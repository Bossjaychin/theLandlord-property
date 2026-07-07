import React, { useState, useMemo, useRef, useEffect } from "react";
import { dataConnect, ai, aiModel } from "./lib/firebase";
import { getGenerativeModel } from "firebase/ai";
import { listAllProperties, createBooking } from "./lib/dataconnect";
import { sendBookingConfirmation, sendHostAlert } from "./lib/emailjs";

/* ============================================================
   AI SHORTLET OPERATIONS — Updated Flow
   - Unauthenticated users can browse available apartments & features.
   - Viewing calendar & booking requires Guest login/account.
   - Posting apartments requires Owner account & KYC verification.
   ============================================================ */

const T = {
  ink: "#0C2B1F",
  green: "#0E5A3A",
  greenDark: "#0A422B",
  mint: "#E7F2EC",
  gold: "#C9A227",
  goldSoft: "#F6EFD8",
  amber: "#B4540A",
  amberSoft: "#FBEEDF",
  teal: "#0E6B75",
  tealSoft: "#E3F0F2",
  paper: "#F5F6F2",
  card: "#FFFFFF",
  line: "#E2E5DF",
  sub: "#5B6A61",
  risk: "#B3261E",
  riskSoft: "#FBEAE8",
};

const fmtN = (n, cur) => {
  if (cur === "USD") {
    const v = n / 1550;
    return v >= 1000 ? "$" + Math.round(v).toLocaleString() : "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "m";
  return "₦" + n.toLocaleString();
};

const fmtDate = (d) => d.toISOString().split("T")[0];
const parseDate = (s) => new Date(s + "T00:00:00");

const CategoryIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MOCK_UNITS = [
  { id: "u1", name: "Guzape Hillview 2-Bed", district: "Guzape", nightly: 120000, occ: 0.74, monthNet: 1920000, rating: 4.8, code: "GZ-102", wifi: "Guzape_Hillview_5G / guestpass2026", lockStatus: "Locked (Battery 92%)", lockIp: "192.168.100.41", features: ["Automatic generator", "24/7 solar backup", "Fibre WiFi", "Biometric estate gate"] },
  { id: "u2", name: "Jabi Lakeside Studio", district: "Jabi", nightly: 58000, occ: 0.81, monthNet: 980000, rating: 4.9, code: "JB-09", wifi: "Jabi_Lakeside / lakeview99", lockStatus: "Locked (Battery 88%)", lockIp: "192.168.100.12", features: ["Lake access view", "Booster water pump", "24/7 security", "Inverter system"] }
];

// Existing mock booked ranges (always occupied)
const BOOKED_RANGES = [
  { propertyId: "u1", start: "2026-07-09", end: "2026-07-11", guest: "K. Adeyemi" },
  { propertyId: "u2", start: "2026-07-06", end: "2026-07-07", guest: "Chidera O." },
];

const MOCK_CALENDAR_PRICES = {
  "u1": { base: 120000, surge: { "2026-07-09": 1.32, "2026-07-10": 1.36, "2026-07-11": 1.28 } },
  "u2": { base: 58000, surge: { "2026-07-08": 1.18, "2026-07-12": 1.19 } },
};

const MOCK_CALENDAR = [
  { date: "Jul 09", status: "Booked", price: 158400, guest: "K. Adeyemi" },
  { date: "Jul 10", status: "Booked", price: 163200, guest: "K. Adeyemi" },
  { date: "Jul 11", status: "Available", price: 153600, guest: null },
  { date: "Jul 12", status: "Available", price: 120000, guest: null },
  { date: "Jul 13", status: "Available", price: 120000, guest: null },
];

const Pill = ({ children, bg, color, border }) => (
  <span style={{
    background: bg, color,
    border: border ? `1px solid ${border}` : "none",
    borderRadius: 999, padding: "3.5px 11px",
    fontSize: 11, fontWeight: 700, letterSpacing: 0.2,
    whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5,
  }}>
    {children}
  </span>
);

const SectionLabel = ({ children, color = T.green }) => (
  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color, marginBottom: 8 }}>
    {children}
  </div>
);

