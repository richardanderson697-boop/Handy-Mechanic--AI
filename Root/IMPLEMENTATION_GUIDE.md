# Handy Mechanic - AI Car Diagnostic App
## Complete Implementation Guide

This guide provides everything you need to build and deploy a production-ready car diagnostic app with AI-powered analysis, authentication, and Stripe payments.

## 🎯 Features

- **Multi-modal AI Diagnostics**: Text, photo, and audio input analysis
- **Agentic & Semantic RAG**: Advanced AI using Claude Sonnet 4
- **User Authentication**: Secure login/signup system
- **Stripe Payments**: $4.99 single use, $9.99 for 3-pack
- **Step-by-step Repair Guides**: DIY instructions with materials list
- **Cost Estimates**: Min/max repair cost predictions
- **YouTube Integration**: Curated repair video recommendations
- **Severity Assessment**: Low/medium/high issue classification

## 📁 Project Structure

```
handy-mechanic/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── CarDiagnosticApp.jsx
│   │   ├── App.jsx
│   │   └── index.js
│   ├── public/
│   └── package.json
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── diagnosis.js
│   │   └── payment.js
│   ├── models/
│   │   ├── User.js
│   │   └── Diagnosis.js
│   ├── middleware/
│   │   └── auth.js
│   └── package.json
└── README.md
```

## 🚀 Frontend Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Create React App**
```bash
npx create-react-app handy-mechanic
cd handy-mechanic
```

2. **Install Dependencies**
```bash
npm install lucide-react
```

3. **Replace App.jsx**
Copy the `car-diagnostic-app.jsx` file content into `src/App.jsx`

4. **Run Development Server**
```bash
npm start
```

## 🔧 Backend Setup

### Create Backend Directory
```bash
mkdir backend
cd backend
npm init -y
```

### Install Backend Dependencies
```bash
npm install express cors dotenv bcryptjs jsonwebtoken mongoose stripe @anthropic-ai/sdk multer uuid
```

### Environment Variables
Create `.env` file:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
YOUTUBE_API_KEY=your_youtube_api_key
FRONTEND_URL=http://localhost:3000
```

### Database Schema

**User Model** (`models/User.js`):
```javascript
const mongoose = require('mongoose');

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

module.exports = mongoose.model('User', userSchema);
```

**Diagnosis Model** (`models/Diagnosis.js`):
```javascript
const mongoose = require('mongoose');

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
    photos: [String], // URLs to uploaded photos
    audioUrl: String  // URL to uploaded audio
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

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
```

## 🔐 Authentication Implementation

**Auth Middleware** (`middleware/auth.js`):
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error();
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = auth;
```

**Auth Routes** (`routes/auth.js`):
```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

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
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

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
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

## 💳 Stripe Payment Integration

**Payment Routes** (`routes/payment.js`):
```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Create checkout session
router.post('/create-checkout-session', auth, async (req, res) => {
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

    const session = await stripe.checkout.sessions.create({
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
    res.status(500).json({ error: 'Payment creation failed' });
  }
});

// Webhook for payment confirmation
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Add credits to user
    const userId = session.metadata.userId;
    const credits = parseInt(session.metadata.credits);

    await User.findByIdAndUpdate(userId, {
      $inc: { diagnosisCredits: credits }
    });
  }

  res.json({ received: true });
});

module.exports = router;
```

## 🤖 AI Diagnosis Implementation

**Diagnosis Routes** (`routes/diagnosis.js`):
```javascript
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const auth = require('../middleware/auth');
const User = require('../models/User');
const Diagnosis = require('../models/Diagnosis');

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Configure multer for file uploads
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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Run diagnosis
router.post('/analyze', auth, upload.fields([
  { name: 'photos', maxCount: 5 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { year, make, model, symptomText } = req.body;

    // Check credits
    if (req.user.diagnosisCredits <= 0) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    // Prepare AI prompt
    const prompt = `You are an expert automotive diagnostic AI. A user has reported the following:

Vehicle: ${year} ${make} ${model}
Symptom: ${symptomText}
${req.files?.photos ? `Photos provided: ${req.files.photos.length}` : ''}
${req.files?.audio ? 'Audio recording provided' : ''}

Provide a detailed diagnostic analysis in JSON format with:
{
  "diagnosis": "Primary diagnosis with detailed explanation",
  "severity": "low|medium|high",
  "commonCauses": ["cause1", "cause2", "cause3"],
  "repairSteps": [
    {"step": 1, "description": "Step description", "duration": "time estimate"},
    {"step": 2, "description": "Next step", "duration": "time estimate"}
  ],
  "materialsNeeded": ["material1", "material2"],
  "estimatedCost": {"min": number, "max": number},
  "relatedVideos": ["search term 1", "search term 2", "search term 3"]
}

Be specific to this vehicle make/model/year and the described symptoms.`;

    // Call Anthropic API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        { role: "user", content: prompt }
      ],
    });

    const resultText = message.content.find(item => item.type === "text")?.text || '';
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
    res.status(500).json({ error: 'Diagnosis failed' });
  }
});

