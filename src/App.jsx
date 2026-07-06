import React, { useState, useMemo, useRef, useEffect } from "react";
import Admin from "./Admin";
import { dataConnect, auth } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { fetchDistrictAvailability, createProperty, createBooking, secureDistressSearch, createDistressProperty, listAllProperties } from "./lib/dataconnect";
import AuthModal from "./AuthModal";
import Profile from "./Profile";

/* ============================================================
   THE LANDLORD PROPERTY AI — Launch Edition Web App
   Two pillars: AI Distress Deals + AI Shortlet Manager
   Design tokens:
   - ink:    #0C2B1F  deep forest (text / headers)
   - green:  #0E5A3A  primary action
   - mint:   #E7F2EC  soft green surface
   - gold:   #C9A227  verification / trust accent
   - amber:  #B4540A  urgency / discount
   - risk:   #B3261E  risk flags
   - teal:   #0E6B75  shortlet pillar accent
   - paper:  #F5F6F2  app background
   Type: Bricolage Grotesque (display) / Instrument Sans (body)
   Signature: TrustRing + the "Buy → Earn" flip on every deal card
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
  risk: "#B3261E",
  riskSoft: "#FBEAE8",
  teal: "#0E6B75",
  tealSoft: "#E3F0F2",
  paper: "#F5F6F2",
  card: "#FFFFFF",
  line: "#E2E5DF",
  sub: "#5B6A61",
};

const FX = 1550; // ₦ per USD (demo rate)

const fmtN = (n, cur) => {
  if (cur === "USD") {
    const v = n / FX;
    return v >= 1000
      ? "$" + Math.round(v).toLocaleString()
      : "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "m";
  return "₦" + n.toLocaleString();
};
const fmtFull = (n, cur) =>
  cur === "USD" ? "$" + Math.round(n / FX).toLocaleString() : "₦" + n.toLocaleString();

/* ---------------- Mock data ---------------- */

const DEALS = [
  {
    id: "d1",
    name: "3-Bedroom Apartment, Jabi Lake axis",
    district: "Jabi",
    type: "Apartment",
    asking: 95_000_000,
    market: 120_000_000,
    title: "C of O",
    titleGrade: "A",
    trust: 92,
    inspected: true,
    agis: "Search completed · Clean",
    urgency: "Owner relocating abroad — 21-day close",
    days: 3,
    demolition: "none",
    flood: "low",
    negotiation: [88_000_000, 93_000_000],
    shortlet: { nightly: 85_000, occ: 0.71, monthlyNet: 1_450_000 },
    yield: 18.3,
    verifiedBy: "Barr. A. Musa & Co.",
  },
  {
    id: "d2",
    name: "4-Bedroom Terrace Duplex, Guzape",
    district: "Guzape",
    type: "Terrace",
    asking: 210_000_000,
    market: 260_000_000,
    title: "C of O",
    titleGrade: "A",
    trust: 88,
    inspected: true,
    agis: "Search completed · Clean",
    urgency: "Estate administration sale",
    days: 6,
    demolition: "none",
    flood: "none",
    negotiation: [195_000_000, 205_000_000],
    shortlet: { nightly: 160_000, occ: 0.64, monthlyNet: 2_600_000 },
    yield: 14.9,
    verifiedBy: "Lex Habitat Partners",
  },
  {
    id: "d3",
    name: "2 Plots (1,200sqm ea.), Lugbe FHA extension",
    district: "Lugbe",
    type: "Land",
    asking: 38_000_000,
    market: 47_000_000,
    title: "Area Council (Regularization 60%)",
    titleGrade: "C",
    trust: 71,
    inspected: true,
    agis: "Regularization file at AGIS · Stage 3 of 5",
    urgency: "Debt settlement — flexible on split sale",
    days: 9,
    demolition: "none",
    flood: "flag",
    negotiation: [33_000_000, 36_000_000],
    shortlet: null,
    yield: 22.0,
    verifiedBy: "Barr. A. Musa & Co.",
  },
  {
    id: "d4",
    name: "Studio + 1-Bed pair, Wuse 2 (shortlet-ready)",
    district: "Wuse 2",
    type: "Apartment",
    asking: 78_000_000,
    market: 92_000_000,
    title: "R of O",
    titleGrade: "B",
    trust: 84,
    inspected: true,
    agis: "Search completed · C of O processing",
    urgency: "Medical emergency — 14-day close",
    days: 1,
    demolition: "none",
    flood: "none",
    negotiation: [72_000_000, 76_000_000],
    shortlet: { nightly: 65_000, occ: 0.78, monthlyNet: 1_180_000 },
    yield: 18.2,
    verifiedBy: "Themis Chambers",
  },
  {
    id: "d5",
    name: "5-Bedroom Detached, Katampe Extension",
    district: "Katampe Ext.",
    type: "Detached",
    asking: 320_000_000,
    market: 385_000_000,
    title: "C of O",
    titleGrade: "A",
    trust: 90,
    inspected: true,
    agis: "Search completed · Clean",
    urgency: "Business liquidation",
    days: 4,
    demolition: "none",
    flood: "none",
    negotiation: [298_000_000, 312_000_000],
    shortlet: { nightly: 230_000, occ: 0.58, monthlyNet: 3_400_000 },
    yield: 12.8,
    verifiedBy: "Lex Habitat Partners",
  },
  {
    id: "d6",
    name: "Corner-piece plot, Kubwa Arab Road",
    district: "Kubwa",
    type: "Land",
    asking: 24_000_000,
    market: 29_000_000,
    title: "Area Council (Regularization 40%)",
    titleGrade: "C",
    trust: 64,
    inspected: false,
    agis: "Regularization file at AGIS · Stage 2 of 5",
    urgency: "Relocation sale",
    days: 12,
    demolition: "flag",
    flood: "none",
    negotiation: [20_500_000, 22_500_000],
    shortlet: null,
    yield: 19.5,
    verifiedBy: "Pending field inspection",
  },
];

const BASE_UNITS = [
  {
    id: "u1",
    name: "Guzape Hillview 2-Bed",
    district: "Guzape",
    nightly: 120_000,
    occ: 0.74,
    monthNet: 1_920_000,
    nextGuest: "K. Adeyemi · NIN verified · Fri 4pm",
    rating: 4.8,
  },
  {
    id: "u2",
    name: "Jabi Lakeside Studio",
    district: "Jabi",
    nightly: 58_000,
    occ: 0.81,
    monthNet: 980_000,
    nextGuest: "Chidera O. · NIN verified · Today 2pm",
    rating: 4.9,
  },
];

const WEEK = [
  { d: "Mon", base: 100, adj: +4, why: "Weekday baseline" },
  { d: "Tue", base: 100, adj: +2, why: "Weekday baseline" },
  { d: "Wed", base: 100, adj: +18, why: "AU trade summit, Transcorp axis" },
  { d: "Thu", base: 100, adj: +32, why: "Tech Connect Abuja — city-wide demand" },
  { d: "Fri", base: 100, adj: +36, why: "Summit + weekend wedding season" },
  { d: "Sat", base: 100, adj: +28, why: "Wedding season peak" },
  { d: "Sun", base: 100, adj: +6, why: "Checkout day softness" },
];

const MAINT = [
  { item: "Generator service (Guzape 2-Bed)", due: "In 6 days", conf: "94% — runtime hours pattern", level: "soon" },
  { item: "AC gas top-up (Jabi Studio, bedroom)", due: "In ~2 weeks", conf: "81% — cooling-time drift", level: "watch" },
  { item: "Inverter battery health (Guzape 2-Bed)", due: "Healthy", conf: "Discharge curve normal", level: "ok" },
  { item: "Water pump pressure (Jabi Studio)", due: "Healthy", conf: "No anomaly", level: "ok" },
];

