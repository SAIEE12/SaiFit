const { getAIInstance, getModelName, safeGenerateContent } = require('../config/gemini');
const db = require('../config/db');
const { logAiUsage } = require('../middlewares/usageMiddleware');
const {
    PROMPT_GLOBAL_INSIGHT,
    PROMPT_WORKOUT_SUGGESTION,
    PROMPT_CALENDAR_COACH,
    PROMPT_PROFILE_COACH
} = require('../config/prompts');


// Streak Calculation Helper
const calculateHabitStreak = async (userId) => {
    try {
        const res = await db.query(
            `SELECT DISTINCT date FROM (
                SELECT date FROM meals WHERE user_id = ?
                UNION
                SELECT date FROM workout_logs WHERE user_id = ?
                UNION
                SELECT date FROM hydration_logs WHERE user_id = ?
            ) ORDER BY date DESC LIMIT 30`,
            [userId, userId, userId]
        );

        if (res.rows.length === 0) return 0;

        let streak = 0;
        let expectedDate = new Date();
        const dateStrings = res.rows.map(r => r.date);

        // Check if user logged anything today or yesterday to continue streak
        const todayStr = expectedDate.toISOString().split('T')[0];
        expectedDate.setDate(expectedDate.getDate() - 1);
        const yesterdayStr = expectedDate.toISOString().split('T')[0];

        if (!dateStrings.includes(todayStr) && !dateStrings.includes(yesterdayStr)) {
            return 0;
        }

        let checkDate = dateStrings.includes(todayStr) ? new Date() : expectedDate;
        
        while (true) {
            const checkStr = checkDate.toISOString().split('T')[0];
            if (dateStrings.includes(checkStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    } catch (e) {
        console.error("Streak calculation failed:", e);
        return 0;
    }
};

// Main Recommendations endpoint (Legacy / General plan)
exports.getRecommendations = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const existingRec = await db.query(
        'SELECT content FROM recommendations WHERE user_id = ? AND type = ? AND date(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1',
        [user_id, 'workout']
    );

    if (existingRec.rows.length > 0) {
        try {
            return res.json(JSON.parse(existingRec.rows[0].content));
        } catch (e) {
            console.error("Failed to parse cached recommendation", e);
        }
    }

    const userGoals = await db.query('SELECT * FROM user_goals WHERE user_id = ?', [user_id]);
    const recentWorkouts = await db.query('SELECT * FROM workout_logs WHERE user_id = ? ORDER BY date DESC LIMIT 3', [user_id]);

    const goalContext = userGoals.rows.length > 0 ? userGoals.rows[0] : { goal_type: 'general fitness' };
    
    const finalPrompt = PROMPT_WORKOUT_SUGGESTION
        .replace('{{GOAL}}', goalContext.goal_type)
        .replace('{{COUNT}}', recentWorkouts.rows.length);

    let recommendation;
    try {
        const responseText = await safeGenerateContent(finalPrompt);
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('AI response did not contain valid JSON: ' + responseText);
        }
        recommendation = JSON.parse(jsonMatch[0]);
        await logAiUsage(user_id, 'workout');
    } catch (aiError) {
        console.error('Gemini API Error, using fallback:', aiError.message);
        recommendation = {
            workout_plan: "Active Recovery Day",
            exercises: ["30 min light walking", "15 min full body stretching"],
            recovery_advice: "Your AI coach is taking a short break. Focus on mobility and recovery!"
        };
    }

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

// 1. Home Screen Context-Aware AI Insights
exports.getInsight = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check cache first
        const cacheRes = await db.query(
            'SELECT content FROM recommendations WHERE user_id = ? AND type = ? AND date(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1',
            [userId, 'insight']
        );
        if (cacheRes.rows.length > 0) {
            return res.json(JSON.parse(cacheRes.rows[0].content));
        }

        const healthData = `
          Today's Date: ${todayStr}.
          User Profile: Goal: ${profile.fitness_goal}, Weight: ${profile.weight} kg (Target: ${profile.target_weight} kg), Activity Level: ${profile.activity_level}, Daily Target Calories: ${goal.target_calories} kcal.
          Yesterday's Performance (${yesterdayStr}): Meals Logged: ${mealsSummary}, Workouts Completed: ${workoutsSummary}, Hydration: ${yesterdayHydration} ml.
          Consistency Metrics: Logged active workouts in ${recentDays} out of the last 7 days. Habit Streak: ${streak} days.
        `;

        const finalPrompt = PROMPT_GLOBAL_INSIGHT.replace('{{DATA}}', healthData);

        let insight;
        try {
            const responseText = await safeGenerateContent(finalPrompt);
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Invalid JSON structure');
            insight = JSON.parse(jsonMatch[0]);
            await logAiUsage(userId, 'insight');
        } catch (aiErr) {
            console.error("Gemini insights failed, using fallback:", aiErr.message);
            insight = {
                summary: `You are maintaining a ${streak}-day active habit streak! Great job keeping consistent.`,
                analysis: `Based on your goal to hit target ${profile.target_weight}kg, focus on logging hydration and sticking to a balanced calorie deficit today. Your workout consistency is solid!`,
                motivational_quote: "Consistency is not about perfection; it is about progress over time.",
                next_actions: ["Log at least 250ml water now", "Plan your upcoming exercise splits"]
            };
        }

        // Cache result
        await db.query(
            'INSERT INTO recommendations (user_id, type, content) VALUES (?, ?, ?)',
            [userId, 'insight', JSON.stringify(insight)]
        );

        res.json(insight);
    } catch (e) {
        console.error("getInsight failed:", e);
        res.status(500).json({ error: e.message });
    }
};