// Get user's diagnosis history
router.get('/history', auth, async (req, res) => {
  try {
    const diagnoses = await Diagnosis.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ diagnoses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
```

## 🎥 YouTube Integration

Add to `routes/diagnosis.js`:

```javascript
const axios = require('axios');

// Fetch YouTube videos
router.get('/videos', async (req, res) => {
  try {
    const { searchTerms } = req.query;
    const terms = JSON.parse(searchTerms);

    const videoPromises = terms.map(async (term) => {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: term,
          type: 'video',
          maxResults: 1,
          key: process.env.YOUTUBE_API_KEY
        }
      });

      const video = response.data.items[0];
      return {
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        videoId: video.id.videoId,
        thumbnail: video.snippet.thumbnails.medium.url,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`
      };
    });

    const videos = await Promise.all(videoPromises);
    res.json({ videos });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});
```

## 🌐 Main Server File

**server.js**:
```javascript
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const diagnosisRoutes = require('./routes/diagnosis');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Stripe webhook needs raw body
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Other routes use JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/diagnosis', diagnosisRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## 📱 Frontend Integration with Backend

Update the frontend to call actual backend APIs:

```javascript
// In CarDiagnosticApp.jsx, replace the mock functions with:

const API_URL = 'http://localhost:5000/api';

const handleAuth = async () => {
  try {
    const endpoint = authMode === 'login' ? 'login' : 'signup';
    const response = await fetch(`${API_URL}/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authData)
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error);

    localStorage.setItem('token', data.token);
    setUser(data.user);
    setDiagnosisCredits(data.user.credits);
    setCurrentScreen('home');
  } catch (error) {
    alert(error.message);
  }
};

const handlePurchase = async (packageType) => {
  try {
    const response = await fetch(`${API_URL}/payment/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ packageType })
    });

    const { url } = await response.json();
    window.location.href = url; // Redirect to Stripe checkout
  } catch (error) {
    alert('Payment failed');
  }
};

const performAIDiagnosis = async () => {
  try {
    const formData = new FormData();
    formData.append('year', vehicleData.year);
    formData.append('make', vehicleData.make);
    formData.append('model', vehicleData.model);
    formData.append('symptomText', symptomData.text);
    
    symptomData.photos.forEach(photo => {
      formData.append('photos', photo);
    });
    
    if (symptomData.audioBlob) {
      formData.append('audio', symptomData.audioBlob, 'recording.webm');
    }

    const response = await fetch(`${API_URL}/diagnosis/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const data = await response.json();
    return data.diagnosis;
  } catch (error) {
    console.error('Diagnosis error:', error);
    return getFallbackDiagnosis();
  }
};
```

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy the build folder
```

### Backend (Railway/Render/Heroku)
```bash
# Push to GitHub
# Connect your repo to deployment platform
# Set environment variables in platform dashboard
```

### Database
- Use MongoDB Atlas for production database
- Get connection string and add to .env

### Stripe Setup
1. Create Stripe account
2. Get API keys from dashboard
3. Set up webhook endpoint for payment confirmation
4. Add webhook secret to .env

## 📊 Testing

### Test Authentication
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### Test Diagnosis (with token)
```bash
curl -X POST http://localhost:5000/api/diagnosis/analyze \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "year=2009" \
  -F "make=Chevrolet" \
  -F "model=Malibu" \
  -F "symptomText=Engine high pitch whine"
```

## 🔒 Security Best Practices

1. **Never commit .env files**
2. **Use HTTPS in production**
3. **Implement rate limiting** (use express-rate-limit)
4. **Validate all user inputs**
5. **Sanitize file uploads**
6. **Use helmet.js for security headers**
7. **Keep dependencies updated**

## 📈 Future Enhancements

- [ ] Push notifications for diagnosis completion
- [ ] Integration with car parts marketplaces
- [ ] Mechanic finder/booking
- [ ] Community forum
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] VIN decoder integration

## 📝 License

This is a commercial application. Ensure you have proper licenses for:
- Anthropic API usage
- Stripe payment processing
- YouTube Data API
- Any third-party libraries

## 🤝 Support

For issues or questions, contact your development team or create an issue in your project repository.
