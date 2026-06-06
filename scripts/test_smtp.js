const nodemailer = require("nodemailer");
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

console.log("SMTP Config:");
console.log("Host:", process.env.SMTP_HOST);
console.log("Port:", process.env.SMTP_PORT);
console.log("Secure:", process.env.SMTP_SECURE);
console.log("User:", process.env.SMTP_USER);
console.log("Pass (exists):", !!process.env.SMTP_PASS);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function main() {
  try {
    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("SMTP connection verified successfully!");
    
    console.log("Sending a test email to:", process.env.SMTP_USER);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: "SMTP Verification Test",
      text: "This is a test to verify Nodemailer SMTP functionality."
    });
    console.log("Email sent successfully! MessageId:", info.messageId);
  } catch (err) {
    console.error("SMTP Test Error:", err);
  }
}

main();
