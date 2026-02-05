// ===========================
// STATE MANAGEMENT
// ===========================
const state = {
    currentScreen: 'consent-screen',
    uploadedImage: null,
    currentScore: 0,
    currentName: '',
    scores: [],
    initialized: false,
    modelsLoaded: false,
    faceApiReady: false,
    compareMode: false,
    compareImages: [null, null],
    compareScores: [0, 0],
    compareNames: ['', ''],
    useGemini: true, // Use Gemini by default, fallback to face-api.js
    geminiBackendUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://facesmash-murex.vercel.app',
    currentExplanation: '',
    currentStrengths: [],
    currentAreas: [],
    compareQualities: [{ strengths: [], areas: [] }, { strengths: [], areas: [] }],
    comparisonSummary: ''
};

// ===========================
// INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadScoresFromStorage();
    attachEventListeners();
    loadFaceApiModels();
});

function initializeApp() {
    // Add SVG gradient for score ring
    const svg = document.querySelector('.score-ring');
    if (svg) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'scoreGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('style', 'stop-color:#667eea;stop-opacity:1');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('style', 'stop-color:#764ba2;stop-opacity:1');

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);
    }

    state.initialized = true;
}

// ===========================
// FACE-API.JS MODEL LOADING
// ===========================
async function loadFaceApiModels() {
    try {
        console.log('Loading face-api.js models...');
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

        // Load required models
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        state.modelsLoaded = true;
        state.faceApiReady = true;
        console.log('✅ Face-api.js models loaded successfully');
    } catch (error) {
        console.error('❌ Error loading face-api.js models:', error);
        state.faceApiReady = false;
        // Fallback to basic algorithm if models fail to load
    }
}

// ===========================
// EVENT LISTENERS
// ===========================
function attachEventListeners() {
    // Consent screen
    document.getElementById('consent-btn').addEventListener('click', () => {
        navigateToScreen('upload-screen');
    });

    document.getElementById('decline-btn').addEventListener('click', () => {
        alert('Thank you for your honesty! Redirecting to homepage...');
        // In production, redirect to actual homepage
        window.location.reload();
    });

    // Upload screen
    document.getElementById('back-to-consent').addEventListener('click', () => {
        navigateToScreen('consent-screen');
        resetUpload();
    });

    document.getElementById('browse-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', handleFileSelect);

    document.getElementById('remove-image').addEventListener('click', resetUpload);

    document.getElementById('analyze-btn').addEventListener('click', analyzeImage);

    // Drag and drop
    const uploadZone = document.getElementById('upload-zone');
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);

    // Results screen
    document.getElementById('try-again-btn').addEventListener('click', () => {
        navigateToScreen('upload-screen');
        resetUpload();
    });

    document.getElementById('view-leaderboard-btn').addEventListener('click', () => {
        showLeaderboard();
    });

    // Leaderboard screen
    document.getElementById('close-leaderboard').addEventListener('click', () => {
        navigateToScreen('results-screen');
    });

    // Mode selector
    document.getElementById('single-mode-btn').addEventListener('click', () => {
        switchToSingleMode();
    });

    document.getElementById('compare-mode-btn').addEventListener('click', () => {
        switchToCompareMode();
    });

    // Comparison mode uploads
    document.getElementById('browse-btn-1').addEventListener('click', () => {
        document.getElementById('file-input-1').click();
    });

    document.getElementById('browse-btn-2').addEventListener('click', () => {
        document.getElementById('file-input-2').click();
    });

    document.getElementById('file-input-1').addEventListener('change', (e) => handleCompareFileSelect(e, 0));
    document.getElementById('file-input-2').addEventListener('change', (e) => handleCompareFileSelect(e, 1));

    document.getElementById('remove-image-1').addEventListener('click', () => removeCompareImage(0));
    document.getElementById('remove-image-2').addEventListener('click', () => removeCompareImage(1));

    document.getElementById('analyze-compare-btn').addEventListener('click', analyzeComparison);

    // Comparison results
    document.getElementById('compare-again-btn').addEventListener('click', () => {
        navigateToScreen('upload-screen');
        resetCompareUpload();
    });

    document.getElementById('view-leaderboard-compare-btn').addEventListener('click', () => {
        showLeaderboard();
    });
}

