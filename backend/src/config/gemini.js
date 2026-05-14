const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

// Initialize the Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = ai;
