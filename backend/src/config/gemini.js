const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./db');
require('dotenv').config();

/**
 * Gets the AI instance with the latest API key from settings
 */
const getAIInstance = async () => {
    try {
        const res = await db.query('SELECT value FROM system_settings WHERE key = ?', ['GEMINI_API_KEY']);
        const dbKey = (res.rows && res.rows.length > 0) ? res.rows[0].value : null;
        const envKey = process.env.GEMINI_API_KEY;
        
        const apiKey = (dbKey && dbKey.trim() !== '') ? dbKey : envKey;
        
        if (!apiKey) {
            console.warn('GEMINI_API_KEY not found in database or environment variables.');
        }
        
        return new GoogleGenerativeAI(apiKey || '');
    } catch (e) {
        console.error('Error fetching GEMINI_API_KEY from DB:', e);
        return new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    }
};

/**
 * Helper to get any system setting
 */
const getSystemSetting = async (key, defaultValue = null) => {
    try {
        const res = await db.query('SELECT value FROM system_settings WHERE key = ?', [key]);
        const val = (res.rows && res.rows.length > 0) ? res.rows[0].value : null;
        return (val !== null && val.trim() !== '') ? val : defaultValue;
    } catch (e) {
        return defaultValue;
    }
};

/**
 * Helper to get the configured model name or default
 */
const getModelName = async () => {
    return await getSystemSetting('GEMINI_MODEL_NAME', 'gemini-3-pro');
};

module.exports = { getAIInstance, getModelName, getSystemSetting };