// ===========================
// NAVIGATION
// ===========================
function navigateToScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        setTimeout(() => {
            targetScreen.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    }

    state.currentScreen = screenId;
}

// ===========================
// FILE UPLOAD HANDLING
// ===========================
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImageFile(file);
    } else {
        alert('Please upload a valid image file (JPG or PNG)');
    }
}

function processImageFile(file) {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        alert('Please upload a JPG or PNG image');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        state.uploadedImage = e.target.result;
        showImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
}

function showImagePreview(imageSrc) {
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const placeholder = document.querySelector('.upload-placeholder');
    const analyzeBtn = document.getElementById('analyze-btn');

    previewImg.src = imageSrc;
    placeholder.style.display = 'none';
    preview.classList.remove('hidden');
    analyzeBtn.classList.remove('hidden');
}

function resetUpload() {
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const placeholder = document.querySelector('.upload-placeholder');
    const analyzeBtn = document.getElementById('analyze-btn');
    const fileInput = document.getElementById('file-input');

    state.uploadedImage = null;
    previewImg.src = '';
    fileInput.value = '';
    preview.classList.add('hidden');
    placeholder.style.display = 'block';
    analyzeBtn.classList.add('hidden');
}

// ===========================
// IMAGE ANALYSIS & SCORING
// ===========================
async function analyzeImage() {
    if (!state.uploadedImage) return;

    // Show loading screen
    navigateToScreen('loading-screen');

    // Try Gemini first if enabled
    let score = null;
    let explanation = '';

    if (state.useGemini) {
        try {
            const geminiResult = await callGeminiAPI(state.uploadedImage);
            if (geminiResult && geminiResult.score) {
                score = geminiResult.score;
                explanation = geminiResult.explanation || '';
                state.currentExplanation = explanation;
                state.currentStrengths = geminiResult.strengths || [];
                state.currentAreas = geminiResult.areas || [];
                console.log('✅ Gemini analysis successful:', score);
            }
        } catch (error) {
            console.warn('⚠️ Gemini API failed, falling back to face-api.js:', error.message);
        }
    }

    // Fallback to face-api.js if Gemini failed or disabled
    if (score === null) {
        // Wait for models to load if not ready
        if (!state.modelsLoaded) {
            console.log('Waiting for AI models to load...');
            const maxWait = 15000;
            const startTime = Date.now();
            while (!state.modelsLoaded && (Date.now() - startTime) < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Simulate processing time for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));

        score = await calculateAttractivenessScore(state.uploadedImage);
        state.currentExplanation = 'Analysis based on facial landmarks and proportions.';
        state.currentStrengths = ['Clear detection', 'Facial symmetry analysis'];
        state.currentAreas = ['Multimodal AI analysis unavailable'];
    }

    // Check if analysis failed (no face detected)
    if (score === null) {
        return; // Already navigated back to upload screen
    }

    state.currentScore = score;

    // Save score
    saveScore(score);

    // Show results
    displayResults(score);
    navigateToScreen('results-screen');
}

async function calculateAttractivenessScore(imageSrc) {
    // Use AI if models are loaded, otherwise fallback to basic algorithm
    if (state.faceApiReady) {
        return await calculateAIScore(imageSrc);
    } else {
        console.warn('AI models not loaded, using basic algorithm');
        return await calculateBasicScore(imageSrc);
    }
}

// ===========================
// AI-POWERED SCORING (face-api.js)
// ===========================
async function calculateAIScore(imageSrc) {
    try {
        // Load image
        const img = await loadImage(imageSrc);

        // Detect face with landmarks
        const detections = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();

        // No face detected
        if (!detections) {
            alert('❌ No face detected in the image. Please upload a clear photo of your face.');
            navigateToScreen('upload-screen');
            return null;
        }

        const landmarks = detections.landmarks;
        const confidence = detections.detection.score;

        console.log('✅ Face detected with confidence:', confidence);
        console.log('📍 Landmarks detected:', landmarks.positions.length);

        // Calculate AI-based score
        let score = 0;

        // 1. Face Detection Success (20 points for finding a face)
        score += 20;

        // 2. Detection Confidence (15 points based on how confident the AI is)
        const confidenceScore = Math.min(15, confidence * 15);
        score += confidenceScore;

        // 3. Facial Symmetry Analysis (20 points)
        const symmetryScore = calculateFacialSymmetry(landmarks);
        score += symmetryScore;

        // 4. Golden Ratio Proportions (20 points)
        const proportionScore = calculateGoldenRatioScore(landmarks);
        score += proportionScore;

        // 5. Image Quality from brightness & clarity (10 points)
        const qualityScore = await calculateImageQuality(img);
        score += qualityScore;

        // Ensure bounds (total max: 85 points + base calculation)
        score = Math.max(0, Math.min(100, Math.round(score)));

        console.log('🎯 Final AI Score:', score);
        return score;

    } catch (error) {
        console.error('Error in AI scoring:', error);
        // Fallback to basic algorithm
        return await calculateBasicScore(imageSrc);
    }
}

