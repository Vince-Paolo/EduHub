# EduHub Backend Setup

## Overview
The quiz generation feature now uses a Node.js/Express backend server to communicate with the Apify API. This avoids CORS (Cross-Origin Resource Sharing) errors that occur when making API calls directly from the browser.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

This installs both frontend and backend dependencies, including:
- `express` - Web server framework
- `cors` - Cross-Origin Resource Sharing middleware
- `dotenv` - Environment variable management
- `concurrently` - Run multiple npm scripts simultaneously

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env.local`:
```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your Apify API token plus your email/OAuth settings:
```
PORT=5000
VITE_APIFY_API_TOKEN=your_actual_token_here

# Gmail OAuth (preferred) or SMTP credentials for sending Email OTPs
GMAIL_OAUTH_CLIENT_ID=your_gmail_oauth_client_id
GMAIL_OAUTH_CLIENT_SECRET=your_gmail_oauth_client_secret
GMAIL_OAUTH_REFRESH_TOKEN=your_gmail_oauth_refresh_token
GMAIL_OAUTH_ACCESS_TOKEN=your_gmail_oauth_access_token
GMAIL_OAUTH_EMAIL=your_email@gmail.com

# Optional SMTP fallback
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
EMAIL_SERVICE=gmail
```

**How to get your Apify API token:**
1. Go to https://console.apify.com/account/integrations
2. Copy your API token
3. Paste it into the `.env.local` file

**How to enable Gmail OTP delivery:**
- Preferred: configure Gmail OAuth values (`GMAIL_OAUTH_*`)
- Fallback: use `EMAIL_USER` + `EMAIL_PASSWORD` with a Gmail app password
- If you do not set these, the app may log OTPs to the console instead of sending real email

### 3. Run the Application

#### Option A: Run both frontend and backend together
```bash
npm run dev:all
```

This starts:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:5000 (Express API server)

#### Option B: Run them separately

In Terminal 1 (Frontend):
```bash
npm run dev
```

In Terminal 2 (Backend):
```bash
npm run dev:server
```

## How It Works

### Architecture
```
User Browser
    ↓ (HTTP Request)
Frontend (React) at http://localhost:5173
    ↓ (POST /api/generate-quiz)
Backend (Express) at http://localhost:5000
    ↓ (HTTPS Request)
Apify API (https://api.apify.com)
```

### Quiz Generation Flow
1. User uploads a module file (PDF, TXT, or MD)
2. User selects quiz type and number of questions
3. User clicks "Generate Quiz"
4. **Frontend** extracts text from the file and sends it to the backend
5. **Backend** communicates with Apify's API securely (API token is safe server-side)
6. **Backend** polls Apify until quiz generation completes
7. **Backend** returns generated questions to frontend
8. **Frontend** displays the quiz to the user

### API Endpoints

#### Generate Quiz
- **URL**: `POST /api/generate-quiz`
- **Request body**:
  ```json
  {
    "fileContent": "The extracted text from the uploaded file...",
    "quizType": "multiple_choice|identification|mixed",
    "count": 10
  }
  ```
- **Response**:
  ```json
  {
    "questions": [
      {
        "type": "multiple_choice",
        "question": "What is...",
        "options": ["A", "B", "C", "D"],
        "answer": 0,
        "explanation": "..."
      }
    ]
  }
  ```

#### Health Check
- **URL**: `GET /api/health`
- **Response**: `{ "status": "ok" }`

## Troubleshooting

### "Could not connect to the backend server"
- Make sure the backend is running: `npm run dev:server`
- Check that it's running on http://localhost:5000
- Verify port 5000 is not in use by another application

### "Apify API token not configured"
- Ensure `.env.local` exists (copy from `.env.example`)
- Verify `VITE_APIFY_API_TOKEN` is set with a valid token
- The backend reads from `.env.local`, not `.env`

### "Quiz generation timed out"
- The Apify actor took too long to process
- Try with fewer questions or a smaller file
- Check Apify API status at https://status.apify.com

## Development Notes

- The backend uses Express.js for simplicity
- CORS is enabled for localhost development
- Environment variables are loaded from `.env.local` using `dotenv`
- For production, implement proper error handling, rate limiting, and authentication
- The backend currently runs on the same machine; for production, deploy separately

## Future Improvements

- Add authentication (to prevent unauthorized API usage)
- Implement request validation and sanitization
- Add rate limiting to prevent abuse
- Deploy backend to a cloud service (Heroku, Vercel, AWS, etc.)
- Add caching for frequently generated quizzes
- Implement webhook notifications for long-running quiz generation
