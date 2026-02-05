const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for images

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'FaceApp backend is running',
        geminiConfigured: !!process.env.GEMINI_API_KEY
    });
});

// Single photo analysis endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                error: 'Gemini API key not configured',
                message: 'Please set GEMINI_API_KEY in .env file'
            });
        }

        // Remove data URL prefix if present
        const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

        // Get Gemini model (use gemini-2.5-flash for multimodal analysis)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Craft the prompt
        const prompt = `Analyze this person's facial attractiveness objectively and professionally based on:
1. Facial symmetry (balance between left and right sides)
2. Proportions (golden ratio, facial thirds)
3. Skin clarity and complexion
4. Feature harmony (how well features complement each other)
5. Overall aesthetic appeal

Provide a realistic score from 0-100. Use the full range:
- 0-30: Below average
- 31-50: Average
- 51-70: Above average
- 71-85: Very attractive
- 86-100: Exceptionally attractive

Be honest and use the full spectrum. Most people should score between 40-70.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "score": <number between 0-100>,
  "explanation": "<2-3 sentence explanation of the score>",
  "strengths": ["<strength1>", "<strength2>"],
  "areas": ["<area1>", "<area2>"]
}`;

        // Call Gemini API
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Parse JSON response
        let analysis;
        try {
            // Remove markdown code blocks if present
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analysis = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', text);
            return res.status(500).json({
                error: 'Failed to parse AI response',
                rawResponse: text
            });
        }

        // Validate score
        if (typeof analysis.score !== 'number' || analysis.score < 0 || analysis.score > 100) {
            analysis.score = Math.max(0, Math.min(100, Math.round(analysis.score || 50)));
        }

        res.json(analysis);

    } catch (error) {
        console.error('Error analyzing image:', error);
        res.status(500).json({
            error: 'Failed to analyze image',
            message: error.message
        });
    }
});

// Comparison endpoint
app.post('/api/compare', async (req, res) => {
    try {
        const { image1, image2, name1, name2 } = req.body;

        if (!image1 || !image2) {
            return res.status(400).json({ error: 'Two images required' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({
                error: 'Gemini API key not configured'
            });
        }

        // Remove data URL prefixes
        const base64Image1 = image1.replace(/^data:image\/\w+;base64,/, '');
        const base64Image2 = image2.replace(/^data:image\/\w+;base64,/, '');

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Compare these two people's facial attractiveness objectively.

Person 1: ${name1 || 'First person'}
Person 2: ${name2 || 'Second person'}

For each person, analyze:
- Facial symmetry
- Proportions and golden ratio
- Feature quality
- Overall aesthetic appeal

Provide realistic scores (0-100) using the full range. Most people score 40-70.

Respond ONLY with valid JSON (no markdown):
{
  "person1": {
    "score": <number>,
    "analysis": "<brief analysis>"
  },
  "person2": {
    "score": <number>,
    "analysis": "<brief analysis>"
  },
  "comparison": "<1-2 sentences comparing them>",
  "winner": <1 or 2, or 0 for tie>
}`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image1
                }
            },
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image2
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        let comparison;
        try {
            const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            comparison = JSON.parse(cleanText);
        } catch (parseError) {
            console.error('Failed to parse comparison response:', text);
            return res.status(500).json({
                error: 'Failed to parse AI response',
                rawResponse: text
            });
        }

        // Validate scores
        comparison.person1.score = Math.max(0, Math.min(100, Math.round(comparison.person1.score || 50)));
        comparison.person2.score = Math.max(0, Math.min(100, Math.round(comparison.person2.score || 50)));

        res.json(comparison);

    } catch (error) {
        console.error('Error comparing images:', error);
        res.status(500).json({
            error: 'Failed to compare images',
            message: error.message
        });
    }
});

// Start server only if not running in Vercel (serverless)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 FaceApp backend running on http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🔑 Gemini API configured: ${!!process.env.GEMINI_API_KEY}`);
    });
}

// Export the Express API for Vercel serverless
module.exports = app;
