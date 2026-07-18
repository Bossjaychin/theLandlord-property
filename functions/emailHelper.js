/**
 * emailHelper.js
 * Sends transactional email via Resend API.
 *
 * Setup:
 *   1. Set the secret in Firebase:
 *      firebase functions:secrets:set RESEND_API_KEY
 *   2. Ensure the custom domain 'send.thelandlordproperty.com' is verified in Resend dashboard.
 */

const { Resend } = require("resend");

/**
 * Send an email using Resend. Fails gracefully — never throws so it doesn't break the
 * surrounding Cloud Function if email delivery fails.
 *
 * @param {object} opts
 * @param {string}   opts.to      - Recipient address
 * @param {string}   opts.subject - Email subject
 * @param {string}   opts.text    - Plain-text body
 * @param {string}  [opts.html]   - Optional HTML body (falls back to text)
 */
async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("[emailHelper] RESEND_API_KEY secret is not set. Emails will be skipped.");
    return;
  }

  const resend = new Resend(apiKey);
  const from = "The Landlord Property AI <notifications@send.thelandlordproperty.com>";

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html: html || `<pre style="font-family:sans-serif">${text}</pre>`,
    });

    if (response.error) {
      console.error(`[emailHelper] Resend API error sending email to ${to}:`, response.error);
    } else {
      console.log(`[emailHelper] Email sent successfully via Resend to ${to}. ID: ${response.data?.id}`);
    }
  } catch (err) {
    console.error(`[emailHelper] Failed to send email to ${to}:`, err.message);
  }
}

module.exports = { sendEmail };

