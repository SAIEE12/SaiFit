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
 * Helper to get the configured model name and sanitize it
 */
const getModelName = async () => {
    const rawModel = await getSystemSetting('GEMINI_MODEL_NAME', 'gemini-1.5-flash');
    
    // Map admin friendly selection names to correct, stable official Google model names
    const mapping = {
        'gemini-3-pro': 'gemini-1.5-pro',
        'gemini-2.5-flash-lite': 'gemini-1.5-flash',
        'gemini-2.0-flash': 'gemini-1.5-flash',
        'gemini-1.5-pro': 'gemini-1.5-pro',
        'gemini-1.5-flash': 'gemini-1.5-flash'
    };
    
    return mapping[rawModel] || rawModel || 'gemini-1.5-flash';
};

/**
 * Self-healing generative content execution tool with automated retries and fallbacks
 */
const safeGenerateContent = async (prompt, imageBuffer = null, mimeType = null) => {
    const ai = await getAIInstance();
    const modelName = await getModelName();
    
    // Models to attempt sequentially upon downstream error catches
    const modelsToTry = [modelName, 'gemini-1.5-flash', 'gemini-1.5-pro'];
    
    let lastError = null;
    for (const modelId of modelsToTry) {
        try {
            console.log(`[Resilient AI Engine] Attempting generative content execution via: ${modelId}`);
            const model = ai.getGenerativeModel({ model: modelId });
            
            let result;
            if (imageBuffer && mimeType) {
                result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: imageBuffer.toString("base64"),
                            mimeType: mimeType
                        }
                    }
                ]);
            } else {
                result = await model.generateContent(prompt);
            }
            
            const responseText = (await result.response).text();
            return responseText;
        } catch (err) {
            console.warn(`[Resilient AI Engine] Model ${modelId} execution failed: ${err.message}. Retrying fallback...`);
            lastError = err;
        }
    }
    
    throw lastError || new Error("All loaded generative fallback models failed to complete content execution.");
};

module.exports = { getAIInstance, getModelName, getSystemSetting, safeGenerateContent };
