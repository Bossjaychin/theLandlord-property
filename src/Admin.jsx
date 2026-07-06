import React, { useState, useEffect, useRef } from "react";
import { db } from "./lib/firebase";
import { collection, query, orderBy, limit, getDocs, getCountFromServer, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";


/* ============================================================
   ADMIN PANEL — The Landlord Property
   PIN-gated. Full deal CRUD. Status pipeline. localStorage.
   ============================================================ */

const T = {
  ink: "#0C2B1F",
  green: "#0E5A3A",
  mint: "#E7F2EC",
  gold: "#C9A227",
  goldSoft: "#F6EFD8",
  amber: "#B4540A",
  amberSoft: "#FBEEDF",
  risk: "#B3261E",
  riskSoft: "#FBEAE8",
  teal: "#0E6B75",
  tealSoft: "#E3F0F2",
  paper: "#F5F6F2",
  card: "#FFFFFF",
  line: "#E2E5DF",
  sub: "#5B6A61",
};

const ADMIN_PIN = "1234";

const STATUS_FLOW = ["Draft", "Under Review", "Verified", "Published", "Sold"];

const STATUS_STYLE = {
  Draft:         { bg: T.paper,     color: T.sub,   border: T.line },
  "Under Review":{ bg: T.goldSoft,  color: "#8A6D0B", border: T.gold },
  Verified:      { bg: T.tealSoft,  color: T.teal,  border: T.teal },
  Published:     { bg: T.mint,      color: T.green, border: T.green },
  Sold:          { bg: "#EDE9FE",   color: "#5B21B6", border: "#7C3AED" },
};

const EMPTY_DEAL = {
  id: "",
  name: "",
  district: "",
  type: "Apartment",
  asking: "",
  market: "",
  title: "C of O",
  titleGrade: "A",
  trust: 80,
  inspected: false,
  agis: "",
  urgency: "",
  days: 1,
  demolition: "none",
  flood: "none",
  shortlet_nightly: "",
  shortlet_occ: "",
  shortlet_monthlyNet: "",
  yield: "",
  verifiedBy: "",
  negotiation_low: "",
  negotiation_high: "",
  status: "Draft",
  notes: "",
};

const fmtM = (n) => {
  if (!n) return "—";
  const num = Number(n);
  if (num >= 1_000_000) return "₦" + (num / 1_000_000).toFixed(1) + "m";
  return "₦" + num.toLocaleString();
};

/* ---------- Reusable UI ---------- */

const Label = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.sub, marginBottom: 5 }}>
    {children}
  </div>
);

const Input = ({ value, onChange, type = "text", placeholder, style, min, max, step }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    min={min}
    max={max}
    step={step}
    style={{
      width: "100%",
      border: `1.5px solid ${T.line}`,
      borderRadius: 8,
      padding: "9px 12px",
      fontSize: 13.5,
      fontFamily: "'Instrument Sans', sans-serif",
      color: T.ink,
      background: "#fff",
      outline: "none",
      ...style,
    }}
    onFocus={(e) => (e.target.style.borderColor = T.green)}
    onBlur={(e) => (e.target.style.borderColor = T.line)}
  />
);

const Select = ({ value, onChange, children, style }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      width: "100%",
      border: `1.5px solid ${T.line}`,
      borderRadius: 8,
      padding: "9px 12px",
      fontSize: 13.5,
      fontFamily: "'Instrument Sans', sans-serif",
      color: T.ink,
      background: "#fff",
      outline: "none",
      cursor: "pointer",
      ...style,
    }}
  >
    {children}
  </select>
);