const SCREENED = [
  { g: "K. Adeyemi", risk: "Low", note: "NIN + BVN matched · 6 prior stays · 0 incidents", ok: true },
  { g: "T. Bello", risk: "Low", note: "NIN verified · corporate booking (NNPC contractor)", ok: true },
  { g: "Unverified profile", risk: "Held", note: "ID mismatch — booking held, re-verification link sent", ok: false },
];

/* ---------------- Small components ---------------- */

const Pill = ({ children, bg, color, border }) => (
  <span
    style={{
      background: bg,
      color,
      border: border ? `1px solid ${border}` : "none",
      borderRadius: 999,
      padding: "3px 10px",
      fontSize: 11.5,
      fontWeight: 600,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
    }}
  >
    {children}
  </span>
);

const TrustRing = ({ score, size = 52 }) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const col = score >= 85 ? T.green : score >= 70 ? T.gold : T.amber;
  const label = score >= 85 ? "Strong" : score >= 70 ? "Good" : "Caution";
  return (
    <div
      style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
      title={`Verify Score ${score}/100 — our AI-weighted composite of title grade, AGIS search outcome, field-inspection status, and demolition/flood risk. ${label} confidence on this deal.`}
      aria-label={`Verify Score ${score} of 100 — ${label}`}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.line} strokeWidth="5" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={col}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * c} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: size * 0.3,
            color: T.ink,
          }}
        >
          {score}
        </div>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: col, lineHeight: 1 }}>Verify ⓘ</div>
    </div>
  );
};

const SectionLabel = ({ children, color = T.green }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 1.6,
      textTransform: "uppercase",
      color,
      marginBottom: 8,
    }}
  >
    {children}
  </div>
);

