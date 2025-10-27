const nodemailer = require('nodemailer');

// === Transporter para Gmail ===
const gmailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// === Transporter para Outlook/Hotmail ===
const outlookTransporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.OUTLOOK_USER,
    pass: process.env.OUTLOOK_PASS,
  },
});
 
// === Función que elige el transporte correcto ===
async function sendMail({ to, subject, html, text }) {
  const domain = to.split('@')[1]?.toLowerCase();

  const transporter = domain.includes('outlook') || domain.includes('hotmail')
    ? outlookTransporter
    : gmailTransporter;

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@carbid.com',
    to,
    subject,
    html,
    text,
  });

  return info;
}

module.exports = { sendMail };