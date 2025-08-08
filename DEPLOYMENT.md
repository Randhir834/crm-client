# Deployment Configuration

## Environment Variables

To deploy the frontend to work with your Render server, you need to set the following environment variable:

### For Production Deployment:
Set the environment variable `REACT_APP_API_URL` to your deployed server URL:

```
REACT_APP_API_URL=https://your-app-name.onrender.com
```

### For Local Development:
Create a `.env` file in the client directory with:
```
REACT_APP_API_URL=http://localhost:5001
```

## Deployment Steps

1. **For Render Frontend Deployment:**
   - Set the environment variable `REACT_APP_API_URL` to your server URL
   - Build command: `npm run build`
   - Publish directory: `build`

2. **For Vercel:**
   - Add environment variable in Vercel dashboard
   - Deploy automatically from GitHub

3. **For Netlify:**
   - Add environment variable in Netlify dashboard
   - Deploy from build folder

## Important Notes

- The API configuration now uses `process.env.REACT_APP_API_URL` with a fallback to localhost
- Make sure your server on Render is accessible via HTTPS
- CORS should be configured on your server to allow requests from your frontend domain 