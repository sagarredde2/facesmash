# FaceApp - AI Attractiveness Scoring

A modern web application that uses AI to analyze facial attractiveness with ethical considerations.

## Features

- ✨ **AI-Powered Analysis** - Google Gemini Vision API for sophisticated scoring
- 📊 **Detailed Insights** - Natural language explanations of scores
- 🆚 **Photo Comparison** - Compare two photos side-by-side
- 🏆 **Leaderboard** - Track and rank scores with names
- 🎨 **Premium UI** - Modern glassmorphism design
- 🔒 **Privacy-Focused** - Optional backend, data stays local

## Setup

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key (free tier available)
3. Copy the key

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file:

```env
GEMINI_API_KEY=your_api_key_here
PORT=3000
```

### 4. Start Backend Server

```bash
npm start
```

Server will run on `http://localhost:3000`

### 5. Open Frontend

Open `index.html` in your browser, or serve it:

```bash
# Using Python
python3 -m http.server 8000

# Using Node
npx http-server -p 8000
```

Then visit `http://localhost:8000`

## Usage

### Single Photo Mode
1. Click "I Understand and Consent"
2. Upload a photo
3. Optionally enter your name
4. Click "Analyze My Photo"
5. View score, explanation, and rank

### Comparison Mode
1. Click "Compare 2 Photos" button
2. Upload two photos with names
3. Click "Compare Photos"
4. See side-by-side results with winner

## API Endpoints

### Health Check
```bash
GET http://localhost:3000/api/health
```

### Analyze Single Photo
```bash
POST http://localhost:3000/api/analyze
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,..."
}
```

### Compare Two Photos
```bash
POST http://localhost:3000/api/compare
Content-Type: application/json

{
  "image1": "data:image/jpeg;base64,...",
  "image2": "data:image/jpeg;base64,...",
  "name1": "Person 1",
  "name2": "Person 2"
}
```

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **AI**: Google Gemini Vision API
- **Fallback**: face-api.js with TensorFlow.js

## Ethical Considerations

- Clear consent flow
- Emphasizes subjectivity of beauty
- No data stored on servers
- User controls their data
- Respectful scoring explanations

## License

MIT
