// server.js - Main Express server for Handy Mechanic backend
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Anthropic = require('@anthropic-ai/sdk');
const stripe = require('stripe');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();

// Initialize Stripe
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Anthropic
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Stripe webhook needs raw body
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Other routes use JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// ============================================
// DATABASE MODELS
// ============================================

// User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  diagnosisCredits: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// Diagnosis Schema
const diagnosisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    year: String,
    make: String,
    model: String
  },
  symptoms: {
    text: String,
    photos: [String],
    audioUrl: String
  },
  diagnosis: {
    primaryDiagnosis: String,
    severity: String,
    commonCauses: [String],
    repairSteps: [{
      step: Number,
      description: String,
      duration: String
    }],
    materialsNeeded: [String],
    estimatedCost: {
      min: Number,
      max: Number
    },
    relatedVideos: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Diagnosis = mongoose.model('Diagnosis', diagnosisSchema);

// ============================================
// MIDDLEWARE
// ============================================

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = './uploads';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept images and audio
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Register
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.diagnosisCredits
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        credits: user.diagnosisCredits
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user
app.get('/api/auth/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      credits: req.user.diagnosisCredits
    }
  });
});

// ============================================
// PAYMENT ROUTES
// ============================================

// Create checkout session
app.post('/api/payment/create-checkout-session', auth, async (req, res) => {
  try {
    const { packageType } = req.body;

    const packages = {
      single: {
        credits: 1,
        price: 4.99,
        name: 'Single Diagnosis'
      },
      triple: {
        credits: 3,
        price: 9.99,
        name: '3-Pack Diagnosis'
      }
    };

    const selectedPackage = packages[packageType];

    if (!selectedPackage) {
      return res.status(400).json({ error: 'Invalid package type' });
    }

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPackage.name,
              description: `${selectedPackage.credits} AI diagnostic analysis credits`
            },
            unit_amount: Math.round(selectedPackage.price * 100)
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId: req.user._id.toString(),
        credits: selectedPackage.credits.toString()
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

// Stripe webhook
app.post('/api/payment/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Add credits to user
    const userId = session.metadata.userId;
    const credits = parseInt(session.metadata.credits);

    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { diagnosisCredits: credits }
      });
      
      console.log(`Added ${credits} credits to user ${userId}`);
    } catch (error) {
      console.error('Error updating user credits:', error);
    }
  }

  res.json({ received: true });
});

// ============================================
// DIAGNOSIS ROUTES
// ============================================

// Run AI diagnosis
app.post('/api/diagnosis/analyze', auth, upload.fields([
  { name: 'photos', maxCount: 5 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { year, make, model, symptomText } = req.body;

    // Validate input
    if (!year || !make || !model || !symptomText) {
      return res.status(400).json({ error: 'All vehicle and symptom information required' });
    }

    // Check credits
    if (req.user.diagnosisCredits <= 0) {
      return res.status(402).json({ error: 'Insufficient credits. Please purchase more.' });
    }

    // Prepare AI prompt
    const prompt = `You are an expert automotive diagnostic AI. A user has reported the following:

Vehicle: ${year} ${make} ${model}
Symptom: ${symptomText}
${req.files?.photos ? `Photos provided: ${req.files.photos.length}` : ''}
${req.files?.audio ? 'Audio recording provided' : ''}

Provide a detailed diagnostic analysis in JSON format with:
{
  "diagnosis": "Primary diagnosis with detailed explanation of what's likely wrong and why",
  "severity": "low|medium|high",
  "commonCauses": ["cause1", "cause2", "cause3", "cause4"],
  "repairSteps": [
    {"step": 1, "description": "First step to diagnose or repair", "duration": "estimated time"},
    {"step": 2, "description": "Second step", "duration": "estimated time"},
    {"step": 3, "description": "Third step", "duration": "estimated time"}
  ],
  "materialsNeeded": ["tool or part 1", "tool or part 2", "tool or part 3"],
  "estimatedCost": {"min": minimum_cost_number, "max": maximum_cost_number},
  "relatedVideos": ["specific search term 1", "specific search term 2", "specific search term 3"]
}

Be specific to this ${year} ${make} ${model} and the described symptoms. Consider common issues for this specific vehicle model and year. Provide practical, actionable repair steps.`;

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        { role: "user", content: prompt }
      ],
    });

    const resultText = message.content.find(item => item.type === "text")?.text || '';
    
    // Extract JSON from response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    
    let diagnosisResult;
    if (jsonMatch) {
      diagnosisResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse AI response');
    }

    // Save diagnosis to database
    const diagnosis = new Diagnosis({
      userId: req.user._id,
      vehicle: { year, make, model },
      symptoms: {
        text: symptomText,
        photos: req.files?.photos?.map(f => f.path) || [],
        audioUrl: req.files?.audio?.[0]?.path || null
      },
      diagnosis: {
        primaryDiagnosis: diagnosisResult.diagnosis,
        severity: diagnosisResult.severity,
        commonCauses: diagnosisResult.commonCauses,
        repairSteps: diagnosisResult.repairSteps,
        materialsNeeded: diagnosisResult.materialsNeeded,
        estimatedCost: diagnosisResult.estimatedCost,
        relatedVideos: diagnosisResult.relatedVideos
      }
    });

    await diagnosis.save();

    // Deduct credit
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { diagnosisCredits: -1 }
    });

    res.json({
      diagnosis: diagnosisResult,
      diagnosisId: diagnosis._id,
      creditsRemaining: req.user.diagnosisCredits - 1
    });

  } catch (error) {
    console.error('Diagnosis error:', error);
    res.status(500).json({ 
      error: 'Diagnosis failed. Please try again.',
      details: error.message 
    });
  }
});

// Get user's diagnosis history
app.get('/api/diagnosis/history', auth, async (req, res) => {
  try {
    const diagnoses = await Diagnosis.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-symptoms.photos -symptoms.audioUrl'); // Don't send file paths

    res.json({ diagnoses });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get specific diagnosis by ID
app.get('/api/diagnosis/:id', auth, async (req, res) => {
  try {
    const diagnosis = await Diagnosis.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!diagnosis) {
      return res.status(404).json({ error: 'Diagnosis not found' });
    }

    res.json({ diagnosis });
  } catch (error) {
    console.error('Diagnosis fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch diagnosis' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ============================================
// DATABASE CONNECTION & SERVER START
// ============================================

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`🔑 API ready at http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

module.exports = app;
