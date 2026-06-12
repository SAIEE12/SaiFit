const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

/**
 * Gets the AI instance using the GEMINI_API_KEY from environment variables
 */
const getAIInstance = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('GEMINI_API_KEY not found in environment variables.');
    }
    return new GoogleGenerativeAI(apiKey || '');
};

/**
 * Helper to get the configured model name and sanitize it using GEMINI_MODEL_NAME from env
 */
const getModelName = async () => {
    const rawModel = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
    
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

module.exports = { getAIInstance, getModelName, safeGenerateContent };