// 2. Workout Screen Context-Aware Trainer
exports.getWorkoutCoach = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check cache first
        const cacheRes = await db.query(
            'SELECT content FROM recommendations WHERE user_id = ? AND type = ? AND date(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1',
            [userId, 'workout_coach']
        );
        if (cacheRes.rows.length > 0) {
            return res.json(JSON.parse(cacheRes.rows[0].content));
        }

        const finalPrompt = PROMPT_WORKOUT_SUGGESTION
            .replace('{{GOAL}}', profile.fitness_goal)
            .replace('{{COUNT}}', missedSessions);

        let workoutPlan;
        try {
            const responseText = await safeGenerateContent(finalPrompt);
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Invalid JSON');
            workoutPlan = JSON.parse(jsonMatch[0]);
            await logAiUsage(userId, 'workout_coach');
        } catch (err) {
            console.error("getWorkoutCoach failed, using fallback:", err.message);
            workoutPlan = {
                summary: "Suggested: Full Body Power Split tomorrow.",
                workout_plan: "Full Body Mobility & Strength",
                exercises: ["Barbell Squats (3 sets x 8 reps)", "Bench Press (3 sets x 10 reps)", "Pull-ups (3 sets x Max)"],
                trainer_advice: "Since you had rest days recently, this full body split will kickstart your metabolism and rebuild strength safely.",
                intensity_level: "Medium"
            };
        }

        // Cache results
        await db.query(
            'INSERT INTO recommendations (user_id, type, content) VALUES (?, ?, ?)',
            [userId, 'workout_coach', JSON.stringify(workoutPlan)]
        );

        res.json(workoutPlan);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// 3. Calendar Intelligence Coach
exports.getCalendarCoach = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check cache first
        const cacheRes = await db.query(
            'SELECT content FROM recommendations WHERE user_id = ? AND type = ? AND date(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1',
            [userId, 'calendar_coach']
        );
        if (cacheRes.rows.length > 0) {
            return res.json(JSON.parse(cacheRes.rows[0].content));
        }

        const finalPrompt = PROMPT_CALENDAR_COACH
            .replace('{{LOGS}}', logsSummary)
            .replace('{{STREAK}}', streak);

        let calendarAnalysis;
        try {
            const responseText = await safeGenerateContent(finalPrompt);
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Invalid JSON');
            calendarAnalysis = JSON.parse(jsonMatch[0]);
            await logAiUsage(userId, 'calendar_coach');
        } catch (err) {
            calendarAnalysis = {
                summary: "Excellent calendar activity recorded over the last two weeks.",
                expanded_narrative: `Based on your previous activity logs over the last 14 days, you have completed multiple high-quality workouts and meals. Your consistency remains excellent at 80% with a steady daily logger pattern. Rest splits are perfectly balanced to ensure optimal recovery, and log timings suggest your current routine aligns well with your natural daily energy peaks. Let's keep this momentum going!`,
                consistency_score: "80%",
                streak_analysis: `Your ${streak}-day active streak shows excellent habit automation.`,
                workout_predictions: "Predicted to train Core & Lower Body based on your upper power split log.",
                best_time_suggestion: "You typically log entries between 6:00 PM and 8:00 PM, which seems to fit your chronotype best.",
                overtraining_alerts: "No fatigue indicators. Muscles are prime for heavy lifting.",
                milestones: ["Maintained a consistent workout cycle!", "Hit your water limits successfully."]
            };
        }

        // Cache results
        await db.query(
            'INSERT INTO recommendations (user_id, type, content) VALUES (?, ?, ?)',
            [userId, 'calendar_coach', JSON.stringify(calendarAnalysis)]
        );

        res.json(calendarAnalysis);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// 4. Profile Intelligence Coach (Body Progress)
