# Deployment Guide

This project is configured for deployment on Render (render.com) using the free tier.

## Prerequisites

- GitHub account
- Render account (free tier)
- This repository pushed to GitHub

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push
   ```

2. **Deploy on Render**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file
   - Review the configuration and click "Apply"

3. **What gets deployed**
   - **shadowban-server**: Node.js backend with Socket.IO
   - **shadowban-client**: Static React frontend
   - **shadowban-db**: PostgreSQL database

4. **Access your app**
   - Render will provide URLs for both services
   - The client will automatically connect to the server via environment variables

## Environment Variables

The `render.yaml` automatically configures:
- `DATABASE_URL`: PostgreSQL connection string
- `CLIENT_ORIGIN`: Client URL for CORS
- `VITE_SERVER_URL`: Server URL for Socket.IO connection

## Local Development

To test locally with production-like settings:
```bash
# Server
cd apps/server
NODE_ENV=production PORT=3001 npm start

# Client
cd apps/client
VITE_SERVER_URL=http://localhost:3001 npm run dev
```

## Troubleshooting

- If Socket.IO fails to connect, check that `VITE_SERVER_URL` is set correctly
- Ensure the database is migrated: `npm run prisma:generate`
- Check Render logs for any startup errors
