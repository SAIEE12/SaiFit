const ai = require('../config/gemini');
const db = require('../config/db');

exports.getRecommendations = async (req, res) => {
  try {
    const user_id = req.user.id;

    // Fetch user goals and recent workouts to provide context to Gemini
    const userGoals = await db.query('SELECT * FROM user_goals WHERE user_id = $1', [user_id]);
    const recentWorkouts = await db.query('SELECT * FROM workout_logs WHERE user_id = $1 ORDER BY date DESC LIMIT 3', [user_id]);

    const goalContext = userGoals.rows.length > 0 ? userGoals.rows[0] : { goal_type: 'general fitness' };
    
    const prompt = `
      Act as an expert AI personal trainer.
      User Goal: ${goalContext.goal_type}
      Recent Workouts Count: ${recentWorkouts.rows.length}
      
      Please provide a highly personalized, beginner-friendly workout recommendation and some recovery advice for tomorrow.
      Format the response as a valid JSON object with the following structure (no markdown, pure JSON):
      {
        "workout_plan": "String describing the workout plan",
        "exercises": ["Exercise 1", "Exercise 2"],
        "recovery_advice": "String with recovery advice"
      }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    const responseText = response.text;
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const recommendation = JSON.parse(jsonStr);

    // Save recommendation to database
    await db.query(
      'INSERT INTO recommendations (user_id, type, content) VALUES ($1, $2, $3)',
      [user_id, 'workout', JSON.stringify(recommendation)]
    );

    res.json(recommendation);
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
};
