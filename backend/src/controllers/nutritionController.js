const db = require('../config/db');
const { getAIInstance, getModelName, safeGenerateContent } = require('../config/gemini');
const { PROMPT_MEAL_ANALYSIS, PROMPT_SMART_SEARCH, injectLifestyleContext } = require('../config/prompts');
const fs = require('fs');
const crypto = require('crypto');
const { logAiUsage } = require('../middlewares/usageMiddleware');
const { getUserLifestyleContext } = require('../utils/lifestyleContext');
const notificationService = require('../services/notificationService');


// Helper to get MD5 hash of a file
const getFileHash = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
};

// Helper to get/set cache
const getCachedResult = async (key) => {
    const res = await db.query('SELECT result FROM ai_cache WHERE cache_key = ?', [key]);
    if (res.rows.length > 0) {
        return JSON.parse(res.rows[0].result);
    }
    return null;
};

const setCachedResult = async (key, result) => {
    await db.query(
        'INSERT INTO ai_cache (cache_key, result) VALUES (?, ?) ON CONFLICT(cache_key) DO UPDATE SET result = EXCLUDED.result',
        [key, JSON.stringify(result)]
    );
};

exports.analyzeFoodImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    // 1. Check Cache by file hash
    const fileHash = getFileHash(req.file.path);
    const cached = await getCachedResult(fileHash);
    if (cached) {
        console.log('--- Cache Hit (Image) ---');
        return res.json({
            ...cached,
            image_url: '/uploads/' + req.file.filename,
            cached: true
        });
    }

    const lifestyleContext = await getUserLifestyleContext(req.user.id);
    const contextualPrompt = injectLifestyleContext(PROMPT_MEAL_ANALYSIS, lifestyleContext);
    const prompt = contextualPrompt.replace('{{TEXT}}', '').replace('{{text}}', '');

    let responseText;
    try {
        responseText = await safeGenerateContent(prompt, fs.readFileSync(req.file.path), req.file.mimetype);
    } catch (aiError) {
        console.error('Gemini Image Analysis Error:', aiError.message);
        return res.status(503).json({ error: 'AI analysis service is temporarily unavailable. Please try again later.' });
    }
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON: ' + responseText);
    }
    const nutritionInfo = JSON.parse(jsonMatch[0]);

    // 2. Save to Cache
    await setCachedResult(fileHash, nutritionInfo);
    await logAiUsage(req.user.id, 'meal_scan');

    res.json({
        ...nutritionInfo,
        image_url: '/uploads/' + req.file.filename,
        cached: false
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze image: ' + error.message });
  }
};

exports.analyzeFoodText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text description is required' });

    // 1. Check Cache by normalized text
    const textKey = 'text_' + text.trim().toLowerCase().replace(/\s+/g, '_');
    const cached = await getCachedResult(textKey);
    if (cached) {
        console.log('--- Cache Hit (Text) ---');
        return res.json({ ...cached, cached: true });
    }

    const lifestyleContext = await getUserLifestyleContext(req.user.id);
    const contextualPrompt = injectLifestyleContext(PROMPT_MEAL_ANALYSIS, lifestyleContext);
    const finalPrompt = contextualPrompt.replace('{{TEXT}}', text).replace('{{text}}', text);

    let responseText;
    try {
        responseText = await safeGenerateContent(finalPrompt);
    } catch (aiError) {
        console.error('Gemini Text Analysis Error:', aiError.message);
        return res.status(503).json({ error: 'AI analysis service is temporarily unavailable. Please try again later.' });
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON: ' + responseText);
    }
    const nutritionInfo = JSON.parse(jsonMatch[0]);

    // 2. Save to Cache
    await setCachedResult(textKey, nutritionInfo);
    await logAiUsage(req.user.id, 'meal_scan');

    res.json({
        ...nutritionInfo,
        cached: false
    });
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze text: ' + error.message });
  }
};

