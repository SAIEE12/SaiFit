/**
 * System AI Prompts Configuration
 * Migrated from system_settings DB table
 */

const PROMPT_GLOBAL_INSIGHT = `Act as a health coach. Analyze today/yesterday health data: {{DATA}}. Respond with ONLY valid JSON (no markdown, no explanation) using structure: {"summary": "2-sentence summary of health improvements", "analysis": "hydration, macros, workout splits details", "motivational_quote": "short quote", "next_actions": ["action 1", "action 2"]}`;

const PROMPT_WORKOUT_SUGGESTION = `Act as a personal trainer. Goal: {{GOAL}}. Missed days: {{COUNT}}. Suggest a beginner-friendly workout. Respond with ONLY valid JSON (no markdown, no explanation) using structure: {"workout_plan": "Plan summary", "exercises": ["ex 1", "ex 2"], "recovery_advice": "Recovery advice"}`;

const PROMPT_MEAL_ANALYSIS = `Analyze the food context: {{TEXT}}. Respond with ONLY valid JSON (no markdown, no explanation) using structure: {"food_name": "Name", "calories": 0, "protein": 0, "carbs": 0, "fats": 0}`;

const PROMPT_SMART_SEARCH = `Act as a chef. Recommend a recipe/ingredient alternative for: {{QUERY}}. Respond with ONLY valid JSON (no markdown, no explanation) using structure: {"food_name": "Name", "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "advice": "Chef advice"}`;

const PROMPT_CALENDAR_COACH = `Analyze 14-day logs: {{LOGS}}. Streak: {{STREAK}} days. Respond with ONLY valid JSON (no markdown, no explanation) using keys: summary, expanded_narrative, consistency_score, streak_analysis, workout_predictions, best_time_suggestion, overtraining_alerts, milestones.`;

const PROMPT_PROFILE_COACH = `Analyze profile metrics: {{PROFILE}}. Respond with ONLY valid JSON (no markdown, no explanation) using keys: summary, fitness_score, strengths, weaknesses, body_predictions, adaptive_suggestions, motivational_summary.`;

const PROMPT_SMART_NOTIFICATIONS = `Write a push notification copy based on: {{STATUS}}. Return a short sentence.`;

const PROMPT_HYDRATION_COACH = `Design an hourly water schedule based on activities: {{HYDRATION_DATA}}. Return a simple schedule.`;

const PROMPT_SLEEP_ADVISOR = `Suggest sleep targets and fatigue checks for: {{RECOVERY_DATA}}. Return advice.`;

function injectLifestyleContext(promptStr, context) {
    if (!context) return promptStr;
    const { tracks, dietaryPhilosophy, dietaryNotes } = context;
    const parts = [];
    if (tracks && tracks.trim()) {
        parts.push(`User tracks: ${tracks.trim()}.`);
    }
    if (dietaryPhilosophy && dietaryPhilosophy.trim()) {
        parts.push(`Diet preference: ${dietaryPhilosophy.trim()}.`);
    }
    if (dietaryNotes && dietaryNotes.trim()) {
        parts.push(`Notes: ${dietaryNotes.trim()}.`);
    }
    if (parts.length > 0) {
        return `${parts.join(' ')} Tailor suggestions.\n\n${promptStr}`;
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