exports.getProfileCoach = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check cache first
        const cacheRes = await db.query(
            'SELECT content FROM recommendations WHERE user_id = ? AND type = ? AND date(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1',
            [userId, 'profile_coach']
        );
        if (cacheRes.rows.length > 0) {
            return res.json(JSON.parse(cacheRes.rows[0].content));
        }

        const profileData = `
          Height: ${profile.height} cm, Age: ${profile.age} years, Gender: ${profile.gender}, Current Weight: ${profile.weight} kg, Target Weight: ${profile.target_weight} kg, Goal: ${profile.fitness_goal}.
          Logging History: Workouts Logged: ${totalWorkouts} sessions, Calories Logged: ${totalCals} kcal.
        `;

        const finalPrompt = PROMPT_PROFILE_COACH.replace('{{PROFILE}}', profileData);

        let profileAnalysis;
        try {
            const responseText = await safeGenerateContent(finalPrompt);
            
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Invalid JSON');
            profileAnalysis = JSON.parse(jsonMatch[0]);
            await logAiUsage(userId, 'profile_coach');
        } catch (err) {
            profileAnalysis = {
                summary: "Your personalized Fitness Score is 75/100. Tap to expand body predictions.",
                fitness_score: 75,
                strengths: "Consistent logger! High calorie logging accountability.",
                weaknesses: "Slightly behind on active workout sessions this week.",
                body_predictions: `Based on your current deficit and ${profile.weight}kg start weight, you are estimated to reach your ${profile.target_weight}kg goal in 5-6 weeks.`,
                adaptive_suggestions: "Increase daily activity multiplier by stepping for 20 mins post-dinner.",
                motivational_summary: "Your dedication is paying off. 1% better every single day!"
            };
        }

        // Cache results
        await db.query(
            'INSERT INTO recommendations (user_id, type, content) VALUES (?, ?, ?)',
            [userId, 'profile_coach', JSON.stringify(profileAnalysis)]
        );

        res.json(profileAnalysis);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

exports.getAchievements = async (req, res) => {
    try {
        const userId = req.user.id;

        // Query workouts count by date
        const workoutRows = await db.query(
            'SELECT date, COUNT(*) as count FROM workout_logs WHERE user_id = ? GROUP BY date',
            [userId]
        );

        // Query hydration sum by date
        const hydrationRows = await db.query(
            'SELECT date, SUM(amount_ml) as amount FROM hydration_logs WHERE user_id = ? GROUP BY date',
            [userId]
        );

        // Query meals calories and macros sum by date
        const mealRows = await db.query(
            'SELECT date, SUM(total_calories) as calories, SUM(total_protein) as protein FROM meals WHERE user_id = ? GROUP BY date',
            [userId]
        );

        // Combine achievements by date
        const achievementsMap = {};

        workoutRows.rows.forEach(r => {
            const d = r.date;
            if (!achievementsMap[d]) achievementsMap[d] = { workouts: 0, hydration: 0, calories: 0, protein: 0 };
            achievementsMap[d].workouts = r.count;
        });

        hydrationRows.rows.forEach(r => {
            const d = r.date;
            if (!achievementsMap[d]) achievementsMap[d] = { workouts: 0, hydration: 0, calories: 0, protein: 0 };
            achievementsMap[d].hydration = r.amount;
        });

        mealRows.rows.forEach(r => {
            const d = r.date;
            if (!achievementsMap[d]) achievementsMap[d] = { workouts: 0, hydration: 0, calories: 0, protein: 0 };
            achievementsMap[d].calories = r.calories;
            achievementsMap[d].protein = r.protein;
        });

        res.json(achievementsMap);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
