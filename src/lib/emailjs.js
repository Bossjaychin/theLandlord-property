/**
 * EmailJS integration — The Landlord Property
 *
 * To enable real email delivery:
 * 1. Sign up free at https://emailjs.com
 * 2. Create a service (Gmail / Outlook / etc.)
 * 3. Create two email templates:
 *    a) Guest confirmation — use the variables listed in sendBookingConfirmation()
 *    b) Host alert         — use the variables listed in sendHostAlert()
 * 4. Replace the placeholder IDs below with your real ones.
 *
 * Until real IDs are set, the functions log to the console so you can
 * verify the integration wiring is correct.
 */

import emailjs from "@emailjs/browser";

// ── Configuration ─────────────────────────────────────────────────────────────
// Replace these with your real EmailJS credentials
const EMAILJS_SERVICE_ID  = "service_landlord";   // e.g. "service_abc1234"
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";    // e.g. "user_abc1234"
const TEMPLATE_GUEST      = "template_guest_booking"; // guest confirmation template
const TEMPLATE_HOST       = "template_host_alert";    // host new-booking alert template

// Host email that receives all booking alerts
const HOST_EMAIL = "host@thelandlord.ai";

const IS_DEMO = EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY";

// ── Init ──────────────────────────────────────────────────────────────────────
if (!IS_DEMO) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtNGN = (n) => "₦" + Number(n).toLocaleString();

/**
 * Send booking confirmation to the guest.
 * @param {object} booking  — { id, checkIn, checkOut, nights, totalCost, propertyId, propertyName }
 * @param {object} unit     — { name, district, nightly }
 * @param {string} guestEmail — guest's email address
 */
export async function sendBookingConfirmation(booking, unit, guestEmail = "guest@example.com") {
  const params = {
    to_email:          guestEmail,
    guest_name:        guestEmail.split("@")[0],
    property_name:     unit?.name || booking.propertyName || "Your shortlet",
    property_district: unit?.district || "Abuja",
    check_in:          booking.checkIn,
    check_out:         booking.checkOut,
    nights:            booking.nights,
    total_cost:        fmtNGN(booking.totalCost),
    nightly_rate:      fmtNGN(unit?.nightly || 0),
    confirmation_code: booking.id?.toUpperCase(),
    platform_name:     "The Landlord Property",
    support_email:     "support@thelandlord.ai",
  };

  if (IS_DEMO) {
    console.group("📧 [EmailJS DEMO] Guest Booking Confirmation");
    console.log("Would send to:", guestEmail);
    console.log("Template vars:", params);
    console.groupEnd();
    return { status: "demo", params };
  }

  try {
    const res = await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_GUEST, params);
    console.log("✅ Guest confirmation email sent:", res.status);
    return res;
  } catch (err) {
    console.error("❌ EmailJS guest email failed:", err);
    throw err;
  }
}

/**
 * Send new booking alert to the host.
 * @param {object} booking  — { id, checkIn, checkOut, nights, totalCost, propertyName }
 * @param {object} unit     — { name, district, nightly }
 */
export async function sendHostAlert(booking, unit) {
  const params = {
    to_email:          HOST_EMAIL,
    property_name:     unit?.name || booking.propertyName || "Your property",
    property_district: unit?.district || "Abuja",
    check_in:          booking.checkIn,
    check_out:         booking.checkOut,
    nights:            booking.nights,
    total_cost:        fmtNGN(booking.totalCost),
    confirmation_code: booking.id?.toUpperCase(),
    booking_date:      new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
  };

  if (IS_DEMO) {
    console.group("📧 [EmailJS DEMO] Host Alert");
    console.log("Would send to:", HOST_EMAIL);
    console.log("Template vars:", params);
    console.groupEnd();
    return { status: "demo", params };
  }

  try {
    const res = await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_HOST, params);
    console.log("✅ Host alert email sent:", res.status);
    return res;
  } catch (err) {
    console.error("❌ EmailJS host email failed:", err);
    throw err;
  }
}
