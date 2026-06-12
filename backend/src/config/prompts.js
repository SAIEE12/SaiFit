/**
 * System AI Prompts Configuration
 * Migrated from system_settings DB table
 */

const PROMPT_GLOBAL_INSIGHT = `Act as an elite AI Personal Health Companion. Analyze today and yesterday health data: {{DATA}}. Highlight improvements, hydration, macros, and workout splits in 2 sentences.`;

const PROMPT_WORKOUT_SUGGESTION = `Act as an expert AI personal trainer.
User Goal: {{GOAL}}
Recent Workouts Count: {{COUNT}}

Please provide a highly personalized, beginner-friendly workout recommendation and some recovery advice for tomorrow.
Format the response as a valid JSON object with the following structure (no markdown, pure JSON):
{
  "workout_plan": "String describing the workout plan",
  "exercises": ["Exercise 1", "Exercise 2"],
  "recovery_advice": "String with recovery advice"
}`;

const PROMPT_MEAL_ANALYSIS = `Analyze the food. Estimate its nutritional value. Return a JSON object exactly like this (no markdown block, pure JSON):
{
  "food_name": "Name of food",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fats": 0
}
Description / context: {{TEXT}}`;

const PROMPT_SMART_SEARCH = `Act as an expert AI Nutrition Chef. Suggest premium, high-density recipes or ingredient alternatives based on user search: {{QUERY}}. Return a friendly markdown response.`;

const PROMPT_CALENDAR_COACH = `Act as an elite AI Fitness Journey Analyst from Apple and Google Fit. Analyze the user last 14 days logs: {{LOGS}}. Streak: {{STREAK}} days. Provide workout splits consistency score, overtraining alerts, and milestones. Format as JSON with keys summary, expanded_narrative, consistency_score, streak_analysis, workout_predictions, best_time_suggestion, overtraining_alerts, milestones.`;

const PROMPT_PROFILE_COACH = `Act as an expert AI Progress & Body Metrics Analyst. Analyze user profile weights, height, target weights, gender, age: {{PROFILE}}. Provide adaptive progress timelines, body predictions, adaptive suggestions, and a dynamic fitness score.`;

const PROMPT_SMART_NOTIFICATIONS = `Act as an elite, ultra-encouraging notification copywriter from Apple/Nike. Write a personalized push notification copy based on user status: {{STATUS}} suggesting actions.`;

const PROMPT_HYDRATION_COACH = `Act as an expert AI Hydration Specialist. Design a simple personalized water drinking schedule based on user total logged exercises and activities: {{HYDRATION_DATA}}. Provide a simple hourly timeline.`;

const PROMPT_SLEEP_ADVISOR = `Act as an expert AI Sleep & Muscle Recovery Advisor. Analyze user daily active logs and suggest sleep targets, recovery suggestions, and fatigue checks: {{RECOVERY_DATA}}.`;

function injectLifestyleContext(promptStr, context) {
    if (!context) return promptStr;
    const { tracks, dietaryPhilosophy, dietaryNotes } = context;
    const parts = [];
    if (tracks && tracks.trim()) {
        parts.push(`This user follows: ${tracks.trim()}.`);
    }
    if (dietaryPhilosophy && dietaryPhilosophy.trim()) {
        parts.push(`Their dietary preference: ${dietaryPhilosophy.trim()}.`);
    }
    if (dietaryNotes && dietaryNotes.trim()) {
        parts.push(`Dietary notes: ${dietaryNotes.trim()}.`);
    }
    if (parts.length > 0) {
        return `${parts.join(' ')} Tailor your suggestions and tone accordingly.\n\n${promptStr}`;
    }
    return promptStr;
}

module.exports = {
    PROMPT_GLOBAL_INSIGHT,
    PROMPT_WORKOUT_SUGGESTION,
    PROMPT_MEAL_ANALYSIS,
    PROMPT_SMART_SEARCH,
    PROMPT_CALENDAR_COACH,
    PROMPT_PROFILE_COACH,
    PROMPT_SMART_NOTIFICATIONS,
    PROMPT_HYDRATION_COACH,
    PROMPT_SLEEP_ADVISOR,
    injectLifestyleContext
};