function calculateFacialSymmetry(landmarks) {
    const points = landmarks.positions;

    // Get key facial points
    const leftEye = points.slice(36, 42);    // Left eye points
    const rightEye = points.slice(42, 48);   // Right eye points
    const leftEyebrow = points.slice(17, 22); // Left eyebrow
    const rightEyebrow = points.slice(22, 27); // Right eyebrow
    const nose = points.slice(27, 36);       // Nose
    const mouth = points.slice(48, 68);      // Mouth

    // Calculate center of face (nose tip)
    const noseTip = points[30];
    const faceCenter = noseTip.x;

    // Calculate symmetry by comparing left and right distances from center
    let symmetryScore = 20; // Start at max

    // Eye symmetry
    const leftEyeCenter = getCenter(leftEye);
    const rightEyeCenter = getCenter(rightEye);
    const leftEyeDist = Math.abs(leftEyeCenter.x - faceCenter);
    const rightEyeDist = Math.abs(rightEyeCenter.x - faceCenter);
    const eyeSymmetry = 1 - Math.abs(leftEyeDist - rightEyeDist) / faceCenter;
    symmetryScore *= eyeSymmetry;

    // Eyebrow symmetry
    const leftBrowCenter = getCenter(leftEyebrow);
    const rightBrowCenter = getCenter(rightEyebrow);
    const leftBrowDist = Math.abs(leftBrowCenter.x - faceCenter);
    const rightBrowDist = Math.abs(rightBrowCenter.x - faceCenter);
    const browSymmetry = 1 - Math.abs(leftBrowDist - rightBrowDist) / faceCenter;
    symmetryScore *= browSymmetry;

    return Math.max(0, Math.min(20, symmetryScore));
}

function calculateGoldenRatioScore(landmarks) {
    const points = landmarks.positions;

    let score = 0;

    // Get key measurements
    const leftEye = getCenter(points.slice(36, 42));
    const rightEye = getCenter(points.slice(42, 48));
    const eyeDistance = distance(leftEye, rightEye);

    const jawLeft = points[0];
    const jawRight = points[16];
    const faceWidth = distance(jawLeft, jawRight);

    const chinBottom = points[8];
    const foreheadTop = points[27]; // Approximation
    const faceHeight = distance(chinBottom, foreheadTop);

    const noseTip = points[30];
    const noseBase = points[33];
    const noseHeight = distance(noseTip, noseBase);

    const mouthLeft = points[48];
    const mouthRight = points[54];
    const mouthWidth = distance(mouthLeft, mouthRight);

    // Golden ratio checks (1.618)
    // 1. Eye spacing to face width (ideal ≈ 0.46)
    const eyeToFaceRatio = eyeDistance / faceWidth;
    if (eyeToFaceRatio > 0.40 && eyeToFaceRatio < 0.52) {
        score += 7;
    } else {
        score += Math.max(0, 7 - Math.abs(eyeToFaceRatio - 0.46) * 20);
    }

    // 2. Face aspect ratio (ideal ≈ 1.618 golden ratio)
    const faceAspectRatio = faceHeight / faceWidth;
    if (faceAspectRatio > 1.4 && faceAspectRatio < 1.8) {
        score += 7;
    } else {
        score += Math.max(0, 7 - Math.abs(faceAspectRatio - 1.618) * 5);
    }

    // 3. Nose to mouth ratio
    const noseToMouthRatio = noseHeight / mouthWidth;
    if (noseToMouthRatio > 0.5 && noseToMouthRatio < 1.0) {
        score += 6;
    } else {
        score += Math.max(0, 6 - Math.abs(noseToMouthRatio - 0.75) * 8);
    }

    return Math.max(0, Math.min(20, score));
}

