import React, { useState, useMemo, useRef, useEffect } from "react";

/* ============================================================
   AI SHORTLET MANAGER — Pillar 2 Upgrade
   Portal-split design for Owners/Hosts and Guest/Users.
   Accents: Teal (#0E6B75) & Green (#0E5A3A)
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
    const v = n / 1550; // FX rate
    return v >= 1000 ? "$" + Math.round(v).toLocaleString() : "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "m";
  return "₦" + n.toLocaleString();
};

/* ── Mock Data for Shortlet Consoles ── */
const MOCK_UNITS = [
  { id: "u1", name: "Guzape Hillview 2-Bed", district: "Guzape", nightly: 120000, occ: 0.74, monthNet: 1920000, rating: 4.8, code: "GZ-102", wifi: "Guzape_Hillview_5G / guestpass2026", lockStatus: "Locked (Battery 92%)", lockIp: "192.168.100.41" },
  { id: "u2", name: "Jabi Lakeside Studio", district: "Jabi", nightly: 58000, occ: 0.81, monthNet: 980000, rating: 4.9, code: "JB-09", wifi: "Jabi_Lakeside / lakeview99", lockStatus: "Locked (Battery 88%)", lockIp: "192.168.100.12" }
];

const MOCK_CALENDAR = [
  { date: "2026-07-06", status: "Booked", guest: "Chidera O. (Jabi)", price: 58000 },
  { date: "2026-07-07", status: "Booked", guest: "Chidera O. (Jabi)", price: 58000 },
  { date: "2026-07-08", status: "Available", guest: "", price: 68440 }, // AI adjusted
  { date: "2026-07-09", status: "Booked", guest: "K. Adeyemi (Guzape)", price: 158400 },
  { date: "2026-07-10", status: "Booked", guest: "K. Adeyemi (Guzape)", price: 163200 },
  { date: "2026-07-11", status: "Booked", guest: "K. Adeyemi (Guzape)", price: 153600 },
  { date: "2026-07-12", status: "Available", guest: "", price: 127200 }
];

const MOCK_REVIEWS = [
  { guest: "K. Adeyemi", rating: 5, date: "July 2026", comment: "Superb power setup. The inverter kicked in instantly during NEPA dropout. Beautiful view.", sentiment: "Positive (98%)", tags: ["Power backup", "Serenity"] },
  { guest: "Chidera O.", rating: 4, date: "June 2026", comment: "Lovely studio. Just next to the lake. The water pressure was low on Tuesday morning.", sentiment: "Neutral (72%)", tags: ["Water pressure", "Location"] },
  { guest: "T. Bello", rating: 5, date: "May 2026", comment: "Perfect corporate stay. NIN gate screening was smooth. Reliable fibre connection.", sentiment: "Positive (95%)", tags: ["Fibre WiFi", "Security"] }
];

/* Custom inline SVG Icons */
const SparklesIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

