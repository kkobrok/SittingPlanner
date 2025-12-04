# Cloudflare Pages Deployment Guide

This guide explains how to deploy the Sitting Planner application to Cloudflare Pages.

## Prerequisites

- A [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Supabase project with connection pooling enabled

## Migration Summary

The application has been migrated from `@astrojs/node` to `@astrojs/cloudflare` adapter. Key changes:

✅ Cloudflare adapter installed
✅ Environment variables use `import.meta.env` (Workers-compatible)
✅ Build configuration updated for Cloudflare Pages
✅ Supabase client configured for Workers runtime

## Deployment Options

### Option 1: Automatic Deployment via Git (Recommended)

This is the simplest method with zero configuration needed.

#### Step 1: Connect Repository

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create application** → **Pages**
3. Click **Connect to Git**
4. Select your repository (authorize Cloudflare if needed)
5. Select the branch to deploy (e.g., `master`)

#### Step 2: Configure Build Settings

Cloudflare auto-detects Astro projects, but verify these settings:

- **Framework preset:** Astro
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (leave empty)
- **Node version:** 20.x (set in environment variables)

#### Step 3: Environment Variables

Add these environment variables in the Cloudflare Pages dashboard (**Settings** → **Environment variables**):

##### Production Environment

```
PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
OPENROUTER_API_KEY=your_openrouter_key
PUBLIC_APP_URL=https://your-app.pages.dev
```

##### Preview Environment (for branch deployments)

```
PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
OPENROUTER_API_KEY=your_openrouter_key
PUBLIC_APP_URL=https://preview.your-app.pages.dev
```

**Important:** Mark `SUPABASE_SERVICE_KEY` and `OPENROUTER_API_KEY` as encrypted (lock icon).

#### Step 4: Deploy

1. Click **Save and Deploy**
2. Cloudflare will build and deploy your application
3. Once complete, you'll receive a URL like `https://sitting-planner.pages.dev`

#### Step 5: Custom Domain (Optional)

1. Go to your Pages project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `sittingplanner.com`)
4. Follow DNS configuration instructions
5. SSL certificate is automatically provisioned

---

### Option 2: Manual Deployment via Wrangler CLI

Use this method for CI/CD pipelines or manual deployments.

#### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

#### Step 2: Authenticate

```bash
wrangler login
```

This opens a browser for Cloudflare authentication.

#### Step 3: Build Locally

```bash
npm run build
```

#### Step 4: Deploy

```bash
wrangler pages deploy dist --project-name=sitting-planner
```

On first deployment, Wrangler will prompt you to create the project.

#### Step 5: Set Environment Variables

You can set environment variables via CLI:

```bash
wrangler pages secret put PUBLIC_SUPABASE_URL --project-name=sitting-planner
wrangler pages secret put PUBLIC_SUPABASE_ANON_KEY --project-name=sitting-planner
wrangler pages secret put SUPABASE_SERVICE_KEY --project-name=sitting-planner
wrangler pages secret put OPENROUTER_API_KEY --project-name=sitting-planner
wrangler pages secret put PUBLIC_APP_URL --project-name=sitting-planner
```

Or configure them in the dashboard as described in Option 1.

---

## Important: Supabase Connection Pooling

**CRITICAL:** Cloudflare Workers require connection pooling for Supabase due to their serverless architecture.

### Enable Supabase Pooler

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Database** → **Connection Pooling**
3. Enable **Transaction mode** pooling
4. Copy the pooled connection string (ends with `.pooler.supabase.com`)

### Update Environment Variables

**For Cloudflare deployment, use the pooler URL:**

```
# ❌ Direct connection (Don't use with Cloudflare)
PUBLIC_SUPABASE_URL=https://yourproject.supabase.co

# ✅ Pooled connection (Use with Cloudflare)
PUBLIC_SUPABASE_URL=https://yourproject.pooler.supabase.com
```

**Note:** The pooler URL is required for production. Direct connections will cause timeout errors.

---

## Continuous Deployment

Cloudflare Pages automatically deploys on every push to your repository:

- **Main branch** → Production deployment
- **Other branches** → Preview deployments

### Preview Deployments

Every pull request gets its own preview URL:
- Format: `https://[branch].[project].pages.dev`
- Automatically updated on new commits
- Isolated environment with separate environment variables (if configured)

### Disable Auto-Deploy (Optional)

If you want manual control:

1. Go to **Settings** → **Builds & deployments**
2. Toggle **Automatic deployments** off
3. Deploy manually via dashboard or Wrangler

---

## Local Development with Workers Runtime

Test the Cloudflare Workers runtime locally before deploying:

```bash
# Install Wrangler locally (if not installed globally)
npm install -D wrangler

# Run dev server with Workers simulation
npx wrangler pages dev -- npm run dev
```

This simulates the Cloudflare Workers environment, helping catch compatibility issues early.