async function calculateImageQuality(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Brightness check
    const brightness = calculateBrightness(data);
    const brightnessScore = Math.min(5, (brightness / 150) * 5);

    // Clarity check
    const variance = calculateColorVariance(data);
    const clarityScore = Math.min(5, (variance / 50) * 5);

    return brightnessScore + clarityScore;
}

// Helper functions for AI scoring
function getCenter(points) {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// ===========================
// BASIC SCORING (Fallback)
// ===========================
async function calculateBasicScore(imageSrc) {
    const img = await loadImage(imageSrc);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let score = 50;
    score += Math.min(15, (calculateBrightness(data) / 200) * 15);
    score += Math.min(15, (calculateColorVariance(data) / 50) * 15);
    score += calculateSymmetryScore(canvas, ctx);

    const aspectRatio = img.width / img.height;
    score += (aspectRatio > 0.6 && aspectRatio < 0.9) ? 5 : 2;

    return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateBrightness(data) {
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalBrightness += (r + g + b) / 3;
    }
    return totalBrightness / (data.length / 4);
}

function calculateColorVariance(data) {
    const mean = calculateBrightness(data);
    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const pixelBrightness = (r + g + b) / 3;
        variance += Math.pow(pixelBrightness - mean, 2);
    }
    return Math.sqrt(variance / (data.length / 4));
}

function calculateSymmetryScore(canvas, ctx) {
    // Simple symmetry check: compare left and right halves
    const width = canvas.width;
    const height = canvas.height;
    const midpoint = Math.floor(width / 2);

    const leftHalf = ctx.getImageData(0, 0, midpoint, height);
    const rightHalf = ctx.getImageData(midpoint, 0, midpoint, height);

    let diff = 0;
    const sampleRate = 10; // Sample every 10th pixel for performance

    for (let i = 0; i < leftHalf.data.length; i += 4 * sampleRate) {
        const rDiff = Math.abs(leftHalf.data[i] - rightHalf.data[i]);
        const gDiff = Math.abs(leftHalf.data[i + 1] - rightHalf.data[i + 1]);
        const bDiff = Math.abs(leftHalf.data[i + 2] - rightHalf.data[i + 2]);
        diff += (rDiff + gDiff + bDiff) / 3;
    }

    const avgDiff = diff / (leftHalf.data.length / (4 * sampleRate));
    const symmetryScore = Math.max(0, 10 - (avgDiff / 10));

    return symmetryScore;
}

// ===========================
// RESULTS DISPLAY
// ===========================
function displayResults(score) {
    // Animate score counter
    animateScore(score);

    // Animate score ring
    animateScoreRing(score);

    // Calculate and display statistics
    const stats = calculateStatistics(score);

    document.getElementById('percentile-value').textContent = stats.percentile + '%';
    document.getElementById('rank-value').textContent = stats.rank + ' / ' + stats.total;
    document.getElementById('total-users-value').textContent = stats.total;

    // Display personalized message
    const message = generateResultMessage(score, stats.percentile);
    document.getElementById('result-text').textContent = message;

    // Display AI explanation and qualities
    if (state.currentExplanation) {
        document.getElementById('ai-explanation').classList.remove('hidden');
        document.getElementById('explanation-text').textContent = state.currentExplanation;

        // Display strengths
        const strengthsList = document.getElementById('strengths-list');
        strengthsList.innerHTML = '';
        state.currentStrengths.forEach(s => {
            const li = document.createElement('li');
            li.textContent = s;
            strengthsList.appendChild(li);
        });

        // Display areas
        const areasList = document.getElementById('areas-list');
        areasList.innerHTML = '';
        state.currentAreas.forEach(a => {
            const li = document.createElement('li');
            li.textContent = a;
            areasList.appendChild(li);
        });
    } else {
        document.getElementById('ai-explanation').classList.add('hidden');
    }
}

