const db = require('../config/db');
const { getAIInstance, getModelName, getSystemSetting, safeGenerateContent } = require('../config/gemini');
const fs = require('fs');
const crypto = require('crypto');

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

    const isFeatureEnabled = await getSystemSetting('ENABLE_MEAL_SCAN', 'true');
    if (isFeatureEnabled === 'false') {
        const fallbackMeal = {
            food_name: "Logged Food Image (AI Scanning Offline)",
            calories: 420,
            protein: 24,
            carbs: 48,
            fats: 14
        };
        return res.json({
            ...fallbackMeal,
            image_url: '/uploads/' + req.file.filename,
            cached: false,
            message: "AI Scan is currently disabled in system governance."
        });
    }

    const defaultPrompt = `Analyze this food image. Return a JSON object exactly like this (no markdown, pure JSON):
    {
      "food_name": "Name of food",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0
    }`;
    const prompt = await getSystemSetting('PROMPT_MEAL_ANALYSIS', defaultPrompt);

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

    const isFeatureEnabled = await getSystemSetting('ENABLE_MEAL_SCAN', 'true');
    if (isFeatureEnabled === 'false') {
        const fallbackMeal = {
            food_name: text || "Logged Food (AI Scanning Offline)",
            calories: 340,
            protein: 18,
            carbs: 42,
            fats: 10
        };
        return res.json({
            ...fallbackMeal,
            cached: false,
            message: "AI Scan is currently disabled in system governance."
        });
    }

    const defaultPrompt = `Analyze this food description: "${text}". Return a JSON object exactly like this (no markdown, pure JSON):
    {
      "food_name": "Name of food",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0
    }`;
    const prompt = await getSystemSetting('PROMPT_MEAL_ANALYSIS', defaultPrompt);
    const finalPrompt = prompt.replace('{{TEXT}}', text).replace('{{text}}', text);

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

    // Verify if Smart Search setting is enabled
    const isEnabled = await getSystemSetting('ENABLE_SMART_SEARCH', 'false');
    if (isEnabled !== 'true') {
        return res.status(403).json({ error: 'Smart search is currently disabled in system settings.' });
    }

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

    const defaultPrompt = `Act as an elite AI nutrition coach and personal trainer. The user is asking a conceptual query: "{{QUERY}}".
    Today's Date: ${targetDate}.
    Current User Nutrition Status Today:
    - Logged so far: ${totalCals} kcal (P: ${totalProt}g, C: ${totalCarb}g, F: ${totalFat}g)
    - Target goals: ${goal.target_calories || 2000} kcal (P: ${goal.target_protein || 150}g, C: ${goal.target_carbs || 200}g, F: ${goal.target_fats || 65}g)
    - Remaining today: ${remainingCals} kcal (P: ${remainingProt}g, C: ${remainingCarb}g, F: ${remainingFat}g)
    
    User Profile Context:
    - Goal: ${profile.fitness_goal}
    - Level: ${profile.activity_level}
    
    Please recommend a precise recipe, food, or nearby meal recommendation that perfectly matches their query, matches their current time and location preferences, and dynamically balances their remaining targets today.
    Return a JSON object exactly like this (no markdown block, pure JSON, no backticks):
    {
      "food_name": "Name of recommended food/meal/recipe",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0,
      "advice": "Context-aware explanation of why this fits their exact query and nutritional balance (under 25 words)"
    }`;

    const prompt = await getSystemSetting('PROMPT_SMART_SEARCH', defaultPrompt);
    const finalPrompt = prompt
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

    res.json(searchResult);
  } catch (error) {
    console.error('Smart search error:', error);
    res.status(500).json({ error: 'Failed to perform smart search: ' + error.message });
  }
};

exports.getSmartSearchStatus = async (req, res) => {
  try {
    const isEnabled = await getSystemSetting('ENABLE_SMART_SEARCH', 'false');
    res.json({ enabled: isEnabled === 'true' });
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
      `SELECT fl.*, m.user_id 
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

    res.json({ message: 'Meal log removed successfully' });
  } catch (error) {
    console.error('Delete Meal Log Error:', error);
    res.status(500).json({ error: 'Failed to delete meal log: ' + error.message });
  }
};



