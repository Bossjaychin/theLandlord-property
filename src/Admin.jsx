import React, { useState, useEffect } from "react";

/* ============================================================
   ADMIN PANEL — The Landlord Property AI
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
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    const newDots = [false, false, false, false].map((_, i) => i < next.length);
    setDots(newDots);
    if (next.length === 4) {
      if (next === ADMIN_PIN) {
        setTimeout(() => onUnlock(), 200);
      } else {
        setTimeout(() => {
          setShake(true);
          setTimeout(() => { setShake(false); setPin(""); setDots([false,false,false,false]); }, 400);
        }, 100);
      }
    }
  };

  const handleBack = () => {
    const next = pin.slice(0, -1);
    setPin(next);
    setDots([false,false,false,false].map((_,i) => i < next.length));
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div style={{ minHeight: "100vh", background: T.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: T.green, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24, color: "#fff" }}>
          L
        </div>
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: "#fff" }}>Admin Panel</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", marginTop: 4 }}>Enter your 4-digit PIN</div>
      </div>

      {/* dots */}
      <div style={{ display: "flex", gap: 16, animation: shake ? "shake .3s ease" : "none" }}>
        {dots.map((filled, i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: filled ? T.gold : "rgba(255,255,255,.2)", transition: "background .15s ease" }} />
        ))}
      </div>

      {/* keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 12 }}>
        {keys.map((k, i) => (
          <button
            key={i}
            onClick={() => k === "⌫" ? handleBack() : k ? handleDigit(k) : null}
            style={{
              height: 64,
              borderRadius: 14,
              border: "none",
              background: k === "" ? "transparent" : k === "⌫" ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.1)",
              color: "#fff",
              fontSize: k === "⌫" ? 20 : 22,
              fontWeight: 600,
              cursor: k ? "pointer" : "default",
              fontFamily: "'Bricolage Grotesque'",
              transition: "background .1s ease",
            }}
            onMouseEnter={(e) => k && (e.target.style.background = "rgba(255,255,255,.18)")}
            onMouseLeave={(e) => k && (e.target.style.background = k === "⌫" ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.1)")}
          >
            {k}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>Demo PIN: 1234</div>

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

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const hasShortlet = form.type !== "Land";

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

          <G label="Internal Notes">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Internal team notes — not visible to buyers"
              rows={3}
              style={{ width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "'Instrument Sans', sans-serif", color: T.ink, resize: "vertical", outline: "none" }}
              onFocus={(e) => (e.target.style.borderColor = T.green)}
              onBlur={(e) => (e.target.style.borderColor = T.line)}
            />
          </G>
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

export default function Admin({ initialDeals, onDealsChange, onBack }) {
  const [unlocked, setUnlocked] = useState(false);
  const [deals, setDeals] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lp_admin_deals")) || initialDeals; }
    catch { return initialDeals; }
  });
  const [modal, setModal] = useState(null); // null | "new" | {deal object}
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Persist to localStorage and notify parent
  useEffect(() => {
    localStorage.setItem("lp_admin_deals", JSON.stringify(deals));
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
          <Btn kind="ghost" small onClick={onBack}>← Back to App</Btn>
          <Btn kind="primary" small onClick={() => setModal("new")}>+ New Deal</Btn>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 20px 80px" }}>

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
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 160px", gap: 0, background: T.mint, padding: "10px 16px", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.green }}>
            <div>Property</div>
            <div>Asking</div>
            <div>Discount</div>
            <div>Trust</div>
            <div>Title</div>
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
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 160px",
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
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 14, color: T.ink }}>{fmtM(deal.asking)}</div>
                {/* Discount */}
                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.amber }}>−{disc}%</div>
                {/* Trust */}
                <div>
                  <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 16, color: trustColor }}>{deal.trust}</span>
                  <span style={{ fontSize: 11, color: T.sub }}>/100</span>
                </div>
                {/* Title */}
                <div style={{ fontSize: 12, fontWeight: 600, color: deal.titleGrade === "A" ? T.green : deal.titleGrade === "B" ? "#8A6D0B" : T.amber }}>
                  Grade {deal.titleGrade}
                </div>
                {/* Status */}
                <div><StatusPill status={deal.status} /></div>
                {/* Actions */}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {nextStatus && (
                    <Btn small kind="teal" onClick={() => advanceStatus(deal)} style={{ fontSize: 11, padding: "5px 10px" }}>
                      → {nextStatus}
                    </Btn>
                  )}
                  <Btn small kind="ghost" onClick={() => setModal(deal)} style={{ fontSize: 11, padding: "5px 10px" }}>Edit</Btn>
                  <Btn small kind="danger" onClick={() => setConfirmDelete(deal)} style={{ fontSize: 11, padding: "5px 10px" }}>Del</Btn>
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
          <span>· Use "→ Next" to advance deal through the pipeline</span>
        </div>

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
