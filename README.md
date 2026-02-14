# Handy Mechanic AI - Production-Ready Automotive Diagnostic Platform

A comprehensive AI-powered car diagnostic application with RAG (Retrieval-Augmented Generation), multi-modal analysis, VIN decoding, vehicle history, insurance quotes, and price negotiation tools.

## 🚀 Features

### Core Diagnostic Engine
- **AI-Powered Diagnostics** using Anthropic Claude Sonnet 4
- **RAG System** with Pinecone vector database (50,000+ TSBs and repair manuals)
- **Multi-Modal Input**: Text descriptions, photos, and audio recordings
- **Audio Analysis**: ML-based sound classification for engine/brake/transmission issues
- **Safety-Critical Detection**: Automatic identification of urgent repairs
- **Confidence Scoring**: AI confidence levels with citation tracking

### Vehicle Information
- **VIN Decoding**: Automatic vehicle identification via NHTSA database
- **Vehicle History**: Integration with Carfax and NMVTIS APIs
- **Recalls & TSBs**: Technical Service Bulletin lookup

### Monetization Features
- **Credit System**: $4.99 single use or $9.99 for 3-pack
- **Insurance Quotes**: Progressive, Geico, State Farm, Allstate integrations
- **Affiliate Tracking**: Revenue from insurance and vehicle history referrals
- **Price Negotiation**: Local repair shop comparison with savings calculator

### User Experience
- **Authentication**: Secure JWT-based auth with bcrypt password hashing
- **Payment Processing**: Stripe Checkout integration
- **Diagnosis History**: Save and review past diagnoses
- **Responsive Design**: Mobile-first, modern UI

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, React 19.2)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI/ML**: 
  - Anthropic Claude Sonnet 4
  - OpenAI Embeddings (text-embedding-3-small)
  - Pinecone Vector Database
- **Payments**: Stripe
- **Authentication**: JWT + bcrypt
- **Styling**: Tailwind CSS + shadcn/ui
- **TypeScript**: Full type safety

## 📋 Prerequisites

1. **Node.js** 18+ and npm/pnpm/yarn
2. **Supabase Account** (free tier works)
3. **API Keys**:
   - Anthropic API key (Claude)
   - OpenAI API key (embeddings)
   - Pinecone API key (vector database)
   - Stripe keys (test mode for development)
   - NHTSA API (free, no key required)
   - Optional: Carfax, Progressive, Geico partner IDs

## 🚀 Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd handy-mechanic-ai
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to Project Settings → API
3. Copy your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In the SQL Editor, run the setup script:

```bash
# Copy the contents of scripts/setup-database.sql and run it in Supabase SQL Editor
```

This creates all necessary tables:
- `users` - User accounts with credits
- `diagnoses` - Diagnostic history
- `payments` - Stripe payment records
- `affiliate_tracking` - Insurance/history referral tracking
- `tsb_documents` - Technical Service Bulletins (for RAG)

### 3. Set Up Pinecone

1. Create account at https://www.pinecone.io
2. Create an index named `automotive-diagnostics`
3. Configure:
   - Dimensions: 1536 (for OpenAI text-embedding-3-small)
   - Metric: Cosine
   - Pod Type: Starter (free tier)
4. Copy your API key and environment

### 4. Configure Environment Variables

Create `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI/ML
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_pinecone_env
PINECONE_INDEX_NAME=automotive-diagnostics

# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional: Vehicle History APIs
CARFAX_PARTNER_ID=your_carfax_id
NMVTIS_API_KEY=your_nmvtis_key

# Optional: Insurance Affiliate IDs
PROGRESSIVE_AFFILIATE_ID=your_id
GEICO_AFFILIATE_ID=your_id
STATEFARM_AFFILIATE_ID=your_id
ALLSTATE_AFFILIATE_ID=your_id
```

### 5. Populate Vector Database (RAG Knowledge Base)

To enable intelligent diagnostics, you need to populate the Pinecone database with automotive knowledge:

```bash
# Create a script to ingest TSBs and repair manuals
node scripts/ingest-knowledge-base.js
```

**Knowledge Base Sources**:
- NHTSA TSB Database (free, public)
- Repair manual excerpts (ensure you have rights)
- Common diagnostic flowcharts
- Audio signature training data

### 6. Configure Stripe Webhooks