const Btn = ({ children, onClick, kind = "primary", small, disabled, style }) => {
  const kinds = {
    primary: { background: T.green, color: "#fff", border: "none" },
    gold:    { background: T.gold,  color: T.ink,  border: "none" },
    ghost:   { background: "transparent", color: T.green, border: `1.5px solid ${T.green}` },
    danger:  { background: T.riskSoft, color: T.risk, border: `1.5px solid ${T.risk}` },
    teal:    { background: T.teal,  color: "#fff", border: "none" },
    ink:     { background: T.ink,   color: "#fff", border: "none" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "'Instrument Sans', sans-serif",
        fontWeight: 600,
        fontSize: small ? 12.5 : 14,
        padding: small ? "7px 14px" : "10px 20px",
        borderRadius: 9,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "transform .1s ease",
        whiteSpace: "nowrap",
        ...kinds[kind],
        ...style,
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
};

const StatusPill = ({ status }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Draft;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 999,
      padding: "3px 10px",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
};

/* ---------- PIN Gate ---------- */

const PinGate = ({ onUnlock }) => {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [dots, setDots] = useState([false, false, false, false]);

  const handleDigit = (d) => {
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const next = prev + d;
      setDots([false, false, false, false].map((_, i) => i < next.length));
      if (next.length === 4) {
        if (next === ADMIN_PIN) {
          setTimeout(() => onUnlock(), 200);
        } else {
          setTimeout(() => {
            setShake(true);
            setTimeout(() => {
              setShake(false);
              setPin("");
              setDots([false, false, false, false]);
            }, 400);
          }, 100);
        }
      }
      return next;
    });
  };

  const handleBack = () => {
    setPin((prev) => {
      const next = prev.slice(0, -1);
      setDots([false, false, false, false].map((_, i) => i < next.length));
      return next;
    });
  };

  // Wire up physical keyboard inputs (numbers + backspace)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        handleBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div style={{ minHeight: "100vh", background: T.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <img
          src="/logo_mark.png"
          alt="The Landlord Property"
          style={{
            height: 56,
            width: "auto",
            objectFit: "contain",
            display: "block",
            margin: "0 auto 16px",
          }}
        />
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: "#fff" }}>Admin Panel</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginTop: 4 }}>Enter your 4-digit PIN</div>
      </div>

      {/* dots */}
      <div style={{ display: "flex", gap: 16, animation: shake ? "shake .3s ease" : "none" }}>
        {dots.map((filled, i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              boxSizing: "border-box",
              border: filled ? `2px solid ${T.gold}` : "2px solid rgba(255, 255, 255, 0.7)",
              background: filled ? T.gold : "transparent",
              transition: "background .15s ease, border-color .15s ease",
            }}
          />
        ))}
      </div>

      {/* keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 12 }}>
        {keys.map((k, i) => {
          if (k === "") {
            return <div key={i} style={{ height: 64 }} />;
          }
          return (
            <button
              key={i}
              onClick={() => k === "⌫" ? handleBack() : handleDigit(k)}
              style={{
                height: 64,
                borderRadius: 14,
                border: "none",
                background: k === "⌫" ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.1)",
                color: "#fff",
                fontSize: k === "⌫" ? 20 : 22,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Instrument Sans', sans-serif",
                transition: "background .1s ease",
              }}
              onMouseEnter={(e) => (e.target.style.background = "rgba(255,255,255,.18)")}
              onMouseLeave={(e) => (e.target.style.background = k === "⌫" ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.1)")}
            >
              {k}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4 }}>
        or type your PIN
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
      `}</style>
    </div>
  );
};

/* ---------- Deal Form Modal ---------- */

const DealFormModal = ({ deal, onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY_DEAL, ...deal });
  const [descLoading, setDescLoading] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const hasShortlet = form.type !== "Land";

  const generateDescription = async () => {
    setDescLoading(true);
    try {
      const res = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          district: form.district,
          type: form.type,
          asking: form.asking,
          market: form.market,
          title: form.title,
          features: form.shortlet_nightly ? `Shortlet nightly: ₦${Number(form.shortlet_nightly).toLocaleString()}` : '',
          agis: form.agis,
          urgency: form.urgency,
        }),
      });
      const data = await res.json();
      if (data.description) set('notes', data.description);
    } catch {
      // silently fail
    } finally {
      setDescLoading(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.district.trim()) return alert("Name and district are required.");
    if (!form.asking || !form.market) return alert("Asking and market price are required.");
    onSave({
      ...form,
      asking: Number(form.asking),
      market: Number(form.market),
      trust: Number(form.trust),
      days: Number(form.days),
      yield: form.yield ? Number(form.yield) : null,
      negotiation: [Number(form.negotiation_low) || 0, Number(form.negotiation_high) || 0],
      shortlet: hasShortlet && form.shortlet_nightly
        ? { nightly: Number(form.shortlet_nightly), occ: Number(form.shortlet_occ) || 0.7, monthlyNet: Number(form.shortlet_monthlyNet) || 0 }
        : null,
      id: form.id || "d" + Date.now(),
    });
  };

  const G = ({ label, children, half }) => (
    <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
      <Label>{label}</Label>
      {children}
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(12,43,31,.5)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: T.paper, borderRadius: 20, width: "min(760px,100%)", maxHeight: "92vh", overflowY: "auto", padding: 24 }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 20, color: T.ink }}>
            {deal?.id ? "✏️ Edit Deal" : "➕ New Deal"}
          </div>
          <button onClick={onClose} style={{ border: "none", background: T.card, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 15 }}>✕</button>
        </div>

        {/* Form grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          <G label="Property Name / Address">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 3-Bed Apartment, Jabi Lake axis" />
          </G>

          <G label="District" half>
            <Input value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="e.g. Jabi" />
          </G>

          <G label="Property Type" half>
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              {["Apartment","Terrace","Detached","Semi-Detached","Land","Commercial"].map(t => <option key={t}>{t}</option>)}
            </Select>
          </G>

          <G label="Asking Price (₦)" half>
            <Input type="number" value={form.asking} onChange={(e) => set("asking", e.target.value)} placeholder="95000000" />
          </G>

          <G label="AI Market Value (₦)" half>
            <Input type="number" value={form.market} onChange={(e) => set("market", e.target.value)} placeholder="120000000" />
          </G>

          <G label="Negotiation Floor (₦)" half>
            <Input type="number" value={form.negotiation_low} onChange={(e) => set("negotiation_low", e.target.value)} placeholder="88000000" />
          </G>

          <G label="Negotiation Ceiling (₦)" half>
            <Input type="number" value={form.negotiation_high} onChange={(e) => set("negotiation_high", e.target.value)} placeholder="93000000" />
          </G>

          <G label="Title Type">
            <Select value={form.title} onChange={(e) => set("title", e.target.value)}>
              {["C of O","R of O","Area Council (Regularization 40%)","Area Council (Regularization 60%)","Deed of Assignment","Lease Hold","Governor's Consent"].map(t => <option key={t}>{t}</option>)}
            </Select>
          </G>

          <G label="Title Grade" half>
            <Select value={form.titleGrade} onChange={(e) => set("titleGrade", e.target.value)}>
              <option value="A">A — Highest (C of O)</option>
              <option value="B">B — Good (R of O)</option>
              <option value="C">C — Regularizable</option>
              <option value="D">D — High Risk</option>
            </Select>
          </G>

          <G label="Trust Score (1–100)" half>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="range" min={1} max={100} value={form.trust}
                onChange={(e) => set("trust", e.target.value)}
                style={{ flex: 1, accentColor: T.green }}
              />
              <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: Number(form.trust) >= 85 ? T.green : Number(form.trust) >= 70 ? T.gold : T.amber, minWidth: 36 }}>
                {form.trust}
              </span>
            </div>
          </G>

          <G label="AGIS Status">
            <Input value={form.agis} onChange={(e) => set("agis", e.target.value)} placeholder="Search completed · Clean" />
          </G>

          <G label="Urgency Note">
            <Input value={form.urgency} onChange={(e) => set("urgency", e.target.value)} placeholder="Owner relocating abroad — 21-day close" />
          </G>

          <G label="Verified By (Lawyer/Firm)" half>
            <Input value={form.verifiedBy} onChange={(e) => set("verifiedBy", e.target.value)} placeholder="Barr. A. Musa & Co." />
          </G>

          <G label="Days Listed" half>
            <Input type="number" min={1} value={form.days} onChange={(e) => set("days", e.target.value)} placeholder="3" />
          </G>

          <G label="Demolition Risk" half>
            <Select value={form.demolition} onChange={(e) => set("demolition", e.target.value)}>
              <option value="none">None</option>
              <option value="flag">⚠ Flag — verify setback</option>
            </Select>
          </G>

          <G label="Flood Risk" half>
            <Select value={form.flood} onChange={(e) => set("flood", e.target.value)}>
              <option value="none">None</option>
              <option value="low">Low exposure</option>
              <option value="flag">⚠ Flag — flood-watch corridor</option>
            </Select>
          </G>

          {/* Shortlet fields */}
          {hasShortlet && (
            <>
              <div style={{ gridColumn: "span 2", borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.teal }}>
                  Shortlet Projection (optional)
                </div>
              </div>
              <G label="Nightly Rate (₦)" half>
                <Input type="number" value={form.shortlet_nightly} onChange={(e) => set("shortlet_nightly", e.target.value)} placeholder="85000" />
              </G>
              <G label="Projected Occupancy (0–1)" half>
                <Input type="number" step="0.01" min="0" max="1" value={form.shortlet_occ} onChange={(e) => set("shortlet_occ", e.target.value)} placeholder="0.71" />
              </G>
              <G label="Projected Monthly Net (₦)" half>
                <Input type="number" value={form.shortlet_monthlyNet} onChange={(e) => set("shortlet_monthlyNet", e.target.value)} placeholder="1450000" />
              </G>
              <G label="Gross Yield (%)" half>
                <Input type="number" step="0.1" value={form.yield} onChange={(e) => set("yield", e.target.value)} placeholder="18.3" />
              </G>
            </>
          )}

          {/* Status & notes */}
          <div style={{ gridColumn: "span 2", borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.sub }}>
              Pipeline Status &amp; Notes
            </div>
          </div>

          <G label="Publication Status" half>
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
            </Select>
          </G>

          <G label="Field Inspection Done?" half>
            <Select value={form.inspected ? "yes" : "no"} onChange={(e) => set("inspected", e.target.value === "yes")}>
              <option value="no">No — inspection scheduled</option>
              <option value="yes">Yes — geotagged photos on file</option>
            </Select>
          </G>

          <div style={{ gridColumn: "span 2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <Label>Listing Description / Internal Notes</Label>
              <button
                type="button"
                id="ai-generate-description-btn"
                onClick={generateDescription}
                disabled={descLoading || !form.name}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: descLoading ? T.paper : `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
                  color: descLoading ? T.sub : "#fff",
                  border: `1px solid ${descLoading ? T.line : "transparent"}`,
                  borderRadius: 8, padding: "5px 11px",
                  fontSize: 11.5, fontWeight: 700, cursor: descLoading || !form.name ? "not-allowed" : "pointer",
                  transition: "all .15s ease", whiteSpace: "nowrap",
                }}
              >
                {descLoading ? (
                  <>
                    <span style={{ width: 10, height: 10, border: `2px solid ${T.line}`, borderTopColor: T.green, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                    Generating…
                  </>
                ) : "✦ Generate with AI"}
              </button>
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Enter notes or click ✦ Generate with AI to auto-write a listing description"
              rows={4}
              style={{ width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "'Instrument Sans', sans-serif", color: T.ink, resize: "vertical", outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = T.green)}
              onBlur={(e) => (e.target.style.borderColor = T.line)}
            />
          </div>

        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" onClick={handleSave}>
            {deal?.id ? "Save Changes" : "Create Deal"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

/* ---------- Stat card ---------- */
const StatCard = ({ label, value, color = T.ink, sub }) => (
  <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: "16px 18px", flex: "1 1 160px" }}>
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.sub }}>{label}</div>
    <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 28, color, marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{sub}</div>}
  </div>
);

/* ---------- Main Admin Panel ---------- */

/* ──────────────────────────────────────────────
   Analytics Tab Component
   ────────────────────────────────────────────── */

const AnalyticsView = ({ deals }) => {
  const [kpis, setKpis] = useState({ users: 0, buyers: 0, sellers: 0, notifications: 0, matched: 0 });
  const [notifications, setNotifications] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch KPI counts from Firestore
        const [usersSnap, notifSnap, logsSnap, buyerSnap, matchedSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), limit(200))),
          getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(50))),
          getDocs(query(collection(db, "activity_logs"), orderBy("createdAt", "desc"), limit(30))),
          getDocs(query(collection(db, "users"), limit(200))),
          getDocs(query(collection(db, "activity_logs"), limit(200))),
        ]);

        const allUsers = usersSnap.docs.map(d => d.data());
        const buyers = allUsers.filter(u => u.role === "buyer" || u.buyer === true).length;
        const sellers = allUsers.filter(u => u.role === "seller" || u.role === "distress_seller").length;
        const matched = matchedSnap.docs.filter(d => d.data().action === "property_matched").length;

        setKpis({
          users: allUsers.length,
          buyers,
          sellers,
          notifications: notifSnap.size,
          matched,
        });

        setNotifications(notifSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setActivityLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("[Analytics] Could not load from Firestore:", err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const avgTrust = deals.length
    ? Math.round(deals.reduce((s, d) => s + (Number(d.trust) || 0), 0) / deals.length)
    : 0;

  // District distribution
  const districtCounts = {};
  deals.forEach(d => {
    if (d.district) districtCounts[d.district] = (districtCounts[d.district] || 0) + 1;
  });
  const districtEntries = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]);
  const maxDistrictCount = Math.max(...districtEntries.map(e => e[1]), 1);

  // Trust score bins
  const trustBins = [
    { label: "85-100 (Strong)", count: deals.filter(d => d.trust >= 85).length, color: T.green },
    { label: "70-84 (Good)", count: deals.filter(d => d.trust >= 70 && d.trust < 85).length, color: T.gold },
    { label: "0-69 (Caution)", count: deals.filter(d => d.trust < 70).length, color: T.amber },
  ];
  const maxTrustBin = Math.max(...trustBins.map(b => b.count), 1);

  // Pipeline data
  const pipelineCounts = STATUS_FLOW.map(s => ({
    label: s,
    count: deals.filter(d => d.status === s).length,
  }));
  const maxPipelineCount = Math.max(...pipelineCounts.map(p => p.count), 1);

  const fmtTime = (ts) => {
    if (!ts) return "—";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  };

  const channelIcon = (type) => ({ email: "📧", sms: "📱", whatsapp: "💬" }[type] || "🔔");
  const actionColor = (action) => (
    action === "account_created" ? T.green
    : action === "user_logged_in" ? T.teal
    : action === "property_matched" ? T.gold
    : T.sub
  );

  const KpiCard = ({ label, value, icon, color = T.ink, sub }) => (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: "18px 20px", flex: "1 1 140px", minWidth: 140 }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.sub, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 32, color, lineHeight: 1 }}>
        {loading ? <span style={{ fontSize: 20, color: T.line }}>…</span> : value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: T.sub, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ padding: "0 0 60px" }}>
      {/* Analytics hero */}
      <div style={{
        background: `linear-gradient(135deg, ${T.ink} 0%, #0A3420 60%, ${T.teal}44 100%)`,
        borderRadius: 18,
        padding: "28px 24px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(201,162,39,.07)" }} />
        <div style={{ position: "absolute", left: "40%", bottom: -60, width: 180, height: 180, borderRadius: "50%", background: "rgba(14,107,117,.1)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.gold, marginBottom: 8 }}>Live Analytics Dashboard</div>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 26, color: "#fff", marginBottom: 6 }}>Portfolio Intelligence</div>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.7)" }}>Real-time data from Firestore · {deals.length} deals managed</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Registered Users" value={kpis.users} icon="👥" color={T.green} sub="All-time signups" />
        <KpiCard label="Active Buyers" value={kpis.buyers} icon="🏠" color={T.teal} sub="Role: buyer" />
        <KpiCard label="Sellers" value={kpis.sellers} icon="🏷" color={T.gold} />
        <KpiCard label="Notifications Sent" value={kpis.notifications} icon="🔔" color={T.amber} sub="Last 50" />
        <KpiCard label="AI Matches" value={kpis.matched} icon="🤖" color="#6B3FA0" sub="Buyer-property matches" />
        <KpiCard label="Avg Trust Score" value={`${avgTrust}/100`} icon="🛡️" color={avgTrust >= 85 ? T.green : avgTrust >= 70 ? T.gold : T.amber} sub="Deal portfolio" />
      </div>

      {/* Two-column layout for charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, marginBottom: 24 }}>

        {/* Pipeline Funnel */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.green, marginBottom: 16 }}>Deal Pipeline Funnel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pipelineCounts.map(({ label, count }, i) => {
              const st = STATUS_STYLE[label];
              const pct = Math.round((count / maxPipelineCount) * 100);
              return (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, marginBottom: 5, color: T.ink }}>
                    <span>{label}</span>
                    <span style={{ color: st?.color }}>{count} deal{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ height: 10, background: T.paper, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: st?.color || T.green,
                      borderRadius: 99,
                      transition: "width .8s cubic-bezier(.22,1,.36,1)",
                      minWidth: count > 0 ? 6 : 0,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust Score Distribution */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.green, marginBottom: 16 }}>Trust Score Distribution</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {trustBins.map(({ label, count, color }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                  <span style={{ color: T.ink }}>{label}</span>
                  <span style={{ color }}>{count}</span>
                </div>
                <div style={{ height: 10, background: T.paper, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((count / maxTrustBin) * 100)}%`, background: color, borderRadius: 99, transition: "width .8s .1s cubic-bezier(.22,1,.36,1)", minWidth: count > 0 ? 6 : 0 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14, marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.teal, marginBottom: 12 }}>District Distribution</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
              {districtEntries.map(([district, count]) => (
                <div key={district} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, minWidth: 90 }}>{district}</div>
                  <div style={{ flex: 1, height: 8, background: T.paper, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round((count / maxDistrictCount) * 100)}%`, background: T.teal, borderRadius: 99, transition: "width .8s .2s ease" }} />
                  </div>
                  <div style={{ fontSize: 12, color: T.sub, minWidth: 16, textAlign: "right" }}>{count}</div>
                </div>
              ))}
              {districtEntries.length === 0 && <div style={{ fontSize: 13, color: T.sub }}>No district data yet.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Notification History Table */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ background: T.mint, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.green }}>🔔 Notification History (last 50)</div>
          {loading && <div style={{ fontSize: 12, color: T.sub }}>Loading…</div>}
        </div>
        {notifications.length === 0 && !loading && (
          <div style={{ padding: "24px", textAlign: "center", color: T.sub, fontSize: 13.5 }}>No notifications yet. Start the emulators and register a user to see data here.</div>
        )}
        {notifications.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.paper }}>
                  {["Channel", "Email", "Title", "Sent At", "Read"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: T.sub, whiteSpace: "nowrap", borderBottom: `1px solid ${T.line}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {notifications.map((n, i) => (
                  <tr key={n.id} style={{ borderBottom: i < notifications.length - 1 ? `1px solid ${T.line}` : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.paper}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 16 }}>{channelIcon(n.type)}</span>
                      <span style={{ fontSize: 11, marginLeft: 4, color: T.sub }}>{n.type}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: T.sub, fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.email || "—"}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: T.ink, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</td>
                    <td style={{ padding: "10px 14px", color: T.sub, fontSize: 12, whiteSpace: "nowrap" }}>{fmtTime(n.createdAt)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        background: n.read ? T.mint : T.riskSoft,
                        color: n.read ? T.green : T.risk,
                        borderRadius: 99,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                      }}>{n.read ? "✓ Read" : "● Unread"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ background: T.tealSoft, padding: "14px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.teal }}>📋 Activity Log (last 30)</div>
        </div>
        {activityLogs.length === 0 && !loading && (
          <div style={{ padding: "24px", textAlign: "center", color: T.sub, fontSize: 13.5 }}>No activity logs yet. Run Cloud Functions triggers to populate this feed.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {activityLogs.map((log, i) => (
            <div key={log.id} style={{
              padding: "12px 18px",
              borderBottom: i < activityLogs.length - 1 ? `1px solid ${T.line}` : "none",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: actionColor(log.action), flexShrink: 0, marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{(log.action || "").replace(/_/g, " ").toUpperCase()}</div>
                <div style={{ fontSize: 12, color: T.sub, marginTop: 2, lineHeight: 1.4 }}>{log.details}</div>
              </div>
              <div style={{ fontSize: 11, color: T.sub, whiteSpace: "nowrap", flexShrink: 0 }}>{fmtTime(log.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


/* ──────────────────────────────────────────────
   Offers Tab Component
   ────────────────────────────────────────────── */
const OffersView = ({ showToast }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counterId, setCounterId] = useState(null); // id of offer being countered
  const [counterPrice, setCounterPrice] = useState("");

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "offers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setOffers(list);
      setLoading(false);
    }, (err) => {
      console.warn("[Admin OffersView] Firestore query error:", err.message);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleUpdateStatus = async (offer, status, extraData = {}) => {
    try {
      const offerRef = doc(db, "offers", offer.id);
      const updatePayload = { status, ...extraData };
      await updateDoc(offerRef, updatePayload);

      // Create notification for the buyer
      const notifRef = collection(db, "notifications");
      let message = "";
      if (status === "Accepted") {
        message = `🏡 Congratulations! Your offer of ₦${offer.offerPrice.toLocaleString()} on "${offer.dealName}" has been ACCEPTED by the seller.\n\nOur team is initializing the escrow process. We will reach out to you shortly via WhatsApp.`;
      } else if (status === "Declined") {
        message = `💼 Update on your offer for "${offer.dealName}". The seller has declined your offer of ₦${offer.offerPrice.toLocaleString()}.\n\nExplore other distress deals on the dashboard: thelandlordproperty.com`;
      } else if (status === "Counter-Offer") {
        message = `🤝 Counter-Offer Received!\n\nThe seller has proposed a counter-offer of ₦${extraData.counterPrice.toLocaleString()} for "${offer.dealName}".\n\nPlease log in to review and respond.`;
      }

      await addDoc(notifRef, {
        userId: offer.userId,
        type: "whatsapp",
        email: offer.userEmail || "",
        status: "sent",
        sent: true,
        title: `Offer Update: ${status}`,
        message,
        read: false,
        createdAt: serverTimestamp(),
      });

      // Log activity
      await addDoc(collection(db, "activity_logs"), {
        userId: offer.userId,
        action: `offer_${status.toLowerCase().replace("-", "_")}`,
        details: `Admin marked offer ${offer.id} as ${status}.${extraData.counterPrice ? ` Counter Price: ₦${extraData.counterPrice.toLocaleString()}` : ""}`,
        createdAt: serverTimestamp(),
      });

      showToast(`Offer ${status.toLowerCase()} successfully!`);
    } catch (err) {
      console.error("[Admin OffersView] Failed to update offer:", err);
      showToast("Error updating offer status.", T.risk);
    }
  };

  const fmtM = (n) => {
    if (!n) return "—";
    return "₦" + Number(n).toLocaleString();
  };

  const badgeStyle = (status) => {
    switch (status) {
      case "Accepted": return { bg: T.mint, color: T.green };
      case "Declined": return { bg: T.riskSoft, color: T.risk };
      case "Counter-Offer": return { bg: T.goldSoft, color: "#8A6D0B" };
      default: return { bg: T.tealSoft, color: T.teal };
    }
  };

  return (
    <div style={{ padding: "0 0 60px" }}>
      <div style={{
        background: `linear-gradient(135deg, ${T.ink} 0%, #1A3E31 100%)`,
        borderRadius: 18,
        padding: "28px 24px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.gold, marginBottom: 8 }}>Buyer Offers &amp; Negotiations</div>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 26, color: "#fff", marginBottom: 6 }}>Active Offers</div>
          <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.7)" }}>Review, accept, decline or make counter-proposals to buyers.</div>
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ background: T.mint, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.green }}>📋 Active Offers ({offers.length})</div>
          {loading && <div style={{ fontSize: 12, color: T.sub }}>Loading…</div>}
        </div>

        {offers.length === 0 && !loading && (
          <div style={{ padding: "32px", textAlign: "center", color: T.sub, fontSize: 13.5 }}>
            No buyer offers received yet.
          </div>
        )}

        {offers.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {offers.map((offer, i) => {
              const disc = Math.round(((offer.askingPrice - offer.offerPrice) / offer.askingPrice) * 100);
              const bs = badgeStyle(offer.status);
              const isPending = offer.status === "Submitted";
              const isCounter = offer.status === "Counter-Offer";

              return (
                <div key={offer.id} style={{
                  padding: "20px 24px",
                  borderBottom: i < offers.length - 1 ? `1px solid ${T.line}` : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  background: isPending ? "#FBFDFB" : "#fff",
                }}
                onMouseEnter={e => e.currentTarget.style.background = isPending ? "#F7FAF7" : T.paper}
                onMouseLeave={e => e.currentTarget.style.background = isPending ? "#FBFDFB" : "#fff"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 16.5, color: T.ink }}>
                        {offer.dealName}
                      </div>
                      <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>
                        📍 {offer.district} · Buyer: <strong>{offer.userName}</strong> ({offer.userEmail})
                      </div>
                    </div>
                    <span style={{
                      background: bs.bg, color: bs.color, borderRadius: 999,
                      padding: "4px 12px", fontSize: 11.5, fontWeight: 700
                    }}>
                      {offer.status}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, margin: "6px 0", background: T.paper, padding: 12, borderRadius: 12 }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>Offer Price</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.green }}>{fmtM(offer.offerPrice)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>Asking Price</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginTop: 2 }}>{fmtM(offer.askingPrice)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>Discount Below Asking</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.amber, marginTop: 2 }}>−{disc}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10.5, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>Financing &amp; Close</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginTop: 3 }}>
                        {offer.financing.charAt(0).toUpperCase() + offer.financing.slice(1)} · {offer.timeline} Days
                      </div>
                    </div>
                  </div>

                  {offer.note && (
                    <div style={{ fontStyle: "italic", fontSize: 12.5, color: T.sub, background: T.card, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.line}` }}>
                      📝 "{offer.note}"
                    </div>
                  )}

                  {/* Counter offer info */}
                  {offer.counterPrice && (
                    <div style={{ background: T.goldSoft, border: `1px solid ${T.gold}44`, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: "#8A6D0B", fontWeight: 600 }}>
                      🤝 Proferred counter-offer: <strong>{fmtM(offer.counterPrice)}</strong>
                    </div>
                  )}

                  {/* Actions */}
                  {(isPending || isCounter) && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                      <Btn small kind="primary" onClick={() => handleUpdateStatus(offer, "Accepted")}>✓ Accept Offer</Btn>
                      <Btn small kind="danger" onClick={() => handleUpdateStatus(offer, "Declined")}>✕ Decline Offer</Btn>
                      
                      {counterId !== offer.id ? (
                        <Btn small kind="teal" onClick={() => { setCounterId(offer.id); setCounterPrice(String(Math.round(offer.askingPrice * 0.98))); }}>
                          🤝 Make Counter-Offer
                        </Btn>
                      ) : (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", background: T.paper, padding: "4px 8px", borderRadius: 8 }}>
                          <input
                            type="number"
                            value={counterPrice}
                            onChange={e => setCounterPrice(e.target.value)}
                            placeholder="Counter Price (₦)"
                            style={{ padding: "6px 10px", border: `1.5px solid ${T.line}`, borderRadius: 6, fontSize: 12.5, width: 150 }}
                          />
                          <Btn small kind="teal" onClick={() => {
                            if (!counterPrice) return;
                            handleUpdateStatus(offer, "Counter-Offer", { counterPrice: Number(counterPrice) });
                            setCounterId(null);
                          }}>
                            Submit Counter
                          </Btn>
                          <button onClick={() => setCounterId(null)} style={{ border: "none", background: "none", color: T.sub, cursor: "pointer", fontSize: 12.5 }}>Cancel</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


/* ──────────────────────────────────────────────
   Main Admin Panel
   ────────────────────────────────────────────── */


export default function Admin({ initialDeals, onDealsChange, onBack }) {
  const [unlocked, setUnlocked] = useState(false);
  const [adminTab, setAdminTab] = useState("deals"); // "deals" | "analytics"
  const [deals, setDeals] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lp_admin_deals_v2")) || initialDeals; }
    catch { return initialDeals; }
  });
  const [modal, setModal] = useState(null); // null | "new" | {deal object}
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmAdvance, setConfirmAdvance] = useState(null);

  // Persist to localStorage and notify parent
  useEffect(() => {
    localStorage.setItem("lp_admin_deals_v2", JSON.stringify(deals));
    onDealsChange && onDealsChange(deals);
  }, [deals]);

  const showToast = (msg, color = T.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const saveDeall = (updated) => {
    setDeals((prev) => {
      const exists = prev.find((d) => d.id === updated.id);
      if (exists) return prev.map((d) => d.id === updated.id ? updated : d);
      return [updated, ...prev];
    });
    setModal(null);
    showToast(updated.id && modal !== "new" ? "Deal updated ✓" : "New deal created ✓");
  };

  const deleteDeal = (id) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
    setConfirmDelete(null);
    showToast("Deal deleted", T.risk);
  };

  const advanceStatus = (deal) => {
    const idx = STATUS_FLOW.indexOf(deal.status);
    if (idx >= STATUS_FLOW.length - 1) return;
    const newStatus = STATUS_FLOW[idx + 1];
    setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, status: newStatus } : d));
    setConfirmAdvance(null);
    showToast(`${deal.name.split(",")[0]} → ${newStatus}`);
  };

  // Stats
  const stats = {
    total: deals.length,
    published: deals.filter((d) => d.status === "Published").length,
    pending: deals.filter((d) => ["Draft","Under Review"].includes(d.status)).length,
    verified: deals.filter((d) => d.status === "Verified").length,
    portfolioValue: deals.filter((d) => d.status === "Published").reduce((s,d) => s + (Number(d.asking)||0), 0),
  };

  // Filtered list
  const filtered = deals.filter((d) => {
    if (filter !== "All" && d.status !== filter) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.district.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;


  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: "'Instrument Sans', system-ui, sans-serif", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Instrument+Sans:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid ${T.gold}; outline-offset: 2px; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 99px; }
        @keyframes slideup { from { transform: translateY(6px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* Top bar */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(245,246,242,.94)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: "auto" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 15, color: "#fff" }}>
              L
            </div>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 15, lineHeight: 1 }}>The Landlord · Admin</div>
              <div style={{ fontSize: 10.5, color: T.sub, letterSpacing: 1.2, fontWeight: 600 }}>DEAL MANAGEMENT PANEL</div>
            </div>
          </div>

          {/* Admin Tab Switcher */}
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,.7)", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: 3 }}>
            {[["deals", "📋", "Deal Management"], ["offers", "🤝", "Buyer Offers"], ["analytics", "📊", "Analytics"]].map(([k, icon, label]) => (
              <button
                key={k}
                onClick={() => setAdminTab(k)}
                style={{
                  border: "none",
                  borderRadius: 9,
                  padding: "7px 14px",
                  fontSize: 12.5,
                  fontWeight: adminTab === k ? 700 : 600,
                  cursor: "pointer",
                  background: adminTab === k ? (k === "analytics" ? T.teal : k === "offers" ? "#6B3FA0" : T.ink) : "transparent",
                  color: adminTab === k ? "#fff" : T.sub,
                  transition: "all .18s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          <Btn kind="ghost" small onClick={onBack}>← Back to App</Btn>
          {adminTab === "deals" && <Btn kind="primary" small onClick={() => setModal("new")}>+ New Deal</Btn>}
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 20px 80px" }}>

        {/* Offers tab */}
        {adminTab === "offers" && <OffersView showToast={showToast} />}

        {/* Analytics tab */}
        {adminTab === "analytics" && <AnalyticsView deals={deals} />}

        {/* Deal management tab content */}
        {adminTab === "deals" && <>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
          <StatCard label="Total Deals" value={stats.total} />
          <StatCard label="Published" value={stats.published} color={T.green} sub="Visible to buyers" />
          <StatCard label="Awaiting Review" value={stats.pending} color={T.amber} sub="Draft or Under Review" />
          <StatCard label="Verified (Unpublished)" value={stats.verified} color={T.teal} />
          <StatCard
            label="Published Portfolio"
            value={"₦" + (stats.portfolioValue / 1_000_000).toFixed(0) + "m"}
            color={T.ink}
            sub="Total asking value"
          />
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍  Search by name or district…"
            style={{ flex: "1 1 220px", border: `1.5px solid ${T.line}`, borderRadius: 10, padding: "9px 14px", fontSize: 13.5, fontFamily: "'Instrument Sans'", outline: "none", background: "#fff", color: T.ink }}
            onFocus={(e) => (e.target.style.borderColor = T.green)}
            onBlur={(e) => (e.target.style.borderColor = T.line)}
          />
          {/* Status filter */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["All", ...STATUS_FLOW].map((s) => {
              const active = filter === s;
              const st = STATUS_STYLE[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    border: `1.5px solid ${active ? (st?.border || T.green) : T.line}`,
                    background: active ? (st?.bg || T.mint) : "#fff",
                    color: active ? (st?.color || T.green) : T.sub,
                    borderRadius: 999,
                    padding: "6px 14px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Deal table */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1.3fr 1fr 210px", gap: 0, background: T.mint, padding: "10px 16px", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.green }}>
            <div>Property</div>
            <div style={{ textAlign: "right", paddingRight: 8 }}>Asking</div>
            <div style={{ textAlign: "right", paddingRight: 8 }}>Discount</div>
            <div style={{ textAlign: "right", paddingRight: 8 }}>Trust</div>
            <div>Title &amp; Grade</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Actions</div>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: T.sub, fontSize: 14 }}>
              No deals match the current filter.
              <br />
              <button onClick={() => setModal("new")} style={{ marginTop: 12, border: "none", background: "none", color: T.green, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                + Add your first deal
              </button>
            </div>
          )}

          {filtered.map((deal, i) => {
            const disc = deal.market ? Math.round(((deal.market - deal.asking) / deal.market) * 100) : 0;
            const isLast = i === filtered.length - 1;
            const trustColor = deal.trust >= 85 ? T.green : deal.trust >= 70 ? T.gold : T.amber;
            const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(deal.status) + 1];

            return (
              <div
                key={deal.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1.3fr 1fr 210px",
                  gap: 0,
                  padding: "13px 16px",
                  alignItems: "center",
                  borderBottom: isLast ? "none" : `1px solid ${T.line}`,
                  transition: "background .12s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.paper)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                {/* Name */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink, lineHeight: 1.3 }}>{deal.name}</div>
                  <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>{deal.district} · {deal.type} · {deal.days}d listed</div>
                  {deal.notes && <div style={{ fontSize: 11, color: T.gold, marginTop: 2, fontStyle: "italic" }}>📝 {deal.notes.slice(0,50)}{deal.notes.length>50?"…":""}</div>}
                </div>
                {/* Asking */}
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 14, color: T.ink, textAlign: "right", paddingRight: 8 }}>{fmtM(deal.asking)}</div>
                {/* Discount */}
                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.amber, textAlign: "right", paddingRight: 8 }}>−{disc}%</div>
                {/* Trust */}
                <div style={{ textAlign: "right", paddingRight: 8 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 16, color: trustColor }}>{deal.trust}</span>
                  <span style={{ fontSize: 11, color: T.sub }}>/100</span>
                </div>
                {/* Title & Grade */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: T.ink }}>{deal.title || "Unspecified"}</div>
                  <div style={{ fontSize: 11, color: deal.titleGrade === "A" ? T.green : deal.titleGrade === "B" ? "#8A6D0B" : T.amber, fontWeight: 700, marginTop: 2 }}>
                    Grade {deal.titleGrade}
                  </div>
                </div>
                {/* Status */}
                <div><StatusPill status={deal.status} /></div>
                {/* Actions */}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {nextStatus && (
                    <Btn small kind="ghost" onClick={() => setConfirmAdvance(deal)} style={{ fontSize: 11, padding: "5px 10px", borderColor: T.teal, color: T.teal }}>
                      → {nextStatus}
                    </Btn>
                  )}
                  <Btn small kind="ghost" onClick={() => setModal(deal)} style={{ fontSize: 11, padding: "5px 10px" }}>Edit</Btn>
                  <Btn small kind="danger" onClick={() => setConfirmDelete(deal)} style={{ fontSize: 11, padding: "5px 10px" }}>Delete</Btn>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: T.sub }}>
          {STATUS_FLOW.map((s) => {
            const st = STATUS_STYLE[s];
            return (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: st.color, display: "inline-block" }} />
                {s}
              </span>
            );
          })}
          <span>· Use the "→ [Status]" action button to advance a deal through the pipeline (requires confirmation)</span>
        </div>

        </> /* end deals tab */}
      </main>

      {/* Modals */}
      {(modal === "new" || (modal && modal.id !== undefined)) && (
        <DealFormModal
          deal={modal === "new" ? null : modal}
          onSave={saveDeall}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,43,31,.45)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, padding: 24, maxWidth: 400, width: "100%" }}>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.risk, marginBottom: 10 }}>Delete deal?</div>
            <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>
              <b>{confirmDelete.name}</b> will be permanently removed from the system.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <Btn kind="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
              <Btn kind="danger" onClick={() => deleteDeal(confirmDelete.id)}>Delete</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Confirm pipeline advance */}
      {confirmAdvance && (() => {
        const next = STATUS_FLOW[STATUS_FLOW.indexOf(confirmAdvance.status) + 1];
        return (
          <div onClick={() => setConfirmAdvance(null)} style={{ position: "fixed", inset: 0, background: "rgba(12,43,31,.45)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, padding: 24, maxWidth: 400, width: "100%" }}>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.teal, marginBottom: 10 }}>Advance status?</div>
              <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>
                Advance status of <b>{confirmAdvance.name.split(",")[0]}</b> from <span style={{ fontWeight: 700 }}>{confirmAdvance.status}</span> to <span style={{ fontWeight: 700, color: T.green }}>{next}</span>?
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
                <Btn kind="ghost" onClick={() => setConfirmAdvance(null)}>Cancel</Btn>
                <Btn kind="teal" onClick={() => advanceStatus(confirmAdvance)}>Confirm Advance</Btn>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 100, background: toast.color || T.ink, color: "#fff",
          padding: "11px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,.2)", animation: "slideup .25s ease",
          whiteSpace: "nowrap",
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes slideup{from{transform:translateX(-50%) translateY(10px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
    </div>
  );
}
