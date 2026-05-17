# Quick Start: Backend Setup

## What Changed?
The quiz generation now uses a backend server to communicate securely with Apify's API, avoiding CORS errors.

## Quick Setup (3 steps)

### Step 1: Install dependencies
```bash
npm install
```

### Step 2: Create `.env.local` and add your Apify token
```bash
# Copy the example file
cp .env.example .env.local

# Then edit .env.local and paste your Apify API token:
# VITE_APIFY_API_TOKEN=your_token_here
```

Get your token from: https://console.apify.com/account/integrations

### Step 3: Run everything
```bash
npm run dev:all
```

This will start:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## What to Do Next

1. Go to http://localhost:5173 in your browser
2. Upload a module (PDF, TXT, or MD file)
3. Go to the module's Quiz Config page
4. Select quiz type and number of questions
5. Click "Generate Quiz"

## If Something Goes Wrong

**Error: "Could not connect to the backend server"**
- Make sure you ran `npm run dev:all` (not just `npm run dev`)
- Or run `npm run dev:server` in a separate terminal

**Error: "Apify API token not configured"**
- Check that `.env.local` exists in the root directory
- Make sure it has `VITE_APIFY_API_TOKEN=your_actual_token`
- Don't forget to replace with your real token!

**Port 5000 already in use**
- Edit `.env.local` and change `PORT=5000` to a different port
- Then update the frontend URL in Quizconfig.jsx accordingly

## File Structure
```
eduhub/
├── server.js                 ← Backend server (NEW)
├── .env.local               ← Your API token (NEW, not in git)
├── .env.example             ← Template for .env.local (NEW)
├── BACKEND_SETUP.md         ← Full backend documentation (NEW)
├── package.json             ← Updated with backend dependencies
├── src/
│   └── pages/
│       └── Quizconfig.jsx   ← Updated to call backend
```

## More Info
See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for detailed documentation.