export default function ShortletView({ cur, units: parentUnits, user, onSignInRequest }) {
  // Role selector: "host" (Owner Console) or "guest" (Guest Portal)
  const [role, setRole] = useState("host");

  // Portal Authentication State (Fallback local auth simulation)
  const [authRole, setAuthRole] = useState(null); // null | "host" | "guest"
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("host");
  const [authError, setAuthError] = useState("");

  // Host Portal States
  const [calendar, setCalendar] = useState(MOCK_CALENDAR);
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const [aiPricingActive, setAiPricingActive] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(MOCK_UNITS[0].id);

  // Guest Portal States
  const [guestMessages, setGuestMessages] = useState([
    { sender: "ai", text: "Hello! I am your 24/7 Guest Assistant. How can I help you today? (e.g. WiFi password, water pressure, check-in instructions)" }
  ]);
  const [guestChatInp, setGuestChatInp] = useState("");
  const [guestSelfie, setGuestSelfie] = useState(null);
  const [guestIdDoc, setGuestIdDoc] = useState(null);
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [kycProgress, setKycProgress] = useState(0);
  const [guestCheckedIn, setGuestCheckedIn] = useState(false);

  // Handle local registration/login bypass if Firebase isn't signed in
  const activeUser = user || (authRole ? { email: emailInput || "simulated@user.com", uid: "sim-uid-1002" } : null);
  const activeUserRole = user ? role : authRole;

  const handleLocalAuth = (e) => {
    e.preventDefault();
    if (!emailInput || !passInput) {
      setAuthError("Please fill in all credentials.");
      return;
    }
    setAuthRole(selectedRole);
    setRole(selectedRole);
    setAuthError("");
  };

  const handleLogout = () => {
    setAuthRole(null);
    setEmailInput("");
    setPassInput("");
  };

  /* Guest AI Assistant Reply Logic */
  const handleGuestChatSend = () => {
    if (!guestChatInp.trim()) return;
    const txt = guestChatInp.trim();
    setGuestMessages(prev => [...prev, { sender: "guest", text: txt }]);
    setGuestChatInp("");

    setTimeout(() => {
      let reply = "I'm checking that details with the property database... Could you please specify your unit code?";
      const q = txt.toLowerCase();
      const currentUnit = MOCK_UNITS.find(u => u.id === selectedUnit) || MOCK_UNITS[0];

      if (q.includes("wifi") || q.includes("internet") || q.includes("password")) {
        reply = `📶 The fibre WiFi credentials for your unit (${currentUnit.name}) are:\n\nSSID: ${currentUnit.wifi.split(" / ")[0]}\nKey: ${currentUnit.wifi.split(" / ")[1]}\n\nLet me know if you face connection lags!`;
      } else if (q.includes("generator") || q.includes("nepa") || q.includes("power") || q.includes("light")) {
        reply = `⚡ Power Setup: ${currentUnit.district} has active utility grid monitoring. If NEPA cuts supply, the 20kVA automatic generator or battery inverter bank kicks in within 6 seconds. No manual switch required!`;
      } else if (q.includes("water") || q.includes("pressure") || q.includes("pump")) {
        reply = `🚰 Water pressure: The booster pumps are monitored by our AI. If you experience a drop, I can trigger a self-diagnostic cycle on the reservoir pump. Let me know if I should initiate it.`;
      } else if (q.includes("check-in") || q.includes("check in") || q.includes("gate") || q.includes("direction")) {
        reply = `🏡 Check-in instructions: Complete your biometric selfie upload in the check-in panel. Once verified, your digital gate compliance code will generate, releasing your smart lock access.`;
      } else if (q.includes("check-out") || q.includes("check out") || q.includes("checkout")) {
        reply = `🔑 Checking out is automated. Clean up the waste, close all windows, and tap the 'Complete Checkout' button in your panel. The AI will verify lock security and notify the cleaning crew.`;
      }
      setGuestMessages(prev => [...prev, { sender: "ai", text: reply }]);
    }, 850);
  };

  /* Simulate guest bio verification */
  const handleSelfieUpload = (e) => {
    setGuestSelfie("selfie-uploaded");
  };

  const handleIdUpload = (e) => {
    setGuestIdDoc("id-uploaded");
  };

  const executeKycVerification = () => {
    if (!guestSelfie || !guestIdDoc) return;
    setKycSubmitted(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setKycProgress(p);
      if (p >= 100) {
        clearInterval(interval);
      }
    }, 400);
  };

  // Pricing analysis calculations
  const weeklyForecastRevenue = useMemo(() => {
    return calendar.reduce((sum, item) => sum + (item.status === "Booked" ? item.price : 0), 0);
  }, [calendar]);

  return (
    <div style={{ animation: "slideup .3s ease" }}>
      {/* ── Secure Portal Gateway / Portal authentication check ── */}
      {!activeUser ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32, marginTop: 12 }}>
          {/* Brand lockup panel */}
          <div style={{
            background: `linear-gradient(135deg, ${T.greenDark} 0%, ${T.green} 60%, #052216 100%)`,
            borderRadius: 20, padding: 32, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(10,66,43,0.12)"
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.gold, marginBottom: 12 }}>Pillar 2 · Shortlet Operations console</div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 32, lineHeight: 1.15, margin: "0 0 14px 0" }}>
              Automated Operations Portal
            </h1>
            <p style={{ fontSize: 14.5, opacity: 0.85, lineHeight: 1.6, margin: "0 0 24px 0" }}>
              Log in to access your dashboard. Owners track pricing optimization, occupancy models, and payouts. Guests verify biometric identities, open smart locks, and chat with live support.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16 }}>
              <div style={{ display: "flex", gap: 10, fontSize: 13, alignItems: "center" }}>
                <span style={{ color: T.gold }}>🔒</span>
                <span>Role-isolated dashboards with secure claims validation</span>
              </div>
              <div style={{ display: "flex", gap: 10, fontSize: 13, alignItems: "center" }}>
                <span style={{ color: T.gold }}>🛡️</span>
                <span>NIN/BVN guest validation integrated directly</span>
              </div>
            </div>
          </div>

          {/* Secure Role Login Form */}
          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 20, padding: 28, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
            <h2 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 21, color: T.ink, margin: "0 0 18px 0" }}>
              {authMode === "login" ? "Secure Portal Sign-In" : "Register Host or Guest Account"}
            </h2>

            <form onSubmit={handleLocalAuth} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Role Selection */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase" }}>Select Account Access Level</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("host")}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
                      background: selectedRole === "host" ? T.green : T.paper,
                      color: selectedRole === "host" ? "#fff" : T.sub,
                      border: selectedRole === "host" ? "none" : `1px solid ${T.line}`,
                      transition: "all .15s ease"
                    }}
                  >
                    📊 Property Owner / Host
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("guest")}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
                      background: selectedRole === "guest" ? T.green : T.paper,
                      color: selectedRole === "guest" ? "#fff" : T.sub,
                      border: selectedRole === "guest" ? "none" : `1px solid ${T.line}`,
                      transition: "all .15s ease"
                    }}
                  >
                    🔑 Traveler / Guest
                  </button>
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Account Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                  style={{ width: "100%", padding: 11, border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 14, outline: "none" }}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Security Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passInput}
                  onChange={e => setPassInput(e.target.value)}
                  required
                  style={{ width: "100%", padding: 11, border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 14, outline: "none" }}
                />
              </div>

              {authError && (
                <div style={{ background: T.riskSoft, color: T.risk, padding: 10, borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>
                  ⚠️ {authError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: 12, fontWeight: 700, fontSize: 14,
                  cursor: "pointer", marginTop: 6, boxShadow: "0 2px 8px rgba(14,90,58,0.2)"
                }}
              >
                {authMode === "login" ? "Authenticate & Enter Dashboard" : "Register Secure Profile"}
              </button>
            </form>

            {/* Toggle Mode */}
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: T.sub }}>
              {authMode === "login" ? (
                <>Need to create an account?{" "}
                  <button onClick={() => setAuthMode("signup")} style={{ border: "none", background: "none", color: T.green, fontWeight: 700, cursor: "pointer", padding: 0 }}>Register now</button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button onClick={() => setAuthMode("login")} style={{ border: "none", background: "none", color: T.green, fontWeight: 700, cursor: "pointer", padding: 0 }}>Sign in</button>
                </>
              )}
            </div>

            {/* Diaspora / standard guest instructions */}
            <div style={{ marginTop: 18, background: T.goldSoft, borderRadius: 12, padding: "10px 12px", fontSize: 12, color: "#7A5800", lineHeight: 1.45 }}>
              💡 **Verification Check:** Owners require certified AGIS document validation. Guests complete NIN + facial biometrics.
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* ── Active User Dashboard Header ── */}
          <div style={{
            background: `linear-gradient(135deg, ${T.ink}, ${T.green})`,
            borderRadius: 20, padding: "20px 24px", color: "#fff",
            display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 20
          }}>
            <div>
              <div style={{ fontSize: 11.5, opacity: 0.8, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                Active Secure Session ({activeUserRole === "host" ? "Owner / Operator Console" : "Guest / Traveler Portal"})
              </div>
              <h1 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, margin: "4px 0 0 0" }}>
                {activeUser.email.split("@")[0]}
              </h1>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Role Toggle Switcher */}
              <button
                onClick={() => setRole(activeUserRole === "host" ? "guest" : "host")}
                style={{
                  background: T.gold, color: T.ink, border: "none", borderRadius: 10, padding: "8px 14px",
                  fontWeight: 700, fontSize: 12.5, cursor: "pointer", boxShadow: "0 2px 6px rgba(201,162,39,0.2)"
                }}
              >
                {activeUserRole === "host" ? "🔑 Switch to Guest Portal" : "📊 Switch to Host Console"}
              </button>

              <button
                onClick={handleLogout}
                style={{
                  background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer"
                }}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
             OWNER / HOST CONSOLE (Host Dashboard)
             ══════════════════════════════════════════════════════════ */}
          {activeUserRole === "host" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Top Board Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {[
                  { title: "Net revenue", val: fmtN(1920000 + 980000, cur), sub: "All units under active MGMT" },
                  { title: "AI Occupancy Rate", val: "77.5%", sub: "Guzape: 74% | Jabi: 81%", color: T.gold },
                  { title: "Smart lock battery status", val: "Normal", sub: "All hardware devices online" },
                  { title: "Total check-ins (July)", val: "14 guests", sub: "100% identity matched" }
                ].map((item, idx) => (
                  <div key={idx} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: "16px 20px" }}>
                    <div style={{ fontSize: 11.5, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.title}</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24, color: item.color || T.ink, marginTop: 4 }}>{item.val}</div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* Units Selection Hub */}
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {MOCK_UNITS.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUnit(u.id)}
                    style={{
                      border: `1.5px solid ${selectedUnit === u.id ? T.green : T.line}`,
                      background: selectedUnit === u.id ? T.mint : T.card,
                      color: selectedUnit === u.id ? T.green : T.sub,
                      borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                      whiteSpace: "nowrap"
                    }}
                  >
                    🏠 {u.name} ({u.district})
                  </button>
                ))}
              </div>

              {/* Main Panel Content Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>
                
                {/* 1. AI Dynamic Pricing & Override */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <SectionLabel color={T.green}>AI Dynamic Pricing optimization</SectionLabel>
                      <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>Rates adjusted based on demand metrics</p>
                    </div>
                    <button
                      onClick={() => setAiPricingActive(!aiPricingActive)}
                      style={{
                        background: aiPricingActive ? T.mint : T.amberSoft,
                        color: aiPricingActive ? T.green : T.amber,
                        border: "none", borderRadius: 8, padding: "6px 12px",
                        fontSize: 11, fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      {aiPricingActive ? "✦ AI active" : "Manual mode"}
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {calendar.map(item => (
                      <div key={item.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: T.paper, borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{item.date}</div>
                          <div style={{ fontSize: 11.5, color: T.sub }}>{item.guest || "AI Optimization forecast"}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{fmtN(item.price, cur)}</span>
                          <span style={{ fontSize: 10, background: T.mint, color: T.green, borderRadius: 4, padding: "2px 4px", fontWeight: 700 }}>
                            {aiPricingActive ? "+18% spike" : "Fixed"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. AI Occupancy & Performance prediction */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column" }}>
                  <SectionLabel color={T.green}>AI Occupancy Prediction & reports</SectionLabel>
                  <p style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>Guzape Hillview performance analysis</p>

                  <div style={{ background: T.paper, borderRadius: 12, padding: 16, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ textAlign: "center", marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>PREDICTED OCCUPANCY (JULY)</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 36, color: T.green }}>78%</div>
                      <div style={{ fontSize: 11.5, color: T.green, fontWeight: 700, marginTop: 2 }}>✦ High Demand Alert (Tech Connect Abuja)</div>
                    </div>

                    <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                        <span style={{ color: T.sub }}>Average Daily Rate</span>
                        <span style={{ fontWeight: 700, color: T.ink }}>{fmtN(120000, cur)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                        <span style={{ color: T.sub }}>Projected Revenue</span>
                        <span style={{ fontWeight: 700, color: T.green }}>{fmtN(2830000, cur)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                        <span style={{ color: T.sub }}>Utility overhead prediction</span>
                        <span style={{ fontWeight: 700, color: T.amber }}>{fmtN(140000, cur)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    style={{
                      width: "100%", background: T.green, color: "#fff", border: "none", borderRadius: 10,
                      padding: 10, fontWeight: 700, fontSize: 12.5, cursor: "pointer", marginTop: 12
                    }}
                    onClick={() => alert("AI Performance Report successfully generated & sent to WhatsApp!")}
                  >
                    📄 Generate Property Performance Report
                  </button>
                </div>

                {/* 3. AI Smart Lock & Check-in monitoring */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <SectionLabel color={T.green}>AI Smart Lock & check-in hub</SectionLabel>
                  <p style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Check-in & lock status</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {MOCK_UNITS.map(u => (
                      <div key={u.id} style={{ border: `1px solid ${T.line}`, borderRadius: 10, padding: 12, background: T.paper }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{u.name}</span>
                          <span style={{ fontSize: 11, background: T.mint, color: T.green, borderRadius: 99, padding: "2px 8px", fontWeight: 700 }}>Online</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.sub, marginTop: 8 }}>
                          <span>Hardware Lock:</span>
                          <span style={{ fontWeight: 600, color: T.ink }}>{u.lockStatus}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.sub, marginTop: 4 }}>
                          <span>Access IP Address:</span>
                          <span style={{ fontFamily: "monospace" }}>{u.lockIp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. AI Guest Screening Queue */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <SectionLabel color={T.green}>AI Guest Screening logs</SectionLabel>
                  <p style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>BVN/NIN verified travelers</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { guest: "K. Adeyemi", status: "Passed", risk: "Low Risk", verified: "NIN match" },
                      { guest: "Chidera O.", status: "Passed", risk: "Low Risk", verified: "BVN match" },
                      { guest: "T. Bello", status: "Passed", risk: "Low Risk", verified: "NIN match" },
                      { guest: "A. Ibrahim", status: "Pending Verification", risk: "Verification Held", verified: "ID mismatch", held: true }
                    ].map((g, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, background: T.paper, borderRadius: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{g.guest}</div>
                          <div style={{ fontSize: 11, color: T.sub }}>{g.verified}</div>
                        </div>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                          background: g.held ? T.riskSoft : T.mint,
                          color: g.held ? T.risk : T.green
                        }}>{g.risk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. AI Review sentiment Analysis */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <SectionLabel color={T.green}>AI Guest Review Analysis</SectionLabel>
                  <p style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Review sentiment & auto replies</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {reviews.map((r, i) => (
                      <div key={i} style={{ borderBottom: i < reviews.length - 1 ? `1px solid ${T.line}` : "none", paddingBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{r.guest} · ★ {r.rating}</span>
                          <span style={{ fontSize: 10.5, color: T.green, fontWeight: 700 }}>{r.sentiment}</span>
                        </div>
                        <p style={{ fontSize: 12, color: T.sub, margin: "4px 0" }}>"{r.comment}"</p>
                        <button
                          onClick={() => alert(`Auto reply draft: "Thank you ${r.guest} for the feedback. We will check the issues immediately."`)}
                          style={{
                            background: "transparent", border: "none", color: T.green, cursor: "pointer",
                            fontSize: 11, fontWeight: 700, padding: 0, textDecoration: "underline"
                          }}
                        >
                          Draft AI reply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. AI Smart Calendar & Channel manager */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <SectionLabel color={T.green}>AI Smart Calendar & Channel manager</SectionLabel>
                  <p style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Channel synchronization status</p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ background: T.paper, borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>Airbnb Sync Status</span>
                      <span style={{ color: T.green, fontWeight: 700 }}>✓ Synced 1m ago</span>
                    </div>
                    <div style={{ background: T.paper, borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>Booking.com Sync Status</span>
                      <span style={{ color: T.green, fontWeight: 700 }}>✓ Synced 1m ago</span>
                    </div>
                    <div style={{ background: T.paper, borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ fontWeight: 600 }}>Escrow Direct Channel</span>
                      <span style={{ color: T.green, fontWeight: 700 }}>✓ Live connected</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
             GUEST / TRAVELER PORTAL (Guest Dashboard)
             ══════════════════════════════════════════════════════════ */}
          {activeUserRole === "guest" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              
              {/* Left Column: Booking details & Smart Check-in/out */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                
                {/* Stay Info Card */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <SectionLabel color={T.green}>Your Active Stay details</SectionLabel>
                  <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.ink }}>
                    Guzape Hillview 2-Bed (Unit GZ-102)
                  </div>
                  <div style={{ fontSize: 12.5, color: T.sub, marginTop: 4 }}>
                    Address: Hillview Heights, Guzape Phase 1, Abuja
                  </div>

                  <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 14, paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>CHECK-IN</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Mon, July 6 · 2 PM</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>CHECK-OUT</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>Mon, July 13 · 11 AM</div>
                    </div>
                  </div>
                </div>

                {/* AI Smart Check-in & Biometrics Panel */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                    <ShieldIcon />
                    <SectionLabel color={T.green} style={{ margin: 0 }}>AI Smart Check-in & Identity verification</SectionLabel>
                  </div>
                  <p style={{ fontSize: 12, color: T.sub, marginBottom: 14 }}>
                    Abuja estate security requires mandatory biometric matching against BVN/NIN database prior to digital key issuance.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.paper, padding: 10, borderRadius: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>1. Facial Bio Selfie</span>
                      <button
                        onClick={handleSelfieUpload}
                        style={{
                          background: guestSelfie ? T.mint : T.green,
                          color: guestSelfie ? T.green : "#fff",
                          border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        {guestSelfie ? "✓ Uploaded" : "📷 Take Selfie"}
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.paper, padding: 10, borderRadius: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>2. Government ID (NIN/Passport)</span>
                      <button
                        onClick={handleIdUpload}
                        style={{
                          background: guestIdDoc ? T.mint : T.green,
                          color: guestIdDoc ? T.green : "#fff",
                          border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        {guestIdDoc ? "✓ Uploaded" : "🪪 Upload ID"}
                      </button>
                    </div>

                    {guestSelfie && guestIdDoc && !kycSubmitted && (
                      <button
                        onClick={executeKycVerification}
                        style={{
                          background: T.green, color: "#fff", border: "none", borderRadius: 10,
                          padding: 11, fontWeight: 700, fontSize: 12.5, cursor: "pointer", marginTop: 8
                        }}
                      >
                        ⚡ Submit identity verification
                      </button>
                    )}

                    {kycSubmitted && kycProgress < 100 && (
                      <div style={{ background: T.paper, borderRadius: 8, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.sub }}>Verifying Identity ({kycProgress}%)</div>
                        <div style={{ height: 4, background: T.line, borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                          <div style={{ width: `${kycProgress}%`, height: "100%", background: T.green }} />
                        </div>
                      </div>
                    )}

                    {kycProgress >= 100 && (
                      <div style={{ background: T.mint, color: T.green, borderRadius: 8, padding: 12, fontSize: 12.5, fontWeight: 600, border: `1px solid ${T.green}22` }}>
                        ✓ Identity verification passed! Digital key released. Smart lock status is now active for your stay.
                      </div>
                    )}
                  </div>
                </div>

                {/* Check-out controller */}
                {kycProgress >= 100 && (
                  <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                    <SectionLabel color={T.green}>AI Smart Check-out</SectionLabel>
                    <p style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Tap checkout at end of stay to auto lock and notify cleaning team</p>

                    {!guestCheckedIn ? (
                      <button
                        onClick={() => { setGuestCheckedIn(true); alert("Check-out verified by AI. Gate clearance code closed."); }}
                        style={{
                          width: "100%", background: T.amber, color: "#fff", border: "none", borderRadius: 10,
                          padding: 11, fontWeight: 700, fontSize: 12.5, cursor: "pointer"
                        }}
                      >
                        🔑 Complete check-out
                      </button>
                    ) : (
                      <div style={{ background: T.amberSoft, color: T.amber, padding: 10, borderRadius: 8, fontSize: 12.5, fontWeight: 700, textAlign: "center" }}>
                        🔒 Check-out complete. Access closed. Thank you!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: 24/7 AI Guest Support Assistant */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", height: 480 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <SparklesIcon />
                  <SectionLabel color={T.green} style={{ margin: 0 }}>AI Guest Support Assistant (24/7)</SectionLabel>
                </div>

                {/* Chat window */}
                <div style={{ flex: 1, background: T.paper, borderRadius: 12, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                  {guestMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: msg.sender === "ai" ? "flex-start" : "flex-end",
                        background: msg.sender === "ai" ? "#fff" : T.mint,
                        color: T.ink,
                        padding: "8px 12px",
                        borderRadius: msg.sender === "ai" ? "12px 12px 12px 2px" : "12px 12px 2px 12px",
                        fontSize: 13,
                        maxWidth: "85%",
                        lineHeight: 1.45,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        whiteSpace: "pre-line"
                      }}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                {/* Message input */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Ask about WiFi, check-in, generator..."
                    value={guestChatInp}
                    onChange={e => setGuestChatInp(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleGuestChatSend()}
                    style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${T.line}`, borderRadius: 999, fontSize: 13, outline: "none" }}
                  />
                  <button
                    onClick={handleGuestChatSend}
                    style={{
                      background: T.green, color: "#fff", border: "none", borderRadius: "50%",
                      width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                    }}
                  >
                    ➔
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