---

## Troubleshooting

### Issue 1: "Invalid binding `SESSION`" Error

**Cause:** Cloudflare adapter enables KV storage for sessions by default.

**Solution:** Add to `wrangler.toml` (create if missing):

```toml
name = "sitting-planner"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "SESSION"
id = "your-kv-namespace-id"
```

Create KV namespace:
```bash
wrangler kv:namespace create SESSION
```

### Issue 2: Supabase Connection Timeouts

**Symptoms:**
- API routes return 500 errors
- "connection timeout" in logs

**Solution:**
1. Verify you're using the pooled Supabase URL (`.pooler.supabase.com`)
2. Check Supabase pooler is enabled in your dashboard
3. Ensure `SUPABASE_URL` environment variable is correctly set

### Issue 3: OpenRouter API Timeouts

**Symptoms:**
- AI seating generation fails
- 30-second timeout errors

**Cause:** Cloudflare Workers have a 30-second request timeout for HTTP requests.

**Solutions:**
- Optimize AI prompts to reduce processing time
- Consider using Cloudflare Durable Objects for longer operations
- Implement a job queue for async processing (advanced)

### Issue 4: Build Fails with "Module not found"

**Symptoms:**
- Build errors referencing Node.js modules (fs, path, crypto)

**Solution:**
- Remove any server-side code using Node.js-specific APIs
- Use Cloudflare Workers-compatible alternatives
- Ensure imports use `import.meta.env` instead of `process.env`

### Issue 5: "Script size exceeded" Warning

**Symptoms:**
- Deployment succeeds but warnings about bundle size

**Current Status:**
- Your worker bundle is ~3.8MB (within limits)
- If issues arise, consider code splitting

**Optimization Options:**
```javascript
// Use dynamic imports for large components
const SeatingPlanPage = lazy(() => import('./pages/SeatingPlanPage'));

// Lazy load heavy libraries
const html2canvas = await import('html2canvas');
```

---

## Cost Considerations

### Free Tier Limitations

Cloudflare Pages Free tier includes:
- ✅ 500 builds per month
- ✅ Unlimited bandwidth
- ✅ Unlimited requests
- ✅ 100,000 Workers requests/day

**However:** For production SSR (Server-Side Rendering), you need **Workers Paid**.

### Workers Paid Plan ($5/month)

Required for production use with SSR:
- 10 million requests/month included
- $0.50 per additional million requests
- No bandwidth charges
- Global edge network

### Cost Examples

| Monthly Traffic | Cost |
|-----------------|------|
| 10,000 requests | $5 |
| 100,000 requests | $5 |
| 1 million requests | $5 |
| 15 million requests | $7.50 |
| 100 million requests | $50 |

**Note:** Most small/medium applications stay within the $5/month tier.

---

## Monitoring & Logs

### View Deployment Logs

1. Go to your Pages project dashboard
2. Click on a deployment
3. View **Build log** and **Function log**

### Real-Time Logs (Wrangler)

```bash
wrangler pages deployment tail --project-name=sitting-planner
```

### Analytics

Cloudflare provides free analytics:
- Request count
- Bandwidth usage
- Error rates
- Geographic distribution

Access via: **Pages project** → **Analytics**

---

## Rollback Procedure

If a deployment causes issues:

### Via Dashboard

1. Go to **Deployments** tab
2. Find a previous working deployment
3. Click **···** → **Rollback to this deployment**

### Via Wrangler

```bash
# List deployments
wrangler pages deployment list --project-name=sitting-planner

# Promote a specific deployment to production
wrangler pages deployment promote [deployment-id] --project-name=sitting-planner
```

---

## Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` files
   - Use encrypted variables for secrets
   - Rotate API keys regularly

2. **Supabase Security:**
   - Enable Row Level Security (RLS) on all tables
   - Use service key only for server-side operations
   - Keep anon key public-facing only

3. **OpenRouter API:**
   - Set budget limits in OpenRouter dashboard
   - Monitor usage regularly
   - Implement rate limiting if needed

4. **CSP Headers:**
   Consider adding Content Security Policy headers in `_headers` file:
   ```
   /*
     Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
   ```

---

## Next Steps

After successful deployment:

1. ✅ Test all application features on production URL
2. ✅ Verify Supabase authentication works
3. ✅ Test AI seating generation (OpenRouter integration)
4. ✅ Set up custom domain
5. ✅ Configure production environment variables
6. ✅ Enable Cloudflare Web Analytics (optional)
7. ✅ Set up monitoring/alerting

---

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Astro Cloudflare Adapter Docs](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

---

## Support

If you encounter issues:
1. Check [Cloudflare Community](https://community.cloudflare.com/)
2. Review [Astro Discord](https://astro.build/chat)
3. Consult [Supabase Support](https://supabase.com/support)
