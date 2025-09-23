# Supabase Deployment Guide for Sigma LMS

This guide will help you deploy your Sigma LMS application to Supabase.

## Prerequisites

1. **Supabase Account**: Create an account at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Already installed via npx
3. **Docker**: Required for local Supabase development (optional but recommended)

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `sigma-lms`
   - **Database Password**: Generate a strong password
   - **Region**: Choose the closest region to your users
5. Click "Create new project"

## Step 2: Get Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

## Step 3: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   
   # Contentful Configuration (keep your existing values)
   CONTENTFUL_SPACE_ID=your_contentful_space_id
   CONTENTFUL_DELIVERY_TOKEN=your_contentful_delivery_token
   CONTENTFUL_PREVIEW_TOKEN=your_contentful_preview_token
   CONTENTFUL_ENVIRONMENT=master
   ```

## Step 4: Deploy Database Schema

1. **Link your local project to Supabase**:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

2. **Push the database schema**:
   ```bash
   npm run supabase:db:push
   ```

3. **Generate TypeScript types**:
   ```bash
   npm run supabase:gen-types
   ```

## Step 5: Deploy Application

### Option A: Deploy to Supabase Edge Functions (Recommended)

1. **Install Supabase CLI globally** (if not already done):
   ```bash
   npm install -g supabase
   ```

2. **Deploy your Next.js app as an Edge Function**:
   ```bash
   npx supabase functions deploy
   ```

### Option B: Deploy to Vercel (Alternative)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Add environment variables in Vercel dashboard**:
   - Go to your project settings
   - Add all environment variables from `.env.local`

### Option C: Deploy with Docker

1. **Build Docker image**:
   ```bash
   docker build -t sigma-lms .
   ```

2. **Run container**:
   ```bash
   docker run -p 3000:3000 --env-file .env.local sigma-lms
   ```

## Step 6: Configure Authentication (Optional)

If you want to add user authentication:

1. **Enable Auth providers** in Supabase dashboard:
   - Go to **Authentication** → **Providers**
   - Enable desired providers (Email, Google, GitHub, etc.)

2. **Configure redirect URLs**:
   - Add your production URL to allowed redirect URLs
   - Update `site_url` in `supabase/config.toml`

## Step 7: Test Deployment

1. **Test database connection**:
   ```bash
   npm run supabase:status
   ```

2. **Test API endpoints**:
   - Visit your deployed URL
   - Check if lessons, modules, and quizzes load correctly

## Step 8: Set up Content Delivery

1. **Configure CDN** (if using Vercel):
   - Vercel automatically provides global CDN
   - Configure custom domains if needed

2. **Set up monitoring**:
   - Enable Supabase Analytics
   - Set up error tracking (Sentry, LogRocket, etc.)

## Local Development

To run the project locally with Supabase:

1. **Start Supabase locally**:
   ```bash
   npm run supabase:start
   ```

2. **Run migrations**:
   ```bash
   npm run supabase:db:migrate
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Common Issues:

1. **Database connection errors**:
   - Check environment variables
   - Verify Supabase project is active
   - Check network connectivity

2. **Migration failures**:
   - Check SQL syntax in migration files
   - Ensure proper permissions
   - Review Supabase logs

3. **Build errors**:
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check TypeScript errors

### Useful Commands:

```bash
# Check Supabase status
npm run supabase:status

# Reset local database
npm run supabase:reset

# Generate new migration
npx supabase migration new migration_name

# View logs
npx supabase logs

# Stop local Supabase
npm run supabase:stop
```

## Production Considerations

1. **Security**:
   - Never commit `.env.local` to version control
   - Use strong database passwords
   - Enable RLS policies
   - Regular security audits

2. **Performance**:
   - Enable database connection pooling
   - Use CDN for static assets
   - Optimize images and assets
   - Monitor performance metrics

3. **Backup**:
   - Set up automated database backups
   - Test restore procedures
   - Monitor backup success

4. **Monitoring**:
   - Set up error tracking
   - Monitor database performance
   - Track user analytics
   - Set up alerts for critical issues

## Next Steps

After successful deployment:

1. **Customize the application**:
   - Update branding and styling
   - Add more courses and content
   - Implement additional features

2. **Scale the application**:
   - Add more database indexes
   - Implement caching strategies
   - Consider microservices architecture

3. **Enhance security**:
   - Implement rate limiting
   - Add input validation
   - Set up security headers

For more information, visit the [Supabase Documentation](https://supabase.com/docs) and [Next.js Deployment Guide](https://nextjs.org/docs/deployment).
