import React, { useState, useMemo, useRef } from "react";

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
    const v = n / 1550; // FX rate
    return v >= 1000 ? "$" + Math.round(v).toLocaleString() : "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "m";
  return "₦" + n.toLocaleString();
};

const CategoryIcon = ({ type, color = "currentColor", size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MOCK_UNITS = [
  { id: "u1", name: "Guzape Hillview 2-Bed", district: "Guzape", nightly: 120000, occ: 0.74, monthNet: 1920000, rating: 4.8, code: "GZ-102", wifi: "Guzape_Hillview_5G / guestpass2026", lockStatus: "Locked (Battery 92%)", lockIp: "192.168.100.41", features: ["Automatic generator", "24/7 solar backup", "Fibre WiFi", "Biometric estate gate"] },
  { id: "u2", name: "Jabi Lakeside Studio", district: "Jabi", nightly: 58000, occ: 0.81, monthNet: 980000, rating: 4.9, code: "JB-09", wifi: "Jabi_Lakeside / lakeview99", lockStatus: "Locked (Battery 88%)", lockIp: "192.168.100.12", features: ["Lake access view", "Booster water pump", "24/7 security", "Inverter system"] }
];

const MOCK_CALENDAR = [
  { date: "2026-07-06", status: "Booked", guest: "Chidera O. (Jabi)", price: 58000 },
  { date: "2026-07-07", status: "Booked", guest: "Chidera O. (Jabi)", price: 58000 },
  { date: "2026-07-08", status: "Available", guest: "", price: 68440 },
  { date: "2026-07-09", status: "Booked", guest: "K. Adeyemi (Guzape)", price: 158400 },
  { date: "2026-07-10", status: "Booked", guest: "K. Adeyemi (Guzape)", price: 163200 },
  { date: "2026-07-11", status: "Booked", guest: "K. Adeyemi (Guzape)", price: 153600 },
  { date: "2026-07-12", status: "Available", guest: "", price: 127200 }
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

export default function ShortletView({ cur, user: fbUser }) {
  // Global simulation states
  const [currentUser, setCurrentUser] = useState(null); // { email, role, kycVerified }
  const [activeTab, setActiveTab] = useState("browse"); // "browse" | "host" | "guest"
  
  // Auth Form Modal States
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authIntent, setAuthIntent] = useState(""); // "view_calendar" | "post_apartment"
  const [authRole, setAuthRole] = useState("guest"); // "guest" | "host"
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  
  // Host state
  const [myUnits, setMyUnits] = useState(MOCK_UNITS);
  const [hostPostMode, setHostPostMode] = useState(false);
  const [newUnitForm, setNewUnitForm] = useState({ name: "", district: "Jabi", nightly: "", wifi: "", features: "" });
  const [kycSimulating, setKycSimulating] = useState(false);

  // Guest Chat & Stay states
  const [guestMessages, setGuestMessages] = useState([
    { sender: "ai", text: "Hello! I am your 24/7 Guest Assistant. How can I help you today? Ask about the WiFi details, generator switches, or gate access." }
  ]);
  const [guestChatInp, setGuestChatInp] = useState("");
  const [guestSelfie, setGuestSelfie] = useState(null);
  const [guestIdDoc, setGuestIdDoc] = useState(null);
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [kycProgress, setKycProgress] = useState(0);

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
    
    // Log user in
    const newUser = {
      email: emailInput,
      role: authRole,
      kycVerified: authRole === "host" ? false : true // Host starts unverified, guest verified for demo stay
    };
    setCurrentUser(newUser);
    setShowAuthGate(false);
    
    // Redirect to relevant panel
    if (authRole === "host") {
      setActiveTab("host");
    } else {
      setActiveTab("guest");
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
    
    const newUnit = {
      id: "u-" + Date.now(),
      name: newUnitForm.name,
      district: newUnitForm.district,
      nightly: Number(newUnitForm.nightly),
      occ: 0.70,
      monthNet: Number(newUnitForm.nightly) * 30 * 0.70,
      rating: 5.0,
      code: "NEW-" + Math.floor(Math.random() * 900),
      wifi: newUnitForm.wifi || "SSID / KEY",
      lockStatus: "Locked (Battery 100%)",
      lockIp: "192.168.100.80",
      features: newUnitForm.features ? newUnitForm.features.split(",").map(f => f.trim()) : ["AC", "Generators"]
    };

    setMyUnits(prev => [...prev, newUnit]);
    setNewUnitForm({ name: "", district: "Jabi", nightly: "", wifi: "", features: "" });
    setHostPostMode(false);
  };

  const handleGuestChatSend = () => {
    if (!guestChatInp.trim()) return;
    const txt = guestChatInp.trim();
    setGuestMessages(prev => [...prev, { sender: "guest", text: txt }]);
    setGuestChatInp("");

    setTimeout(() => {
      let reply = "Let me check that stays detail with the manager...";
      const q = txt.toLowerCase();
      if (q.includes("wifi") || q.includes("internet") || q.includes("password")) {
        reply = "📶 WiFi Credentials:\nSSID: Guzape_Hillview_5G\nKey: guestpass2026\nLet me know if connection speeds are low!";
      } else if (q.includes("generator") || q.includes("nepa") || q.includes("power")) {
        reply = "⚡ Power is automatically monitored. If utility lines fail, the inverter is active. In case of extended outage, the estate auto-generator switches on in 6 seconds.";
      } else if (q.includes("check-out") || q.includes("check out")) {
        reply = "🔑 To checkout, lock all windows, exit the building, and click 'Complete check-out' in your stays panel.";
      }
      setGuestMessages(prev => [...prev, { sender: "ai", text: reply }]);
    }, 800);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Sub Header / Switcher Bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.paper, padding: "12px 18px", borderRadius: 14, border: `1px solid ${T.line}`, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setActiveTab("browse")}
            style={{
              background: activeTab === "browse" ? T.green : "transparent",
              color: activeTab === "browse" ? "#fff" : T.sub,
              border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer"
            }}
          >
            🔍 Browse Apartments
          </button>
          <button
            onClick={() => {
              if (!loggedIn) {
                triggerAuthGate("host", "post_apartment");
              } else if (currentUser.role !== "host") {
                triggerAuthGate("host", "post_apartment");
              } else {
                setActiveTab("host");
              }
            }}
            style={{
              background: activeTab === "host" ? T.green : "transparent",
              color: activeTab === "host" ? "#fff" : T.sub,
              border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer"
            }}
          >
            📊 Host Console
          </button>
          {loggedIn && currentUser.role === "guest" && (
            <button
              onClick={() => setActiveTab("guest")}
              style={{
                background: activeTab === "guest" ? T.green : "transparent",
                color: activeTab === "guest" ? "#fff" : T.sub,
                border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer"
              }}
            >
              🔑 Guest Portal
            </button>
          )}
        </div>

        {loggedIn ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>
              👤 {currentUser.email.split("@")[0]} ({currentUser.role === "host" ? "Host" : "Guest"})
            </span>
            <button
              onClick={() => { setCurrentUser(null); setActiveTab("browse"); }}
              style={{ background: "transparent", border: `1.5px solid ${T.line}`, borderRadius: 8, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, color: T.sub, cursor: "pointer" }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={() => triggerAuthGate("guest", "view_calendar")}
            style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Sign In / Register
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
         TAB 1: UN-AUTHENTICATED BROWSE MODE
         ══════════════════════════════════════════════════════════ */}
      {activeTab === "browse" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Hero Header */}
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

          {/* Grid of Listings */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 }}>
            {myUnits.map(u => (
              <div key={u.id} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 16.5, color: T.ink, margin: 0 }}>{u.name}</h3>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>📍 {u.district}, Abuja · ★ {u.rating}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: T.green }}>{fmtN(u.nightly, cur)}<span style={{ fontSize: 11, fontWeight: 500, color: T.sub }}>/night</span></span>
                </div>

                {/* Features list */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1, alignContent: "flex-start", marginBottom: 16 }}>
                  {u.features.map(f => (
                    <Pill key={f} bg={T.paper} color={T.ink}>{f}</Pill>
                  ))}
                </div>

                {/* Gated Calendar button */}
                <button
                  onClick={() => {
                    if (!loggedIn) {
                      triggerAuthGate("guest", "view_calendar");
                    } else if (currentUser.role !== "guest") {
                      triggerAuthGate("guest", "view_calendar");
                    } else {
                      setActiveTab("guest");
                    }
                  }}
                  style={{
                    width: "100%", background: T.green, color: "#fff", border: "none", borderRadius: 10,
                    padding: 11, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                  }}
                >
                  📅 View Availability Calendar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB 2: SECURE OWNER / HOST CONSOLE
         ══════════════════════════════════════════════════════════ */}
      {activeTab === "host" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Owner Verification Gate */}
          {!isVerifiedHost ? (
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 20, padding: 32, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.riskSoft, color: T.risk, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, color: T.ink, margin: "0 0 10px 0" }}>Host Verification Required</h2>
              <p style={{ color: T.sub, fontSize: 14, maxWidth: 500, margin: "0 auto 20px", lineHeight: 1.5 }}>
                To comply with FCT security guidelines, all hosts must complete identity validation (NIN & BVN matching) before they can post shortlet apartments or sync calendars.
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <button
                  onClick={handleSimulateKyc}
                  disabled={kycSimulating}
                  style={{
                    background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px",
                    fontWeight: 700, fontSize: 13.5, cursor: kycSimulating ? "not-allowed" : "pointer"
                  }}
                >
                  {kycSimulating ? "Validating with Identity Server..." : "⚡ Complete 2-Min NIN/BVN KYC Check"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Header Info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: T.ink, margin: 0 }}>📊 Host Operations Console</h2>
                  <p style={{ fontSize: 12, color: T.sub, margin: "3px 0 0 0" }}>Verifying live listings & automatic price adjustments</p>
                </div>
                
                <button
                  onClick={() => setHostPostMode(!hostPostMode)}
                  style={{
                    background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px",
                    fontWeight: 700, fontSize: 13, cursor: "pointer"
                  }}
                >
                  {hostPostMode ? "✕ Cancel listing" : "➕ Post New Apartment"}
                </button>
              </div>

              {/* Host Post Listing Form */}
              {hostPostMode && (
                <div style={{ background: T.card, border: `2px solid ${T.green}33`, borderRadius: 16, padding: 20 }}>
                  <SectionLabel>Post New Shortlet Apartment</SectionLabel>
                  <form onSubmit={handlePostApartment} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Apartment Title *</label>
                      <input
                        type="text"
                        placeholder="e.g. Maitama Executive Suite"
                        value={newUnitForm.name}
                        onChange={e => setNewUnitForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                        style={{ width: "100%", padding: 10, border: `1px solid ${T.line}`, borderRadius: 8 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Nightly Rate (₦) *</label>
                      <input
                        type="number"
                        placeholder="85000"
                        value={newUnitForm.nightly}
                        onChange={e => setNewUnitForm(prev => ({ ...prev, nightly: e.target.value }))}
                        required
                        style={{ width: "100%", padding: 10, border: `1px solid ${T.line}`, borderRadius: 8 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Abuja District</label>
                      <select
                        value={newUnitForm.district}
                        onChange={e => setNewUnitForm(prev => ({ ...prev, district: e.target.value }))}
                        style={{ width: "100%", padding: 10, border: `1px solid ${T.line}`, borderRadius: 8 }}
                      >
                        {["Maitama", "Guzape", "Jabi", "Wuse 2", "Gwarinpa", "Katampe"].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>WiFi Details (SSID / Password)</label>
                      <input
                        type="text"
                        placeholder="Maitama_Suites / pass123"
                        value={newUnitForm.wifi}
                        onChange={e => setNewUnitForm(prev => ({ ...prev, wifi: e.target.value }))}
                        style={{ width: "100%", padding: 10, border: `1px solid ${T.line}`, borderRadius: 8 }}
                      />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Key Features (comma-separated)</label>
                      <input
                        type="text"
                        placeholder="Solar backup, Automatic generator, Booster water pump, Smart lock"
                        value={newUnitForm.features}
                        onChange={e => setNewUnitForm(prev => ({ ...prev, features: e.target.value }))}
                        style={{ width: "100%", padding: 10, border: `1px solid ${T.line}`, borderRadius: 8 }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        gridColumn: "1/-1", background: T.green, color: "#fff", border: "none", borderRadius: 10,
                        padding: 12, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 8
                      }}
                    >
                      🚀 Publish verified apartment to marketplace
                    </button>
                  </form>
                </div>
              )}

              {/* Host Analytics Dash */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                {[
                  { title: "Projected Revenue", value: "₦2.9m/mo", sub: "Based on active demand curves" },
                  { title: "Overall Occupancy", value: "77.5%", sub: "AI prediction: +4% next week" },
                  { title: "Smart Check-in logs", value: "100% matched", sub: "NIN/BVN gate validation active" }
                ].map((item, idx) => (
                  <div key={idx} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>{item.title}</div>
                    <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24, color: T.green, marginTop: 4 }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* Operations logs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
                {/* 1. Dynamic Pricing */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <SectionLabel>AI Dynamic Pricing Optimizer</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                    {calendar.map(item => (
                      <div key={item.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, background: T.paper, borderRadius: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{item.date}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>{fmtN(item.price, cur)}</span>
                          <span style={{ fontSize: 9.5, background: T.mint, color: T.green, borderRadius: 4, padding: "2px 4px", fontWeight: 700 }}>AI active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Review Analysis */}
                <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                  <SectionLabel>AI Review Sentiment analysis</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    {[
                      { guest: "K. Adeyemi", rating: "★ 5", text: "Inverter configuration is perfect.", sentiment: "Positive (98%)" },
                      { guest: "Chidera O.", rating: "★ 4", text: "Lovely lakefront studio.", sentiment: "Positive (91%)" }
                    ].map((r, i) => (
                      <div key={i} style={{ borderBottom: i === 0 ? `1px solid ${T.line}` : "none", paddingBottom: i === 0 ? 10 : 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: T.ink }}>
                          <span>{r.guest} · {r.rating}</span>
                          <span style={{ color: T.green }}>{r.sentiment}</span>
                        </div>
                        <p style={{ fontSize: 12, color: T.sub, margin: "4px 0" }}>"{r.text}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
         TAB 3: GUEST PORTAL & CALENDAR VIEW
         ══════════════════════════════════════════════════════════ */}
      {activeTab === "guest" && isGuest && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          
          {/* Stays & Calendars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Stay details */}
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
              <SectionLabel>Your Active Reservation</SectionLabel>
              <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.ink, margin: "8px 0 4px" }}>
                Guzape Hillview 2-Bed (Unit GZ-102)
              </h3>
              <p style={{ fontSize: 13, color: T.sub, margin: 0 }}>Hillview Heights, Guzape Phase 1, Abuja</p>

              {/* Wifi detail */}
              <div style={{ background: T.mint, borderRadius: 10, padding: 12, marginTop: 14, fontSize: 12.5, color: T.green }}>
                📶 **Fibre WiFi Details:** SSID: Guzape_Hillview_5G / Key: guestpass2026
              </div>
            </div>

            {/* Smart Check-in Panel */}
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
              <SectionLabel>AI Smart Check-in biometrics</SectionLabel>
              <p style={{ fontSize: 12, color: T.sub, marginBottom: 12 }}>Upload biometrics to match against local database records.</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.paper, padding: 10, borderRadius: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>1. Selfie biometrics</span>
                  <button
                    onClick={() => setGuestSelfie("done")}
                    style={{ background: guestSelfie ? T.mint : T.green, color: guestSelfie ? T.green : "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}
                  >
                    {guestSelfie ? "✓ Done" : "Take Photo"}
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.paper, padding: 10, borderRadius: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>2. Government ID card</span>
                  <button
                    onClick={() => setGuestIdDoc("done")}
                    style={{ background: guestIdDoc ? T.mint : T.green, color: guestIdDoc ? T.green : "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}
                  >
                    {guestIdDoc ? "✓ Done" : "Upload ID"}
                  </button>
                </div>

                {guestSelfie && guestIdDoc && !kycSubmitted && (
                  <button
                    onClick={executeKycVerification}
                    style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: 11, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 8 }}
                  >
                    Start NIN matching checks
                  </button>
                )}

                {kycSubmitted && kycProgress >= 100 && (
                  <div style={{ background: T.mint, color: T.green, padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    ✓ Identification cleared. Check-in processed. Gate compliance access keys activated.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Live Support Chat */}
          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", height: 440 }}>
            <SectionLabel>AI Guest Support (24/7 Chat)</SectionLabel>
            
            <div style={{ flex: 1, background: T.paper, borderRadius: 12, padding: 10, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, margin: "10px 0" }}>
              {guestMessages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.sender === "ai" ? "flex-start" : "flex-end",
                    background: msg.sender === "ai" ? "#fff" : T.mint,
                    color: T.ink,
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: 12.5,
                    maxWidth: "85%"
                  }}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                placeholder="Ask wifi, check-out, power setup..."
                value={guestChatInp}
                onChange={e => setGuestChatInp(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGuestChatSend()}
                style={{ flex: 1, padding: "8px 12px", border: `1px solid ${T.line}`, borderRadius: 99, outline: "none", fontSize: 13 }}
              />
              <button
                onClick={handleGuestChatSend}
                style={{ background: T.green, color: "#fff", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ➔
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ── AUTH GATE MODAL OVERLAY ── */}
      {showAuthGate && (
        <div
          onClick={() => setShowAuthGate(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(12,43,31,.7)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: T.card, borderRadius: 20, width: "min(400px, 100%)", padding: 24, boxShadow: "0 12px 36px rgba(0,0,0,0.15)" }}
          >
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 20, color: T.ink, margin: 0 }}>
                {authIntent === "post_apartment" ? "🔐 Owner / Host Portal Required" : "🔐 Guest Authentication Required"}
              </h3>
              <p style={{ fontSize: 13, color: T.sub, marginTop: 6, lineHeight: 1.45 }}>
                {authIntent === "post_apartment"
                  ? "You must register a validated Owner account to post new shortlet apartments on the platform."
                  : "Sign in or create a traveler account to view live calendar availability dates and place reservations."}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 4 }}>Role Access Level</label>
                <select
                  value={authRole}
                  onChange={e => setAuthRole(e.target.value)}
                  style={{ width: "100%", padding: 10, border: `1.5px solid ${T.line}`, borderRadius: 8, background: "#fff" }}
                >
                  <option value="guest">Traveler / Guest Portal</option>
                  <option value="host">Property Owner / Host Console</option>
                </select>
              </div>

              <div>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                  style={{ width: "100%", padding: 11, border: `1.5px solid ${T.line}`, borderRadius: 8, outline: "none", fontSize: 13.5 }}
                />
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Security Password"
                  value={passInput}
                  onChange={e => setPassInput(e.target.value)}
                  required
                  style={{ width: "100%", padding: 11, border: `1.5px solid ${T.line}`, borderRadius: 8, outline: "none", fontSize: 13.5 }}
                />
              </div>

              <button
                type="submit"
                style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginTop: 6 }}
              >
                {authMode === "login" ? "Log In & Continue" : "Create Account & Continue"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 14, fontSize: 12.5, color: T.sub }}>
              {authMode === "login" ? (
                <>No account yet?{" "}
                  <button onClick={() => setAuthMode("signup")} style={{ border: "none", background: "none", color: T.green, fontWeight: 700, cursor: "pointer" }}>Sign up</button>
                </>
              ) : (
                <>Already registered?{" "}
                  <button onClick={() => setAuthMode("login")} style={{ border: "none", background: "none", color: T.green, fontWeight: 700, cursor: "pointer" }}>Log in</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