exports.logFood = async (req, res) => {
  try {
    const { meal_id, food_name, calories, protein, carbs, fats, image_url, input_type, date } = req.body;
    const userId = req.user ? req.user.id : 1; 
    const targetDate = date || new Date().toISOString().split('T')[0];

    let mealRes = await db.query('SELECT * FROM meals WHERE user_id = ? AND date = ?', [userId, targetDate]);
    let actualMealId = meal_id;
    
    if (!actualMealId) {
        if (mealRes.rows.length === 0) {
            const newMeal = await db.query(
                'INSERT INTO meals (user_id, date, meal_type) VALUES (?, ?, ?) RETURNING id',
                [userId, targetDate, 'lunch']
            );
            actualMealId = newMeal.rows[0].id;
        } else {
            actualMealId = mealRes.rows[0].id;
        }
    }

    const newLog = await db.query(
      'INSERT INTO food_logs (meal_id, food_name, calories, protein, carbs, fats, image_url, input_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *',
      [actualMealId, food_name, calories, protein, carbs, fats, image_url || null, input_type || 'text']
    );

    await db.query(
      'UPDATE meals SET total_calories = total_calories + ?, total_protein = total_protein + ?, total_carbs = total_carbs + ?, total_fats = total_fats + ? WHERE id = ?',
      [calories, protein, carbs, fats, actualMealId]
    );

    // Calculate total daily values after update
    const todayMeals = await db.query('SELECT total_calories, total_protein FROM meals WHERE user_id = ? AND date = ?', [userId, targetDate]);
    let totalCals = 0;
    let totalProtein = 0;
    todayMeals.rows.forEach(m => {
      totalCals += m.total_calories || 0;
      totalProtein += m.total_protein || 0;
    });

    // Check goals to see if macro limits are crossed
    const goalsRes = await db.query('SELECT target_calories, target_protein FROM user_goals WHERE user_id = ?', [userId]);
    const targetCalories = goalsRes.rows[0]?.target_calories || 2200;
    const targetProtein = goalsRes.rows[0]?.target_protein || 140;

    const todayStr = new Date().toISOString().split('T')[0];
    if (targetDate === todayStr) {
      // 1. Protein Target Met Check
      if (totalProtein >= targetProtein) {
        const existingNotif = await db.query(
          "SELECT id FROM notifications WHERE user_id = ? AND category = ? AND date(created_at) = date('now') AND action_payload LIKE '%protein%'",
          [userId, 'NUTRITION TARGET']
        );

        if (existingNotif.rows.length === 0) {
          await notificationService.createNotification(userId, {
            category: 'NUTRITION TARGET',
            title: 'Excellent Macro Balance',
            body: `Your logged meals have met today's lean protein target goal.`,
            icon: 'food-apple',
            icon_type: 'material',
            color: '#10B981', // theme.colors.success
            action_type: 'navigate',
            action_payload: { screen: 'Meals', target: 'protein' },
            templates: {
              Supportive: {
                title: 'Excellent Macro Balance',
                body: `Your logged meals have met today's lean protein target goal of ${targetProtein}g. Keep up the good work!`
              },
              Direct: {
                title: 'Protein Goal Met',
                body: `Logged: ${Math.round(totalProtein)}g / ${targetProtein}g. Lean protein target has been met.`
              },
              Challenger: {
                title: 'FUEL LOADED: Protein Goal Locked 🍖',
                body: `Sensational lunch tracking. You fed your muscle tissue exactly the amino acids required for growth!`
              }
            }
          });
        }
      }

      // 2. Calorie Limit Warn Check (90% target)
      if (totalCals >= targetCalories * 0.9) {
        const existingNotif = await db.query(
          "SELECT id FROM notifications WHERE user_id = ? AND category = ? AND date(created_at) = date('now') AND action_payload LIKE '%calorie_limit%'",
          [userId, 'NUTRITION TARGET']
        );

        if (existingNotif.rows.length === 0) {
          await notificationService.createNotification(userId, {
            category: 'NUTRITION TARGET',
            title: 'Calorie Limit Approaching',
            body: `You are close to reaching your daily calorie limit (${Math.round(totalCals)} kcal consumed).`,
            icon: 'alert-triangle',
            icon_type: 'feather',
            color: '#F59E0B', // theme.colors.warning
            action_type: 'navigate',
            action_payload: { screen: 'Meals', target: 'calorie_limit' },
            templates: {
              Supportive: {
                title: 'Calorie Budget Reminder',
                body: `You are approaching your daily calorie limit (${Math.round(totalCals)} kcal consumed). Keep an eye on portion sizes!`
              },
              Direct: {
                title: 'Daily Calories at 90%',
                body: `Logged: ${Math.round(totalCals)} kcal / ${targetCalories} kcal. You have 10% remaining.`
              },
              Challenger: {
                title: 'CALORIE CEILING WARNING ⚡',
                body: `You are at 90% of your daily calorie allowance. Make sure any remaining fuel is high-volume, low-calorie!`
              }
            }
          });
        }
      }
    }

    // Invalidate recommendation cache
    await db.query(
      "DELETE FROM recommendations WHERE user_id = ? AND type IN ('insight', 'calendar_coach') AND date = ?",
      [userId, targetDate]
    );

    res.status(201).json(newLog.rows[0]);
  } catch (error) {

    console.error('Log Food Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getMeals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query; 
    const targetDate = date || new Date().toISOString().split('T')[0];

    const mealsRes = await db.query('SELECT * FROM meals WHERE user_id = ? AND date = ?', [userId, targetDate]);
    
    const mealsWithLogs = await Promise.all(mealsRes.rows.map(async (meal) => {
      const logsRes = await db.query('SELECT * FROM food_logs WHERE meal_id = ?', [meal.id]);
      return { ...meal, logs: logsRes.rows };
    }));

    res.json(mealsWithLogs);
  } catch (error) {
    console.error('Get Meals Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.smartSearch = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Search query is required' });

    const userId = req.user.id;
    const targetDate = new Date().toISOString().split('T')[0];

    // Fetch today's logged meals
    const mealsRes = await db.query('SELECT * FROM meals WHERE user_id = ? AND date = ?', [userId, targetDate]);
    let totalCals = 0, totalProt = 0, totalCarb = 0, totalFat = 0;
    mealsRes.rows.forEach(meal => {
        totalCals += meal.total_calories || 0;
        totalProt += meal.total_protein || 0;
        totalCarb += meal.total_carbs || 0;
        totalFat += meal.total_fats || 0;
    });

    // Fetch goals
    const goalsRes = await db.query('SELECT * FROM user_goals WHERE user_id = ?', [userId]);
    const profileRes = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
    
    const goal = goalsRes.rows[0] || { target_calories: 2000, target_protein: 150, target_carbs: 200, target_fats: 65 };
    const profile = profileRes.rows[0] || { fitness_goal: 'general fitness', activity_level: 'Intermediate' };

    const remainingCals = Math.max(0, (goal.target_calories || 2000) - totalCals);
    const remainingProt = Math.max(0, (goal.target_protein || 150) - totalProt);
    const remainingCarb = Math.max(0, (goal.target_carbs || 200) - totalCarb);
    const remainingFat = Math.max(0, (goal.target_fats || 65) - totalFat);

    const lifestyleContext = await getUserLifestyleContext(userId);
    const contextStr = JSON.stringify(lifestyleContext || {});
    const searchKey = 'search_' + crypto.createHash('md5').update(`${query.trim().toLowerCase()}_${contextStr}`).digest('hex');

    const cached = await getCachedResult(searchKey);
    if (cached) {
        console.log('--- Cache Hit (Smart Search) ---');
        return res.json({ ...cached, cached: true });
    }

    const contextualPrompt = injectLifestyleContext(PROMPT_SMART_SEARCH, lifestyleContext);
    const finalPrompt = contextualPrompt
        .replace('{{QUERY}}', query)
        .replace('{{query}}', query);

    let responseText;
    try {
        responseText = await safeGenerateContent(finalPrompt);
    } catch (aiError) {
        console.error('Gemini Smart Search Error:', aiError.message);
        return res.status(503).json({ error: 'AI search service is temporarily unavailable.' });
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON: ' + responseText);
    }
    const searchResult = JSON.parse(jsonMatch[0]);
    
    await setCachedResult(searchKey, searchResult);
    await logAiUsage(userId, 'smart_search');

    res.json({
        ...searchResult,
        cached: false
    });
  } catch (error) {
    console.error('Smart search error:', error);
    res.status(500).json({ error: 'Failed to perform smart search: ' + error.message });
  }
};

