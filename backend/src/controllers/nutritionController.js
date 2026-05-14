const db = require('../config/db');
const ai = require('../config/gemini');
const fs = require('fs');

exports.analyzeFoodImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image is required' });

    const prompt = `Analyze this food image. Return a JSON object exactly like this (no markdown, pure JSON):
    {
      "food_name": "Name of food",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            prompt,
            {
                inlineData: {
                    data: Buffer.from(fs.readFileSync(req.file.path)).toString("base64"),
                    mimeType: req.file.mimetype
                }
            }
        ]
    });
    
    let jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const nutritionInfo = JSON.parse(jsonStr);

    res.json({
        ...nutritionInfo,
        image_url: '/uploads/' + req.file.filename
    });
  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
};

exports.analyzeFoodText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text description is required' });

    const prompt = `Analyze this food description: "${text}". Return a JSON object exactly like this (no markdown, pure JSON):
    {
      "food_name": "Name of food",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    let jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
    const nutritionInfo = JSON.parse(jsonStr);

    res.json(nutritionInfo);
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
};

exports.logFood = async (req, res) => {
  try {
    const { meal_id, food_name, calories, protein, carbs, fats, image_url, input_type } = req.body;
    
    // Fallback to user 1 for dev if auth is skipped
    const userId = req.user ? req.user.id : 1; 

    // Find or create a meal for today
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

    // Update meal totals
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
