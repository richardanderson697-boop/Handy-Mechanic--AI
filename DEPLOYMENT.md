# Quick Deployment Guide

## Prerequisites Checklist

Before deploying, ensure you have:

- [ ] Supabase account and project created
- [ ] Database schema executed (scripts/setup-database.sql)
- [ ] Anthropic API key for Claude Sonnet 4
- [ ] OpenAI API key for embeddings
- [ ] Pinecone account with index created
- [ ] Stripe account (test mode for dev, live for production)
- [ ] All environment variables ready

## Step-by-Step Deployment to Vercel

### 1. Prepare Your Environment Variables

Create a `.env.local` file with all required keys (see .env.example).

**Critical Variables:**
```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=

# Auth
JWT_SECRET=

# Payments
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

### 2. Test Locally First

```bash
npm install
npm run dev
```

Visit http://localhost:3000 and test:
- [ ] User registration and login
- [ ] Credit purchase (use Stripe test card: 4242 4242 4242 4242)
- [ ] VIN decode
- [ ] Diagnostic submission
- [ ] Insurance quotes

### 3. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: (leave default)

5. Add Environment Variables:
   - Click "Environment Variables"
   - Paste all variables from .env.local
   - Add to Production, Preview, and Development

6. Click "Deploy"

#### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel

# Follow prompts
# Set up environment variables when prompted
# Or add them in the Vercel dashboard
```

### 4. Configure Stripe Webhook (Production)

Once deployed:

1. Get your production URL (e.g., `https://your-app.vercel.app`)
2. Go to Stripe Dashboard → Developers → Webhooks
3. Add endpoint: `https://your-app.vercel.app/api/payment/webhook`
4. Select event: `checkout.session.completed`
5. Copy the webhook signing secret
6. Add to Vercel environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
7. Redeploy (Vercel auto-redeploys when env vars change)

### 5. Populate RAG Knowledge Base

After first deployment, run the ingestion script:

```bash
# Install tsx if needed
npm install -g tsx

# Run ingestion
npx tsx scripts/ingest-knowledge-base.ts
```

This populates Pinecone with:
- Sample TSBs
- NHTSA data
- Diagnostic knowledge

**Important:** This only needs to run once during initial setup.

### 6. Set Up Supabase RLS Policies

Ensure Row Level Security is enabled:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own diagnoses" ON diagnoses
  FOR SELECT USING (auth.uid() = user_id);
```

## Post-Deployment Checklist

- [ ] Test user registration and login
- [ ] Verify Stripe payments work (test mode)
- [ ] Check diagnostic flow end-to-end
- [ ] Confirm VIN decoding works
- [ ] Test insurance quote generation
- [ ] Verify email notifications (if configured)
- [ ] Check mobile responsiveness
- [ ] Test with real vehicle data
- [ ] Monitor Vercel logs for errors
- [ ] Check Supabase database connections
- [ ] Verify Pinecone vector search performance

## Switching to Production

### Stripe

1. Complete Stripe activation
2. Get live API keys
3. Update environment variables:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
4. Update webhook endpoint with live URL
5. Update webhook secret

### API Keys

- Switch all API keys from test to production
- Monitor usage and set up billing alerts
- Implement rate limiting if needed

### Domain Setup

1. Add custom domain in Vercel dashboard
2. Update DNS records
3. Configure SSL (automatic with Vercel)
4. Update Stripe webhook URL
5. Update OAuth redirect URLs (if using social auth)

## Monitoring

### Key Metrics to Track

1. **User Activity**
   - Signups per day
   - Active users
   - Credit purchases

2. **Diagnostic Performance**
   - Diagnoses per day
   - Average confidence score
   - Error rate

3. **Revenue**
   - Daily revenue
   - Conversion rate
   - Affiliate commissions

4. **API Usage**
   - Anthropic API calls and cost
   - OpenAI API usage
   - Pinecone queries

### Monitoring Tools

- **Vercel Analytics**: Real-time traffic, performance
- **Supabase Dashboard**: Database queries, storage
- **Stripe Dashboard**: Payments, revenue
- **Sentry** (optional): Error tracking
- **PostHog** (optional): Product analytics

## Troubleshooting

### Common Issues

**"Unauthorized" errors**
- Check JWT_SECRET is set
- Verify token is being sent in Authorization header
- Check Supabase RLS policies

**Stripe webhook failures**
- Verify webhook secret is correct
- Check endpoint URL is accessible
- Review Stripe webhook logs

**RAG returns no results**
- Ensure Pinecone index is populated
- Check PINECONE_INDEX_NAME matches
- Verify OpenAI embeddings are generated

**VIN decode fails**
- NHTSA API may be rate-limited
- Check VIN format (17 characters)
- Verify network access to api.nhtsa.gov

**Audio upload issues**
- Check file size limits
- Verify MIME types accepted
- Ensure microphone permissions granted

## Scaling Considerations

### Performance Optimization

1. **Caching**
   - Cache VIN lookups (same VIN often queried)
   - Cache insurance quotes (TTL: 24 hours)
   - Use Next.js cache for static content

2. **Database**
   - Add indexes on frequently queried columns
   - Implement pagination for diagnosis history
   - Archive old diagnoses

3. **API Rate Limiting**
   - Implement rate limits per user
   - Queue diagnostic requests
   - Use Upstash Redis for distributed rate limiting

4. **CDN**
   - Use Vercel Edge Network (automatic)
   - Optimize images with Next.js Image
   - Compress audio files before storage

### Cost Management

**Monthly Cost Breakdown (estimated at 1,000 diagnoses/month):**

- Vercel Pro: $20/month
- Supabase Pro: $25/month (includes 8GB database)
- Anthropic API: ~$300 (assuming $0.30 per diagnosis)
- OpenAI Embeddings: ~$5
- Pinecone Starter: Free (100k vectors)
- Stripe: 2.9% + $0.30 per transaction
- **Total: ~$350-400/month**

**Revenue (1,000 diagnoses at $4.99 avg):** $4,990/month
**Profit Margin:** ~90%

### Security Hardening

1. **Rate Limiting**
   ```typescript
   // Add to middleware.ts
   import { Ratelimit } from "@upstash/ratelimit";
   ```

2. **Input Validation**
   - Sanitize all user inputs
   - Validate file uploads
   - Check VIN format strictly

3. **Monitoring**
   - Set up alerts for suspicious activity
   - Monitor failed login attempts
   - Track API error rates

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Review Supabase logs
3. Check browser console for client errors
4. Review API endpoint responses

For help:
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- GitHub Issues: [your-repo]/issues

---

Ready to launch? Follow this guide step-by-step and you'll have a production-ready automotive diagnostic platform running in under an hour!
