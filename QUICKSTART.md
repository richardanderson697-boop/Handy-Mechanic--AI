# Handy Mechanic AI - Quickstart Guide

This is a fully functional Next.js 16 application with production-ready features. The app is complete and ready to run locally or deploy to Vercel.

## What's Built

✅ **Complete Next.js 16 Application** with App Router
✅ **AI-Powered Diagnostics** with RAG (Pinecone + Claude Sonnet 4)
✅ **Authentication System** with JWT and bcrypt  
✅ **Stripe Payment Processing** with webhooks
✅ **VIN Decoding** via NHTSA API
✅ **Vehicle History Integration** (Carfax/NMVTIS ready)
✅ **Insurance Quotes** from multiple providers
✅ **Audio & Image Upload** for diagnostic input
✅ **Supabase PostgreSQL Database** with RLS
✅ **Full TypeScript** type safety
✅ **Responsive UI** with Tailwind CSS

## Run Locally in 5 Minutes

### 1. Clone and Install

```bash
# If not already cloned, pull from GitHub
git clone https://github.com/richardanderson697-boop/Handy-Mechanic--AI.git
cd Handy-Mechanic--AI

# Install dependencies
pnpm install
# or: npm install
```

### 2. Set Up Environment Variables

Create `.env.local`:

```bash
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX=automotive-diagnostics

# Payments
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Auth
JWT_SECRET=your_very_long_random_secret_at_least_32_characters

# Vehicle Data (Optional)
NHTSA_API_KEY=optional_nhtsa_key
CARFAX_API_KEY=your_carfax_key
NMVTIS_API_KEY=your_nmvtis_key

# Insurance APIs (Optional)
PROGRESSIVE_AFFILIATE_ID=your_progressive_id
GEICO_AFFILIATE_ID=your_geico_id
```

### 3. Set Up Database

```bash
# Go to Supabase dashboard and run:
# scripts/setup-database.sql

# Or use the Supabase CLI:
supabase db push
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000` - The app will be fully functional!

## Deploy to Vercel (1 Click)

1. Push code to GitHub (already done)
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import `Handy-Mechanic--AI` repository
5. Add all environment variables from `.env.local`
6. Click "Deploy"

Done! Your app will be live in minutes.

## Get API Keys

### Required (App won't work without these):

1. **Supabase** (Database) - [supabase.com](https://supabase.com) - FREE
2. **Anthropic** (Claude AI) - [anthropic.com](https://console.anthropic.com) - Pay per use
3. **Stripe** (Payments) - [stripe.com](https://dashboard.stripe.com) - FREE (2.9% + $0.30 per transaction)

### Recommended (For full features):

4. **OpenAI** (Embeddings) - [platform.openai.com](https://platform.openai.com) - ~$0.0001 per request
5. **Pinecone** (Vector DB) - [pinecone.io](https://pinecone.io) - FREE tier available

### Optional (For enhanced features):

6. **Carfax** (Vehicle history) - Business account required
7. **NMVTIS** (Vehicle history) - [nmvtis.org](https://www.nmvtis.gov)
8. **Insurance affiliates** - Apply to each provider's affiliate program

## What Works Right Now

- ✅ User registration and login
- ✅ Credit purchase via Stripe
- ✅ Vehicle information input (make/model/year)
- ✅ VIN decoding
- ✅ Symptom description (text/audio/photos)
- ✅ AI diagnostic analysis with Claude
- ✅ Repair instructions and cost estimates
- ✅ Insurance quote comparisons
- ✅ User dashboard with history

## Next Steps After Setup

1. **Populate RAG Knowledge Base**: Run the ingestion script to add TSBs and repair manuals
   ```bash
   npx tsx scripts/ingest-knowledge-base.ts
   ```

2. **Test Stripe Webhooks**: Use Stripe CLI for local testing
   ```bash
   stripe listen --forward-to localhost:3000/api/payment/webhook
   ```

3. **Customize Branding**: Edit colors in `tailwind.config.ts` and `app/globals.css`

## Troubleshooting

**Database Connection Issues?**
- Verify Supabase URL and keys are correct
- Ensure RLS policies are disabled for service role
- Check if database schema was created from `setup-database.sql`

**Stripe Webhook Not Working?**
- Use Stripe CLI for local testing
- In production, add webhook URL in Stripe dashboard

**AI Diagnostics Failing?**
- Verify Anthropic API key has credits
- Check Pinecone index exists and has data
- Ensure OpenAI API key is valid for embeddings

**Build Errors?**
```bash
# Clear cache and reinstall
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

## Support

- See `README.md` for full documentation
- See `DEPLOYMENT.md` for detailed deployment guide
- Check the database schema in `scripts/setup-database.sql`

---

**You have a complete, production-ready automotive diagnostic application. Just add your API keys and it's ready to go!**
