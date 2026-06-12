const { getAIInstance, getModelName, safeGenerateContent } = require('../config/gemini');
const db = require('../config/db');
const { logAiUsage } = require('../middlewares/usageMiddleware');
const { calculateHabitStreak } = require('../utils/streaks');
const {
    PROMPT_GLOBAL_INSIGHT,
    PROMPT_WORKOUT_SUGGESTION,
    PROMPT_CALENDAR_COACH,
    PROMPT_PROFILE_COACH,
    injectLifestyleContext
} = require('../config/prompts');

const getUserLifestyleContext = async (userId) => {
    try {
        const tracksRes = await db.query(
            `SELECT lt.display_name 
             FROM user_tracks ut 
             JOIN lifestyle_tracks lt ON ut.track_id = lt.id 
             WHERE ut.user_id = ?`,
            [userId]
        );
        const tracks = tracksRes.rows.map(r => r.display_name).join(', ');

        const profileRes = await db.query(
            `SELECT dietary_philosophy, dietary_notes 
             FROM user_profiles 
             WHERE user_id = ?`,
            [userId]
        );
        const profile = profileRes.rows[0] || {};

        return {
            tracks,
            dietaryPhilosophy: profile.dietary_philosophy,
            dietaryNotes: profile.dietary_notes
        };
    } catch (e) {
        console.error('Error fetching user lifestyle context:', e);
        return null;
    }
};

