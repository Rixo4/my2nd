# TradeWise Deployment Guide

## Deployment Options

### Option 1: Vercel (Recommended for Frontend + Backend)

#### Prerequisites
- Vercel account (free at vercel.com)
- GitHub account with the project pushed

#### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the `vercel.json` configuration
   - Add environment variables:
     ```
     VITE_SERPER_API_KEY=your_serper_api_key
     VITE_BINANCE_API_KEY=your_binance_api_key
     VITE_GEMINI_API_KEY=your_gemini_api_key
     ```
   - Click "Deploy"

3. **Environment Variables**
   - Go to Project Settings > Environment Variables
   - Add the following variables:
     - `VITE_SERPER_API_KEY`
     - `VITE_BINANCE_API_KEY`
     - `VITE_GEMINI_API_KEY`

### Option 2: Render (Alternative for Full-Stack)

#### Prerequisites
- Render account (free at render.com)
- GitHub account with the project pushed

#### Steps

1. **Deploy Backend**
   - Go to [render.com](https://render.com)
   - Click "New" > "Web Service"
   - Connect your GitHub repository
   - Set:
     - Root Directory: `server`
     - Build Command: `npm install`
     - Start Command: `node server.js`
   - Add environment variables as needed

2. **Deploy Frontend**
   - Create another Web Service
   - Set:
     - Root Directory: `client`
     - Build Command: `npm install && npm run build`
     - Start Command: `npm run preview`
   - Add environment variables:
     - `VITE_SERPER_API_KEY`
     - `VITE_BINANCE_API_KEY`
     - `VITE_GEMINI_API_KEY`

### Option 3: Netlify + External Backend

#### Frontend on Netlify
- Push to GitHub
- Connect Netlify to GitHub
- Set build directory: `client/dist`
- Set build command: `cd client && npm install && npm run build`
- Add environment variables in Netlify dashboard

#### Backend on Render/Railway
- Deploy backend separately on Render or Railway
- Update frontend API URLs to point to deployed backend

## Environment Variables

Required for production:
- `VITE_SERPER_API_KEY` - For news fetching
- `VITE_BINANCE_API_KEY` - For Binance API (optional, for higher rate limits)
- `VITE_GEMINI_API_KEY` - For ChatBot AI features

## Post-Deployment Checklist

- [ ] Test all features on deployed URL
- [ ] Verify environment variables are loaded
- [ ] Test ChatBot functionality
- [ ] Test real-time data connections
- [ ] Verify news fetching works
- [ ] Check mobile responsiveness
- [ ] Test pattern detection
- [ ] Verify all navigation links work

## Troubleshooting

### Build Errors
- Check `package.json` scripts are correct
- Verify all dependencies are installed
- Check for any missing environment variables

### Runtime Errors
- Check browser console for errors
- Verify API keys are correctly configured
- Check backend server logs
- Ensure CORS is properly configured

### ChatBot Not Working
- Verify `VITE_GEMINI_API_KEY` is set
- Check Gemini API key is valid
- Ensure model name is correct (gemini-1.5-flash)
