# SkillGate Backend

Express + MongoDB + Socket.IO backend for SkillGate.

## Interview Email Setup (Gmail)

The interview scheduling flow can send an email invite automatically when a recipient email is available.

1. In your Google account, enable 2-Step Verification.
2. Generate an App Password for Mail.
3. Set these variables in `.env`:

```env
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your.address@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM=SkillGate <your.address@gmail.com>
WEB_APP_URL=http://localhost:5173
EMAIL_LOGO_URL=https://your-domain.com/skillgate-logo.png
EMAIL_LOGO_PATH=src/assets/skillgate-logo-email.svg
```

Notes:
- Use App Password, not your normal Gmail password.
- For TLS on port 465, set `SMTP_PORT=465` and `SMTP_SECURE=true`.
- `EMAIL_LOGO_PATH` is optional. If set and the file exists, email invites embed that local image directly (best for reliable rendering).
- `EMAIL_LOGO_URL` is optional. If `EMAIL_LOGO_PATH` is not set, invites can load a hosted official logo URL.
- If neither is set, SkillGate uses a built-in high-resolution branded fallback logo.

## How To Test With A Real Inbox

1. Start backend and frontend.
2. Log in as recruiter.
3. Open Schedule Interview.
4. Enter candidate email (or rely on candidate profile email).
5. Schedule the interview.
6. Confirm schedule response includes `emailDelivery.sent: true`.
7. Check inbox (and spam/junk) for subject `SkillGate Interview Scheduled`.
