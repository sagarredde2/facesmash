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
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

app.get('/api/health', (req, res) => {
    const key = process.env.GOOGLE_AI_API_KEY || '';
    // Security: Only show first 4 and last 4 chars to verify key loading
    const maskedKey = key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : 'Not Set';

    res.json({
        status: 'ok',
        message: 'FaceApp backend is running',
        geminiConfigured: !!key,
        keyDebug: {
            variable: 'GOOGLE_AI_API_KEY',
            masked: maskedKey,
            length: key.length,
            hasQuotes: key.startsWith('"') || key.startsWith("'"),
            hasWhitespace: key.trim() !== key,
            rawStart: key.substring(0, 2),
            rawEnd: key.substring(key.length - 2)
        }
    });
});

// Single photo analysis endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        if (!process.env.GOOGLE_AI_API_KEY) {
            return res.status(500).json({
                error: 'Gemini API key not configured',
                message: 'Please set GOOGLE_AI_API_KEY in Vercel settings'
            });
        }

        // Remove data URL prefix if present
        const base64Image = image.replace(/^data:image\/\w+;base64,/, '');

        // Get Gemini model (use gemini-2.5-flash for multimodal analysis)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Craft the prompt
        const prompt = `Analyze this person's facial attractiveness with extreme honesty and critical objectivity. 
Do not be overly polite or generic. Provide a genuine, high-fidelity assessment based on:
1. Facial symmetry (balance between left and right sides)
2. Proportions (golden ratio, facial thirds, bone structure)
3. Skin clarity, complexion, and grooming
4. Feature harmony (how well features complement each other)
5. Overall aesthetic appeal and physical impact

CRITICAL SCORING INSTRUCTIONS:
- Use the FULL range from 0 to 100. Do not cluster scores in the middle.
- 0-20: Exceptionally below average / Significant aesthetic issues
- 21-40: Below average
- 41-55: Average
- 56-75: Above average / Conventionally attractive
- 76-90: High model tier / Significantly attractive
- 91-100: Top 1% / Exceptional beauty

Be bold and critical. If a face has flaws, account for them. If it is stunning, reward it.
Most people should NOT be 70+. A score of 80 should be rare, and 90+ should be elite.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "score": <number between 0-100>,
  "explanation": "<2-3 sentence honest and specific explanation of the score>",
  "strengths": ["<specific_strength1>", "<specific_strength2>"],
  "areas": ["<specific_area1>", "<specific_area2>"]
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

        if (!process.env.GOOGLE_AI_API_KEY) {
            return res.status(500).json({
                error: 'Gemini API key not configured'
            });
        }

        // Remove data URL prefixes
        const base64Image1 = image1.replace(/^data:image\/\w+;base64,/, '');
        const base64Image2 = image2.replace(/^data:image\/\w+;base64,/, '');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Critically compare these two people's facial attractiveness with brutal honesty and objectivity.

Person 1: ${name1 || 'First person'}
Person 2: ${name2 || 'Second person'}

Analyze for each:
- Symmetry and bone structure
- Feature harmony and proportions
- Overall physical impact

SCORING RULES:
- Use the full 0-100 range.
- Do not default to high scores. 
- Be specific about why one is more attractive than the other.
- If there is a clear difference, reflect it in a significant score gap.

Respond ONLY with valid JSON (no markdown):
{
  "person1": {
    "score": <number>,
    "analysis": "<honest, critical analysis>"
  },
  "person2": {
    "score": <number>,
    "analysis": "<honest, critical analysis>"
  },
  "comparison": "<brutally honest comparison of the two>",
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
        console.log(`🔑 Gemini API configured: ${!!process.env.GOOGLE_AI_API_KEY}`);
    });
}

// Export the Express API for Vercel serverless
module.exports = app;