function animateScore(targetScore) {
    const scoreElement = document.getElementById('score-value');
    const duration = 2000; // 2 seconds
    const frameRate = 60;
    const totalFrames = (duration / 1000) * frameRate;
    const increment = targetScore / totalFrames;

    let currentScore = 0;
    let frame = 0;

    const animation = setInterval(() => {
        frame++;
        currentScore += increment;

        if (frame >= totalFrames) {
            currentScore = targetScore;
            clearInterval(animation);
        }

        scoreElement.textContent = Math.round(currentScore);
    }, 1000 / frameRate);
}

function animateScoreRing(score) {
    const ring = document.getElementById('score-ring-fill');
    const circumference = 2 * Math.PI * 85; // radius = 85
    const offset = circumference - (score / 100) * circumference;

    // Animate from full offset to calculated offset
    setTimeout(() => {
        ring.style.strokeDashoffset = offset;
    }, 100);
}

function calculateStatistics(score) {
    const scores = state.scores;
    const total = scores.length;

    // Calculate rank (how many scores are below this one)
    const scoresBelow = scores.filter(s => s < score).length;
    const rank = total - scoresBelow;

    // Calculate percentile
    const percentile = total === 1 ? 100 : Math.round((scoresBelow / (total - 1)) * 100);

    return {
        rank,
        total,
        percentile,
        average: Math.round(scores.reduce((a, b) => a + b, 0) / total)
    };
}

function generateResultMessage(score, percentile) {
    if (percentile >= 95) {
        return "🌟 Outstanding! You're in the top 5% of all users!";
    } else if (percentile >= 80) {
        return "✨ Great score! You're doing better than most users!";
    } else if (percentile >= 60) {
        return "👍 Good job! You're above average!";
    } else if (percentile >= 40) {
        return "💫 Solid score! Right around the median!";
    } else if (percentile >= 20) {
        return "🎯 Everyone is beautiful in their own way!";
    } else {
        return "💖 Beauty is subjective - this is just one algorithm's opinion!";
    }
}

// ===========================
// DATA PERSISTENCE
// ===========================
function saveScore(score, customName = null) {
    const userName = customName || document.getElementById('user-name')?.value.trim() || 'Anonymous';
    state.currentName = userName;

    const scoreData = {
        score,
        name: userName,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString()
    };

    state.scores.push(score);

    // Get existing data
    let allScores = [];
    try {
        const stored = localStorage.getItem('faceapp_scores');
        if (stored) {
            allScores = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading scores:', e);
    }

    allScores.push(scoreData);

    // Save to localStorage
    try {
        localStorage.setItem('faceapp_scores', JSON.stringify(allScores));
    } catch (e) {
        console.error('Error saving score:', e);
    }
}

function loadScoresFromStorage() {
    try {
        const stored = localStorage.getItem('faceapp_scores');
        if (stored) {
            const allScores = JSON.parse(stored);
            state.scores = allScores.map(s => s.score);
        }
    } catch (e) {
        console.error('Error loading scores:', e);
        state.scores = [];
    }
}

// ===========================
// LEADERBOARD
// ===========================
function showLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    try {
        const stored = localStorage.getItem('faceapp_scores');
        if (!stored) {
            list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No scores yet. Be the first!</p>';
            navigateToScreen('leaderboard-screen');
            return;
        }

        const allScores = JSON.parse(stored);

        // Sort by score descending
        allScores.sort((a, b) => b.score - a.score);

        // Display top 20
        const topScores = allScores.slice(0, 20);

        topScores.forEach((scoreData, index) => {
            const rank = index + 1;
            const item = createLeaderboardItem(rank, scoreData);
            list.appendChild(item);
        });

    } catch (e) {
        console.error('Error loading leaderboard:', e);
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Error loading leaderboard</p>';
    }

    navigateToScreen('leaderboard-screen');
}

function createLeaderboardItem(rank, scoreData) {
    const item = document.createElement('div');
    item.className = 'leaderboard-item';

    const rankClass = rank <= 3 ? `top-${rank}` : '';
    const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    const displayName = scoreData.name || 'Anonymous';

    item.innerHTML = `
        <div class="leaderboard-rank ${rankClass}">${rankMedal || rank}</div>
        <div class="leaderboard-info">
            <div class="leaderboard-name">${displayName}</div>
            <div class="leaderboard-score">${scoreData.score} / 100</div>
            <div class="leaderboard-date">${scoreData.date || 'Unknown date'}</div>
        </div>
    `;

    return item;
}