const Btn = ({ children, onClick, kind = "primary", small, style }) => {
  const base = {
    fontFamily: "'Instrument Sans', sans-serif",
    fontWeight: 600,
    fontSize: small ? 12.5 : 14,
    padding: small ? "7px 14px" : "11px 20px",
    borderRadius: 10,
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "transform .12s ease, box-shadow .12s ease",
  };
  const kinds = {
    primary: { background: T.green, color: "#fff" },
    gold: { background: T.gold, color: T.ink },
    ghost: { background: "transparent", color: T.green, border: `1.5px solid ${T.green}` },
    teal: { background: T.teal, color: "#fff" },
    wa: { background: "#1FAF55", color: "#fff" },
  };
  return (
    <button
      onClick={onClick}
      style={{ ...base, ...kinds[kind], ...style }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
};

const RiskFlag = ({ kind, level }) => {
  if (level === "none") return null;
  const label =
    kind === "demolition"
      ? level === "flag"
        ? "Near road-corridor buffer — verify setback"
        : "Demolition risk"
      : level === "flag"
      ? "Flood-watch corridor (seasonal)"
      : "Low flood exposure";
  const bad = level === "flag";
  return (
    <Pill bg={bad ? T.riskSoft : T.mint} color={bad ? T.risk : T.green}>
      {bad ? "⚠" : "✓"} {label}
    </Pill>
  );
};

/* ---------------- Deal card ---------------- */

const DealCard = ({ deal, cur, onOpen }) => {
  const [earn, setEarn] = useState(false);
  const disc = Math.round(((deal.market - deal.asking) / deal.market) * 100);
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.line}`,
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 1px 3px rgba(12,43,31,.06)",
      }}
    >
      {/* header strip */}
      <div
        style={{
          background: earn ? T.tealSoft : T.mint,
          padding: "14px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          transition: "background .25s ease",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 16.5, color: T.ink, lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {deal.name}
          </div>
          <div style={{ fontSize: 12.5, color: T.sub, marginTop: 3 }}>
            {deal.district} · {deal.type} · listed {deal.days === 1 ? "yesterday" : deal.days + " days ago"}
          </div>
        </div>
        <TrustRing score={deal.trust} />
      </div>

      {/* Buy ⇄ Rent toggle */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button
            onClick={() => setEarn(false)}
            title="See the purchase price, discount vs. market value, and urgency context"
            style={{
              flex: 1,
              padding: "7px 0",
              borderRadius: 8,
              border: `1.5px solid ${!earn ? T.ink : T.line}`,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              background: !earn ? T.ink : "transparent",
              color: !earn ? "#fff" : T.sub,
              transition: "all .18s ease",
            }}
          >
            Buy it
          </button>
          {deal.shortlet ? (
            <button
              onClick={() => setEarn(true)}
              title="If you buy this property, the AI projects it can earn this much as a managed shortlet"
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: `1.5px solid ${earn ? T.teal : T.line}`,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12,
                background: earn ? T.teal : "transparent",
                color: earn ? "#fff" : T.teal,
                transition: "all .18s ease",
              }}
            >
              Rent it out →
            </button>
          ) : (
            <div
              title="Shortlet projection not available for land — no building yet"
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: 8,
                border: `1.5px dashed ${T.line}`,
                fontWeight: 600,
                fontSize: 11.5,
                textAlign: "center",
                color: "#B9C2BC",
                cursor: "default",
                userSelect: "none",
              }}
            >
              Land — build first
            </div>
          )}
        </div>

        {/* Price / yield body — fixed min-height keeps all cards level */}
        <div style={{ minHeight: 62 }}>
          {!earn ? (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24, color: T.ink }}>
                  {fmtN(deal.asking, cur)}
                </span>
                <span style={{ fontSize: 13, color: T.sub, textDecoration: "line-through" }}>{fmtN(deal.market, cur)}</span>
                <Pill bg={T.amberSoft} color={T.amber}>−{disc}% below market</Pill>
              </div>
              <div style={{ fontSize: 12.5, color: T.amber, fontWeight: 600, marginTop: 6 }}>⏱ {deal.urgency}</div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24, color: T.teal }}>
                  {fmtN(deal.shortlet.monthlyNet, cur)}
                  <span style={{ fontSize: 13, fontWeight: 600 }}>/mo</span>
                </span>
                <Pill bg={T.tealSoft} color={T.teal}>AI rental projection</Pill>
              </div>
              <div style={{ fontSize: 12.5, color: T.sub, marginTop: 6 }}>
                {fmtN(deal.shortlet.nightly, cur)}/night · {Math.round(deal.shortlet.occ * 100)}% occupancy · {deal.yield}% gross yield
              </div>
            </div>
          )}
        </div>
      </div>

      {/* badges — flex-grow pushes them up, buttons pin to bottom */}
      <div style={{ padding: "12px 16px 8px", display: "flex", flexWrap: "wrap", gap: 6, flex: 1, alignContent: "flex-start" }}>
        <Pill bg={deal.titleGrade === "A" ? T.mint : deal.titleGrade === "B" ? T.goldSoft : T.amberSoft} color={deal.titleGrade === "A" ? T.green : deal.titleGrade === "B" ? "#8A6D0B" : T.amber}>
          {deal.title} · Grade {deal.titleGrade}
        </Pill>
        {deal.inspected ? (
          <Pill bg={T.mint} color={T.green}>✓ Field-inspected</Pill>
        ) : (
          <Pill bg={T.paper} color={T.sub} border={T.line}>Inspection scheduled</Pill>
        )}
        <RiskFlag kind="demolition" level={deal.demolition} />
        <RiskFlag kind="flood" level={deal.flood} />
      </div>

      {/* CTA row — always pinned to card bottom */}
      <div style={{ padding: "8px 16px 16px", display: "flex", gap: 8 }}>
        <Btn onClick={() => onOpen(deal)} style={{ flex: 1 }}>
          View full deal report
        </Btn>
        <Btn kind="ghost" small onClick={() => onOpen(deal)} style={{ alignSelf: "stretch", whiteSpace: "nowrap" }} title="Open the milestone-based escrow flow for this deal">
          Start escrow
        </Btn>
      </div>
    </div>
  );
};

/* ---------------- Deal modal ---------------- */

const DealModal = ({ deal, cur, onClose, onBuyAndOnboard }) => {
  const [step, setStep] = useState(1);
  const [forensicReport, setForensicReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  
  if (!deal) return null;
  const disc = Math.round(((deal.market - deal.asking) / deal.market) * 100);
  const steps = ["Offer accepted", "AGIS search & legal review", "Documents executed", "Possession — funds released"];

  const runForensics = async () => {
    setLoadingReport(true);
    const stages = [
      "Parsing title document integrity...",
      "Validating AGIS registration ledger...",
      "Cross-referencing demolition road-corridors...",
      "Checking lowland hydrology & drainage plans...",
      "Synthesizing legal mitigation plan..."
    ];
    
    // Animate stage messages
    for (let i = 0; i < stages.length; i++) {
      setLoadingStage(stages[i]);
      await new Promise(r => setTimeout(r, 550));
    }

    try {
      const res = await fetch('/api/forensics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: deal.name,
          district: deal.district,
          titleType: deal.title,
          titleGrade: deal.titleGrade,
          agisNotes: deal.agis,
          inspected: deal.inspected,
          demolitionFlag: deal.demolition,
          floodFlag: deal.flood,
          trust: deal.trust
        })
      });
      const result = await res.json();
      setForensicReport(result);
    } catch (e) {
      console.error("Forensic analysis failed:", e);
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(12,43,31,.45)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.paper,
          borderRadius: 20,
          width: "min(720px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <SectionLabel>AI Deal Intelligence Report</SectionLabel>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: T.ink }}>{deal.name}</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>
              {deal.district}, Abuja · Verified by {deal.verifiedBy}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: T.card, borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 16 }}>
            ✕
          </button>
        </div>

        {/* numbers grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
          {[
            ["Asking price", fmtFull(deal.asking, cur), T.ink],
            ["AI market value", fmtFull(deal.market, cur), T.green],
            ["Discount", "−" + disc + "%", T.amber],
            ["AI negotiation range", `${fmtN(deal.negotiation[0], cur)} – ${fmtN(deal.negotiation[1], cur)}`, T.ink],
          ].map(([k, v, c]) => (
            <div key={k} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{k}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 17, color: c, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* trust and verification + AI forensics trigger */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel color={T.gold}>Trust & Verification</SectionLabel>
            {!forensicReport && !loadingReport && (
              <button
                onClick={runForensics}
                style={{
                  background: `linear-gradient(135deg, ${T.gold}, #E1B22B)`,
                  color: T.ink,
                  border: "none",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontWeight: 700,
                  fontSize: 11.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: "0 2px 6px rgba(201,162,39,0.25)"
                }}
              >
                ✦ Run AI Document Forensics
              </button>
            )}
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, fontSize: 13.5, color: T.ink }}>
            <div>✓ Seller identity — NIN + BVN matched</div>
            <div>✓ Ownership chain consistent</div>
            <div>{deal.inspected ? "✓ Physical inspection — geotagged photos" : "○ Field inspection scheduled"}</div>
            <div>✓ AGIS status: {deal.agis}</div>
            <div>✓ Document forensics — no manipulation detected</div>
            <div>
              {deal.demolition === "none" && deal.flood !== "flag"
                ? "✓ No demolition or flood-corridor flags"
                : "⚠ Risk flags present — see report"}
            </div>
          </div>

          {loadingReport && (
            <div style={{
              background: T.paper,
              border: `1.5px dashed ${T.gold}`,
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
              marginTop: 14
            }}>
              <div className="spinner" style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: `3.5px solid ${T.gold}`,
                borderTopColor: "transparent",
                margin: "0 auto 10px"
              }}></div>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 14.5, color: T.ink }}>
                Running AI Title Forensics...
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>
                {loadingStage}
              </div>
            </div>
          )}

          {forensicReport && (
            <div style={{
              marginTop: 14,
              borderTop: `1.5px solid ${T.line}`,
              paddingTop: 14
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginBottom: 12, background: T.paper, padding: 12, borderRadius: 12, border: `1px solid ${T.line}` }}>
                <div>
                  <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>AI FORENSIC VERDICT</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.green }}>
                    {forensicReport.titleStatus.status}
                  </div>
                  <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
                    {forensicReport.titleStatus.explanation}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: 10, color: T.sub, fontWeight: 700, marginBottom: 2 }}>REVISED TRUST</div>
                  <TrustRing score={forensicReport.trustScore} size={48} />
                </div>
              </div>

              {/* risk table */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {[
                  ["Demolition Risk", forensicReport.risks.demolition],
                  ["Flood Exposure", forensicReport.risks.flood],
                  ["Deed Chain / Ownership", forensicReport.risks.ownership]
                ].map(([label, risk]) => {
                  const bad = risk.level === "flag";
                  const warn = risk.level === "watch";
                  const badgeBg = bad ? T.riskSoft : warn ? T.goldSoft : T.mint;
                  const badgeColor = bad ? T.risk : warn ? "#8A6D0B" : T.green;
                  return (
                    <div key={label} style={{ background: T.paper, padding: 12, borderRadius: 10, border: `1px solid ${T.line}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{label}</span>
                        <Pill bg={badgeBg} color={badgeColor}>
                          {risk.level.toUpperCase()}
                        </Pill>
                      </div>
                      <p style={{ fontSize: 12.5, color: T.sub, margin: "6px 0 0 0", lineHeight: 1.4 }}>
                        {risk.analysis}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* mitigation checklist */}
              <div style={{ background: T.paper, padding: 14, borderRadius: 12, border: `1px solid ${T.line}`, marginBottom: 12 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: T.ink, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                  ⚖ Actionable Legal Mitigation Plan
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {forensicReport.mitigationPlan.map((step, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: T.ink }}>
                      <span style={{ color: T.green, fontWeight: "bold", fontSize: 14, lineHeight: 1 }}>✓</span>
                      <span style={{ lineHeight: 1.35 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* pidgin summary speech bubble */}
              <div style={{
                background: T.tealSoft,
                border: `1px solid ${T.teal}33`,
                borderRadius: "14px 14px 14px 3px",
                padding: 14,
                position: "relative",
                boxShadow: "0 2px 6px rgba(14,107,117,.04)"
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 5 }}>
                  💡 AI Street-Smart Summary (Pidgin)
                </div>
                <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.45, fontStyle: "italic", fontWeight: 500 }}>
                  "{forensicReport.pidginSummary}"
                </div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, color: T.sub, marginTop: 10 }}>
            AI verification supports — never replaces — your own lawyer. Full search report is shareable with your counsel.
          </div>
        </div>

        {/* escrow */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginTop: 14 }}>
          <SectionLabel>Escrow — funds released by milestone</SectionLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {steps.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i + 1)}
                style={{
                  flex: "1 1 140px",
                  textAlign: "left",
                  border: `1.5px solid ${i < step ? T.green : T.line}`,
                  background: i < step ? T.mint : T.paper,
                  color: i < step ? T.green : T.sub,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {i < step ? "●" : "○"} {i + 1}. {s}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 8 }}>
            Held with a licensed partner bank. Pay in ₦ locally or from abroad — Paystack, bank transfer, or domiciliary FX.
          </div>
        </div>

        {/* flywheel */}
        {deal.shortlet && (
          <div style={{ background: T.teal, borderRadius: 14, padding: 18, marginTop: 14, color: "#fff" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, opacity: 0.85 }}>BUY SMART → EARN SMART</div>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 20, marginTop: 6 }}>
              Projected {fmtN(deal.shortlet.monthlyNet, cur)}/month as a managed shortlet
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
              {fmtN(deal.shortlet.nightly, cur)}/night · {Math.round(deal.shortlet.occ * 100)}% occupancy (district + event model) · payback boost from the −{disc}% purchase discount.
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn kind="gold" onClick={() => onBuyAndOnboard(deal)}>
                Simulate: buy &amp; onboard to Shortlet Manager →
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------- Deals view ---------------- */

const DealsView = ({ cur, onOpen, query, setQuery, dealsList, onAiSearch, aiResults, aiSearching, usingEmulator }) => {
  const [pidgin, setPidgin] = useState(false);
  const parsed = useMemo(() => {
    const q = query.toLowerCase();
    const district = ["jabi", "guzape", "wuse", "lugbe", "katampe", "kubwa", "maitama", "gwarinpa", "apo", "life camp"].find((d) => q.includes(d));
    const m = q.match(/(\d+)\s*(m|million)/);
    const maxM = m ? parseInt(m[1]) * 1_000_000 : null;
    const land = q.includes("land") || q.includes("plot");
    return { district, maxM, land };
  }, [query]);

  const deals = useMemo(() => {
    return dealsList.filter((d) => {
      // Only show published deals in the public view
      if (d.status && d.status !== "Published") return false;
      if (parsed.district && !d.district.toLowerCase().includes(parsed.district)) return false;
      if (parsed.maxM && d.asking > parsed.maxM) return false;
      if (parsed.land && d.type !== "Land") return false;
      return true;
    });
  }, [parsed, dealsList]);

  const example = pidgin
    ? "Abeg find me 2-bed wey dey Jabi under 100 million, C of O only"
    : "Find land in Lugbe under 40 million with regularizable title";

  return (
    <div>
      {/* hero */}
      <div style={{ background: T.ink, borderRadius: 20, padding: "28px 24px", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 220, height: 220, borderRadius: "50%", background: "rgba(201,162,39,.14)" }} />
        <div style={{ position: "absolute", right: 60, bottom: -70, width: 160, height: 160, borderRadius: "50%", background: "rgba(14,107,117,.22)" }} />
        <SectionLabel color={T.gold}>Pillar 1 · Verified Distress Deals — Abuja</SectionLabel>
        <h1 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: "clamp(24px,4vw,36px)", lineHeight: 1.15, margin: 0, maxWidth: 560 }}>
          Below-market properties. Verified before you ever see them.
        </h1>
        <p style={{ fontSize: 14.5, opacity: 0.85, maxWidth: 520, marginTop: 10 }}>
          Every deal passes NIN/BVN identity checks, AGIS title search, document forensics and field inspection. Funds move only through escrow.
        </p>

        {/* NL search */}
        <div style={{ marginTop: 16, background: "#fff", borderRadius: 14, padding: 8, display: "flex", gap: 8, alignItems: "center", maxWidth: 640, flexWrap: "wrap" }}>
          <input
            id="deals-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query.trim() && onAiSearch && onAiSearch(query)}
            placeholder={example}
            aria-label="Describe what you want"
            style={{ flex: "1 1 220px", border: "none", outline: "none", fontSize: 14, padding: "10px 12px", color: T.ink, fontFamily: "'Instrument Sans'", background: "transparent" }}
          />
          <Btn small kind="ghost" onClick={() => setQuery(example)}>🎙 Try voice</Btn>
          <Btn
            small
            id="ai-search-btn"
            onClick={() => query.trim() && onAiSearch && onAiSearch(query)}
            disabled={aiSearching}
            style={{ opacity: aiSearching ? 0.7 : 1, minWidth: 100 }}
          >
            {aiSearching ? "Searching…" : usingEmulator ? "✦ AI Search" : "AI Search"}
          </Btn>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>The AI understands</span>
          <button
            onClick={() => setPidgin(false)}
            style={{ fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", borderRadius: 999, padding: "3px 10px", background: !pidgin ? T.gold : "rgba(255,255,255,.12)", color: !pidgin ? T.ink : "#fff" }}
          >
            English
          </button>
          <button
            onClick={() => setPidgin(true)}
            style={{ fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", borderRadius: 999, padding: "3px 10px", background: pidgin ? T.gold : "rgba(255,255,255,.12)", color: pidgin ? T.ink : "#fff" }}
          >
            Pidgin
          </button>
          <span style={{ fontSize: 12, opacity: 0.7 }}>· Hausa & Yoruba coming soon</span>
        </div>
      </div>

      {/* ── AI semantic results panel (live from pgvector) ── */}
      {aiResults && aiResults.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{
              background: "linear-gradient(135deg, #0E5A3A, #0E6B75)",
              color: "#fff",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 700,
              padding: "4px 12px",
              letterSpacing: 0.5,
            }}>✦ AI SEMANTIC MATCH — pgvector cosine similarity</span>
            <button
              onClick={() => onAiSearch && onAiSearch(null)}
              style={{ border: "none", background: "none", color: T.amber, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >clear results</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
            {aiResults.map((r) => (
              <div key={r.id} style={{
                background: T.card,
                border: `2px solid ${T.green}22`,
                borderRadius: 16,
                padding: 20,
                position: "relative",
              }}>


                <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>✓ AGIS Verified · Distress Sale</div>
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 16, color: T.ink, lineHeight: 1.3 }}>{r.title}</div>
                <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{r.district}</div>
                {r.askingPrice && (
                  <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: T.amber, marginTop: 10 }}>
                    {fmtN(r.askingPrice, cur)}
                  </div>
                )}
                <Btn small style={{ marginTop: 14, width: "100%" }} onClick={() => onOpen && onOpen(r)}>
                  View deal →
                </Btn>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: T.line, margin: "20px 0" }} />
          <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 8 }}>All verified listings below</div>
        </div>
      )}

      {/* parsed chip */}
      {query && !aiResults?.length && (
        <div style={{ marginTop: 12, fontSize: 13, color: T.sub }}>
          <b style={{ color: T.green }}>AI understood:</b>{" "}
          {[
            parsed.district ? `district ≈ ${parsed.district[0].toUpperCase() + parsed.district.slice(1)}` : null,
            parsed.maxM ? `budget ≤ ${fmtN(parsed.maxM, cur)}` : null,
            parsed.land ? "land / plots only" : null,
          ]
            .filter(Boolean)
            .join(" · ") || "showing all verified deals"}
          {"  "}
          <button onClick={() => setQuery("")} style={{ border: "none", background: "none", color: T.amber, cursor: "pointer", fontWeight: 600 }}>
            clear
          </button>
        </div>
      )}

      {/* grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14, marginTop: 16 }}>
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} cur={cur} onOpen={onOpen} />
        ))}
        {deals.length === 0 && (
          <div style={{ gridColumn: "1/-1", background: T.card, border: `1px dashed ${T.line}`, borderRadius: 14, padding: 24, textAlign: "center", color: T.sub, fontSize: 14 }}>
            No verified deal matches that yet. Set a deal alert and the AI will message you on WhatsApp the moment one clears verification.
            <div style={{ marginTop: 10 }}>
              <Btn kind="wa" small onClick={() => { setQuery(""); /* bubble opened below via setWaOpen */ document.querySelector('[aria-label="Open WhatsApp AI assistant"]')?.click(); }}>Set WhatsApp deal alert</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------- Shortlet view ---------------- */

const ShortletView = ({ cur, units, user, onSignInRequest }) => {
  const totNet = units.reduce((s, u) => s + u.monthNet, 0);
  const avgOcc = Math.round((units.reduce((s, u) => s + u.occ, 0) / units.length) * 100);
  return (
    <div>
      {/* Auth state warning */}
      {!user && (
        <div style={{
          background: T.goldSoft,
          color: "#8A6D0B",
          border: `1px solid ${T.gold}44`,
          padding: "12px 18px",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <span>🔒 You are viewing the <strong>Demo/Preview Portfolio</strong>. Sign in to unlock live yield tracking, gate compliance, and tenant details.</span>
          <button 
            onClick={onSignInRequest}
            style={{
              background: T.gold,
              color: T.ink,
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            Sign In Now
          </button>
        </div>
      )}

      {/* Hero Portfolio Stat Board */}
      <div style={{ 
        background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`, 
        borderRadius: 20, 
        padding: "32px 28px", 
        color: "#fff",
        boxShadow: "0 8px 24px rgba(10,66,43,0.15)",
        border: `1px solid rgba(255,255,255,0.06)`,
        position: "relative",
        overflow: "hidden"
      }}>
        {/* subtle circular background lights */}
        <div style={{ position: "absolute", right: -50, top: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }}></div>
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <SectionLabel color={T.gold}>Pillar 2 · AI Shortlet Manager — portfolio</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 12.5, opacity: 0.8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Projected Net Revenue / Mo</div>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: "clamp(24px, 4.5vw, 42px)", color: "#fff", marginTop: 4 }}>
                {fmtN(totNet, cur)}
              </div>
            </div>
            <div style={{ width: 1.5, height: 48, background: "rgba(255,255,255,0.15)", alignSelf: "center" }}></div>
            <div>
              <div style={{ fontSize: 12.5, opacity: 0.8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Portfolio Occupancy</div>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: "clamp(24px, 4.5vw, 42px)", color: T.gold, marginTop: 4 }}>
                {avgOcc}%
              </div>
            </div>
            <div style={{ width: 1.5, height: 48, background: "rgba(255,255,255,0.15)", alignSelf: "center" }}></div>
            <div>
              <div style={{ fontSize: 12.5, opacity: 0.8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Units Under Management</div>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: "clamp(24px, 4.5vw, 42px)", color: "#fff", marginTop: 4 }}>
                {units.length}
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 13, opacity: 0.85, maxWidth: 260, lineHeight: 1.45, background: "rgba(255,255,255,0.06)", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
              Payouts every Friday · Paystack / bank transfer · statements auto-sent to WhatsApp.
            </div>
          </div>
        </div>
      </div>

      {/* units */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14, marginTop: 16 }}>
        {units.map((u) => (
          <div key={u.id} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 16, color: T.ink }}>{u.name}</div>
                <div style={{ fontSize: 12.5, color: T.sub }}>{u.district}, Abuja · ★ {u.rating}</div>
              </div>
              {u.new && <Pill bg={T.goldSoft} color="#8A6D0B">Just onboarded 🎉</Pill>}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>NIGHTLY (AI-SET)</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: T.ink }}>{fmtN(u.nightly, cur)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>OCCUPANCY</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: T.ink }}>{Math.round(u.occ * 100)}%</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>NET / MONTH</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: T.teal }}>{fmtN(u.monthNet, cur)}</div>
              </div>
            </div>
            {/* flex-grow pushes check-in strip to card bottom, equalising heights */}
            <div style={{ flex: 1 }} />
            <div style={{ marginTop: 12, background: T.tealSoft, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, color: T.teal, fontWeight: 600 }}>
              Next check-in: {u.nextGuest || "AI is filling the calendar…"}
            </div>
          </div>
        ))}
        {/* Add-unit ghost card fills empty grid slot */}
        <div
          style={{
            border: `1.5px dashed ${T.line}`,
            borderRadius: 16,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            cursor: "pointer",
            minHeight: 160,
            background: "transparent",
            transition: "border-color .18s ease, background .18s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.teal; e.currentTarget.style.background = T.tealSoft; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = "transparent"; }}
          title="Onboard a new property to the AI Shortlet Manager"
          role="button"
          aria-label="Add a new shortlet unit"
        >
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1.5px dashed ${T.teal}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: T.teal }}>+</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.teal }}>Add a unit</div>
          <div style={{ fontSize: 12, color: T.sub, textAlign: "center", maxWidth: 180, lineHeight: 1.4 }}>AI sets the price, screens guests, and handles check-ins.</div>
        </div>
      </div>

      {/* dynamic pricing */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 18, marginTop: 16 }}>
        <SectionLabel color={T.teal}>AI Dynamic Pricing — this week (event-aware)</SectionLabel>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {WEEK.map((w) => {
            const hot = w.adj >= 18;
            return (
              <div
                key={w.d}
                title={w.why}
                style={{
                  flex: "1 0 92px",
                  background: hot ? T.teal : T.paper,
                  color: hot ? "#fff" : T.ink,
                  border: `1px solid ${hot ? T.teal : T.line}`,
                  borderRadius: 12,
                  padding: "10px 10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, opacity: hot ? 0.9 : 0.6 }}>{w.d}</div>
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, marginTop: 2 }}>+{w.adj}%</div>
                <div style={{ fontSize: 10.5, marginTop: 3, opacity: hot ? 0.9 : 0.6, lineHeight: 1.25 }}>{w.why}</div>
              </div>
            );
          })}
        </div>
        
        {/* pricing day tiles legend — dots, not squares */}
        <div style={{ display: "flex", gap: 20, marginTop: 14, flexWrap: "wrap", borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.sub }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: T.teal, flexShrink: 0, display: "inline-block" }}></span>
            <span><b>AI Event Spike</b>: Demand-aware premium rates (e.g. tech summits, AU conferences).</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: T.sub }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#CBD0C8", flexShrink: 0, display: "inline-block" }}></span>
            <span><b>Standard Baseline</b>: Regular weekday pricing optimisation.</span>
          </div>
        </div>
      </div>

      {/* Active Operations */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, borderBottom: `1px solid ${T.line}`, paddingBottom: 12 }}>
          <span style={{ fontSize: 18 }}>⚙️</span>
          <h2 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.ink, margin: 0 }}>
            Active Operations
          </h2>
        </div>
        
        {/* Two columns — aligned bottoms via stretch + identical footer note row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24, alignItems: "start" }}>
          {/* maintenance */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <SectionLabel color={T.teal}>AI Maintenance Predictions</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {MAINT.map((m) => (
                <div key={m.item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.line}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{m.item}</div>
                    <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>{m.conf}</div>
                  </div>
                  <Pill
                    bg={m.level === "soon" ? T.amberSoft : m.level === "watch" ? T.goldSoft : T.mint}
                    color={m.level === "soon" ? T.amber : m.level === "watch" ? "#8A6D0B" : T.green}
                  >
                    {m.due}
                  </Pill>
                </div>
              ))}
            </div>
          </div>

          {/* guest screening */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <SectionLabel color={T.teal}>AI Guest Screening (NIN/BVN-linked)</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {SCREENED.map((s) => (
                <div key={s.g} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.line}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{s.g}</div>
                    <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>{s.note}</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <Pill bg={s.ok ? T.mint : T.riskSoft} color={s.ok ? T.green : T.risk}>
                      {s.risk}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* shared full-width footer note — sits below both columns */}
        <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 14, paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 24 }}>
          <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.45 }}>
            Generator, inverter, AC and pump models tuned for Nigerian power reality — fixes flagged before guests check in.
          </div>
          <div style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.45 }}>
            Estate compliance mode auto-registers verified guests with your estate's security gate.
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- WhatsApp assistant ---------------- */

