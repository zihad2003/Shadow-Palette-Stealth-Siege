# Deployment Guide

This guide covers deploying Shadow Palette to production using Render (backend) and Vercel (frontend).

## Prerequisites

- GitHub repository with the code
- Render account (free tier available)
- Vercel account (free tier available)

## Backend Deployment (Render)

### 1. Create MySQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Database"
3. Choose "MySQL"
4. Database name: `shadow_palette`
5. User: `shadow_palette_user`
6. Region: Choose closest to your users
7. Click "Create Database"

### 2. Deploy Backend Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `shadow-palette-backend`
   - **Runtime**: Docker
   - **Dockerfile path**: `./backend/Dockerfile`
   - **Docker Context**: `./backend`
   - **Branch**: `main` (or your deployment branch)
5. Add Environment Variables:
   - `SPRING_DATASOURCE_URL`: Get from your Render database (connection string)
   - `SPRING_DATASOURCE_USERNAME`: Get from your Render database
   - `SPRING_DATASOURCE_PASSWORD`: Get from your Render database
   - `SPRING_PROFILES_ACTIVE`: `prod`
   - `PORT`: `8080`
6. Click "Deploy Web Service"

### 3. Get Backend URL

After deployment, Render will provide a URL like:
```
https://shadow-palette-backend.onrender.com
```

Save this URL for the frontend configuration.

## Frontend Deployment (Vercel)

### 1. Connect to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository

### 2. Configure Project

1. **Framework Preset**: Vite
2. **Root Directory**: Leave empty (or set to `frontend` if needed)
3. **Build Command**: `npm run build --prefix frontend`
4. **Output Directory**: `frontend/dist`

### 3. Add Environment Variables

Add the following environment variable:
- `VITE_API_BASE_URL`: Your Render backend URL (e.g., `https://shadow-palette-backend.onrender.com`)

### 4. Deploy

Click "Deploy" and wait for the build to complete.

## Post-Deployment Steps

### 1. Update Backend CORS

Your backend may need CORS configuration to allow requests from your Vercel domain. Update `application.yml` or add a CORS configuration in your Spring Boot application.

### 2. Test the Deployment

1. Visit your Vercel URL
2. Test user registration/login
3. Test gameplay features
4. Check WebSocket connections for live raids

### 3. Monitor Logs

- **Render**: Check service logs in Render Dashboard
- **Vercel**: Check deployment logs in Vercel Dashboard

## Troubleshooting

### Backend Issues

- **Database Connection**: Verify MySQL credentials in Render environment variables
- **Port Issues**: Ensure PORT is set to 8080
- **Build Failures**: Check Render build logs for Docker build errors

### Frontend Issues

- **API Connection**: Verify VITE_API_BASE_URL is set correctly
- **WebSocket Issues**: Ensure backend supports WebSocket connections
- **Build Failures**: Check Vercel build logs for dependency issues

### Common Problems

1. **CORS Errors**: Add your Vercel domain to backend CORS allowed origins
2. **WebSocket Failures**: Ensure Render supports WebSocket connections (may need paid plan)
3. **Database Timeouts**: Consider using Render's internal database for better performance

## Local Development vs Production

### Local Development
- Frontend: `http://localhost:3000` (with Vite proxy)
- Backend: `http://localhost:8080`
- Database: Local MySQL or H2

### Production
- Frontend: Your Vercel URL
- Backend: Your Render URL
- Database: Render MySQL

## Cost Considerations

- **Render Free Tier**: Limited resources, may sleep when inactive
- **Vercel Free Tier**: Generous limits for hobby projects
- **Database**: Render free MySQL has limited connections

For production usage, consider upgrading to paid plans for better performance and reliability.

## Backup and Maintenance

1. **Database Backups**: Render automatically backs up databases
2. **Code Updates**: Deploy via git push to connected branches
3. **Monitoring**: Set up alerts for service health

## Support

For issues specific to:
- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Spring Boot**: https://spring.io/projects/spring-boot
- **React/Vite**: https://vitejs.dev/guide/