// ===========================
// UTILITY FUNCTIONS
// ===========================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export for debugging (optional)
if (typeof window !== 'undefined') {
    window.FaceAppDebug = {
        state,
        clearScores: () => {
            localStorage.removeItem('faceapp_scores');
            state.scores = [];
            console.log('Scores cleared');
        },
        getScores: () => {
            return JSON.parse(localStorage.getItem('faceapp_scores') || '[]');
        }
    };
}
// ===========================
// MODE SWITCHING
// ===========================
function switchToSingleMode() {
    state.compareMode = false;
    document.getElementById('single-mode-btn').classList.add('active');
    document.getElementById('compare-mode-btn').classList.remove('active');
    document.getElementById('single-upload-container').classList.remove('hidden');
    document.getElementById('compare-upload-container').classList.add('hidden');
}

function switchToCompareMode() {
    state.compareMode = true;
    document.getElementById('single-mode-btn').classList.remove('active');
    document.getElementById('compare-mode-btn').classList.add('active');
    document.getElementById('single-upload-container').classList.add('hidden');
    document.getElementById('compare-upload-container').classList.remove('hidden');
}

// ===========================
// COMPARISON FILE HANDLING
// ===========================
function handleCompareFileSelect(e, index) {
    const file = e.target.files[0];
    if (file) {
        processCompareImageFile(file, index);
    }
}

function processCompareImageFile(file, index) {
    // Validate file
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        alert('Please upload a JPG or PNG image');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        state.compareImages[index] = e.target.result;
        showCompareImagePreview(e.target.result, index);
        checkCompareButtonState();
    };
    reader.readAsDataURL(file);
}

function showCompareImagePreview(imageSrc, index) {
    const preview = document.getElementById(`image-preview-${index + 1}`);
    const previewImg = document.getElementById(`preview-img-${index + 1}`);
    const placeholder = preview.previousElementSibling;

    previewImg.src = imageSrc;
    placeholder.style.display = 'none';
    preview.classList.remove('hidden');
}

function removeCompareImage(index) {
    state.compareImages[index] = null;
    const preview = document.getElementById(`image-preview-${index + 1}`);
    const previewImg = document.getElementById(`preview-img-${index + 1}`);
    const placeholder = preview.previousElementSibling;
    const fileInput = document.getElementById(`file-input-${index + 1}`);

    previewImg.src = '';
    fileInput.value = '';
    preview.classList.add('hidden');
    placeholder.style.display = 'flex';
    checkCompareButtonState();
}

function checkCompareButtonState() {
    const analyzeBtn = document.getElementById('analyze-compare-btn');
    if (state.compareImages[0] && state.compareImages[1]) {
        analyzeBtn.classList.remove('hidden');
    } else {
        analyzeBtn.classList.add('hidden');
    }
}

function resetCompareUpload() {
    removeCompareImage(0);
    removeCompareImage(1);
    document.getElementById('name-1').value = '';
    document.getElementById('name-2').value = '';
    state.compareScores = [0, 0];
    state.compareNames = ['', ''];
}