const waReply = (msg) => {
  const q = msg.toLowerCase();
  if (q.includes("jabi"))
    return "I get 2 verified options for Jabi 👌 — a 3-bed at ₦95m (Trust 92, C of O, −21% vs market) and a lakeside studio pair. You wan make I book inspection for Saturday or send the AI deal report here?";
  if (q.includes("shortlet") || q.includes("manage"))
    return "For shortlet management: we handle pricing, guests, cleaning & maintenance. Typical Guzape 2-bed nets ₦1.9m/month at 74% occupancy. Send your property location and photos, the AI will project your earnings in 2 minutes.";
  if (q.includes("escrow") || q.includes("pay"))
    return "Payments sit in escrow with our licensed partner bank and only release when: (1) AGIS search is clean, (2) documents are executed, (3) you take possession. You can pay from abroad in USD/GBP too. 🔒";
  if (q.includes("land") || q.includes("lugbe"))
    return "Verified land in Lugbe: 2 plots at ₦38m (regularization at Stage 3 of 5 — I go show you the file status). Note: one corner of that axis carries a seasonal flood-watch flag, so the report includes drainage guidance. Want the full title breakdown?";
  return "You fit ask me anything — search deals, check title status, book inspection, or project shortlet earnings. Try: \u201cFind me 2-bed for Jabi under 100m\u201d 🙂";
};

