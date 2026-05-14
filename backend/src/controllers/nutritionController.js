const db = require('../config/db');
const ai = require('../config/gemini');

exports.analyzeFoodImage = async (req, res) => {
  try {
    // In a real implementation, we'd use multer to get the file buffer
    // and upload to Cloudinary or pass directly to Gemini.
    // For this example, we assume we receive an image URL or base64.
    const { imageBase64 } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const prompt = `Analyze this food image and return a JSON object with exactly the following structure (no markdown formatting, just raw JSON):
    {
      "food_name": "Name of the dish",
      "calories": estimated_calories_integer,
      "protein": estimated_protein_grams_integer,
      "carbs": estimated_carbs_grams_integer,
      "fats": estimated_fats_grams_integer
    }`;

    // Pass base64 to Gemini
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: 'image/jpeg' // adjust dynamically if needed
                }
            }
        ]
    });
    
    const responseText = response.text;
    // Clean up response if it contains markdown code blocks
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const nutritionInfo = JSON.parse(jsonStr);

    res.json(nutritionInfo);
  } catch (error) {
    console.error('Error analyzing food image:', error);
    res.status(500).json({ error: 'Failed to analyze food image' });
  }
};

exports.logFood = async (req, res) => {
  try {
    const { meal_id, food_name, calories, protein, carbs, fats, image_url } = req.body;
    // req.user.id would be available via authMiddleware
    
    const newLog = await db.query(
      'INSERT INTO food_logs (meal_id, food_name, calories, protein, carbs, fats, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [meal_id, food_name, calories, protein, carbs, fats, image_url]
    );

    // Update meal totals
    await db.query(
      'UPDATE meals SET total_calories = total_calories + $1, total_protein = total_protein + $2, total_carbs = total_carbs + $3, total_fats = total_fats + $4 WHERE id = $5',
      [calories, protein, carbs, fats, meal_id]
    );

    res.status(201).json(newLog.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