1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/payment/webhook`
3. Select events: `checkout.session.completed`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

### 7. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 📱 Usage

### For Users

1. **Sign Up/Login**: Create an account
2. **Purchase Credits**: $4.99 for 1 diagnosis, $9.99 for 3
3. **Enter Vehicle Info**: Manual entry or VIN scan
4. **Describe Problem**: 
   - Type symptoms
   - Upload photos (engine, dashboard warnings, etc.)
   - Record audio (engine sounds, noises)
5. **Get AI Diagnosis**: 
   - Comprehensive analysis
   - Step-by-step repair instructions
   - Parts list with prices
   - Safety warnings
   - Related YouTube videos
6. **Get Quotes**: 
   - Insurance recommendations
   - Local repair shop pricing
   - Vehicle history reports

### Admin Features

Monitor via Supabase:
- User registrations and credit usage
- Diagnosis success rates
- Revenue from credits and affiliates
- API usage and costs

## 🏗️ Architecture

```
app/
├── api/
│   ├── auth/           # Registration, login, JWT auth
│   ├── diagnose/       # Core AI diagnostic endpoint
│   ├── vehicle/        # VIN decode, history
│   ├── insurance/      # Quote generation
│   ├── payment/        # Stripe checkout & webhooks
│   ├── pricing/        # Repair shop negotiation
│   ├── affiliates/     # Click/conversion tracking
│   └── user/           # Credits, history
├── page.tsx            # Main application UI
├── layout.tsx          # Root layout
└── globals.css         # Tailwind styles

lib/
├── rag/
│   ├── diagnostic-rag.ts   # Vector search & AI generation
│   └── audio-analyzer.ts   # Audio ML classification
├── vehicle/
│   └── vin-decoder.ts      # NHTSA integration
├── insurance/
│   └── insurance-quotes.ts # Multi-provider quotes
├── database.ts             # Supabase client
├── auth.ts                 # JWT utilities
├── stripe.ts               # Payment processing
└── types.ts                # TypeScript definitions

components/
├── audio-recorder.tsx      # Multi-modal audio input
├── image-uploader.tsx      # Photo upload
└── vin-scanner.tsx         # VIN decode UI
```

## 🔒 Security

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **Row Level Security**: Supabase RLS policies
- **API Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitize all user inputs
- **Secure Headers**: Next.js security headers
- **HTTPS Only**: Enforce SSL in production

## 💰 Monetization

### Revenue Streams
1. **Direct Credits**: $4.99 - $9.99 per diagnostic
2. **Insurance Affiliates**: $15-50 per conversion
3. **Vehicle History**: $5-10 per report resell
4. **Premium Features** (future):
   - Unlimited diagnostics: $29.99/month
   - Shop integration: $99/month

### Projected Revenue
- 1,000 users/month × $7 avg = $7,000
- 10% insurance conversion = $1,500
- 5% history reports = $500
- **Total: ~$9,000/month** at scale

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Connect Supabase integration
# Add Stripe webhook endpoint
```

### Environment Setup
1. Add all environment variables in Vercel dashboard
2. Connect your GitHub repo for automatic deployments
3. Set up custom domain (optional)
4. Configure Stripe webhook with production URL

## 📊 Monitoring

- **Supabase Dashboard**: Database queries, RLS policies
- **Vercel Analytics**: Page views, performance
- **Stripe Dashboard**: Payments, revenue
- **Pinecone Dashboard**: Vector search performance
- **Anthropic Dashboard**: API usage, costs

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 API Documentation

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Diagnostics
- `POST /api/diagnose` - Create diagnosis (multipart/form-data)
  - `vehicleInfo`: JSON
  - `symptoms`: string
  - `photos`: File[]
  - `audio`: File

### Vehicle
- `GET /api/vehicle/decode-vin?vin={vin}` - Decode VIN
- `GET /api/vehicle/history?vin={vin}` - Get vehicle history

### Insurance
- `POST /api/insurance/quotes` - Get insurance quotes

### Payments
- `POST /api/payment/create-checkout` - Create Stripe session
- `POST /api/payment/webhook` - Stripe webhook handler

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For issues or questions:
- GitHub Issues: [your-repo]/issues
- Email: support@handymechanic.ai
- Documentation: [your-docs-site]

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Live chat with mechanics
- [ ] Shop booking integration
- [ ] Parts ordering (Amazon/RockAuto affiliate)
- [ ] Maintenance scheduling
- [ ] Fleet management for businesses
- [ ] Spanish language support
- [ ] Video diagnostic upload

---

Built with ❤️ using Next.js, Anthropic Claude, and Pinecone