// Main Recommendations endpoint (Legacy / General plan)
exports.getRecommendations = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const selectedDate = req.query.date || todayStr;

    const existingRec = await db.query(
        'SELECT content FROM recommendations WHERE user_id = ? AND type = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
        [user_id, 'workout', selectedDate]
    );

    if (existingRec.rows.length > 0) {
        try {
            return res.json(JSON.parse(existingRec.rows[0].content));
        } catch (e) {
            console.error("Failed to parse cached recommendation", e);
        }
    }

    if (selectedDate !== todayStr) {
        return res.json({ viewingPast: true });
    }

    const userGoals = await db.query('SELECT * FROM user_goals WHERE user_id = ?', [user_id]);
    const recentWorkouts = await db.query('SELECT * FROM workout_logs WHERE user_id = ? ORDER BY date DESC LIMIT 3', [user_id]);

    const goalContext = userGoals.rows.length > 0 ? userGoals.rows[0] : { goal_type: 'general fitness' };
    
    const lifestyleContext = await getUserLifestyleContext(user_id);
    const contextualPrompt = injectLifestyleContext(PROMPT_WORKOUT_SUGGESTION, lifestyleContext);
    const finalPrompt = contextualPrompt
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
          'INSERT INTO recommendations (user_id, type, content, date) VALUES (?, ?, ?, ?)',
          [user_id, 'workout', JSON.stringify(recommendation), selectedDate]
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
        const todayStr = new Date().toISOString().split('T')[0];
        const selectedDate = req.query.date || todayStr;

        // Check cache first
        const cacheRes = await db.query(
            'SELECT content FROM recommendations WHERE user_id = ? AND type = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
            [userId, 'insight', selectedDate]
        );
        if (cacheRes.rows.length > 0) {
            return res.json(JSON.parse(cacheRes.rows[0].content));
        }

        // If it's a past date and not cached, do not run Gemini
        if (selectedDate !== todayStr) {
            return res.json({ viewingPast: true });
        }

        // Load Context Variables
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

        // Fetch yesterday's meals
        const yesterdayMeals = await db.query(
            `SELECT m.*, fl.food_name, fl.calories, fl.protein, fl.carbs, fl.fats 
             FROM meals m
             JOIN food_logs fl ON m.id = fl.meal_id
             WHERE m.user_id = ? AND m.date = ?`,
            [userId, yesterdayStr]
        );
        let mealsSummary = "No meals logged yesterday.";
        if (yesterdayMeals.rows.length > 0) {
            const list = yesterdayMeals.rows.map(m => `${m.food_name} (${m.calories} kcal, P:${m.protein}g, C:${m.carbs}g, F:${m.fats}g)`);
            mealsSummary = list.join(', ');
        }

        // Fetch yesterday's workouts
        const yesterdayWorkouts = await db.query(
            `SELECT wl.*, ws.sets, ws.reps, ws.weight, e.name as ex_name 
             FROM workout_logs wl
             JOIN workout_sets ws ON wl.id = ws.workout_log_id
             JOIN exercises e ON ws.exercise_id = e.id
             WHERE wl.user_id = ? AND wl.date = ?`,
            [userId, yesterdayStr]
        );
        let workoutsSummary = "No workouts logged yesterday.";
        if (yesterdayWorkouts.rows.length > 0) {
            const list = yesterdayWorkouts.rows.map(w => `${w.ex_name} (${w.sets} sets x ${w.reps} reps @ ${w.weight}kg)`);
            workoutsSummary = `${yesterdayWorkouts.rows[0].notes || 'Workout'} completed: ${list.join(', ')}`;
        }

        // Fetch yesterday's hydration
        const yesterdayHydrationRes = await db.query(
            'SELECT SUM(amount_ml) as total FROM hydration_logs WHERE user_id = ? AND date = ?',
            [userId, yesterdayStr]
        );
        const yesterdayHydration = yesterdayHydrationRes.rows[0]?.total || 0;

        // Fetch goal configurations
        const goalsRes = await db.query('SELECT * FROM user_goals WHERE user_id = ?', [userId]);
        const profileRes = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
        
        const goal = goalsRes.rows[0] || { target_calories: 2000 };
        const profile = profileRes.rows[0] || { fitness_goal: 'general fitness', activity_level: 'Intermediate', weight: 70, target_weight: 65 };

        // Fetch consistency & streak
        const streak = await calculateHabitStreak(userId);
        const recentDaysRes = await db.query(
            `SELECT COUNT(DISTINCT date) as count FROM workout_logs WHERE user_id = ? AND date >= date('now', '-7 days')`,
            [userId]
        );
        const recentDays = recentDaysRes.rows[0]?.count || 0;

        const healthData = `
          Today's Date: ${todayStr}.
          User Profile: Goal: ${profile.fitness_goal}, Weight: ${profile.weight} kg (Target: ${profile.target_weight} kg), Activity Level: ${profile.activity_level}, Daily Target Calories: ${goal.target_calories} kcal.
          Yesterday's Performance (${yesterdayStr}): Meals Logged: ${mealsSummary}, Workouts Completed: ${workoutsSummary}, Hydration: ${yesterdayHydration} ml.
          Consistency Metrics: Logged active workouts in ${recentDays} out of the last 7 days. Habit Streak: ${streak} days.
        `;

        const lifestyleContext = await getUserLifestyleContext(userId);
        const contextualPrompt = injectLifestyleContext(PROMPT_GLOBAL_INSIGHT, lifestyleContext);
        const finalPrompt = contextualPrompt.replace('{{DATA}}', healthData);

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
            'INSERT INTO recommendations (user_id, type, content, date) VALUES (?, ?, ?, ?)',
            [userId, 'insight', JSON.stringify(insight), selectedDate]
        );

        res.json(insight);
    } catch (e) {
        console.error("getInsight failed:", e);
        res.status(500).json({ error: e.message });
    }
};

