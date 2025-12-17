# Vercel Deployment Guide for Funny Tutor Backend

This guide explains how to deploy the Funny Tutor backend to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed (optional, for CLI deployment)
3. All environment variables configured

## Environment Variables

You need to set the following environment variables in Vercel:

### Database Configuration

- `DB_HOST` - MySQL database host
- `DB_USER` - MySQL database user
- `DB_PASSWORD` - MySQL database password
- `DB_NAME` - MySQL database name
- `DB_PORT` - MySQL database port (usually 3306)

### JWT Configuration

- `JWT_SECRET` - Secret key for JWT token generation
- `JWT_EXPIRES_IN` - JWT token expiration time (e.g., "7d")

### Cloudinary Configuration

- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Your Cloudinary API key
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret

### Stripe Configuration

- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret (for webhook verification)

### Email Configuration

- `EMAIL_HOST` - SMTP host (e.g., smtp.gmail.com)
- `EMAIL_PORT` - SMTP port (e.g., 587)
- `EMAIL_USER` - SMTP username/email
- `EMAIL_PASS` - SMTP password
- `EMAIL_FROM` - From email address

### Frontend URL

- `FRONTEND_URL` - Your frontend URL (for CORS)

### Other

- `NODE_ENV` - Set to "production" for production deployments
- `PORT` - Optional (Vercel handles this automatically)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Configure the project:
   - **Root Directory**: Set to `funny-tutor-be`
   - **Framework Preset**: Other
   - **Build Command**: Leave empty (or `npm install` if needed)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`
5. Add all environment variables in the "Environment Variables" section
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Navigate to the backend directory:

   ```bash
   cd funny-tutor-be
   ```

3. Login to Vercel:

   ```bash
   vercel login
   ```

4. Deploy:

   ```bash
   vercel
   ```

5. For production deployment:
   ```bash
   vercel --prod
   ```

## Important Notes

### Database Connection

- Vercel uses serverless functions, so database connections are handled per request
- The database connection pool is configured to work with serverless architecture
- Make sure your MySQL database allows connections from Vercel's IP addresses
- Consider using a connection pooler like PlanetScale or a managed MySQL service

### Webhooks

- Stripe webhooks need to be configured to point to your Vercel deployment URL
- The webhook endpoint will be: `https://your-project.vercel.app/webhook`
- Make sure to update your Stripe webhook URL after deployment

### CORS Configuration

- Update the `CORS_ORIGINS` in `src/config/constants.js` to include your Vercel frontend URL
- Or set the `FRONTEND_URL` environment variable in Vercel

### Cold Starts

- Vercel serverless functions may experience cold starts
- Database initialization happens on the first request after a cold start
- This is handled automatically in the code

### File Uploads

- File uploads are handled via Cloudinary
- Make sure your Cloudinary account has sufficient storage and bandwidth

## Troubleshooting

### Database Connection Issues

- Verify all database environment variables are set correctly
- Check that your database allows external connections
- Ensure your database firewall allows Vercel's IP ranges

### Build Errors

- Check that all dependencies are listed in `package.json`
- Verify Node.js version compatibility (Vercel uses Node.js 18.x by default)

### Function Timeout

- Vercel has execution time limits (10s for Hobby, 60s for Pro)
- Optimize long-running operations or consider using background jobs

## Monitoring

- Check Vercel dashboard for function logs
- Monitor database connection pool usage
- Set up error tracking (e.g., Sentry) for production

## Updating Deployment

- Push changes to your Git repository
- Vercel will automatically redeploy if connected to Git
- Or use `vercel --prod` to manually deploy updates