/* ── Interactive Booking Calendar ── */
function BookingCalendar({ unit, usingEmulator, onBookingConfirmed, activeBookings }) {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [booking, setBooking] = useState(false); // loading state
  const [confirmed, setConfirmed] = useState(null); // confirmed booking object

  // Build July 2026 calendar grid
  const YEAR = 2026, MONTH = 6; // 0-indexed = July
  const firstDay = new Date(YEAR, MONTH, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(YEAR, MONTH + 1, 0).getDate();

  // All booked date strings for this unit (mock + db)
  const bookedDates = useMemo(() => {
    const set = new Set();
    // Mock ranges
    BOOKED_RANGES.filter(r => r.propertyId === unit.id).forEach(r => {
      let d = parseDate(r.start);
      const end = parseDate(r.end);
      while (d <= end) { set.add(fmtDate(d)); d.setDate(d.getDate() + 1); }
    });
    // DB bookings for this unit
    (activeBookings || []).forEach(b => {
      let d = parseDate(b.checkIn);
      const end = parseDate(b.checkOut);
      while (d <= end) { set.add(fmtDate(d)); d.setDate(d.getDate() + 1); }
    });
    return set;
  }, [unit.id, activeBookings]);

  const getPriceForDate = (dateStr) => {
    const priceData = MOCK_CALENDAR_PRICES[unit.id];
    if (!priceData) return unit.nightly;
    const surge = priceData.surge[dateStr] || 1;
    return Math.round(priceData.base * surge);
  };

  const isBooked = (dateStr) => bookedDates.has(dateStr);
  const isInRange = (dateStr) => {
    if (!checkIn) return false;
    const end = checkOut || hoveredDate;
    if (!end) return false;
    const d = parseDate(dateStr);
    const s = parseDate(checkIn);
    const e = parseDate(end);
    return d > s && d < e;
  };

  const isSelected = (dateStr) => dateStr === checkIn || dateStr === checkOut;

  const handleDayClick = (dateStr) => {
    if (isBooked(dateStr)) return;
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr);
      setCheckOut(null);
      setConfirmed(null);
    } else {
      if (dateStr <= checkIn) { setCheckIn(dateStr); setCheckOut(null); return; }
      // Check no booked dates in range
      let d = parseDate(checkIn);
      const end = parseDate(dateStr);
      d.setDate(d.getDate() + 1);
      while (d < end) {
        if (bookedDates.has(fmtDate(d))) {
          setCheckIn(dateStr); setCheckOut(null); return;
        }
        d.setDate(d.getDate() + 1);
      }
      setCheckOut(dateStr);
    }
  };

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.round((parseDate(checkOut) - parseDate(checkIn)) / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  const totalCost = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    let total = 0;
    let d = parseDate(checkIn);
    const end = parseDate(checkOut);
    while (d < end) {
      total += getPriceForDate(fmtDate(d));
      d.setDate(d.getDate() + 1);
    }
    return total;
  }, [checkIn, checkOut, unit.id]);

  const handleConfirmBooking = async () => {
    if (!checkIn || !checkOut) return;
    setBooking(true);
    try {
      if (usingEmulator) {
        // Try to write to Firebase Data Connect
        const unitIdIsUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unit.id);
        if (unitIdIsUUID) {
          await createBooking(dataConnect, { propertyId: unit.id, checkIn, checkOut });
        }
      }
      // Always record locally
      const newBooking = { id: "bk-" + Date.now(), propertyId: unit.id, propertyName: unit.name, checkIn, checkOut, nights, totalCost, status: "Confirmed" };
      setConfirmed(newBooking);
      setCheckIn(null);
      setCheckOut(null);
      if (onBookingConfirmed) onBookingConfirmed(newBooking);
    } catch (e) {
      console.error("Booking error:", e);
    } finally {
      setBooking(false);
    }
  };

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = fmtDate(new Date());

  return (
    <div>
      <style>{`
        @keyframes calFadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Confirmed banner */}
      {confirmed && (
        <div style={{ background: T.mint, border: `1px solid ${T.green}33`, borderRadius: 14, padding: "14px 18px", marginBottom: 16, animation: "calFadeIn .3s ease", display: "flex", gap: 12, alignItems: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.green }}>Booking Confirmed!</div>
            <div style={{ fontSize: 12.5, color: T.greenDark, marginTop: 3 }}>
              {confirmed.checkIn} → {confirmed.checkOut} · {confirmed.nights} nights · {fmtN(confirmed.totalCost, "NGN")}
            </div>
            <div style={{ fontSize: 11.5, color: T.sub, marginTop: 4 }}>Confirmation code: #{confirmed.id.toUpperCase()}</div>
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 16, color: T.ink }}>July 2026</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Pill bg={T.mint} color={T.green}>✓ Available</Pill>
          <Pill bg={T.riskSoft} color={T.risk}>Booked</Pill>
          <Pill bg={T.goldSoft} color="#7A5800">Selected</Pill>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: T.sub, padding: "4px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="booking-cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={"empty-" + i} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${YEAR}-07-${String(day).padStart(2, "0")}`;
          const booked = isBooked(dateStr);
          const selected = isSelected(dateStr);
          const inRange = isInRange(dateStr);
          const isToday = dateStr === today;
          const isPast = dateStr < today;

          let bg = "#fff";
          let color = T.ink;
          let borderColor = T.line;
          if (booked || isPast) { bg = T.paper; color = T.sub; }
          if (booked) { bg = T.riskSoft; color = T.risk; }
          if (inRange) { bg = T.mint; color = T.greenDark; borderColor = T.green + "40"; }
          if (selected) { bg = T.gold; color = "#fff"; borderColor = T.gold; }
          if (isToday && !selected) { borderColor = T.green; }

          return (
            <button
              key={dateStr}
              id={`cal-day-${day}`}
              className="booking-cal-cell"
              onClick={() => !isPast && handleDayClick(dateStr)}
              onMouseEnter={() => checkIn && !checkOut && setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
              disabled={booked || isPast}
              title={booked ? "Booked" : `${fmtN(getPriceForDate(dateStr), "NGN")}/night`}
              style={{
                background: bg,
                color,
                border: `1.5px solid ${borderColor}`,
                borderRadius: 8,
                padding: "8px 4px 6px",
                cursor: booked || isPast ? "not-allowed" : "pointer",
                fontWeight: selected ? 800 : isToday ? 700 : 500,
                fontSize: 12.5,
                textAlign: "center",
                transition: "all .12s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                opacity: isPast ? 0.4 : 1,
                scale: "1",
              }}
            >
              <span>{day}</span>
              {!booked && !isPast && (
                <span className="booking-cal-cell-price" style={{ fontSize: 8.5, opacity: 0.7, letterSpacing: -0.2 }}>
                  {fmtN(getPriceForDate(dateStr), "NGN").replace("₦", "₦").replace("000", "k")}
                </span>
              )}
              {booked && <span style={{ fontSize: 8 }}>✗</span>}
            </button>
          );
        })}
      </div>

      {/* Booking summary & CTA */}
      <div style={{ marginTop: 16, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 12, padding: "14px 16px" }}>
        {!checkIn && (
          <p style={{ margin: 0, fontSize: 13, color: T.sub, textAlign: "center" }}>Click a date to set your check-in, then select check-out</p>
        )}
        {checkIn && !checkOut && (
          <p style={{ margin: 0, fontSize: 13, color: T.ink, textAlign: "center" }}>
            <b>Check-in:</b> {checkIn} — Now select your check-out date
          </p>
        )}
        {checkIn && checkOut && (
          <div>
            <div className="booking-summary-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
              {[
                ["Check-in", checkIn],
                ["Check-out", checkOut],
                ["Total", `${nights} nights · ${fmtN(totalCost, "NGN")}`],
              ].map(([k, v]) => (
                <div key={k} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{k}</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 13, color: T.ink, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
            <button
              id="confirm-booking-btn"
              onClick={handleConfirmBooking}
              disabled={booking}
              style={{
                width: "100%",
                background: booking ? T.sub : T.green,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "13px",
                fontWeight: 700,
                fontSize: 14,
                cursor: booking ? "not-allowed" : "pointer",
                transition: "all .15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {booking ? (
                <>
                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                  Confirming via escrow...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Confirm Booking — {fmtN(totalCost, "NGN")}
                </>
              )}
            </button>
            <button
              onClick={() => { setCheckIn(null); setCheckOut(null); }}
              style={{ width: "100%", background: "transparent", border: "none", color: T.sub, fontSize: 12.5, cursor: "pointer", marginTop: 6, padding: "4px" }}
            >
              Clear selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Dedicated model for structured JSON shortlet pricing recommendations
const pricingModel = getGenerativeModel(ai, {
  model: "gemini-3.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

export default function ShortletView({ cur, usingEmulator, user: _fbUser }) {
  // Local auth simulation states
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("browse");

  // Auth Form Modal
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authIntent, setAuthIntent] = useState("");
  const [authRole, setAuthRole] = useState("guest");
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [authMode, setAuthMode] = useState("signin");

  // Host state
  const [myUnits, setMyUnits] = useState(MOCK_UNITS);
  const [hostPostMode, setHostPostMode] = useState(false);
  const [newUnitForm, setNewUnitForm] = useState({ name: "", district: "Jabi", nightly: "", wifi: "", features: "" });
  const [uploadedImages, setUploadedImages] = useState([]);
  const [kycSimulating, setKycSimulating] = useState(false);

  // Booking state
  const [selectedUnitForCal, setSelectedUnitForCal] = useState(null);
  const [myBookings, setMyBookings] = useState([]); // guest's confirmed bookings
  const [dbBookings, setDbBookings] = useState([]); // from Data Connect
  const [bookingToast, setBookingToast] = useState(null);

  const [guestMessages, setGuestMessages] = useState([
    { sender: "ai", text: "Hello! I am your 24/7 Guest Assistant powered by Gemini AI. Ask about WiFi, generator, gate codes, or checkout." }
  ]);
  const [guestChatInp, setGuestChatInp] = useState("");
  const [guestChatTyping, setGuestChatTyping] = useState(false);
  const guestChatHistoryRef = useRef([]);
  const [guestSelfie, setGuestSelfie] = useState(null);
  const [guestIdDoc, setGuestIdDoc] = useState(null);
  const [kycCheckinDone, setKycCheckinDone] = useState(false);

  // AI Pricing state
  const [pricingUnit, setPricingUnit] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingData, setPricingData] = useState(null);

  const fetchAiPricing = async (unit) => {
    setPricingUnit(unit);
    setPricingLoading(true);
    setPricingData(null);
    try {
      const prompt = `You are a Nigerian shortlet pricing analyst for The Landlord Property in Abuja.
Given the property details, generate AI-optimised nightly rate recommendations.

Property:
- District: ${unit.district || 'Jabi'}
- Base nightly rate: ₦${Number(unit.nightly || 0).toLocaleString()}
- Current occupancy: ${Math.round((unit.occ || 0.7) * 100)}%
- Features: ${(unit.features || []).join(', ') || 'AC, Generator, Smart lock'}
- Month: ${new Date().toLocaleString('en-NG', { month: 'long' })}

Return valid JSON ONLY:
{
  "recommendations": [
    { "period": "string", "rate": number, "reasoning": "string" },
    { "period": "string", "rate": number, "reasoning": "string" },
    { "period": "string", "rate": number, "reasoning": "string" },
    { "period": "string", "rate": number, "reasoning": "string" }
  ],
  "projectedMonthlyNet": number,
  "insight": "string (2 sentences on market conditions for this district this month)"
}`;

      const result = await pricingModel.generateContent(prompt);
      const text = result.response.text();
      const data = JSON.parse(text);
      setPricingData(data);
    } catch (err) {
      console.error("[Firebase AI] Client-side pricing error:", err);
      setPricingData({ error: true });
    } finally {
      setPricingLoading(false);
    }
  };

  const chatEndRef = useRef(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [guestMessages]);

  // Load bookings from DB if emulator active
  useEffect(() => {
    if (!usingEmulator) return;
    const load = async () => {
      try {
        const res = await listAllProperties(dataConnect, { checkIn: "2026-07-01", checkOut: "2026-07-31" });
        const bookingsFlat = (res?.data?.properties || []).flatMap(p =>
          (p.bookings_on_property || []).map(b => ({ ...b, propertyId: p.id }))
        );
        setDbBookings(bookingsFlat);
      } catch (e) {
        console.warn("Could not load DB bookings:", e);
      }
    };
    load();
  }, [usingEmulator]);

  // Computed checks
  const loggedIn = !!currentUser;
  const isHost = loggedIn && currentUser.role === "host";
  const isGuest = loggedIn && currentUser.role === "guest";
  const isVerifiedHost = isHost && currentUser.kycVerified;

  const triggerAuthGate = (roleType, intent) => {
    setAuthRole(roleType);
    setAuthIntent(intent);
    setShowAuthGate(true);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!emailInput || !passInput) return;
    const newUser = { email: emailInput, role: authRole, kycVerified: authRole === "host" ? false : true };
    setCurrentUser(newUser);
    setShowAuthGate(false);
    setEmailInput(""); setPassInput("");
    if (authRole === "host") setActiveTab("host");
    else {
      setActiveTab("guest");
      if (selectedUnitForCal) { /* keep it */ }
    }
  };

  const handleSimulateKyc = () => {
    setKycSimulating(true);
    setTimeout(() => {
      setCurrentUser(prev => ({ ...prev, kycVerified: true }));
      setKycSimulating(false);
    }, 1500);
  };

  const handlePostApartment = (e) => {
    e.preventDefault();
    if (!newUnitForm.name || !newUnitForm.nightly) return;
    if (uploadedImages.length < 3 || uploadedImages.length > 6) return;
    const newUnit = {
      id: "u-" + Date.now(),
      name: newUnitForm.name,
      district: newUnitForm.district,
      nightly: Number(newUnitForm.nightly),
      occ: 0.70,
      monthNet: Number(newUnitForm.nightly) * 30 * 0.70,
      rating: 5.0,
      code: "NEW-" + Math.floor(Math.random() * 900),
      wifi: "Access details provided upon booking confirmation",
      lockStatus: "Locked (Battery 100%)",
      lockIp: "192.168.100.80",
      features: newUnitForm.features ? newUnitForm.features.split(",").map(f => f.trim()) : ["AC", "Generators"],
      images: uploadedImages
    };
    setMyUnits(prev => [...prev, newUnit]);
    setNewUnitForm({ name: "", district: "Jabi", nightly: "", wifi: "", features: "" });
    setUploadedImages([]);
    setHostPostMode(false);
  };

  const handleGuestChatSend = async () => {
    if (!guestChatInp.trim() || guestChatTyping) return;
    const txt = guestChatInp.trim();
    setGuestMessages(prev => [...prev, { sender: "guest", text: txt }]);
    setGuestChatInp("");
    setGuestChatTyping(true);
    try {
      // Map history to the role/parts format required by firebase/ai
      const chatHistory = guestMessages.map(m => ({
        role: m.sender === "guest" ? "user" : "model",
        parts: [{ text: m.text }]
      }));

      // Start client-side chat session with history
      const chat = aiModel.startChat({
        history: chatHistory,
      });

      // Send message to client-side generative model with system context guidelines
      const result = await chat.sendMessage(
        `[System context: Guest is staying at a shortlet apartment in Abuja. Help with WiFi, power, check-in/out, and local tips.] ${txt}`
      );
      const reply = result.response.text();

      setGuestMessages(prev => [...prev, { sender: "ai", text: reply }]);
    } catch (err) {
      console.error("[Firebase AI] Guest chat failed:", err);
      setGuestMessages(prev => [...prev, { sender: "ai", text: "Network error — please check your connection and try again." }]);
    } finally {
      setGuestChatTyping(false);
    }
  };

  const handleBookingConfirmed = async (booking) => {
    setMyBookings(prev => [booking, ...prev]);
    setBookingToast(`Booking confirmed! ${booking.checkIn} → ${booking.checkOut} · Sending confirmation email…`);
    setSelectedUnitForCal(null);
    if (isGuest) setActiveTab("guest");

    // Send confirmation email to guest + host alert
    try {
      const unit = myUnits.find(u => u.id === booking.propertyId);
      const guestEmail = currentUser?.email || "guest@thelandlordproperty.com";
      await Promise.all([
        sendBookingConfirmation(booking, unit, guestEmail),
        sendHostAlert(booking, unit),
      ]);
      setBookingToast(`Confirmed! ${booking.checkIn} → ${booking.checkOut} · Confirmation email sent!`);
    } catch (e) {
      console.warn("Email send failed (non-critical):", e);
      setBookingToast(`Booking confirmed! ${booking.checkIn} → ${booking.checkOut}`);
    }

    setTimeout(() => setBookingToast(null), 5500);

    // Refresh DB bookings
    if (usingEmulator) {
      listAllProperties(dataConnect, { checkIn: "2026-07-01", checkOut: "2026-07-31" })
        .then(res => {
          const flat = (res?.data?.properties || []).flatMap(p =>
            (p.bookings_on_property || []).map(b => ({ ...b, propertyId: p.id }))
          );
          setDbBookings(flat);
        }).catch(() => {});
    }
  };

  // Get bookings for a specific unit (mock + db)
  const getBookingsForUnit = (unitId) => {
    return dbBookings.filter(b => b.propertyId === unitId);
  };

  const latestBooking = myBookings[0];
  const activeUnit = latestBooking ? myUnits.find(u => u.id === latestBooking.propertyId) || myUnits[0] : myUnits[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideup { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* Booking Toast */}
      {bookingToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: T.ink, color: "#fff", padding: "12px 22px", borderRadius: 12,
          fontSize: 13.5, fontWeight: 600, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,.25)",
          animation: "slideup .3s ease", maxWidth: "90vw", textAlign: "center"
        }}>
          {bookingToast}
        </div>
      )}

      {/* Sub Header / Switcher Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.paper, padding: "12px 18px", borderRadius: 14, border: `1px solid ${T.line}`, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            ["browse", "Browse Apartments"],
            ["host", "Host Console"],
            ...(isGuest ? [["guest", "Guest Portal"]] : []),
          ].map(([key, label]) => (
            <button
              key={key}
              id={`shortlet-tab-${key}`}
              onClick={() => {
                if (key === "host" && !isHost) { triggerAuthGate("host", "post_apartment"); return; }
                if (key === "guest" && !isGuest) { triggerAuthGate("guest", "view_calendar"); return; }
                setActiveTab(key);
              }}
              style={{
                background: activeTab === key ? T.green : "transparent",
                color: activeTab === key ? "#fff" : T.sub,
                border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                transition: "all .15s ease",
              }}
            >
              {label}
              {key === "guest" && myBookings.length > 0 && (
                <span style={{ background: T.gold, color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: 6 }}>
                  {myBookings.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {loggedIn ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>
              {currentUser.email.split("@")[0]} ({currentUser.role === "host" ? "Host" : "Guest"})
            </span>
            <button
              onClick={() => { setCurrentUser(null); setActiveTab("browse"); setMyBookings([]); }}
              style={{ background: "transparent", border: `1.5px solid ${T.line}`, borderRadius: 8, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, color: T.sub, cursor: "pointer" }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            id="shortlet-signin-btn"
            onClick={() => triggerAuthGate("guest", "view_calendar")}
            style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Sign in
          </button>
        )}
      </div>

      {/* ══ TAB 1: BROWSE ══ */}
      {activeTab === "browse" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Hero */}
          <div style={{
            background: `linear-gradient(135deg, ${T.greenDark} 0%, ${T.green} 60%, #052216 100%)`,
            borderRadius: 20, padding: "32px 28px", color: "#fff", position: "relative", overflow: "hidden",
            boxShadow: "0 8px 24px rgba(10,66,43,0.12)"
          }}>
            <div style={{ position: "absolute", right: -50, top: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
            <SectionLabel color={T.gold}>Pillar 2 · Shortlet Operations</SectionLabel>
            <h1 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 32, margin: "0 0 10px 0" }}>
              Verifiable Shortlet Stays
            </h1>
            <p style={{ fontSize: 14.5, opacity: 0.9, maxWidth: 540, lineHeight: 1.5, margin: 0 }}>
              Browse premium listings across Guzape, Jabi, and Wuse. Complete standard biometric screening to unlock calendars, view date availability, and finalize bookings.
            </p>
          </div>

          {/* Property Cards */}
          <div className="shortlet-browse-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
            {myUnits.map(u => {
              const hasImages = u.images && u.images.length > 0;
              const displayImg = hasImages ? u.images[0] : "/default_apartment.png";
              return (
                <div key={u.id} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  {/* Premium Image Header */}
                  <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
                    <img
                      src={displayImg}
                      alt={u.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform .3s ease" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    />
                    <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
                      <Pill bg="rgba(255,255,255,0.9)" color={T.green} border="rgba(0,0,0,0.05)">Shortlet</Pill>
                      <Pill bg="rgba(201,162,39,0.95)" color="#fff">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ flexShrink: 0, marginRight: 2 }}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {u.rating}
                      </Pill>
                    </div>
                    {hasImages && (
                      <span style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 700 }}>
                        1 of {u.images.length} Photos
                      </span>
                    )}
                  </div>

                  {/* Card header */}
                  <div style={{ padding: "16px 18px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `1px solid ${T.line}` }}>
                    <div>
                      <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 17, color: T.ink, margin: 0 }}>{u.name}</h3>
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: T.sub }}>
                          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {u.district}, Abuja
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 20, color: T.green }}>{fmtN(u.nightly, cur)}</div>
                      <div style={{ fontSize: 11, color: T.sub }}>per night</div>
                    </div>
                  </div>

                {/* Features */}
                <div style={{ padding: "12px 18px", flex: 1 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {u.features.map(f => <Pill key={f} bg={T.paper} color={T.ink}>{f}</Pill>)}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, fontSize: 12.5, color: T.sub }}>
                    <span>Occupancy: <strong>{Math.round(u.occ * 100)}%</strong></span>
                    <span>·</span>
                    <span>Est. Yield: <strong>{fmtN(u.monthNet, cur)}/mo</strong></span>
                  </div>
                </div>

                  {/* Calendar CTA */}
                  <div style={{ padding: "12px 18px 16px", borderTop: `1px solid ${T.line}` }}>
                    <button
                      id={`view-calendar-${u.id}`}
                      onClick={() => {
                        if (!loggedIn) { setSelectedUnitForCal(u); triggerAuthGate("guest", "view_calendar"); }
                        else if (currentUser.role !== "guest") { setSelectedUnitForCal(u); triggerAuthGate("guest", "view_calendar"); }
                        else { setSelectedUnitForCal(u); }
                      }}
                      style={{
                        width: "100%", background: T.green, color: "#fff", border: "none", borderRadius: 10,
                        padding: "11px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "opacity .15s ease",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      View Availability & Book
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ══ TAB 2: HOST CONSOLE ══ */}
      {/* ══ TAB 2: HOST CONSOLE ══ */}
      {activeTab === "host" && (() => {
        const activeBookingsCount = myBookings.filter(b => b.status === "Confirmed").length;
        const hasBookings = activeBookingsCount > 0;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {!isVerifiedHost ? (
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 20, padding: 32, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.riskSoft, color: T.risk, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, marginBottom: 16, border: `2px solid ${T.risk}` }}>!</div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, color: T.ink, margin: "0 0 10px 0" }}>Host Verification Required</h2>
                <p style={{ color: T.sub, fontSize: 14, maxWidth: 500, margin: "0 auto 20px", lineHeight: 1.5 }}>
                  To comply with FCT security guidelines, all hosts must complete identity validation (NIN & BVN matching) before they can post shortlet apartments or sync calendars.
                </p>
                <button
                  onClick={handleSimulateKyc}
                  disabled={kycSimulating}
                  style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 13.5, cursor: kycSimulating ? "not-allowed" : "pointer" }}
                >
                  {kycSimulating ? "Validating with Identity Server..." : "Complete 2-Min NIN/BVN KYC Check"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Dev environment warning banner */}
                {usingEmulator && (
                  <div style={{
                    background: "#FFF9E6",
                    border: "1px solid #FFE49E",
                    color: "#855800",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}>
                    Developer Mode: Connected to local database emulator. Changes are local and will sync in real-time.
                  </div>
                )}

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: T.ink, margin: 0 }}>Host Operations Console</h2>
                    <p style={{ fontSize: 12, color: T.sub, margin: "3px 0 0 0" }}>
                      Manage bookings, verify occupancy, and optimize rates
                    </p>
                  </div>
                  <button
                    onClick={() => setHostPostMode(!hostPostMode)}
                    style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    {hostPostMode ? "Cancel" : "Post New Apartment"}
                  </button>
                </div>

                {/* Post form */}
                {hostPostMode && (
                  <div style={{ background: T.card, border: `2px solid ${T.green}33`, borderRadius: 16, padding: 20 }}>
                    <SectionLabel>Post New Shortlet Apartment</SectionLabel>
                    <form onSubmit={handlePostApartment} className="host-post-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                      {[
                        { label: "Apartment Title *", key: "name", type: "text", placeholder: "e.g. Maitama Executive Suite", required: true },
                        { label: "Nightly Rate (₦) *", key: "nightly", type: "number", placeholder: "85000", required: true },
                      ].map(({ label, key, type, placeholder, required }) => (
                        <div key={key}>
                          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{label}</label>
                          <input
                            type={type} placeholder={placeholder} value={newUnitForm[key]}
                            onChange={e => setNewUnitForm(prev => ({ ...prev, [key]: e.target.value }))}
                            required={required}
                            style={{ width: "100%", padding: 10, border: `1px solid ${T.line}`, borderRadius: 8, boxSizing: "border-box", fontSize: 13 }}
                          />
                        </div>
                      ))}
                      <div>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Abuja District *</label>
                        <select value={newUnitForm.district} onChange={e => setNewUnitForm(prev => ({ ...prev, district: e.target.value }))} style={{ width: "100%", padding: 10, border: `1px solid ${T.line}`, borderRadius: 8, boxSizing: "border-box", fontSize: 13 }}>
                          {["Maitama", "Guzape", "Jabi", "Wuse 2", "Gwarinpa", "Katampe"].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Key Features (comma-separated)</label>
                        <input type="text" placeholder="e.g. Solar backup, Automatic generator, Smart lock" value={newUnitForm.features} onChange={e => setNewUnitForm(prev => ({ ...prev, features: e.target.value }))} style={{ width: "100%", padding: 10, border: `1px solid ${T.line}`, borderRadius: 8, boxSizing: "border-box", fontSize: 13 }} />
                      </div>

                      {/* Apartment Photos (3-6 required) */}
                      <div style={{ gridColumn: "1/-1", marginTop: 6 }}>
                        <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
                          Apartment Photos * (Upload 3 to 6 images)
                        </label>
                        
                        <div
                          style={{
                            border: `2px dashed ${uploadedImages.length >= 3 && uploadedImages.length <= 6 ? T.green : T.line}`,
                            borderRadius: 12,
                            padding: "20px 16px",
                            textAlign: "center",
                            background: T.paper,
                            cursor: "pointer",
                            transition: "all .15s ease",
                          }}
                          onClick={() => document.getElementById("shortlet-image-upload").click()}
                        >
                          <input
                            id="shortlet-image-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              const urls = files.map(file => URL.createObjectURL(file));
                              setUploadedImages(prev => {
                                const combined = [...prev, ...urls];
                                return combined.slice(0, 6);
                              });
                            }}
                            style={{ display: "none" }}
                          />
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                              <circle cx="12" cy="13" r="4" />
                            </svg>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Drag & drop or click to upload</div>
                          <div style={{ fontSize: 11, color: T.sub, marginTop: 4 }}>JPEG, PNG up to 10MB (Select multiple files)</div>
                        </div>

                        {uploadedImages.length > 0 && (
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                            {uploadedImages.map((url, idx) => (
                              <div key={idx} style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.line}` }}>
                                <img src={url} alt={`Preview ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUploadedImages(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  style={{
                                    position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "#fff",
                                    border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ fontSize: 11.5, color: uploadedImages.length >= 3 && uploadedImages.length <= 6 ? T.green : T.risk, marginTop: 6, fontWeight: 600 }}>
                          {uploadedImages.length < 3 
                            ? `Please upload at least 3 images to verify the property layout (${uploadedImages.length} of 3 uploaded)`
                            : `Photo requirement satisfied (${uploadedImages.length} of 6 images)`
                          }
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={uploadedImages.length < 3 || uploadedImages.length > 6}
                        style={{
                          gridColumn: "1/-1",
                          background: uploadedImages.length < 3 || uploadedImages.length > 6 ? T.sub : T.green,
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          padding: 12,
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: uploadedImages.length < 3 || uploadedImages.length > 6 ? "not-allowed" : "pointer",
                          marginTop: 4
                        }}
                      >
                        Submit shortlet for compliance review
                      </button>
                    </form>
                  </div>
                )}

                {/* Analytics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                  {[
                    { title: "Projected Revenue", value: hasBookings ? "₦2.9m/mo" : "₦0.00", sub: hasBookings ? "Based on active demand curves" : "Awaiting first active booking" },
                    { title: "Overall Occupancy", value: hasBookings ? "77.5%" : "0.0%", sub: hasBookings ? "AI prediction: +4% next week" : "Awaiting occupancy logs" },
                    { title: "Smart Check-in logs", value: hasBookings ? "100% matched" : "0 matched", sub: hasBookings ? "NIN/BVN gate validation active" : "Awaiting check-in events" },
                    { title: "Active Bookings", value: String(activeBookingsCount), sub: "Guest reservations this month" },
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      background: T.card,
                      border: `1px solid ${T.line}`,
                      borderRadius: 14,
                      padding: 18,
                      borderTop: `3px solid ${idx === 3 ? T.gold : T.green}`
                    }}>
                      <div style={{ fontSize: 10, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>{item.title}</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 26, color: T.green, marginTop: 4 }}>{item.value}</div>
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{item.sub}</div>
                    </div>
                  ))}
                </div>

              {/* Pricing optimizer + reviews */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <SectionLabel>AI Dynamic Pricing Optimizer</SectionLabel>
                    <select
                      value={pricingUnit?.id || ""}
                      onChange={e => {
                        const u = myUnits.find(u => u.id === e.target.value);
                        if (u) fetchAiPricing(u);
                      }}
                      style={{ fontSize: 12, padding: "5px 10px", border: `1px solid ${T.line}`, borderRadius: 8, background: "#fff", color: T.ink, cursor: "pointer" }}
                    >
                      <option value="">Select unit…</option>
                      {myUnits.map(u => <option key={u.id} value={u.id}>{u.name.split(',')[0]}</option>)}
                    </select>
                  </div>

                  {!pricingUnit && !pricingLoading && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: T.sub, fontSize: 13 }}>
                      Select a unit above to generate AI-optimised rates
                    </div>
                  )}

                  {pricingLoading && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0" }}>
                      <div style={{ width: 28, height: 28, border: `3px solid ${T.line}`, borderTopColor: T.green, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                      <div style={{ fontSize: 12.5, color: T.sub }}>Gemini analysing market conditions…</div>
                    </div>
                  )}

                  {pricingData && !pricingData.error && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {pricingData.isDemo && (
                        <div style={{ fontSize: 11, color: T.amber, background: T.amberSoft, borderRadius: 7, padding: "5px 10px", marginBottom: 4 }}>Demo mode — add GEMINI_API_KEY for live calibration</div>
                      )}
                      {(pricingData.recommendations || []).map((rec, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", background: i % 2 === 0 ? T.mint : T.paper, borderRadius: 9 }}>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{rec.period}</div>
                            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{rec.reasoning}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                            <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 15, color: T.green }}>{fmtN(rec.rate, cur)}</span>
                            <span style={{ fontSize: 9.5, background: T.goldSoft, color: T.gold, borderRadius: 4, padding: "2px 5px", fontWeight: 700 }}>AI</span>
                          </div>
                        </div>
                      ))}
                      {pricingData.projectedMonthlyNet > 0 && (
                        <div style={{ marginTop: 8, background: T.ink, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>Projected Monthly Net</span>
                          <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 17, color: T.gold }}>{fmtN(pricingData.projectedMonthlyNet, cur)}</span>
                        </div>
                      )}
                      {pricingData.insight && (
                        <div style={{ fontSize: 12, color: T.sub, fontStyle: "italic", lineHeight: 1.5, marginTop: 4, padding: "8px 10px", background: T.paper, borderRadius: 8 }}>
                          💡 {pricingData.insight}
                        </div>
                      )}
                    </div>
                  )}

                  {pricingData?.error && (
                    <div style={{ color: T.risk, fontSize: 13, textAlign: "center", padding: "16px 0" }}>Could not fetch pricing — check network or API key.</div>
                  )}
                </div>

                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <SectionLabel>AI Review Sentiment Analysis</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                    {[
                      { guest: "K. Adeyemi", rating: "★★★★★", text: "Inverter configuration is perfect — zero downtime in 3 days.", sentiment: "Positive", pct: 98 },
                      { guest: "Chidera O.", rating: "★★★★", text: "Lovely lakefront studio. Great location.", sentiment: "Positive", pct: 91 },
                    ].map((r, i) => (
                      <div key={i} style={{ paddingBottom: i === 0 ? 12 : 0, borderBottom: i === 0 ? `1px solid ${T.line}` : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{r.guest}</div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Pill bg={T.mint} color={T.green}>{r.sentiment} {r.pct}%</Pill>
                            <span style={{ fontSize: 12, color: T.gold }}>{r.rating}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 12.5, color: T.sub, margin: "5px 0 0", lineHeight: 1.45, fontStyle: "italic" }}>"{r.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) })()}

      {/* ══ TAB 3: GUEST PORTAL ══ */}
      {activeTab === "guest" && isGuest && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>

          {/* Stays & Active Reservation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {myBookings.length === 0 ? (
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.mint, color: T.green, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, margin: "0 auto 12px", border: `2px solid ${T.green}` }}>!</div>
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.ink, marginBottom: 8 }}>No Active Reservations</div>
                <p style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.5, margin: "0 0 20px" }}>Browse our verified shortlet listings and book your stay in seconds.</p>
                <button
                  onClick={() => setActiveTab("browse")}
                  style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  Browse Apartments
                </button>
              </div>
            ) : (
              myBookings.map((b) => {
                const unit = myUnits.find(u => u.id === b.propertyId) || activeUnit;
                return (
                  <div key={b.id} style={{ background: T.card, border: `1px solid ${T.green}33`, borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`, padding: "14px 18px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, opacity: 0.8 }}>ACTIVE RESERVATION</div>
                        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 17 }}>{unit?.name || "Shortlet Unit"}</div>
                      </div>
                      <Pill bg="rgba(255,255,255,.2)" color="#fff">✓ Confirmed</Pill>
                    </div>
                    <div style={{ padding: 18 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                        {[["Check-in", b.checkIn], ["Check-out", b.checkOut], ["Total Cost", fmtN(b.totalCost, cur)]].map(([k, v]) => (
                          <div key={k} style={{ background: T.paper, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                            <div style={{ fontSize: 9.5, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>{k}</div>
                            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink, marginTop: 2 }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {unit && (
                        <div style={{ background: T.mint, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: T.green, lineHeight: 1.5 }}>
                          <b>WiFi:</b> {unit.wifi}
                        </div>
                      )}

                      <div style={{ fontSize: 11, color: T.sub, marginTop: 10 }}>Booking ref: #{b.id.toUpperCase()}</div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Biometric Check-in */}
            {myBookings.length > 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                <SectionLabel>AI Smart Check-in Biometrics</SectionLabel>
                <p style={{ fontSize: 12.5, color: T.sub, marginBottom: 14, lineHeight: 1.5 }}>Upload biometrics to match against local database records and activate estate access.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "1. Selfie biometrics", state: guestSelfie, onClick: () => setGuestSelfie("done") },
                    { label: "2. Government ID (NIN Card)", state: guestIdDoc, onClick: () => setGuestIdDoc("done") },
                  ].map(({ label, state, onClick }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.paper, padding: "10px 14px", borderRadius: 10, border: `1px solid ${state ? T.green + "40" : T.line}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: state ? T.green : T.ink }}>{state ? "✓ " : ""}{label}</span>
                      <button onClick={onClick} style={{ background: state ? T.mint : T.green, color: state ? T.green : "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, cursor: state ? "default" : "pointer" }}>
                        {state ? "Done" : (label.includes("Selfie") ? "Take Photo" : "Upload ID")}
                      </button>
                    </div>
                  ))}
                  {guestSelfie && guestIdDoc && !kycCheckinDone && (
                    <button
                      onClick={() => { setKycCheckinDone(true); setTimeout(() => setGuestMessages(m => [...m, { sender: "ai", text: "Identity verified! Your gate access code has been activated. Welcome to your stay!" }]), 1000); }}
                      style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: 11, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 4 }}
                    >
                      Start NIN Matching Check
                    </button>
                  )}
                  {kycCheckinDone && (
                    <div style={{ background: T.mint, color: T.green, padding: "10px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, display: "flex", gap: 8 }}>
                      <span>Identity cleared. Check-in processed. Gate compliance access keys activated.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Live Support Chat */}
          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", height: 480 }}>
            <SectionLabel>AI Guest Support (24/7 Chat)</SectionLabel>
            <div style={{ flex: 1, background: "#EFEAE2", borderRadius: 12, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, margin: "10px 0" }}>
              {guestMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === "ai" ? "flex-start" : "flex-end",
                    background: msg.sender === "ai" ? "#fff" : "#D7F5C8",
                    color: T.ink,
                    padding: "9px 13px",
                    borderRadius: msg.sender === "ai" ? "12px 12px 12px 3px" : "12px 12px 3px 12px",
                    fontSize: 13,
                    maxWidth: "85%",
                    lineHeight: 1.45,
                    boxShadow: "0 1px 2px rgba(0,0,0,.06)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.text}
                </div>
              ))}
              {guestChatTyping && (
                <div style={{ alignSelf: "flex-start", background: "#fff", borderRadius: "12px 12px 12px 3px", padding: "10px 14px", display: "flex", gap: 5, boxShadow: "0 1px 2px rgba(0,0,0,.06)" }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#aaa", display: "inline-block", animation: `guestDot .9s ${i * 0.2}s infinite ease-in-out` }} />
                  ))}
                  <style>{`@keyframes guestDot{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder='Ask: "wifi", "check-out", "power setup"...'
                value={guestChatInp}
                onChange={e => setGuestChatInp(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGuestChatSend()}
                style={{ flex: 1, padding: "9px 14px", border: `1px solid ${T.line}`, borderRadius: 99, outline: "none", fontSize: 13, fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
              />
              <button
                onClick={handleGuestChatSend}
                disabled={guestChatTyping}
                style={{ background: guestChatTyping ? T.sub : "#1FAF55", color: "#fff", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: guestChatTyping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}
              >
                ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AUTH GATE MODAL ── */}
      {showAuthGate && (
        <div
          onClick={() => setShowAuthGate(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(12,43,31,.72)", backdropFilter: "blur(6px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: 24, width: "min(420px, 100%)", padding: "32px 28px", boxShadow: "0 28px 64px rgba(12,43,31,.38)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 20, color: T.ink, margin: 0 }}>
                {authIntent === "post_apartment" ? "Owner / Host Portal" : "Guest Authentication"}
              </h3>
              <p style={{ fontSize: 13, color: T.sub, marginTop: 8, lineHeight: 1.5 }}>
                {authIntent === "post_apartment"
                  ? "Register a validated Owner account to post shortlet apartments on the platform."
                  : "Sign in to view live calendar availability and place bookings."}
              </p>
            </div>
            <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 5 }}>Access Role</label>
                <select value={authRole} onChange={e => setAuthRole(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${T.line}`, borderRadius: 10, background: "#fff", fontSize: 13.5, boxSizing: "border-box" }}>
                  <option value="guest">Traveler / Guest Portal</option>
                  <option value="host">Property Owner / Host Console</option>
                </select>
              </div>
              <input type="email" placeholder="Email address" value={emailInput} onChange={e => setEmailInput(e.target.value)} required style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, outline: "none", fontSize: 13.5, boxSizing: "border-box" }} />
              <input type="password" placeholder="Password" value={passInput} onChange={e => setPassInput(e.target.value)} required style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, outline: "none", fontSize: 13.5, boxSizing: "border-box" }} />
              <button type="submit" style={{ background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 4, boxShadow: "0 2px 12px rgba(14,90,58,.28)" }}>
                {authMode === "signin" ? "Sign in & Continue" : "Create Account & Continue"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: T.sub }}>
              {authMode === "signin"
                ? <><span>No account yet? </span><button onClick={() => setAuthMode("signup")} style={{ border: "none", background: "none", color: T.green, fontWeight: 700, cursor: "pointer" }}>Sign up</button></>
                : <><span>Already registered? </span><button onClick={() => setAuthMode("signin")} style={{ border: "none", background: "none", color: T.green, fontWeight: 700, cursor: "pointer" }}>Sign in</button></>
              }
            </div>
          </div>
        </div>
      )}

      {/* ══ GUEST BOOKING DRAWER OVERLAY ══ */}
      {selectedUnitForCal && isGuest && (
        <div
          onClick={() => setSelectedUnitForCal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(12, 43, 31, 0.4)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 100,
            display: "flex",
            justifyContent: "flex-end",
            animation: "fadeIn .25s ease-out",
          }}
        >
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
          
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: T.paper,
              width: "min(540px, 100%)",
              height: "100%",
              boxShadow: "-10px 0 40px rgba(12,43,31,0.15)",
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight .35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              position: "relative",
              borderLeft: `1px solid ${T.line}`,
            }}
          >
            {/* Header */}
            <div style={{
              padding: "20px 24px",
              borderBottom: `1px solid ${T.line}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: T.card,
              flexShrink: 0
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Pill bg={T.mint} color={T.green}>★ {selectedUnitForCal.rating} Rating</Pill>
                  <Pill bg={T.tealSoft} color={T.teal}>{selectedUnitForCal.district}</Pill>
                </div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.ink, margin: 0 }}>
                  Book {selectedUnitForCal.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedUnitForCal(null)}
                aria-label="Close booking drawer"
                style={{
                  border: "none",
                  background: T.paper,
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  cursor: "pointer",
                  fontSize: 16,
                  color: T.sub,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background .15s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.line}
                onMouseLeave={e => e.currentTarget.style.background = T.paper}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Image & Price banner */}
              <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", height: 160, flexShrink: 0, background: T.ink }}>
                <img
                  src={selectedUnitForCal.district === "Guzape" 
                    ? "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80" 
                    : "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"}
                  alt={selectedUnitForCal.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(12,43,31,0.85) 0%, transparent 60%)" }} />
                <div style={{ position: "absolute", bottom: 14, left: 16, right: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: "#fff" }}>
                  <div>
                    <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>NIGHTLY RATE</span>
                    <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24, color: T.gold }}>
                      {fmtN(selectedUnitForCal.nightly, cur)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 700 }}>Occupancy</span>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{Math.round(selectedUnitForCal.occ * 100)}% active</div>
                  </div>
                </div>
              </div>

              {/* Booking Calendar Widget */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                <BookingCalendar
                  unit={selectedUnitForCal}
                  usingEmulator={usingEmulator}
                  activeBookings={getBookingsForUnit(selectedUnitForCal.id)}
                  onBookingConfirmed={handleBookingConfirmed}
                />
              </div>

              {/* Amenities/Features */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                <SectionLabel>Included Amenities</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedUnitForCal.features.map(f => (
                    <Pill key={f} bg={T.mint} color={T.green}>✓ {f}</Pill>
                  ))}
                </div>
              </div>

              {/* Escrow note */}
              <div style={{
                background: T.goldSoft,
                border: `1px solid ${T.gold}33`,
                borderRadius: 14,
                padding: "16px 20px",
                fontSize: 13,
                color: "#7A5800",
                lineHeight: 1.5,
                display: "flex",
                gap: 10,
                alignItems: "flex-start"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A5800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <div>
                  <strong>Escrow Guarantee:</strong> Your payment is held securely in our partner-bank milestone escrow account. Funds are only released to the owner after your check-in is verified on-site.
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