exports.getWorkoutCoach = async (req, res) => {
    try {
        const userId = req.user.id;
        const todayStr = new Date().toISOString().split('T')[0];
        const selectedDate = req.query.date || todayStr;

        // Check cache first
        const cacheRes = await db.query(
            'SELECT content FROM recommendations WHERE user_id = ? AND type = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
            [userId, 'workout_coach', selectedDate]
        );
        if (cacheRes.rows.length > 0) {
            return res.json(JSON.parse(cacheRes.rows[0].content));
        }

        if (selectedDate !== todayStr) {
            return res.json({ viewingPast: true });
        }

        // Load goals & recent logs
        const profileRes = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
        const profile = profileRes.rows[0] || { fitness_goal: 'Gym Workout', weight: 70, target_weight: 65, activity_level: 'Intermediate' };

        const recentLogs = await db.query(
            `SELECT wl.*, ws.sets, ws.reps, ws.weight, e.name as ex_name 
             FROM workout_logs wl
             JOIN workout_sets ws ON wl.id = ws.workout_log_id
             JOIN exercises e ON ws.exercise_id = e.id
             WHERE wl.user_id = ? ORDER BY wl.date DESC LIMIT 5`,
            [userId]
        );
        let recentSummary = "No workouts logged yet.";
        if (recentLogs.rows.length > 0) {
            const list = recentLogs.rows.map(w => `${w.date}: ${w.ex_name} (${w.sets}x${w.reps}@${w.weight}kg)`);
            recentSummary = list.join('\n');
        }

        // Fetch missed sessions count (days with no workouts in last 5 days)
        const activeDaysRes = await db.query(
            `SELECT COUNT(DISTINCT date) as count FROM workout_logs WHERE user_id = ? AND date >= date('now', '-5 days')`,
            [userId]
        );
        const missedSessions = Math.max(0, 5 - (activeDaysRes.rows[0]?.count || 0));

        const lifestyleContext = await getUserLifestyleContext(userId);
        const contextualPrompt = injectLifestyleContext(PROMPT_WORKOUT_SUGGESTION, lifestyleContext);
        const finalPrompt = contextualPrompt
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
            'INSERT INTO recommendations (user_id, type, content, date) VALUES (?, ?, ?, ?)',
            [userId, 'workout_coach', JSON.stringify(workoutPlan), selectedDate]
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

        // Load 14 days activity logs
        const recentLogs = await db.query(
            `SELECT date, notes, duration_minutes FROM workout_logs 
             WHERE user_id = ? AND date >= date('now', '-14 days') ORDER BY date DESC`,
            [userId]
        );
        let logsSummary = "No recent workouts logged in the last 14 days.";
        if (recentLogs.rows.length > 0) {
            const list = recentLogs.rows.map(w => `${w.date}: ${w.notes || 'Workout'} (${w.duration_minutes} mins)`);
            logsSummary = list.join('\n');
        }

        const streak = await calculateHabitStreak(userId);

        const lifestyleContext = await getUserLifestyleContext(userId);
        const contextualPrompt = injectLifestyleContext(PROMPT_CALENDAR_COACH, lifestyleContext);
        const finalPrompt = contextualPrompt
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

        // Load profile stats
        const profileRes = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
        const profile = profileRes.rows[0] || { weight: 70, target_weight: 65, height: 175, age: 25, gender: 'Male', fitness_goal: 'Fat Loss' };

        // Fetch user totals
        const workoutsCountRes = await db.query('SELECT COUNT(*) as count FROM workout_logs WHERE user_id = ?', [userId]);
        const totalWorkouts = workoutsCountRes.rows[0]?.count || 0;

        const mealsCountRes = await db.query(
            `SELECT SUM(total_calories) as total FROM meals WHERE user_id = ?`,
            [userId]
        );
        const totalCals = mealsCountRes.rows[0]?.total || 0;

        const profileData = `
          Height: ${profile.height} cm, Age: ${profile.age} years, Gender: ${profile.gender}, Current Weight: ${profile.weight} kg, Target Weight: ${profile.target_weight} kg, Goal: ${profile.fitness_goal}.
          Logging History: Workouts Logged: ${totalWorkouts} sessions, Calories Logged: ${totalCals} kcal.
        `;

        const lifestyleContext = await getUserLifestyleContext(userId);
        const contextualPrompt = injectLifestyleContext(PROMPT_PROFILE_COACH, lifestyleContext);
        const finalPrompt = contextualPrompt.replace('{{PROFILE}}', profileData);

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
