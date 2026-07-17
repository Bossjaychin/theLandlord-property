/**
 * emailHelper.js
 * Sends transactional email via Nodemailer (Gmail OAuth2 App Password transport).
 *
 * Setup:
 *   1. Set the secrets in Firebase:
 *      firebase functions:secrets:set GMAIL_USER   (e.g. admin@thelandlordproperty.com)
 *      firebase functions:secrets:set GMAIL_PASS   (16-char Google App Password)
 *   2. The GMAIL_USER account must have "Less secure app access" OR
 *      use a Google App Password (recommended).
 *
 * In production you can swap this for SendGrid / Mailgun by replacing
 * the transporter without touching any other file.
 */

const nodemailer = require("nodemailer");

/**
 * Build a Nodemailer transporter using Gmail App Password credentials
 * stored as Firebase Function secrets.
 */
function createTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!gmailUser || !gmailPass) {
    console.warn("[emailHelper] GMAIL_USER or GMAIL_PASS secret is not set. Emails will be skipped.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
}

/**
 * Send an email. Fails gracefully — never throws so it doesn't break the
 * surrounding Cloud Function if email delivery fails.
 *
 * @param {object} opts
 * @param {string}   opts.to      - Recipient address
 * @param {string}   opts.subject - Email subject
 * @param {string}   opts.text    - Plain-text body
 * @param {string}  [opts.html]   - Optional HTML body (falls back to text)
 */
async function sendEmail({ to, subject, text, html }) {
  const transporter = createTransporter();
  if (!transporter) return; // secrets not configured — skip silently

  const from = `"The Landlord Property AI" <${process.env.GMAIL_USER}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || `<pre style="font-family:sans-serif">${text}</pre>`,
    });
    console.log(`[emailHelper] Email sent to ${to}: ${info.messageId}`);
  } catch (err) {
    // Non-fatal — log and continue
    console.error(`[emailHelper] Failed to send email to ${to}:`, err.message);
  }
}

module.exports = { sendEmail };
