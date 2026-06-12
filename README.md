# SkillGate Backend

Backend service for SkillGate technical interview platform.

## Stack

- Node.js
- Express
- MongoDB Atlas + Mongoose
- Passport JWT auth
- Socket.IO
- Nodemailer

## Run Locally

1. Install dependencies:

```powershell
npm install
```

2. Create .env and configure required values:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
NODE_ENV=development

OPENAI_API_KEY=optional_openai_key
OPENAI_MODEL=gpt-4o-mini
AI_PROVIDER=openai
HUGGINGFACE_API_KEY=optional_huggingface_key
HUGGINGFACE_MODEL=Qwen/Qwen2.5-7B-Instruct
AI_HINT_LIMIT=3

SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.address@gmail.com
SMTP_PASS=your_16_char_gmail_app_password
SMTP_FROM=SkillGate <your.address@gmail.com>
WEB_APP_URL=http://localhost:5173
```

3. Start backend:

```powershell
npm run dev
```

4. Health check:

- http://localhost:5000/health

## Scripts

- npm run dev
- npm run start
- npm run test
- npm run seed:data

## Seed Data

```powershell
npm run seed:data
```

Creates recruiter/candidate test users plus sample challenge and assessment data.

Default seeded credentials:

- Recruiter: mia.recruiter@test.com / Password123!
- Candidate: jamie.candidate@test.com / Password123!

## Interview Email Delivery

Interview scheduling returns an emailDelivery object in response payload.

Example:

```json
{
	"message": "Interview scheduled successfully",
	"emailDelivery": {
		"sent": false,
		"reason": "send-failed"
	}
}
```

Known reason values:

- no-recipient
- invalid-recipient
- smtp-not-configured
- smtp-auth-failed
- send-failed

## Gmail Setup Notes

1. Enable 2-Step Verification on Google account.
2. Create a Gmail App Password.
3. Use that app password in SMTP_PASS.

Important:

- Do not use your normal Gmail password.
- SMTP_FROM is display header only; SMTP_USER/SMTP_PASS are the actual SMTP credentials.
- For SSL/TLS on port 465 use SMTP_PORT=465 and SMTP_SECURE=true.

## Auth Notes

- Access tokens include user identity and role claims.
- Protected routes use Passport JWT middleware.
- Recruiter/admin route restrictions are enforced in role middleware.

## Production Notes (Render)

- Ensure backend has trust proxy enabled for rate-limit compatibility.
- Ensure MongoDB credentials and Atlas network access are valid.
- Ensure all SMTP variables are set and then redeploy service.
- If protected routes return 401, clear stale web sessions and log in again.

## Test

```powershell
npm run test
```

Smoke suite validates grading, AI fallback, attempt summary, feature flow, and architecture boundaries.