const WhatsAppPanel = ({ open, setOpen }) => {
  const [msgs, setMsgs] = useState([
    { me: false, t: "Welcome to The Landlord Property AI 🇳🇬 — I dey here 24/7. Ask in English or Pidgin: deals, titles, escrow, or shortlet earnings." },
  ]);
  const [inp, setInp] = useState("");
  const boxRef = useRef(null);
  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [msgs, open]);
  const send = () => {
    if (!inp.trim()) return;
    const mine = inp.trim();
    setMsgs((m) => [...m, { me: true, t: mine }]);
    setInp("");
    setTimeout(() => setMsgs((m) => [...m, { me: false, t: waReply(mine) }]), 500);
  };
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open WhatsApp AI assistant"
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 90,
          background: "#1FAF55",
          color: "#fff",
          border: "none",
          borderRadius: 999,
          padding: "13px 18px",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(31,175,85,.4)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        💬 WhatsApp AI
      </button>
      {open && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 76,
            zIndex: 90,
            width: "min(360px, calc(100vw - 36px))",
            background: "#fff",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 16px 40px rgba(12,43,31,.28)",
            border: `1px solid ${T.line}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ background: "#0B3D2E", color: "#fff", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Landlord AI · WhatsApp</div>
              <div style={{ fontSize: 11.5, opacity: 0.8 }}>Online · replies in seconds · English / Pidgin</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: 8, width: 28, height: 28, cursor: "pointer" }}>
              ✕
            </button>
          </div>
          <div ref={boxRef} style={{ height: 300, overflowY: "auto", padding: 12, background: "#EFEAE2", display: "flex", flexDirection: "column", gap: 8 }}>
            {msgs.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.me ? "flex-end" : "flex-start",
                  maxWidth: "84%",
                  background: m.me ? "#D7F5C8" : "#fff",
                  borderRadius: m.me ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                  padding: "8px 11px",
                  fontSize: 13.2,
                  color: "#1c261f",
                  lineHeight: 1.4,
                  boxShadow: "0 1px 1px rgba(0,0,0,.08)",
                }}
              >
                {m.t}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, padding: 10, borderTop: `1px solid ${T.line}` }}>
            <input
              value={inp}
              onChange={(e) => setInp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder='Try "escrow" or "find 2-bed for Jabi"'
              aria-label="Message the AI assistant"
              style={{ flex: 1, border: `1px solid ${T.line}`, borderRadius: 999, padding: "9px 14px", fontSize: 13.5, outline: "none", fontFamily: "'Instrument Sans'" }}
            />
            <Btn kind="wa" small onClick={send}>Send</Btn>
          </div>
        </div>
      )}
    </>
  );
};

/* ---------------- App ---------------- */

export default function App() {
  const [tab, setTab] = useState("deals");
  const [cur, setCur] = useState("NGN");
  const [modal, setModal] = useState(null);
  const [waOpen, setWaOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [units, setUnits] = useState(BASE_UNITS);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  // Initialize stateful deals list with "Published" status
  const [dealsList, setDealsList] = useState(() => {
    try {
      const stored = localStorage.getItem("lp_admin_deals");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEALS.map(d => ({
      ...d,
      status: "Published",
      negotiation_low: d.negotiation ? d.negotiation[0] : "",
      negotiation_high: d.negotiation ? d.negotiation[1] : "",
      shortlet_nightly: d.shortlet ? d.shortlet.nightly : "",
      shortlet_occ: d.shortlet ? d.shortlet.occ : "",
      shortlet_monthlyNet: d.shortlet ? d.shortlet.monthlyNet : ""
    }));
  });

  const [usingEmulator, setUsingEmulator] = useState(false);
  const [dbProperties, setDbProperties] = useState([]);

  // AI semantic search state
  const [aiResults, setAiResults] = useState(null);
  const [aiSearching, setAiSearching] = useState(false);

  // Trigger pgvector cosine similarity search via MatchDistressProperties query
  const handleAiSearch = async (buyerQuery) => {
    if (!buyerQuery) { setAiResults(null); return; }
    // SecureDistressSearch requires a signed-in user with auth.token.kycVerified == true
    if (!user) { setShowAuth(true); return; }
    setAiSearching(true);
    setAiResults(null);
    try {
      const res = await secureDistressSearch(dataConnect, { buyerQuery });
      setAiResults(res?.data?.properties ?? []);
      if (!res?.data?.properties?.length) {
        setToast("No matching distress properties found — try a different description.");
        setTimeout(() => setToast(null), 4000);
      }
    } catch (e) {
      console.error("AI semantic search failed:", e);
      const isKyc = e?.message?.includes("PERMISSION_DENIED") || e?.code === "permission-denied";
      setToast(
        isKyc
          ? "KYC verification required — your account needs identity verification to unlock AI search."
          : usingEmulator
            ? "AI search error — ensure Vertex AI is enabled in your Firebase project."
            : "AI semantic search requires the local emulator to be running."
      );
      setTimeout(() => setToast(null), 5000);
      setAiResults([]);
    } finally {
      setAiSearching(false);
    }
  };


  // Check if emulator is active on startup
  useEffect(() => {
    const checkEmulator = async () => {
      try {
        await fetchDistrictAvailability(dataConnect, {
          district: "TestConnectionOnly",
          checkIn: "2026-07-01",
          checkOut: "2026-07-02"
        });
        setUsingEmulator(true);
        console.log("SQL Connect emulator is active! Live database connection enabled.");
      } catch (e) {
        console.warn("SQL Connect emulator not reachable. Falling back to local storage.", e);
        setUsingEmulator(false);
      }
    };
    checkEmulator();
  }, []);

  // Track Firebase Auth state — drives the KYC gate on SecureDistressSearch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return unsubscribe; // cleans up listener on unmount
  }, []);

  // Seed database if emulator is active and not seeded yet
  useEffect(() => {
    if (!usingEmulator) return;
    const seedDatabase = async () => {
      try {
        const seeded = localStorage.getItem("lp_db_seeded_v2");
        if (!seeded) {
          console.log("Seeding SQL Connect database with mock listings & embeddings...");
          for (const d of DEALS) {
            const desc = `${d.name} in ${d.district} district. Title details: ${d.title}. Sale urgency context: ${d.urgency}. Verified by ${d.verifiedBy}.`;
            await createDistressProperty(dataConnect, {
              title: d.name,
              district: d.district,
              nightlyRate: d.shortlet ? d.shortlet.nightly : 0,
              askingPrice: d.asking,
              description: desc
            });
          }
          localStorage.setItem("lp_db_seeded_v2", "true");
          console.log("Seeding complete!");
        }
      } catch (e) {
        console.error("Failed to seed database:", e);
      }
    };
    seedDatabase();
  }, [usingEmulator]);

  // Load listings from SQL Connect if active
  const parsedDistrict = useMemo(() => {
    const q = query.toLowerCase();
    return ["jabi", "guzape", "wuse", "lugbe", "katampe", "kubwa", "maitama", "gwarinpa", "apo", "life camp"].find((d) => q.includes(d));
  }, [query]);

  useEffect(() => {
    if (!usingEmulator) return;
    const loadProperties = async () => {
      try {
        let res;
        if (parsedDistrict) {
          const searchDistrict = parsedDistrict[0].toUpperCase() + parsedDistrict.slice(1);
          res = await fetchDistrictAvailability(dataConnect, {
            district: searchDistrict,
            checkIn: "2026-07-01",
            checkOut: "2026-07-08"
          });
        } else {
          res = await listAllProperties(dataConnect, {
            checkIn: "2026-07-01",
            checkOut: "2026-07-08"
          });
        }

        if (res.data && res.data.properties) {
          const mapped = res.data.properties.map(p => {
            const original = DEALS.find(d => d.name.toLowerCase().includes(p.title.toLowerCase()) || p.title.toLowerCase().includes(d.name.toLowerCase())) || DEALS[0];
            return {
              ...original,
              id: p.id,
              name: p.title,
              district: p.district,
              shortlet: original.shortlet ? {
                ...original.shortlet,
                nightly: p.nightlyRate
              } : null,
              status: "Published",
              bookings: p.bookings_on_property || []
            };
          });
          setDbProperties(mapped);
        }
      } catch (e) {
        console.error("Failed to fetch properties from SQL Connect:", e);
      }
    };
    loadProperties();
  }, [usingEmulator, parsedDistrict]);

  const buyAndOnboard = async (deal) => {
    setModal(null);

    if (usingEmulator) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deal.id);
        if (isUUID) {
          console.log("SQL Connect: Booking property:", deal.name);
          await createBooking(dataConnect, {
            propertyId: deal.id,
            checkIn: "2026-07-06",
            checkOut: "2026-07-13"
          });
          console.log("SQL Connect: Saved booking successfully!");
        } else {
          console.warn("SQL Connect: Skipping booking because ID is not a valid UUID (mock property):", deal.id);
        }
      } catch (e) {
        console.error("SQL Connect: Failed to save booking:", e);
      }
    }

    setUnits((u) =>
      u.some((x) => x.id === "onb-" + deal.id)
        ? u
        : [
            ...u,
            {
              id: "onb-" + deal.id,
              name: deal.name.split(",")[0],
              district: deal.district,
              nightly: deal.shortlet ? deal.shortlet.nightly : 0,
              occ: deal.shortlet ? deal.shortlet.occ : 0.7,
              monthNet: deal.shortlet ? deal.shortlet.monthlyNet : 0,
              nextGuest: null,
              rating: 5.0,
              new: true,
            },
          ]
    );
    setTab("shortlet");
    setToast("Deal secured in escrow → property onboarded. The AI is now pricing it and filling the calendar.");
    setTimeout(() => setToast(null), 4200);
  };

  // If in admin tab, render the Admin sub-component directly
  if (tab === "admin") {
    return (
      <Admin
        initialDeals={dealsList}
        onDealsChange={(updatedDeals) => {
          const oldLength = dealsList.length;
          setDealsList(updatedDeals);
          if (usingEmulator && updatedDeals.length > oldLength) {
            const added = updatedDeals.filter(ud => !dealsList.some(dl => dl.id === ud.id));
            added.forEach(async (newDeal) => {
              try {
                await createProperty(dataConnect, {
                  title: newDeal.name,
                  district: newDeal.district,
                  nightlyRate: newDeal.shortlet_nightly ? Number(newDeal.shortlet_nightly) : 0
                });
                console.log("SQL Connect: Saved new property:", newDeal.name);
              } catch (e) {
                console.error("SQL Connect: Failed to save property:", e);
              }
            });
          }
        }}
        onBack={() => setTab("deals")}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: "'Instrument Sans', system-ui, sans-serif", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { line-height: 1.5; -webkit-font-smoothing: antialiased; }
        p { margin: 0; }
        button:focus-visible, input:focus-visible { outline: 2.5px solid ${T.gold}; outline-offset: 2px; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${T.line}; border-radius: 99px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
        @keyframes slideup { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes pulsedot {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes shimmer {
          from { background-position: -200% center; }
          to   { background-position:  200% center; }
        }
        .spinner { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Diaspora banner shimmer gradient text */
        .diaspora-shimmer {
          background: linear-gradient(90deg, #C9A227 0%, #fff 40%, #C9A227 70%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      {/* Refined Premium Sticky Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(245,246,242,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${T.line}`,
          boxShadow: "0 1px 2px rgba(12,43,31,0.02)",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          
          {/* Logo & Typographic Brand Lockup */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Bricolage Grotesque'",
              fontWeight: 800,
              fontSize: 18,
              boxShadow: "0 2px 8px rgba(14,90,58,0.2)"
            }}>
              L
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 17, color: T.ink }}>The Landlord</span>
                <span style={{ fontFamily: "'Instrument Sans'", fontWeight: 400, fontSize: 16, color: T.green }}>Property AI</span>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.gold }}></span>
              </div>
              <div style={{ fontSize: 9.5, color: T.sub, letterSpacing: 1.2, fontWeight: 700, textTransform: "uppercase", marginTop: 1 }}>
                Verification &amp; Escrow Gateway · Abuja
              </div>
            </div>
          </div>

          {/* Pulsating Database Status Chip */}
          {usingEmulator && (
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.green,
              background: T.mint,
              border: `1px solid ${T.green}22`,
              padding: "6px 12px",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              gap: 7,
              boxShadow: "0 1px 2px rgba(14,90,58,0.05)"
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: T.green,
                display: "inline-block",
                animation: "pulsedot 1.8s infinite ease-in-out"
              }}></span>
              Live SQL Connect
            </div>
          )}

          {/* Glassmorphic Navigation Bar */}
          <nav style={{
            display: "flex",
            gap: 3,
            background: "rgba(255, 255, 255, 0.6)",
            border: `1.5px solid ${T.line}`,
            borderRadius: 14,
            padding: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            {[
              ["deals", "⚡ Distress Deals"],
              ["shortlet", "🏡 Shortlet Manager"],
              ["profile", "👤 Profile"],
              ...(user ? [["admin", "⚙️ Admin"]] : []),
            ].map(([k, label]) => {
              const active = tab === k;
              return (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: active ? 700 : 600,
                    cursor: "pointer",
                    background: active
                      ? (k === "deals" ? T.green : k === "shortlet" ? T.teal : k === "profile" ? T.greenDark : T.ink)
                      : "transparent",
                    color: active ? "#fff" : T.sub,
                    transition: "all .2s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Diaspora Currency Switcher */}
          <button
            onClick={() => setCur(cur === "NGN" ? "USD" : "NGN")}
            title="Diaspora Mode — toggle NGN / USD pricing"
            style={{
              border: `1.5px solid ${T.line}`,
              background: "#fff",
              borderRadius: 12,
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              color: T.ink,
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              transition: "border-color .15s ease"
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.line}
          >
            {cur === "NGN" ? (
              <><span>🇳🇬</span> NGN ⇄</>
            ) : (
              <><span>🌐</span> USD ⇄</>
            )}
          </button>

          {/* ── Auth / User Control ── */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                title={user.displayName || user.email}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: T.green,
                  color: "#fff",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13.5,
                  overflow: "hidden",
                  boxShadow: `0 0 0 2px #fff, 0 0 0 3.5px ${T.green}`,
                }}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  (user.displayName || user.email || "U")[0].toUpperCase()
                )}
              </div>
              <button
                onClick={() => signOut(auth)}
                style={{
                  border: `1.5px solid ${T.line}`,
                  background: "#fff",
                  borderRadius: 12,
                  padding: "7px 13px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  color: T.sub,
                  transition: "border-color .15s ease"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.risk}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.line}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              id="sign-in-btn"
              onClick={() => setShowAuth(true)}
              style={{
                border: "none",
                background: T.green,
                color: "#fff",
                borderRadius: 12,
                padding: "9px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(14,90,58,0.2)",
                transition: "transform .12s ease, opacity .15s ease",
              }}
              onMouseDown={e => e.currentTarget.style.transform = "scale(.96)"}
              onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* body */}
      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "18px 18px 90px" }}>
        {tab === "deals" ? (
          <DealsView cur={cur} onOpen={setModal} query={query} setQuery={setQuery} dealsList={usingEmulator ? dbProperties : dealsList} onAiSearch={handleAiSearch} aiResults={aiResults} aiSearching={aiSearching} usingEmulator={usingEmulator} />
        ) : tab === "profile" ? (
          <Profile
            user={user}
            cur={cur}
            onSignInRequest={() => setShowAuth(true)}
            onListingsChange={setDealsList}
            dealsList={dealsList}
            onToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); }}
            onRegisterDistressProperty={async (newProp) => {
              if (!usingEmulator) return;
              try {
                await createDistressProperty(dataConnect, {
                  title: newProp.title,
                  nightlyRate: 0,
                  district: newProp.district,
                  askingPrice: newProp.askingPrice,
                  description: newProp.description
                });
                console.log("SQL Connect: Saved user submitted distress listing:", newProp.title);
              } catch (e) {
                console.error("SQL Connect: Failed to save user distress listing:", e);
              }
            }}
          />
        ) : (
          <ShortletView cur={cur} units={units} user={user} onSignInRequest={() => setShowAuth(true)} />
        )}

        {/* ── Diaspora Wealth Accelerator CTA Banner ── */}
        <div style={{
          marginTop: 56,
          background: `linear-gradient(135deg, ${T.ink} 0%, #0A3420 60%, #0E3B4E 100%)`,
          borderRadius: 22,
          padding: "40px 32px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(12,43,31,0.18)",
        }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", right: -60, top: -60, width: 240, height: 240, borderRadius: "50%", background: `rgba(201,162,39,.07)` }} />
          <div style={{ position: "absolute", left: "45%", bottom: -80, width: 200, height: 200, borderRadius: "50%", background: `rgba(14,107,117,.1)` }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.gold, marginBottom: 12 }}>Diaspora Wealth Accelerator</div>
            <div className="diaspora-shimmer" style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: "clamp(22px, 4vw, 36px)", lineHeight: 1.2, marginBottom: 14, maxWidth: 700 }}>
              Live in London, Lagos, or Houston — own in Abuja.
            </div>
            <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.78)", maxWidth: 620, lineHeight: 1.65, marginBottom: 24 }}>
              Every deal supports USD, GBP, and CAD payments through our partner-bank escrow. Your AI concierge handles everything on the ground — from AGIS title searches to WhatsApp-verified tenant check-ins — while your portfolio generates verified monthly income.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Btn kind="gold" onClick={() => setWaOpen(true)}>
                💬 Talk to a deal concierge
              </Btn>
              <Btn kind="ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={() => setTab("deals")}>
                Browse verified deals →
              </Btn>
            </div>
          </div>
        </div>
      </main>

      {/* Premium content-rich footer */}
      <footer style={{ background: T.ink, color: "#fff", padding: "64px 24px 40px", borderTop: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40 }}>
          {/* Column 1: Brand & About */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: T.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 16 }}>
                L
              </div>
              <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, letterSpacing: -0.2 }}>The Landlord Property AI</span>
            </div>
            <p style={{ fontSize: 13.5, opacity: 0.75, lineHeight: 1.6, margin: "0 0 20px 0" }}>
              Abuja's premier AI-powered distress deal marketplace and automated shortlet management platform. We bridge properties directly to verification pipelines.
            </p>
          </div>

          {/* Column 2: Vision & Mission */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, letterSpacing: 1.4, textTransform: "uppercase", color: T.gold, marginBottom: 18 }}>Our Vision</div>
            <p style={{ fontSize: 13.5, opacity: 0.75, lineHeight: 1.6, margin: 0 }}>
              To eliminate transaction friction and title fraud in Nigerian real estate. We empower buyers, sellers, and diaspora investors with verified AGIS legal records and secure escrow flows.
            </p>
          </div>

          {/* Column 3: Trust Pillars */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, letterSpacing: 1.4, textTransform: "uppercase", color: T.gold, marginBottom: 18 }}>Security & Escrow</div>
            <ul style={{ listStyleType: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11, fontSize: 13.5, opacity: 0.85 }}>
              <li>🔒 Partner bank milestone escrow</li>
              <li>🪪 NIN / BVN identity verification</li>
              <li>⚖ Certified AGIS title chain search</li>
              <li>📱 Integrated WhatsApp concierge</li>
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, letterSpacing: 1.4, textTransform: "uppercase", color: T.gold, marginBottom: 18 }}>Contact Info</div>
            <div style={{ fontSize: 13.5, opacity: 0.75, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>📍 Constitution Avenue, Central Business District, Abuja, FCT</div>
              <div>✉️ support@thelandlord.ai</div>
              <div>📞 +234 (0) 90 9823 4823</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ color: T.gold, fontWeight: 700 }}>Concierge:</span> Chat on WhatsApp via the active bubble below
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ maxWidth: 1120, margin: "50px auto 0", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 20, fontSize: 12, opacity: 0.6 }}>
          <div>© {new Date().getFullYear()} The Landlord Property AI. All rights reserved.</div>
          <div style={{ maxWidth: 620, lineHeight: 1.4 }}>
            Disclaimer: AI verification scores and predictions are tools for decision support. They do not constitute legal advice. Always execute final transactions through legal counsel.
          </div>
        </div>
      </footer>

      {toast && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 20,
            zIndex: 80,
            background: T.ink,
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 12,
            fontSize: 13.5,
            fontWeight: 600,
            maxWidth: "min(520px, 92vw)",
            boxShadow: "0 12px 30px rgba(12,43,31,.35)",
            animation: "slideup .3s ease",
          }}
        >
          ✅ {toast}
        </div>
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(u) => { setUser(u); setShowAuth(false); }}
        />
      )}
      <DealModal deal={modal} cur={cur} onClose={() => setModal(null)} onBuyAndOnboard={buyAndOnboard} />
      <WhatsAppPanel open={waOpen} setOpen={setWaOpen} />
    </div>
  );
}
