# 🚗 Handy Mechanic - AI Car Diagnostic App

A full-stack AI-powered car diagnostic application that helps users identify vehicle issues through multi-modal input (text, photos, audio) and provides step-by-step DIY repair guides.

![App Preview](https://via.placeholder.com/800x400/0a0a0a/00d4aa?text=Handy+Mechanic+AI)

## ✨ Features

### 🤖 AI-Powered Diagnostics
- **Multi-modal Input**: Text descriptions, photos, and audio recordings
- **Agentic & Semantic RAG**: Advanced AI analysis using Claude Sonnet 4
- **Vehicle-Specific Analysis**: Tailored diagnostics for make, model, and year
- **Severity Assessment**: Low, medium, or high issue classification

### 🔧 Repair Guidance
- **Step-by-Step Instructions**: Clear DIY repair guides
- **Materials List**: Exactly what tools and parts you need
- **Cost Estimates**: Min/max repair cost predictions
- **Video Tutorials**: Curated YouTube repair videos

### 💳 Monetization
- **Stripe Integration**: Secure payment processing
- **Flexible Pricing**: $4.99 single use or $9.99 for 3-pack
- **Credit System**: Purchase and use diagnostic credits

### 🔐 User Management
- **Authentication**: Secure JWT-based auth system
- **User Accounts**: Track diagnosis history
- **Protected Routes**: Secure API endpoints

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB (local or Atlas)
- Anthropic API key
- Stripe account
- npm or yarn

### Installation

1. **Clone or download the project files**

2. **Set up the backend:**

```bash
# Create backend directory
mkdir backend
cd backend

# Copy backend-server.js to server.js
cp ../backend-server.js server.js

# Copy package.json
cp ../backend-package.json package.json

# Install dependencies
npm install

# Create .env file
cp ../.env.example .env

# Edit .env with your actual credentials
nano .env
```

3. **Set up the frontend:**

```bash
# Go back to root
cd ..

# Create React app
npx create-react-app frontend
cd frontend

# Install dependencies
npm install lucide-react

# Copy the app component
cp ../car-diagnostic-app.jsx src/App.jsx
```

4. **Start the development servers:**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

The app will be available at `http://localhost:3000`

## 🔑 Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/handy-mechanic
JWT_SECRET=your_super_secret_jwt_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=http://localhost:3000
```

### Getting API Keys

#### Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new key
5. Copy and add to `.env`

#### Stripe Keys
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign up or log in
3. Switch to "Test mode"
4. Go to Developers → API keys
5. Copy both publishable and secret keys
6. Set up webhook:
   - Go to Developers → Webhooks
   - Add endpoint: `http://localhost:5000/api/payment/webhook`
   - Select event: `checkout.session.completed`
   - Copy webhook secret

#### MongoDB
**Option 1: Local MongoDB**
```bash
# Install MongoDB locally
brew install mongodb-community  # macOS
# or
sudo apt-get install mongodb    # Linux

# Start MongoDB
brew services start mongodb-community
```

**Option 2: MongoDB Atlas (Recommended)**
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create cluster
4. Click "Connect" → "Connect your application"
5. Copy connection string
6. Replace `<password>` with your password
7. Add to `.env`

## 📱 App Structure

```
handy-mechanic/
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React component
│   │   └── index.js
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── server.js                # Express server + all routes
│   ├── uploads/                 # User uploaded files
│   ├── .env                     # Environment variables
│   └── package.json
│
├── IMPLEMENTATION_GUIDE.md      # Detailed technical guide
└── README.md                    # This file
```

## 🎯 User Flow

1. **Authentication**
   - User signs up or logs in
   - JWT token stored in localStorage

2. **Purchase Credits**
   - User selects package (single or 3-pack)
   - Redirects to Stripe checkout
   - Credits added after successful payment

3. **Vehicle Selection**
   - Choose year, make, and model
   - Proceed to symptom description

4. **Symptom Input**
   - Describe problem in text
   - Optional: Add photos
   - Optional: Record audio of issue

5. **AI Analysis**
   - Multi-step processing animation
   - Claude AI analyzes symptoms
   - Results saved to database

6. **Results**
   - View diagnosis and severity
   - See cost estimates
   - Follow repair steps
   - Watch related videos

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Payments
- `POST /api/payment/create-checkout-session` - Start Stripe checkout
- `POST /api/payment/webhook` - Stripe webhook handler

### Diagnosis
- `POST /api/diagnosis/analyze` - Run AI diagnosis
- `GET /api/diagnosis/history` - Get user's past diagnoses
- `GET /api/diagnosis/:id` - Get specific diagnosis

### Health
- `GET /api/health` - Server health check

## 🎨 Frontend Features

### Screens
1. **Auth Screen** - Login/Signup
2. **Home Screen** - Dashboard with credit balance
3. **Pricing Screen** - Purchase packages
4. **Vehicle Screen** - Select vehicle details
5. **Symptoms Screen** - Describe problem
6. **Analyzing Screen** - AI processing animation
7. **Results Screen** - Diagnostic report

### Design System
- **Colors**: Teal gradient (#00d4aa to #00a0ff) on dark (#0a0a0a)
- **Typography**: System fonts, bold headings
- **Components**: Glassmorphism cards, gradient buttons
- **Animations**: Smooth transitions, loading states

## 🚢 Deployment

### Backend (Railway)

1. **Create Railway account** at [railway.app](https://railway.app)

2. **Create new project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repo

3. **Add environment variables**
   - Go to Variables tab
   - Add all variables from `.env`

4. **Add MongoDB**
   - Add "New Service"
   - Select "MongoDB"
   - Copy connection string to `MONGODB_URI`

5. **Deploy**
   - Railway auto-deploys on git push
   - Get deployment URL

### Frontend (Vercel)

1. **Build the frontend**
```bash
cd frontend
npm run build
```

2. **Deploy to Vercel**
```bash
npm install -g vercel
vercel
```

3. **Add environment variable**
   - In Vercel dashboard
   - Add `REACT_APP_API_URL=your_backend_url`

### Alternative Deployment Options

**Backend:**
- Render: [render.com](https://render.com)
- Heroku: [heroku.com](https://heroku.com)
- AWS EC2
- DigitalOcean

**Frontend:**
- Netlify: [netlify.com](https://netlify.com)
- AWS Amplify
- GitHub Pages (static)

## 🧪 Testing

### Manual Testing Checklist

- [ ] User can sign up
- [ ] User can log in
- [ ] User can purchase credits
- [ ] Credits added after payment
- [ ] User can select vehicle
- [ ] User can describe symptoms
- [ ] Photos upload successfully
- [ ] Audio recording works
- [ ] AI diagnosis completes
- [ ] Results display correctly
- [ ] Video recommendations show
- [ ] Diagnosis history saves

### API Testing with cURL

**Signup:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Diagnosis (replace TOKEN):**
```bash
curl -X POST http://localhost:5000/api/diagnosis/analyze \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "year=2009" \
  -F "make=Chevrolet" \
  -F "model=Malibu" \
  -F "symptomText=Engine high pitch whine when accelerating"
```

## 🔒 Security

### Implemented
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ CORS protection
- ✅ File upload validation
- ✅ Input sanitization
- ✅ Secure payment processing

### Recommended Additions
- Rate limiting (express-rate-limit)
- Helmet.js for security headers
- Input validation library (joi/yup)
- HTTPS in production
- Environment variable validation
- SQL injection prevention
- XSS protection

## 📈 Future Enhancements

### Phase 2
- [ ] Email notifications
- [ ] Password reset functionality
- [ ] Profile management
- [ ] Diagnosis sharing
- [ ] Print/PDF export

### Phase 3
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Mechanic marketplace integration
- [ ] Parts price comparison
- [ ] Service history tracking

### Phase 4
- [ ] Community forum
- [ ] Real-time chat support
- [ ] Subscription model
- [ ] Multi-language support
- [ ] VIN decoder integration
- [ ] OBD-II scanner integration

## 🐛 Troubleshooting

### Common Issues

**"Cannot connect to MongoDB"**
- Check MongoDB is running
- Verify connection string
- Check network/firewall settings

**"Anthropic API error"**
- Verify API key is correct
- Check API credits/quota
- Ensure proper request format

**"Stripe webhook not working"**
- Use Stripe CLI for local testing
- Verify webhook secret
- Check endpoint URL

**"File upload fails"**
- Check file size limits
- Verify uploads directory exists
- Check file type restrictions

### Debug Mode

Enable detailed logging:
```javascript
// In server.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

## 📝 License

This is a commercial application. Ensure you have proper licenses for:
- Anthropic API usage
- Stripe payment processing
- Any third-party libraries

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📧 Support

For issues or questions:
- Create an issue in the repository
- Contact: support@handymechanic.app
- Documentation: See IMPLEMENTATION_GUIDE.md

## 🙏 Acknowledgments

- Claude AI by Anthropic
- Stripe for payment processing
- React team
- Express.js team
- MongoDB team

---

**Built with ❤️ using AI-powered diagnostics**

Made possible by:
- [Anthropic Claude](https://www.anthropic.com)
- [Stripe](https://stripe.com)
- [React](https://react.dev)
- [Express](https://expressjs.com)
- [MongoDB](https://www.mongodb.com)
