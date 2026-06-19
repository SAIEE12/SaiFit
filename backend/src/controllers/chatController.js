const db = require('../config/db');
const { safeGenerateContentStream } = require('../config/gemini');
const { getUserLifestyleContext } = require('../utils/lifestyleContext');

// Fetch recent chat history
exports.getChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { coach_type } = req.query;

        if (!coach_type) {
            return res.status(400).json({ error: 'coach_type is required' });
        }

        const result = await db.query(
            'SELECT role, message, created_at FROM ai_conversations WHERE user_id = ? AND coach_type = ? ORDER BY id ASC LIMIT 50',
            [userId, coach_type]
        );

        res.json(result.rows);
    } catch (e) {
        console.error('Failed to get chat history:', e);
        res.status(500).json({ error: 'Failed to retrieve chat history.' });
    }
};

// Send message and stream response (SSE)
exports.sendMessageStream = async (req, res) => {
    try {
        const userId = req.user.id;
        const { coach_type, message } = req.body;

        if (!coach_type || !message) {
            return res.status(400).json({ error: 'coach_type and message are required' });
        }

        // Save User Message to database
        await db.query(
            'INSERT INTO ai_conversations (user_id, coach_type, role, message) VALUES (?, ?, ?, ?)',
            [userId, coach_type, 'user', message]
        );

        // Fetch User Profile Context
        const profileRes = await db.query(
            'SELECT * FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        const profile = profileRes.rows[0] || {};
        const lifestyleContext = await getUserLifestyleContext(userId) || {};

        // Fetch past 10 messages for conversation context
        const historyRes = await db.query(
            'SELECT role, message FROM ai_conversations WHERE user_id = ? AND coach_type = ? ORDER BY id DESC LIMIT 10',
            [userId, coach_type]
        );
        // Reverse history to have chronological order
        const history = historyRes.rows.reverse();

        // Build Persona / System Prompt based on coach type
        let coachName = 'AI Coach';
        let coachPersona = 'You are a supportive, knowledgeable personal trainer and health assistant.';
        
        if (coach_type === 'hydration_coach') {
            coachName = 'AI Hydration Coach';
            coachPersona = `You are the expert AI Hydration Coach for SaiFit. Your goal is to guide the user to optimize their hydration levels, schedule hourly intake, and recover properly.
User context:
- Weight: ${profile.weight || 70} kg
- Target Weight: ${profile.target_weight || 70} kg
- Fitness Goal: ${profile.fitness_goal || 'General Fitness'}
- Dietary Philosophy: ${lifestyleContext.dietaryPhilosophy || 'None'}
- Special Dietary Notes: ${lifestyleContext.dietaryNotes || 'None'}
- Active Paths: ${lifestyleContext.tracks || 'Gym Training'}`;
        } else if (coach_type === 'sleep_advisor') {
            coachName = 'AI Sleep & Recovery Advisor';
            coachPersona = `You are the expert AI Sleep & Recovery Advisor for SaiFit. Focus on rest hygiene, muscle recovery, circadian rhythm, fatigue management, and overall wellness.
User context:
- Age: ${profile.age || 25} years
- Weight: ${profile.weight || 70} kg
- Activity Level: ${profile.activity_level || 'Active'}
- Fitness Goal: ${profile.fitness_goal || 'General Fitness'}
- Active Paths: ${lifestyleContext.tracks || 'Gym Training'}`;
        } else if (coach_type === 'workout_coach') {
            coachName = 'AI Workout Coach';
            coachPersona = `You are the expert AI Workout Coach for SaiFit. Design exercise plans, explain proper form, suggest alternatives, adjust sets/reps, and keep the user motivated.
User context:
- Fitness Goal: ${profile.fitness_goal || 'General Fitness'}
- Activity Level: ${profile.activity_level || 'Active'}
- Weight: ${profile.weight || 70} kg
- Height: ${profile.height || 170} cm
- Active Paths: ${lifestyleContext.tracks || 'Gym Training'}`;
        } else if (coach_type === 'progression_coach') {
            coachName = 'AI Progression Coach';
            coachPersona = `You are the expert AI Progression Coach for SaiFit. Guide the user regarding their weight targets, timeline projection, strengths, areas of growth, and fitness index.
User context:
- Weight: ${profile.weight || 70} kg
- Target Weight: ${profile.target_weight || 70} kg
- Height: ${profile.height || 170} cm
- Age: ${profile.age || 25} years
- Fitness Goal: ${profile.fitness_goal || 'General Fitness'}`;
        }

        // Build Gemini prompt with system persona, history, and current message
        let prompt = `${coachPersona}

Guidelines:
- Keep your answers concise, clear, and actionable.
- Focus on practical, evidence-based fitness and health advice.
- Adopt a supportive, motivating, yet professional tone.

Conversation History:\n`;

        // Format history
        history.forEach(msg => {
            const speaker = msg.role === 'user' ? 'User' : coachName;
            prompt += `${speaker}: ${msg.message}\n`;
        });

        // Add final prompt instruction
        prompt += `${coachName} response (stream):`;

        // Set Headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let fullAssistantMessage = '';

        try {
            const stream = await safeGenerateContentStream(prompt);
            for await (const chunk of stream) {
                const chunkText = chunk.text();
                fullAssistantMessage += chunkText;
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }

            // Save complete Assistant response to database
            await db.query(
                'INSERT INTO ai_conversations (user_id, coach_type, role, message) VALUES (?, ?, ?, ?)',
                [userId, coach_type, 'assistant', fullAssistantMessage]
            );

            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        } catch (streamError) {
            console.error('Gemini streaming error:', streamError);
            res.write(`data: ${JSON.stringify({ error: 'Failed to generate response stream' })}\n\n`);
            res.end();
        }

    } catch (e) {
        console.error('Failed to process send message stream:', e);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Clear chat history
exports.clearChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { coach_type } = req.body;

        if (!coach_type) {
            return res.status(400).json({ error: 'coach_type is required' });
        }

        await db.query(
            'DELETE FROM ai_conversations WHERE user_id = ? AND coach_type = ?',
            [userId, coach_type]
        );

        res.json({ message: 'Conversation history cleared successfully.' });
    } catch (e) {
        console.error('Failed to clear chat history:', e);
        res.status(500).json({ error: 'Failed to clear chat history.' });
    }
};
