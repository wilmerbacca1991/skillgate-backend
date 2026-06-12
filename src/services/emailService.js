const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const isEmail = (value) => /.+@.+\..+/.test(String(value || '').trim());
const normalize = (value) => String(value || '').trim();

let transporter = null;

const EMAIL_LOGO_CID = 'skillgate-logo@skillgate.local';

const buildFallbackLogoSvg = () => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="320" viewBox="0 0 1200 320" fill="none">',
    '<defs>',
    '<linearGradient id="sgBg" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0%" stop-color="#0B1220"/>',
    '<stop offset="100%" stop-color="#111B31"/>',
    '</linearGradient>',
    '<linearGradient id="sgAccent" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0%" stop-color="#FB923C"/>',
    '<stop offset="100%" stop-color="#FDBA74"/>',
    '</linearGradient>',
    '</defs>',
    '<rect x="12" y="12" width="1176" height="296" rx="44" fill="url(#sgBg)" stroke="#334155" stroke-width="4"/>',
    '<rect x="92" y="72" width="168" height="168" rx="46" fill="#0A162B" stroke="#475569" stroke-width="3"/>',
    '<rect x="128" y="112" width="22" height="90" rx="11" fill="#F8FAFC"/>',
    '<rect x="204" y="112" width="22" height="90" rx="11" fill="url(#sgAccent)"/>',
    '<rect x="156" y="150" width="48" height="14" rx="7" fill="#93C5FD"/>',
    '<text x="312" y="168" fill="#F8FAFC" font-family="Segoe UI,Arial,sans-serif" font-size="92" font-weight="800"><tspan>Skill</tspan><tspan fill="url(#sgAccent)">Gate</tspan></text>',
    '<text x="314" y="218" fill="#94A3B8" font-family="Segoe UI,Arial,sans-serif" font-size="30" letter-spacing="4">AI-POWERED HIRING INTELLIGENCE</text>',
    '</svg>'
  ].join('');

  return svg;
};

const resolveLogoPath = () => {
  const configuredPath = normalize(process.env.EMAIL_LOGO_PATH);
  if (!configuredPath) {
    return '';
  }

  const absolutePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);

  return fs.existsSync(absolutePath) ? absolutePath : '';
};

const getSkillGateLogoSrc = () => {
  const logoPath = resolveLogoPath();
  if (logoPath) {
    return `cid:${EMAIL_LOGO_CID}`;
  }

  const customLogo = normalize(process.env.EMAIL_LOGO_URL);
  if (customLogo) {
    return customLogo;
  }

  return `cid:${EMAIL_LOGO_CID}`;
};

const getLogoAttachments = () => {
  const logoPath = resolveLogoPath();
  if (logoPath) {
    return [
      {
        filename: path.basename(logoPath),
        path: logoPath,
        cid: EMAIL_LOGO_CID,
      },
    ];
  }

  const customLogo = normalize(process.env.EMAIL_LOGO_URL);
  if (customLogo) {
    return [];
  }

  return [
    {
      filename: 'skillgate-logo.svg',
      content: buildFallbackLogoSvg(),
      contentType: 'image/svg+xml',
      cid: EMAIL_LOGO_CID,
    },
  ];
};

const getSmtpConfig = () => {
  const service = normalize(process.env.SMTP_SERVICE).toLowerCase();
  const user = normalize(process.env.SMTP_USER);
  const pass = normalize(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD);

  if (service === 'gmail') {
    const secure = normalize(process.env.SMTP_SECURE).toLowerCase() === 'true';
    const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587));

    return {
      host: normalize(process.env.SMTP_HOST || 'smtp.gmail.com'),
      port,
      secure,
      user,
      pass,
    };
  }

  const host = normalize(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 587);

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
  };
};

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const { host, port, secure, user, pass } = getSmtpConfig();

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  return transporter;
};

const sendInterviewScheduledEmail = async ({
  to,
  candidateName,
  recruiterName,
  scheduledAt,
  timezone,
  durationMinutes,
  roomId,
  meetingLink,
  assessmentTitle,
  notes
}) => {
  const recipient = String(to || '').trim().toLowerCase();
  if (!isEmail(recipient)) {
    return { sent: false, reason: 'invalid-recipient' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@skillgate.local';
  const mailer = getTransporter();
  if (!mailer) {
    return { sent: false, reason: 'smtp-not-configured' };
  }

  const whenText = new Date(scheduledAt).toLocaleString();
  const subject = 'SkillGate Interview Scheduled';
  const logoSrc = getSkillGateLogoSrc();
  const logoAttachments = getLogoAttachments();
  const text = [
    `Hello ${candidateName || 'Candidate'},`,
    '',
    `${recruiterName || 'A recruiter'} has scheduled your interview on SkillGate.`,
    `Date/Time: ${whenText} (${timezone || 'UTC'})`,
    `Duration: ${durationMinutes || 60} minutes`,
    `Assessment: ${assessmentTitle || 'N/A'}`,
    `Room ID: ${roomId}`,
    `Join link: ${meetingLink}`,
    notes ? `Notes: ${notes}` : null,
    '',
    'Please join a few minutes early.'
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <div style="background:#f1f5f9;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
        <p style="margin:0 0 12px;">Hello ${candidateName || 'Candidate'},</p>
        <p style="margin:0 0 14px;"><strong>${recruiterName || 'A recruiter'}</strong> has scheduled your interview on SkillGate.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 14px;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Date/Time:</strong> ${whenText} (${timezone || 'UTC'})</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Duration:</strong> ${durationMinutes || 60} minutes</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Assessment:</strong> ${assessmentTitle || 'N/A'}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Room ID:</strong> ${roomId}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Join link:</strong> <a href="${meetingLink}">${meetingLink}</a></td></tr>
          ${notes ? `<tr><td style="padding:8px 0;"><strong>Notes:</strong> ${notes}</td></tr>` : ''}
        </table>
        <p style="margin:0;color:#334155;">Please join a few minutes early.</p>
        <div style="margin-top:22px;border-top:1px solid #e2e8f0;padding-top:18px;">
          <img src="${logoSrc}" alt="SkillGate logo" style="display:block;width:560px;max-width:100%;height:auto;margin:0 auto;" />
        </div>
      </div>
    </div>
  `;

  await mailer.sendMail({
    from,
    to: recipient,
    subject,
    text,
    html,
    attachments: logoAttachments,
  });

  return { sent: true };
};

module.exports = {
  sendInterviewScheduledEmail
};