// ===========================
// COMPARISON ANALYSIS
// ===========================
async function analyzeComparison() {
    if (!state.compareImages[0] || !state.compareImages[1]) return;

    // Show loading screen
    navigateToScreen('loading-screen');

    state.compareNames = [
        document.getElementById('name-1').value.trim() || 'Person 1',
        document.getElementById('name-2').value.trim() || 'Person 2'
    ];

    let score1 = null;
    let score2 = null;

    // Try Gemini comparison first if enabled
    if (state.useGemini) {
        try {
            const geminiResult = await callGeminiCompareAPI(
                state.compareImages[0],
                state.compareImages[1],
                state.compareNames[0],
                state.compareNames[1]
            );

            if (geminiResult && geminiResult.person1 && geminiResult.person2) {
                score1 = geminiResult.person1.score;
                score2 = geminiResult.person2.score;

                state.compareQualities = [
                    { strengths: geminiResult.person1.strengths || [], areas: geminiResult.person1.areas || [] },
                    { strengths: geminiResult.person2.strengths || [], areas: geminiResult.person2.areas || [] }
                ];
                state.comparisonSummary = geminiResult.comparison || '';

                console.log('✅ Gemini comparison successful:', score1, score2);
            }
        } catch (error) {
            console.warn('⚠️ Gemini comparison failed, falling back to face-api.js:', error.message);
        }
    }

    // Fallback to face-api.js if Gemini failed
    if (score1 === null || score2 === null) {
        // Wait for models if needed
        if (!state.modelsLoaded) {
            const maxWait = 15000;
            const startTime = Date.now();
            while (!state.modelsLoaded && (Date.now() - startTime) < maxWait) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Analyze both photos
        score1 = await calculateAttractivenessScore(state.compareImages[0]);
        score2 = await calculateAttractivenessScore(state.compareImages[1]);

        // Check for failures
        if (score1 === null || score2 === null) {
            return;
        }
    }

    state.compareScores = [score1, score2];

    // Save both scores
    saveScore(score1, state.compareNames[0]);
    saveScore(score2, state.compareNames[1]);

    // Show comparison results
    displayComparisonResults();
    navigateToScreen('comparison-results-screen');
}

function displayComparisonResults() {
    // Display images
    document.getElementById('comparison-img-1').src = state.compareImages[0];
    document.getElementById('comparison-img-2').src = state.compareImages[1];

    // Display names
    document.getElementById('comparison-name-1').textContent = state.compareNames[0];
    document.getElementById('comparison-name-2').textContent = state.compareNames[1];

    // Display scores
    document.getElementById('comparison-score-1').textContent = state.compareScores[0];
    document.getElementById('comparison-score-2').textContent = state.compareScores[1];

    // Calculate and display ranks
    const stats1 = calculateStatistics(state.compareScores[0]);
    const stats2 = calculateStatistics(state.compareScores[1]);

    document.getElementById('comparison-rank-1').textContent = `Rank ${stats1.rank} / ${stats1.total} • ${stats1.percentile}th percentile`;
    document.getElementById('comparison-rank-2').textContent = `Rank ${stats2.rank} / ${stats2.total} • ${stats2.percentile}th percentile`;

    // Show winner badge
    const winnerBadge = document.getElementById('winner-badge');
    if (state.compareScores[0] > state.compareScores[1]) {
        winnerBadge.textContent = '🏆';
        winnerBadge.title = `${state.compareNames[0]} wins!`;
    } else if (state.compareScores[1] > state.compareScores[0]) {
        winnerBadge.textContent = '🏆';
        winnerBadge.title = `${state.compareNames[1]} wins!`;
    } else {
        winnerBadge.textContent = '🤝';
        winnerBadge.title = 'It\'s a tie!';
    }

    // Display comparison summary and qualities
    if (state.comparisonSummary) {
        document.getElementById('comparison-explanation').classList.remove('hidden');
        document.getElementById('comparison-summary-text').textContent = state.comparisonSummary;

        // Update names in qualities grid
        document.getElementById('qualities-name-1').textContent = `${state.compareNames[0]}'s Qualities`;
        document.getElementById('qualities-name-2').textContent = `${state.compareNames[1]}'s Qualities`;

        // Populate lists
        const populateList = (id, items) => {
            const list = document.getElementById(id);
            list.innerHTML = '';
            items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = item;
                list.appendChild(li);
            });
        };

        populateList('compare-strengths-1', state.compareQualities[0].strengths);
        populateList('compare-areas-1', state.compareQualities[0].areas);
        populateList('compare-strengths-2', state.compareQualities[1].strengths);
        populateList('compare-areas-2', state.compareQualities[1].areas);
    } else {
        document.getElementById('comparison-explanation').classList.add('hidden');
    }
}
// ===========================
// GEMINI API INTEGRATION
// ===========================
async function callGeminiAPI(imageData) {
    try {
        const response = await fetch(`${state.geminiBackendUrl}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API request failed');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

async function callGeminiCompareAPI(image1, image2, name1, name2) {
    try {
        const response = await fetch(`${state.geminiBackendUrl}/api/compare`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image1,
                image2,
                name1: name1 || 'Person 1',
                name2: name2 || 'Person 2'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Comparison API request failed');
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Gemini Compare API error:', error);
        throw error;
    }
}
