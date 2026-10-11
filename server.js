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

// Serve static frontend files (index.html)
app.use(express.static(__dirname));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are Sahayak, an intelligent and helpful AI browser assistant. You can communicate fluently in English, Hindi, and Hinglish based on the user's preference or prompt language. Your goal is to help users summarize webpages, explain key takeaways, translate text, and answer browsing queries accurately and politely.`;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            systemInstruction: SYSTEM_INSTRUCTION
        });

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

        const result = await model.generateContent({ contents });
        const response = await result.response;
        const replyText = response.text() || "I'm sorry, I couldn't generate a response.";

        res.json({ reply: replyText });

    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to communicate with Gemini API.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sahayak backend running on port ${PORT}`);
});
