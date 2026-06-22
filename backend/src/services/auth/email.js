const nodemailer = require("nodemailer");

const hasSmtpConfig = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendVerificationOtp = async ({ email, firstName, otp }) => {
  const appName = process.env.APP_NAME || "Creo";
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  // SAFEGUARD WARNING: The fallback to console log for OTP delivery is STRICTLY for local development.
  // In production, SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables MUST be configured.
  // Do not deploy to production without active SMTP credentials as email delivery will fail and expose OTPs in logs.
  if (!hasSmtpConfig()) {
    console.warn(`[AUTH OTP DEV MODE] ${email}: ${otp}`);
    return { delivered: false, devMode: true };
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from,
    to: email,
    subject: `Verify Your Creo Account`,
    text: `
Hi ${firstName || "there"},

Welcome to Creo.

Your verification code is:

${otp}

This code will expire in 10 minutes.

For your security, never share this code with anyone.

If you did not create a Creo account, you can safely ignore this email.

— Team Creo
`,
    html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#111827">
      <h2 style="margin-bottom:10px;">Welcome to Creo 🚀</h2>

      <p>Hi ${firstName || "there"},</p>

      <p>Use the verification code below to complete your account setup:</p>

      <div style="
        background:#f3f4f6;
        padding:20px;
        border-radius:12px;
        text-align:center;
        margin:20px 0;
      ">
        <span style="
          font-size:32px;
          font-weight:700;
          letter-spacing:8px;
          color:#111827;
        ">
          ${otp}
        </span>
      </div>

      <p><strong>This code expires in 10 minutes.</strong></p>

      <p>For your security, do not share this code with anyone.</p>

      <p>If you did not create a Creo account, you can safely ignore this email.</p>

      <br>

      <p>— Team Creo</p>
    </div>
  `
  });

  return { delivered: true, devMode: false };
};

const sendPasswordResetOtp = async ({ email, firstName, otp }) => {
  const appName = process.env.APP_NAME || "Creo";
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  // SAFEGUARD WARNING: The fallback to console log for OTP delivery is STRICTLY for local development.
  // In production, SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables MUST be configured.
  // Do not deploy to production without active SMTP credentials as email delivery will fail and expose OTPs in logs.
  if (!hasSmtpConfig()) {
    console.warn(`[PASSWORD RESET OTP DEV MODE] ${email}: ${otp}`);
    return { delivered: false, devMode: true };
  }

  const transporter = createTransporter();
  await transporter.sendMail({
    from,
    to: email,
    subject: `${appName} password reset code`,
    text: `Hi ${firstName || "there"},\n\nYour ${appName} password reset code is ${otp}.\n\nThis code expires in 10 minutes. If you did not request it, ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <p>Hi ${firstName || "there"},</p>
        <p>Your ${appName} password reset code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request it, ignore this email.</p>
      </div>
    `
  });

  return { delivered: true, devMode: false };
};

module.exports = {
  sendVerificationOtp,
  sendPasswordResetOtp
};