exports.getSmartSearchStatus = async (req, res) => {
  try {
    res.json({ enabled: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.deleteMealLog = async (req, res) => {
  try {
    const logId = req.params.id;
    const userId = req.user.id;

    // Fetch the log first to know what values to subtract and ensure ownership
    const logRes = await db.query(
      `SELECT fl.*, m.user_id, m.date 
       FROM food_logs fl
       JOIN meals m ON fl.meal_id = m.id
       WHERE fl.id = ? AND m.user_id = ?`,
      [logId, userId]
    );

    if (logRes.rows.length === 0) {
      return res.status(404).json({ error: 'Food log not found or unauthorized' });
    }

    const log = logRes.rows[0];

    // Subtract macros from the parent meal
    await db.query(
      `UPDATE meals 
       SET total_calories = total_calories - ?, 
           total_protein = total_protein - ?, 
           total_carbs = total_carbs - ?, 
           total_fats = total_fats - ? 
       WHERE id = ?`,
      [log.calories, log.protein, log.carbs, log.fats, log.meal_id]
    );

    // Delete the food log row
    await db.query('DELETE FROM food_logs WHERE id = ?', [logId]);

    // Check if there are any food logs remaining for this meal
    const remainingLogs = await db.query('SELECT COUNT(*) as count FROM food_logs WHERE meal_id = ?', [log.meal_id]);
    if (parseInt(remainingLogs.rows[0].count) === 0) {
        // Clean up empty meal container
        await db.query('DELETE FROM meals WHERE id = ?', [log.meal_id]);
    }

    // Invalidate recommendation cache
    if (log.date) {
      await db.query(
        "DELETE FROM recommendations WHERE user_id = ? AND type IN ('insight', 'calendar_coach') AND date = ?",
        [userId, log.date]
      );
    }

    res.json({ message: 'Meal log removed successfully' });
  } catch (error) {
    console.error('Delete Meal Log Error:', error);
    res.status(500).json({ error: 'Failed to delete meal log: ' + error.message });
  }
};



