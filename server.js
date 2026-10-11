import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_INSTRUCTION = `You are Sahayak, an intelligent and helpful AI browser assistant. You can communicate fluently in English, Hindi, and Hinglish based on the user's preference or prompt language.`;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
        }

        // Automatic Fallback Models
        const candidateModels = ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest', 'gemini-1.5-flash', 'gemini-pro'];
        let replyText = null;
        let lastError = null;

        const contents = [];
        if (history && Array.isArray(history)) {
            for (const h of history) {
                contents.push({
                    role: h.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: h.text }]
                });
            }
        }
        contents.push({ role: 'user', parts: [{ text: message }] });

        for (const modelName of candidateModels) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: SYSTEM_INSTRUCTION
                });
                const result = await model.generateContent({ contents });
                const response = await result.response;
                replyText = response.text();
                if (replyText) break;
            } catch (err) {
                console.warn(`Model ${modelName} failed, trying next...`, err.message);
                lastError = err;
            }
        }

        if (replyText) {
            return res.json({ reply: replyText });
        } else {
            throw lastError || new Error('All model fallbacks failed.');
        }

    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to communicate with Gemini API: ' + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sahayak backend running on port ${PORT}`);
});
                
