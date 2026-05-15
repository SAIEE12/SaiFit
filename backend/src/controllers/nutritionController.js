const db = require('../config/db');
const { getAIInstance, getModelName, getSystemSetting } = require('../config/gemini');
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

    const ai = await getAIInstance();
    const modelName = await getModelName();
    const model = ai.getGenerativeModel({ model: modelName });

    const defaultPrompt = `Analyze this food image. Return a JSON object exactly like this (no markdown, pure JSON):
    {
      "food_name": "Name of food",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0
    }`;
    const prompt = await getSystemSetting('PROMPT_MEAL_ANALYSIS', defaultPrompt);

    let result;
    try {
        result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: Buffer.from(fs.readFileSync(req.file.path)).toString("base64"),
                    mimeType: req.file.mimetype
                }
            }
        ]);
    } catch (aiError) {
        console.error('Gemini Image Analysis Error:', aiError.message);
        return res.status(503).json({ error: 'AI analysis service is temporarily unavailable. Please try again later.' });
    }
    
    const response = await result.response;
    const responseText = response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON: ' + responseText);
    }
    const nutritionInfo = JSON.parse(jsonMatch[0]);

    // 2. Save to Cache
    await setCachedResult(fileHash, nutritionInfo);

    res.json({
        ...nutritionInfo,
        image_url: '/uploads/' + req.file.filename
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

    const ai = await getAIInstance();
    const modelName = await getModelName();
    const model = ai.getGenerativeModel({ model: modelName });

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

    let result;
    try {
        result = await model.generateContent(finalPrompt);
    } catch (aiError) {
        console.error('Gemini Text Analysis Error:', aiError.message);
        return res.status(503).json({ error: 'AI analysis service is temporarily unavailable. Please try again later.' });
    }

    const response = await result.response;
    const responseText = response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON: ' + responseText);
    }
    const nutritionInfo = JSON.parse(jsonMatch[0]);

    // 2. Save to Cache
    await setCachedResult(textKey, nutritionInfo);

    res.json(nutritionInfo);
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze text: ' + error.message });
  }
};

exports.logFood = async (req, res) => {
  try {
    const { meal_id, food_name, calories, protein, carbs, fats, image_url, input_type } = req.body;
    const userId = req.user ? req.user.id : 1; 

    let mealRes = await db.query('SELECT * FROM meals WHERE user_id = ? AND date = CURRENT_DATE', [userId]);
    let actualMealId = meal_id;
    
    if (!actualMealId) {
        if (mealRes.rows.length === 0) {
            const newMeal = await db.query(
                'INSERT INTO meals (user_id, date, meal_type) VALUES (?, CURRENT_DATE, ?) RETURNING id',
                [userId, 'lunch']
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
