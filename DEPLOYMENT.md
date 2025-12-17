# EasyPanel Deployment Guide

## Environment Variables Required

Set these environment variables in your EasyPanel project:

### Database Configuration

- `DB_HOST`: Your MySQL database host
- `DB_USER`: MySQL username
- `DB_PASSWORD`: MySQL password
- `DB_NAME`: Database name
- `DB_PORT`: MySQL port (default: 3306)

### Stripe Configuration

- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret

### Server Configuration

- `PORT`: Server port (default: 4242)
- `NODE_ENV`: Set to "production"

## Deployment Steps

1. **Build the Docker image** (if building locally):

   ```bash
   docker build -t funny-tutor-backend .
   ```

2. **In EasyPanel**:
   - Create a new project
   - Choose "Docker" as the source
   - Upload your code or connect to your repository
   - Set the environment variables listed above
   - Configure the port mapping (4242:4242)
   - Deploy

## Health Check

The application includes a health check endpoint at `/health` that EasyPanel can use to monitor the service.

## Database Setup

Make sure your MySQL database is set up with the required tables. The application will automatically create tables on startup if they don't exist.

## CORS Configuration

The application is configured to accept requests from:

- `http://88.222.215.134:8081`
- `http://localhost:5173`

Update the CORS origins in `index.js` if you need to add your frontend domain.
