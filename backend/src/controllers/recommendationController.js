const { getAIInstance, getModelName, getSystemSetting } = require('../config/gemini');
const db = require('../config/db');

exports.getRecommendations = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Check if we already have a recommendation for today to save quota
    const existingRec = await db.query(
        'SELECT content FROM recommendations WHERE user_id = ? AND date(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1',
        [user_id]
    );

    if (existingRec.rows.length > 0) {
        try {
            return res.json(JSON.parse(existingRec.rows[0].content));
        } catch (e) {
            console.error("Failed to parse cached recommendation", e);
        }
    }

    const ai = await getAIInstance();
    const modelName = await getModelName();

    // Fetch user goals and recent workouts to provide context to Gemini
    const userGoals = await db.query('SELECT * FROM user_goals WHERE user_id = ?', [user_id]);
    const recentWorkouts = await db.query('SELECT * FROM workout_logs WHERE user_id = ? ORDER BY date DESC LIMIT 3', [user_id]);

    const goalContext = userGoals.rows.length > 0 ? userGoals.rows[0] : { goal_type: 'general fitness' };
    
    const defaultPrompt = `
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
    const configuredPrompt = await getSystemSetting('PROMPT_WORKOUT_SUGGESTION', defaultPrompt);
    const finalPrompt = configuredPrompt
        .replace('{{GOAL}}', goalContext.goal_type)
        .replace('{{COUNT}}', recentWorkouts.rows.length);

    let recommendation;
    try {
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(finalPrompt);
        const response = await result.response;
        const responseText = response.text();
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI response did not contain valid JSON: ' + responseText);
        }
        const jsonStr = jsonMatch[0];
        recommendation = JSON.parse(jsonStr);
    } catch (aiError) {
        console.error('Gemini API Error, using fallback:', aiError.message);
        recommendation = {
            workout_plan: "Active Recovery Day",
            exercises: ["30 min light walking", "15 min full body stretching", "Deep breathing exercises"],
            recovery_advice: "Your AI coach is taking a short break. For today, focus on hydration and mobility. Get at least 8 hours of sleep!"
        };
    }

    // Save recommendation to database
    try {
        await db.query(
          'INSERT INTO recommendations (user_id, type, content) VALUES (?, ?, ?)',
          [user_id, 'workout', JSON.stringify(recommendation)]
        );
    } catch (dbError) {
        console.error('Failed to save recommendation to DB:', dbError.message);
    }

    res.json(recommendation);
  } catch (error) {
    console.error('Recommendation Controller Error:', error);
    res.status(500).json({ error: 'Internal server error while generating recommendations' });
  }
};
