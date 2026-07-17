import React, { useState, useMemo, useRef, useEffect } from "react";
import Admin from "./Admin";
import Marketplace from "./Marketplace";
import Listings from "./Listings";
import { dataConnect, auth, db, requestNotificationPermission, onForegroundMessage, aiModel } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, updateDoc, serverTimestamp, query, collection, where, orderBy, onSnapshot, writeBatch, addDoc, getDocs, getDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { fetchDistrictAvailability, createProperty, createBooking, secureDistressSearch, createDistressProperty, listAllProperties } from "./lib/dataconnect";
import AuthModal from "./AuthModal";
import Profile from "./Profile";
import ShortletView from "./ShortletView";
import About from "./About";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

/* ============================================================
   THE LANDLORD PROPERTY — Launch Edition Web App
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
  purple: "#6B3FA0",
  paper: "#F5F6F2",
  card: "#FFFFFF",
  line: "#E2E5DF",
  sub: "#5B6A61",
};

const FX = 1550; // ₦ per USD (demo rate)

const fmtN = (n, cur) => {
  const val = Number(n || 0);
  if (cur === "USD") {
    const v = val / FX;
    return v >= 1000
      ? "$" + Math.round(v).toLocaleString()
      : "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (val >= 1_000_000) return "₦" + (val / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "m";
  return "₦" + val.toLocaleString();
};

const fmtFull = (n, cur) => {
  const val = Number(n || 0);
  return cur === "USD" ? "$" + Math.round(val / FX).toLocaleString() : "₦" + val.toLocaleString();
};

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

/* ---------------- Property photo map (one per deal type) ---------------- */
// Curated Unsplash photos that match each deal's property type (fallback when no real photos uploaded)
const DEAL_PHOTOS = {
  d1: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",  // apartment
  d2: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",  // terrace duplex
  d3: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",  // land/plots
  d4: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",  // studio/1-bed
  d5: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80",  // 5-bed detached
  d6: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80",  // corner plot land
};
/**
 * Returns the primary photo URL for a deal.
 * Prefers real Firebase Storage uploads (deal.imageUrls), falls back to
 * curated Unsplash photos by deal ID, then a generic apartment shot.
 */
const getDealPhoto = (deal) => {
  if (deal?.imageUrls?.length > 0) return deal.imageUrls[0];
  return DEAL_PHOTOS[deal?.id] || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80";
};

/**
 * Returns the full photo gallery for a deal.
 * Uses real uploaded photos first, then falls back to a single Unsplash shot.
 */
const getDealPhotos = (deal) => {
  if (deal?.imageUrls?.length > 0) return deal.imageUrls;
  const fallback = getDealPhoto(deal);
  return [fallback];
};


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

/* ---------------- Heart / Save Button ---------------- */

const HeartBtn = ({ dealId, savedIds, onToggle, size = "card" }) => {
  const isSaved = savedIds.has(dealId);
  const [burst, setBurst] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isSaved) {
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    onToggle(dealId);
  };

  const isCard = size === "card";
  return (
    <button
      onClick={handleClick}
      title={isSaved ? "Remove from Saved" : "Save this deal"}
      aria-label={isSaved ? "Remove from saved deals" : "Save deal"}
      style={{
        border: "none",
        background: isSaved ? "#FEE2E2" : "rgba(255,255,255,.88)",
        color: isSaved ? "#DC2626" : "#9CA3AF",
        borderRadius: "50%",
        width: isCard ? 34 : 38,
        height: isCard ? 34 : 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: isCard ? 15 : 18,
        boxShadow: "0 2px 8px rgba(0,0,0,.12)",
        backdropFilter: "blur(4px)",
        transition: "all .18s ease",
        transform: burst ? "scale(1.35)" : "scale(1)",
        flexShrink: 0,
      }}
    >
      {isSaved ? "♥" : "♡"}
    </button>
  );
};

/* ---------------- Compare Bar + Modal (fixed bottom) ---------------- */

const CompareBar = ({ compareIds, dealsList, onRemove, onOpen, onClear, cur }) => {
  const [showModal, setShowModal] = useState(false);
  if (compareIds.length < 1) return null;

  const compareDeals = compareIds.map(id => dealsList.find(d => d.id === id)).filter(Boolean);

  const ROWS = [
    ["Asking Price", d => fmtFull(d.asking, cur)],
    ["Market Value", d => fmtFull(d.market, cur)],
    ["Discount", d => `-${Math.round(((d.market - d.asking) / d.market) * 100)}%`],
    ["Trust Score", d => `${d.trust}/100`],
    ["Title Grade", d => `${d.title} · Grade ${d.titleGrade}`],
    ["District", d => d.district],
    ["Type", d => d.type],
    ["Shortlet /mo", d => d.shortlet ? fmtN(d.shortlet.monthlyNet, cur) : "N/A"],
    ["Yield", d => d.yield ? `${d.yield}%` : "N/A"],
    ["Days Listed", d => d.days === 1 ? "1 day" : `${d.days} days`],
    ["Inspected", d => d.inspected ? "✓ Yes" : "Scheduled"],
  ];

  return (
    <>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 55,
        background: T.ink, borderTop: `2px solid ${T.green}`,
        padding: "12px 20px", display: "flex", alignItems: "center",
        gap: 12, boxShadow: "0 -4px 24px rgba(12,43,31,.35)", flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.gold, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 }}>
          ⚖️ Compare ({compareIds.length}/3)
        </div>
        <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
          {compareDeals.map(deal => (
            <div key={deal.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)",
              borderRadius: 10, padding: "6px 10px", maxWidth: 220,
            }}>
              <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {deal.name.split(",")[0]}
              </div>
              <button onClick={() => onRemove(deal.id)} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,.55)", cursor: "pointer", fontSize: 14, padding: "0 2px", lineHeight: 1 }}>×</button>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 2 - compareDeals.length) }).map((_, i) => (
            <div key={i} style={{ width: 120, height: 34, border: "1.5px dashed rgba(255,255,255,.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "rgba(255,255,255,.3)", fontStyle: "italic" }}>add a deal</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onClear} style={{ border: "1.5px solid rgba(255,255,255,.2)", background: "transparent", color: "rgba(255,255,255,.65)", borderRadius: 9, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Clear</button>
          <button
            onClick={() => setShowModal(true)}
            disabled={compareDeals.length < 2}
            style={{
              border: "none",
              background: compareDeals.length >= 2 ? T.gold : "rgba(255,255,255,.15)",
              color: compareDeals.length >= 2 ? T.ink : "rgba(255,255,255,.35)",
              borderRadius: 9, padding: "7px 18px", fontSize: 13, fontWeight: 700,
              cursor: compareDeals.length >= 2 ? "pointer" : "default", transition: "all .15s",
            }}
          >Compare →</button>
        </div>
      </div>

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(12,43,31,.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.paper, borderRadius: 22, width: "min(920px,100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,.35)" }}>
            <div style={{ background: T.ink, borderRadius: "22px 22px 0 0", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: T.gold, textTransform: "uppercase" }}>Side-by-Side Analysis</div>
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 20, color: "#fff", marginTop: 3 }}>Deal Comparison</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ border: "none", background: "rgba(255,255,255,.1)", color: "#fff", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>

            <div>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: `180px repeat(${compareDeals.length}, 1fr)`, borderBottom: `2px solid ${T.line}` }}>
                <div style={{ padding: "16px 20px" }} />
                {compareDeals.map((deal, i) => (
                  <div key={deal.id} style={{ padding: "16px 16px", background: i % 2 === 0 ? T.card : "#FAFCFA", borderLeft: `1px solid ${T.line}` }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 13.5, color: T.ink, lineHeight: 1.25, marginBottom: 4 }}>
                      {deal.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 8 }}>{deal.district} · {deal.type}</div>
                    <button
                      onClick={() => { setShowModal(false); onOpen(deal); }}
                      style={{ border: `1.5px solid ${T.green}`, background: "transparent", color: T.green, borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >View Deal →</button>
                  </div>
                ))}
              </div>

              {ROWS.map(([label, fn], rowIdx) => {
                const values = compareDeals.map(fn);
                const numVals = values.map(v => parseFloat(String(v).replace(/[₦$%,+\-A-Za-z\s/]/g, "")));
                const allNum = numVals.every(v => !isNaN(v) && isFinite(v));
                const maxVal = allNum ? Math.max(...numVals) : null;
                const minVal = allNum ? Math.min(...numVals) : null;
                const bestIsMax = ["Discount","Trust Score","Shortlet /mo","Yield"].includes(label);
                const bestIsMin = ["Asking Price","Days Listed"].includes(label);

                return (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: `180px repeat(${compareDeals.length}, 1fr)`, borderBottom: `1px solid ${T.line}`, background: rowIdx % 2 === 0 ? T.card : "#FAFCFA" }}>
                    <div style={{ padding: "12px 20px", fontSize: 11.5, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.6, display: "flex", alignItems: "center" }}>
                      {label}
                    </div>
                    {compareDeals.map((deal, i) => {
                      const val = values[i];
                      const numVal = numVals[i];
                      const isBest = allNum && ((bestIsMax && numVal === maxVal) || (bestIsMin && numVal === minVal));
                      return (
                        <div key={deal.id} style={{ padding: "12px 16px", borderLeft: `1px solid ${T.line}`, fontSize: 13, fontWeight: isBest ? 700 : 500, color: isBest ? T.green : T.ink, display: "flex", alignItems: "center", gap: 6, background: isBest ? T.mint : "transparent" }}>
                          {isBest && <span style={{ fontSize: 9, background: T.green, color: "#fff", borderRadius: 4, padding: "1px 5px", fontWeight: 800, flexShrink: 0 }}>BEST</span>}
                          {val}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "16px 28px", fontSize: 11.5, color: T.sub, textAlign: "center", borderTop: `1px solid ${T.line}` }}>
              "BEST" highlights the most favourable value for each metric across compared deals.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ---------------- Inspection Request (inside DealModal) ---------------- */

const InspectionRequest = ({ deal, user, onToast }) => {
  const [stage, setStage] = useState("idle"); // idle | picking | submitted
  const [selectedDate, setSelectedDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const businessDays = useMemo(() => {
    const days = [];
    const d = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    while (days.length < 3) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        days.push({ label: `${dayNames[dow]} ${d.getDate()} ${monthNames[d.getMonth()]}`, iso: d.toISOString().split("T")[0] });
      }
    }
    return days;
  }, []);

  const handleSubmit = async () => {
    if (!selectedDate) return;
    setSubmitting(true);
    const payload = {
      dealId: deal.id, dealName: deal.name, district: deal.district,
      preferredDate: selectedDate, userId: user?.uid || "anonymous",
      userEmail: user?.email || "guest", createdAt: new Date().toISOString(),
    };
    try {
      if (user) {
        await addDoc(collection(db, "inspection_requests"), { ...payload, createdAt: serverTimestamp() });
      } else {
        const ex = JSON.parse(localStorage.getItem("lp_inspection_requests") || "[]");
        ex.push(payload);
        localStorage.setItem("lp_inspection_requests", JSON.stringify(ex));
      }
    } catch (e) {
      const ex = JSON.parse(localStorage.getItem("lp_inspection_requests") || "[]");
      ex.push(payload);
      localStorage.setItem("lp_inspection_requests", JSON.stringify(ex));
    } finally {
      setSubmitting(false);
      setStage("submitted");
      if (onToast) onToast("Inspection request submitted! Our team will confirm within 2 hours. ✓");
    }
  };

  if (stage === "submitted") {
    return (
      <div style={{ background: T.mint, border: `1.5px solid ${T.green}`, borderRadius: 14, padding: 18, marginTop: 14, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>✅</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.green }}>Inspection Requested</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 3, lineHeight: 1.4 }}>
            Our field agent will confirm your preferred date of <strong>{selectedDate}</strong> within 2 hours via WhatsApp.
          </div>
        </div>
      </div>
    );
  }

  if (stage === "picking") {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 18, marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: T.green, textTransform: "uppercase", marginBottom: 12 }}>
          📋 Select Preferred Inspection Date
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {businessDays.map(({ label, iso }) => (
            <button key={iso} onClick={() => setSelectedDate(iso)} style={{ flex: "1 1 120px", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${selectedDate === iso ? T.green : T.line}`, background: selectedDate === iso ? T.mint : T.paper, color: selectedDate === iso ? T.green : T.ink, fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "all .15s" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setStage("idle")} style={{ flex: 1, border: `1.5px solid ${T.line}`, background: "transparent", color: T.sub, borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button
            onClick={handleSubmit} disabled={!selectedDate || submitting}
            style={{ flex: 2, border: "none", background: selectedDate ? T.green : T.line, color: selectedDate ? "#fff" : T.sub, borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: selectedDate ? "pointer" : "default", transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            {submitting ? <><span className="spinner" style={{ width: 14, height: 14, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,.4)", borderTopColor: "#fff", display: "inline-block" }} /> Submitting…</> : "Confirm Inspection →"}
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: T.sub, marginTop: 10, lineHeight: 1.4 }}>
          A licensed field agent will inspect the property, take geotagged photos, and send a detailed report within 24 hours.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.goldSoft, border: `1px solid ${T.gold}44`, borderRadius: 14, padding: "14px 18px", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#7A5800" }}>🔍 Request a Field Inspection</div>
        <div style={{ fontSize: 12, color: "#9A7000", marginTop: 3 }}>Book a licensed agent for a physical site visit — geotagged, reported in 24h.</div>
      </div>
      <button onClick={() => setStage("picking")} style={{ border: "none", background: T.gold, color: T.ink, borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(201,162,39,.3)" }}>
        Book Date →
      </button>
    </div>
  );
};

/* ---------------- Deal card ---------------- */

const DealCard = ({ deal, cur, onOpen, savedIds, onToggleSave, compareIds, onToggleCompare }) => {
  const [earn, setEarn] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const disc = Math.round(((deal.market - deal.asking) / deal.market) * 100);
  const photo = getDealPhoto(deal);
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
        transition: "box-shadow .2s ease, transform .2s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(12,43,31,.13)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(12,43,31,.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* ── Property photo ── */}
      <div
        onClick={() => onOpen(deal)}
        style={{
          position: "relative",
          height: 190,
          background: T.mint,
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <img
          src={photo}
          alt={deal.name}
          onLoad={() => setImgLoaded(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform .35s ease, opacity .3s ease",
            opacity: imgLoaded ? 1 : 0,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        />
        {/* Discount badge on photo */}
        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          background: T.amber,
          color: "#fff",
          borderRadius: 999,
          fontSize: 11.5,
          fontWeight: 700,
          padding: "3px 10px",
          boxShadow: "0 2px 6px rgba(180,84,10,.4)",
        }}>−{disc}% below market</div>

        {/* Heart / Save button absolute positioned top-right */}
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
          <HeartBtn dealId={deal.id} savedIds={savedIds} onToggle={onToggleSave} size="card" />
        </div>

        {/* Lock icon — documents gated */}
        <div style={{
          position: "absolute",
          top: 10,
          right: 50,
          background: "rgba(12,43,31,.75)",
          backdropFilter: "blur(4px)",
          color: "#fff",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          padding: "4px 9px",
          display: "flex",
          alignItems: "center",
          gap: 4,
          height: 34,
          boxSizing: "border-box",
          zIndex: 9,
        }}>🔒 Docs</div>

        {/* Trust ring overlay bottom-right */}
        <div style={{ position: "absolute", bottom: 10, right: 10 }}>
          <TrustRing score={deal.trust} size={44} />
        </div>
        {/* Photo skeleton if not loaded */}
        {!imgLoaded && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, ${T.mint} 25%, #d8ede2 50%, ${T.mint} 75%)`,
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s infinite",
          }} />
        )}
      </div>

      {/* header info (below photo) */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 15.5, color: T.ink, lineHeight: 1.25, display: "-webkit-box", overflow: "hidden", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {deal.name}
        </div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>
          {deal.district} · {deal.type} · listed {deal.days === 1 ? "yesterday" : deal.days + " days ago"}
        </div>
      </div>

      {/* Buy ⇄ Rent toggle */}
      <div style={{ padding: "10px 16px 0" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button
            onClick={() => setEarn(false)}
            title="See the purchase price, discount vs. market value, and urgency context"
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 8,
              border: `1.5px solid ${!earn ? T.ink : T.line}`,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 11.5,
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
                padding: "6px 0",
                borderRadius: 8,
                border: `1.5px solid ${earn ? T.teal : T.line}`,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 11.5,
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
                padding: "6px 0",
                borderRadius: 8,
                border: `1.5px dashed ${T.line}`,
                fontWeight: 600,
                fontSize: 11,
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

        {/* Price / yield body */}
        <div style={{ minHeight: 58 }}>
          {!earn ? (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: T.ink }}>
                  {fmtN(deal.asking, cur)}
                </span>
                <span style={{ fontSize: 12.5, color: T.sub, textDecoration: "line-through" }}>{fmtN(deal.market, cur)}</span>
              </div>
              <div style={{ fontSize: 12, color: T.amber, fontWeight: 600, marginTop: 4 }}>⏱ {deal.urgency}</div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: T.teal }}>
                  {fmtN(deal.shortlet.monthlyNet, cur)}
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>/mo</span>
                </span>
                <Pill bg={T.tealSoft} color={T.teal}>AI projection</Pill>
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>
                {fmtN(deal.shortlet.nightly, cur)}/night · {Math.round(deal.shortlet.occ * 100)}% occ · {deal.yield}% yield
              </div>
            </div>
          )}
        </div>
      </div>

      {/* badges */}
      <div style={{ padding: "10px 16px 8px", display: "flex", flexWrap: "wrap", gap: 5, flex: 1, alignContent: "flex-start" }}>
        <Pill bg={deal.titleGrade === "A" ? T.mint : deal.titleGrade === "B" ? T.goldSoft : T.amberSoft} color={deal.titleGrade === "A" ? T.green : deal.titleGrade === "B" ? "#8A6D0B" : T.amber}>
          {deal.title} · Grade {deal.titleGrade}
        </Pill>
        {deal.inspected ? (
          <Pill bg={T.mint} color={T.green}>✓ Inspected</Pill>
        ) : (
          <Pill bg={T.paper} color={T.sub} border={T.line}>Inspection scheduled</Pill>
        )}
        <RiskFlag kind="demolition" level={deal.demolition} />
        <RiskFlag kind="flood" level={deal.flood} />
      </div>

      {/* CTA row */}
      <div style={{ padding: "8px 16px 16px", display: "flex", gap: 8 }}>
        <Btn onClick={() => onOpen(deal)} style={{ flex: 1 }}>
          📷 Details
        </Btn>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCompare(deal.id); }}
          disabled={compareIds.length >= 3 && !compareIds.includes(deal.id)}
          style={{
            border: `1.5px solid ${compareIds.includes(deal.id) ? T.gold : T.line}`,
            background: compareIds.includes(deal.id) ? T.goldSoft : "#fff",
            color: compareIds.includes(deal.id) ? "#8A6D0B" : T.sub,
            borderRadius: 10,
            padding: "0 12px",
            fontSize: 12,
            fontWeight: 700,
            cursor: (compareIds.length >= 3 && !compareIds.includes(deal.id)) ? "default" : "pointer",
            transition: "all .15s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: (compareIds.length >= 3 && !compareIds.includes(deal.id)) ? 0.5 : 1,
            outline: "none",
          }}
          title={compareIds.includes(deal.id) ? "Remove from comparison" : "Add to comparison"}
        >
          {compareIds.includes(deal.id) ? "✓ Compare" : "⊕ Compare"}
        </button>
        <Btn kind="ghost" small onClick={() => onOpen(deal)} style={{ whiteSpace: "nowrap", fontSize: 11.5 }} title="Verification required to access escrow">
          🔒 Docs
        </Btn>
      </div>
    </div>
  );
};

/* ---------------- Verification Gate (inside modal) ---------------- */

const VerificationGate = ({ onSignIn }) => (
  <div style={{
    background: `linear-gradient(135deg, ${T.ink} 0%, #0A3420 100%)`,
    borderRadius: 18,
    padding: "32px 24px",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    marginTop: 20,
  }}>
    {/* Decorative circles */}
    <div style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(201,162,39,.12)" }} />
    <div style={{ position: "absolute", left: -30, bottom: -50, width: 140, height: 140, borderRadius: "50%", background: "rgba(14,107,117,.15)" }} />
    <div style={{ position: "relative", zIndex: 1 }}>
      {/* Shield icon */}
      <div style={{
        width: 68,
        height: 68,
        borderRadius: "50%",
        background: "rgba(201,162,39,.15)",
        border: "2px solid rgba(201,162,39,.4)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 30,
        marginBottom: 18,
      }}>🛡️</div>
      <div style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 800,
        fontSize: 20,
        color: "#fff",
        lineHeight: 1.25,
        marginBottom: 10,
      }}>Get Verified to See Documents</div>
      <p style={{
        fontSize: 13.5,
        color: "rgba(255,255,255,.78)",
        lineHeight: 1.6,
        maxWidth: 420,
        margin: "0 auto 22px",
      }}>
        Title documents, AGIS search results, negotiation ranges, and seller contact are
        protected. A quick <b style={{ color: T.gold }}>NIN/BVN identity check</b> unlocks full
        access — this protects both you and the seller.
      </p>

      {/* What's locked list */}
      <div className="verify-locked-grid" style={{
        background: "rgba(255,255,255,.07)",
        border: "1px solid rgba(255,255,255,.12)",
        borderRadius: 12,
        padding: "14px 18px",
        textAlign: "left",
        marginBottom: 22,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px 16px",
      }}>
        {[
          "📄 Title document (C of O / R of O)",
          "🔍 AGIS land registry search",
          "⚖ AI negotiation range",
          "📋 Field inspection report",
          "🤖 AI Document Forensics",
          "📞 Seller contact & escrow",
        ].map(item => (
          <div key={item} style={{ fontSize: 12.5, color: "rgba(255,255,255,.8)", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ color: "rgba(201,162,39,.7)", fontWeight: 700 }}>🔒</span>
            {item}
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="verify-step-row" style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { n: "1", label: "Sign in", icon: "✉️" },
          { n: "2", label: "ID check (2 min)", icon: "🪪" },
          { n: "3", label: "Full access", icon: "✅" },
        ].map(step => (
          <div key={step.n} style={{
            background: "rgba(255,255,255,.08)",
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 10,
            padding: "10px 16px",
            textAlign: "center",
            minWidth: 100,
          }}>
            <div style={{ fontSize: 20 }}>{step.icon}</div>
            <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, marginTop: 4 }}>Step {step.n}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.85)", marginTop: 2 }}>{step.label}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onSignIn}
        style={{
          background: `linear-gradient(135deg, ${T.gold}, #E1B22B)`,
          color: T.ink,
          border: "none",
          borderRadius: 12,
          padding: "13px 32px",
          fontFamily: "'Instrument Sans', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          boxShadow: "0 4px 18px rgba(201,162,39,.45)",
          transition: "transform .12s ease, box-shadow .12s ease",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
        onMouseDown={e => e.currentTarget.style.transform = "scale(.97)"}
        onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        🛡️ Get Verified — Unlock Documents
      </button>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.5)", marginTop: 12 }}>
        Free · takes ~2 minutes · your data is protected under our privacy policy
      </div>
    </div>
  </div>
);

/* ---------------- Deal modal ---------------- */

const DealModal = ({ deal, cur, onClose, onBuyAndOnboard, user, kycVerified, onSignInRequest, savedIds, onToggleSave, onToast }) => {
  const [step, setStep] = useState(1);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [forensicReport, setForensicReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [roiData, setRoiData] = useState(null);
  const [roiLoading, setRoiLoading] = useState(false);


  if (!deal) return null;
  const dealMarket = Number(deal.market || deal.asking || 1);
  const dealAsking = Number(deal.asking || 0);
  const disc = Math.round(((dealMarket - dealAsking) / dealMarket) * 100);
  const negLow = deal.negotiation?.[0] ?? deal.negotiation_low ?? Math.round(dealAsking * 0.9);
  const negHigh = deal.negotiation?.[1] ?? deal.negotiation_high ?? dealAsking;
  const steps = ["Offer accepted", "AGIS search & legal review", "Documents executed", "Possession — funds released"];
  // isVerified: true when user has passed KYC (claim or localStorage bypass) AND is signed in
  const isVerified = !!user && (kycVerified || localStorage.getItem(`lp_kyc_${user?.uid}`) === "true");
  const photo = getDealPhoto(deal);
  // Use real uploaded photos if available, else single Unsplash fallback
  const photos = getDealPhotos(deal);


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

  const runRoi = async () => {
    setRoiLoading(true);
    setRoiData(null);
    try {
      const res = await fetch('/api/roi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyName: deal.name,
          district: deal.district,
          askingPrice: deal.asking,
          marketValue: deal.market,
          shortletMonthlyNet: deal.shortlet?.monthlyNet || 0,
          shortletNightly: deal.shortlet?.nightly || 0,
          occupancy: deal.shortlet?.occ || 0,
          grossYield: deal.yield || 0,
        }),
      });
      const data = await res.json();
      setRoiData(data);
    } catch {
      setRoiData({ error: true });
    } finally {
      setRoiLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(12,43,31,.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        className="deal-modal-inner"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.paper,
          borderRadius: 20,
          width: "min(760px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Photo gallery (free — always visible) ── */}
        <div className="deal-modal-photo" style={{ position: "relative", height: 280, background: T.ink, overflow: "hidden", flexShrink: 0 }}>
          <img
            src={photos[photoIdx]}
            alt={`${deal.name} — photo ${photoIdx + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          {/* Dark gradient overlay for text legibility */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(12,43,31,.85) 0%, transparent 55%)" }} />
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: 14, right: 14,
              border: "none", background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)",
              color: "#fff", borderRadius: 10, width: 34, height: 34,
              cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 11,
            }}
          >✕</button>
          {/* Photo counter / dots */}
          <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}>
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setPhotoIdx(i)}
                style={{
                  width: i === photoIdx ? 22 : 7,
                  height: 7,
                  borderRadius: 999,
                  border: "none",
                  background: i === photoIdx ? T.gold : "rgba(255,255,255,.5)",
                  cursor: "pointer",
                  transition: "all .2s ease",
                  padding: 0,
                }}
              />
            ))}
          </div>
          {/* Photo nav arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                style={{
                  position: "absolute", top: "50%", left: 12, transform: "translateY(-50%)",
                  border: "none", background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)",
                  color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 10,
                }}
              >‹</button>
              <button
                onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                style={{
                  position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)",
                  border: "none", background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)",
                  color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  zIndex: 10,
                }}
              >›</button>
            </>
          )}
          {/* Property name overlay on photo */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: T.gold, textTransform: "uppercase", marginBottom: 4 }}>
              {isVerified ? "✓ Verified Distress Sale" : "📷 Free Preview · Verify to unlock documents"}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 20, color: "#fff", lineHeight: 1.2 }}>{deal.name}</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.75)", marginTop: 3 }}>{deal.district}, Abuja · Verified by {deal.verifiedBy}</div>
              </div>
              <div style={{ zIndex: 10, marginBottom: 4 }}>
                <HeartBtn dealId={deal.id} savedIds={savedIds} onToggle={onToggleSave} size="modal" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal body (scrollable) ── */}
        <div className="deal-modal-body" style={{ padding: 22, overflowY: "auto", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <SectionLabel>AI Deal Intelligence Report</SectionLabel>
          </div>
          {/* Verified badge */}
          {isVerified ? (
            <Pill bg={T.mint} color={T.green}>✓ Identity Verified</Pill>
          ) : (
            <Pill bg={T.goldSoft} color="#7A5800">🔒 Documents locked</Pill>
          )}
        </div>

        {/* ── Numbers grid — asking price always visible, negotiation/market gated ── */}
        <div className="deal-numbers-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
          {[
            ["Asking price", fmtFull(deal.asking, cur), T.ink, false],
            ["AI market value", isVerified ? fmtFull(deal.market, cur) : "Verify to view", T.green, !isVerified],
            ["Discount", "−" + disc + "%", T.amber, false],
            ["AI negotiation range", isVerified ? `${fmtN(negLow, cur)} – ${fmtN(negHigh, cur)}` : "Verify to view", T.ink, !isVerified],
          ].map(([k, v, c, locked]) => (
            <div key={k} style={{
              background: T.card,
              border: `1px solid ${locked ? T.line : T.line}`,
              borderRadius: 12,
              padding: "12px 14px",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{k}</div>
              <div style={{
                fontFamily: "'Bricolage Grotesque'",
                fontWeight: 700,
                fontSize: 17,
                color: locked ? "transparent" : c,
                marginTop: 4,
                filter: locked ? "blur(6px)" : "none",
                userSelect: locked ? "none" : "auto",
              }}>{locked ? "₦000,000,000" : v}</div>
              {locked && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.sub,
                  gap: 4,
                }}>🔒 Verify</div>
              )}
            </div>
          ))}
        </div>

        {isVerified && (
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => {
                const formEl = document.getElementById("offer-form-section");
                if (formEl) {
                  formEl.scrollIntoView({ behavior: "smooth" });
                }
                const submitBtn = document.getElementById("submit-offer-trigger-btn");
                if (submitBtn) {
                  submitBtn.click();
                }
              }}
              style={{
                width: "100%",
                background: T.green,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 20px",
                fontSize: 14.5,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 12px rgba(14,90,58,0.2)"
              }}
            >
              Submit Purchase Offer to Escrow
            </button>
          </div>
        )}

        {/* trust and verification + AI forensics trigger — only shown to verified users */}
        {isVerified && (
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
        )} {/* end isVerified trust section */}

        {/* escrow — verified only */}
        {isVerified && (
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginTop: 14 }}>
          <SectionLabel>Escrow — funds released by milestone</SectionLabel>
          <div className="escrow-steps" style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
            {steps.map((s, i) => (
              <button
                key={s}
                onClick={() => {
                  if (i === 0) {
                    const formEl = document.getElementById("offer-form-section");
                    if (formEl) {
                      formEl.scrollIntoView({ behavior: "smooth" });
                    }
                    const submitBtn = document.getElementById("submit-offer-trigger-btn");
                    if (submitBtn) {
                      submitBtn.click();
                    }
                  } else {
                    if (onToast) {
                      onToast(`Milestone ${i + 1}: After submitting your offer and gaining seller acceptance, go to your Profile to fund the escrow and execute the deed.`);
                    }
                  }
                }}
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
        )} {/* end isVerified escrow section */}

        {/* ROI Calculator — verified only */}
        {isVerified && (
          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionLabel color={T.teal}>AI Investment ROI Calculator</SectionLabel>
              {!roiData && !roiLoading && (
                <button
                  id="run-roi-btn"
                  onClick={runRoi}
                  style={{
                    background: `linear-gradient(135deg, ${T.teal}, #0A5460)`,
                    color: "#fff", border: "none", borderRadius: 10,
                    padding: "6px 12px", fontWeight: 700, fontSize: 11.5,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  ✦ Run 5-Year ROI Model
                </button>
              )}
            </div>

            {roiLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0", color: T.sub, fontSize: 13 }}>
                <span style={{ width: 18, height: 18, border: `3px solid ${T.line}`, borderTopColor: T.teal, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite", flexShrink: 0 }} />
                Gemini modelling 5-year cash flows…
              </div>
            )}

            {!roiData && !roiLoading && (
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>
                Get a 5-year ROI breakdown: payback period, cumulative net, and year-by-year cash flow projection.
              </div>
            )}

            {roiData && !roiData.error && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {roiData.isDemo && (
                  <div style={{ fontSize: 11, color: T.amber, background: T.amberSoft, borderRadius: 7, padding: "5px 10px" }}>Demo mode — add GEMINI_API_KEY for live modelling</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                  {[
                    ["Payback Period", roiData.paybackYears ? `${roiData.paybackYears} yrs` : "N/A", T.teal],
                    ["5-Yr Net Income", roiData.fiveYearNet ? fmtN(roiData.fiveYearNet, cur) : "—", T.green],
                    ["Gross Yield", roiData.grossYield ? `${roiData.grossYield}%` : "—", T.gold],
                    ["IRR (est)", roiData.irr ? `${roiData.irr}%` : "—", T.ink],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ background: T.paper, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: T.sub, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
                      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color, marginTop: 3 }}>{value}</div>
                    </div>
                  ))}
                </div>
                {(roiData.yearlyBreakdown || []).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>Year-by-Year Net Income</div>
                    {roiData.yearlyBreakdown.map((yr, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: i % 2 === 0 ? T.tealSoft : T.paper, borderRadius: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>Year {yr.year}</span>
                        <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 14, color: T.teal }}>{fmtN(yr.netIncome, cur)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {roiData.insight && (
                  <div style={{ fontSize: 12, color: T.sub, fontStyle: "italic", lineHeight: 1.5, padding: "8px 10px", background: T.paper, borderRadius: 8 }}>💡 {roiData.insight}</div>
                )}
              </div>
            )}

            {roiData?.error && (
              <div style={{ color: T.risk, fontSize: 13, padding: "10px 0" }}>Could not load ROI model — check your connection or API key.</div>
            )}
          </div>
        )}

        {/* flywheel — verified only */}
        {isVerified && deal.shortlet && (
          <div style={{ background: T.teal, borderRadius: 14, padding: 18, marginTop: 14, color: "#fff" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, opacity: 0.85 }}>BUY SMART → EARN SMART</div>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 20, marginTop: 6 }}>
              Projected {fmtN(deal.shortlet?.monthlyNet, cur)}/month as a managed shortlet
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
              {fmtN(deal.shortlet?.nightly, cur)}/night · {Math.round((deal.shortlet?.occ || 0) * 100)}% occupancy (district + event model) · payback boost from the −{disc}% purchase discount.
            </div>
            <div style={{ marginTop: 12 }}>
              <Btn kind="gold" onClick={() => onBuyAndOnboard(deal)}>
                Simulate: buy &amp; onboard to Shortlet Manager →
              </Btn>
            </div>
          </div>
        )} {/* end isVerified flywheel */}
        {/* ── Verification gate — shown when user is not verified ── */}
        {!isVerified && (
          <VerificationGate onSignIn={onSignInRequest} />
        )}

        {/* ── Inspection request flow ── */}
        <InspectionRequest deal={deal} user={user} onToast={onToast} />

        {/* ── Purchase Offer Submission — verified only ── */}
        {isVerified && (
          <OfferForm deal={deal} user={user} cur={cur} onToast={onToast} />
        )}

        </div>{/* end modal body */}

      </div>
    </div>
  );
};

/* ---------------- Deals view ---------------- */

const DealsView = ({ cur, onOpen, query, setQuery, dealsList, onAiSearch, aiResults, aiSearching, usingEmulator, savedIds, onToggleSave, compareIds, onToggleCompare }) => {
  const [pidgin, setPidgin] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome, Safari or Edge! 🎙️");
      return;
    }
    
    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.lang = pidgin ? "en-NG" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setQuery(speechToText);
      setIsListening(false);
      if (speechToText.trim() && onAiSearch) {
        onAiSearch(speechToText);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

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
      <style>{`
        @keyframes lp-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.96); opacity: 0.85; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      {/* Premium Hero Wrapper */}
      <div style={{
        background: `linear-gradient(135deg, ${T.ink} 0%, #062217 100%)`,
        borderRadius: 24,
        padding: "36px 28px",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(12,43,31,0.15)",
        marginBottom: 20
      }}>
        {/* Decorative backdrop gradients */}
        <div style={{ position: "absolute", right: -60, top: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(201,162,39,.1)" }} />
        <div style={{ position: "absolute", right: 80, bottom: -80, width: 220, height: 220, borderRadius: "50%", background: "rgba(14,107,117,.15)" }} />
        
        <div style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 32,
          alignItems: "center"
        }}>
          {/* Left Column: Title & Search Console */}
          <div>
            <SectionLabel color={T.gold}>Pillar 1 · Verified Distress Deals — Abuja</SectionLabel>
            <h1 style={{
              fontFamily: "'Bricolage Grotesque'",
              fontWeight: 800,
              fontSize: "clamp(26px, 4.5vw, 38px)",
              lineHeight: 1.15,
              margin: "8px 0 0",
              letterSpacing: "-0.5px"
            }}>
              Below-market properties. <br />
              <span style={{ color: T.gold }}>Verified before you ever see them.</span>
            </h1>
            <p style={{
              fontSize: 14.5,
              opacity: 0.85,
              lineHeight: 1.6,
              marginTop: 12,
              marginBottom: 24,
              color: "rgba(255,255,255,0.9)"
            }}>
              Every listing passes biometric identity checks, AGIS title registry search, document forensics, and field agent geolocation inspection. Your investment is secured under bank-grade escrow.
            </p>

            {/* AI Search Console */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: "6px 8px 6px 14px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              border: `1.5px solid rgba(255,255,255,0.2)`
            }}>
              <span style={{ display: "flex", alignItems: "center", opacity: 0.4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                id="deals-search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && query.trim() && onAiSearch && onAiSearch(query)}
                placeholder={example}
                aria-label="Describe what you want"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  padding: "8px 0",
                  color: T.ink,
                  fontFamily: "'Instrument Sans'",
                  background: "transparent"
                }}
              />
              <Btn
                small
                kind={isListening ? "danger" : "ghost"}
                onClick={handleVoiceSearch}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 10,
                  gap: 6,
                  animation: isListening ? "lp-pulse 1.2s infinite" : "none",
                  background: isListening ? T.risk : "rgba(12,43,31,0.06)",
                  color: isListening ? "#fff" : T.ink,
                  border: "none"
                }}
              >
                {isListening ? (
                  <>🔴 Listening…</>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="22"></line>
                    </svg>
                    Try voice
                  </>
                )}
              </Btn>
              <Btn
                small
                id="ai-search-btn"
                onClick={() => query.trim() && onAiSearch && onAiSearch(query)}
                disabled={aiSearching}
                style={{
                  opacity: aiSearching ? 0.7 : 1,
                  minWidth: 100,
                  borderRadius: 10,
                  padding: "8px 16px"
                }}
              >
                {aiSearching ? (
                  "Searching…"
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    AI Search
                  </span>
                )}
              </Btn>
            </div>

            {/* Language Selection */}
            <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>The AI understands</span>
              <button
                onClick={() => setPidgin(false)}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 999,
                  padding: "4px 12px",
                  background: !pidgin ? T.gold : "rgba(255,255,255,.12)",
                  color: !pidgin ? T.ink : "#fff",
                  transition: "all 0.15s ease"
                }}
              >
                English
              </button>
              <button
                onClick={() => setPidgin(true)}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 999,
                  padding: "4px 12px",
                  background: pidgin ? T.gold : "rgba(255,255,255,.12)",
                  color: pidgin ? T.ink : "#fff",
                  transition: "all 0.15s ease"
                }}
              >
                Pidgin
              </button>
              <span style={{ fontSize: 12, opacity: 0.75 }}>· Hausa & Yoruba coming soon</span>
            </div>
          </div>

          {/* Right Column: 4 Verification Pillars Interactive Display */}
          <div style={{
            background: "rgba(255, 255, 255, 0.04)",
            borderRadius: 20,
            padding: 24,
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)"
          }}>
            <div style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: T.gold,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginBottom: 16
            }}>
              AGIS Land Verification Protocol
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { title: "Seller Identity Audits", desc: "NIN/BVN checks gatekeeper verification", step: "Pillar 1", status: "Verified ✓" },
                { title: "AGIS Registry Search", desc: "Verifies title deed, boundaries, & encumbrances", step: "Pillar 2", status: "Passed ✓" },
                { title: "Document Forensics", desc: "Validates allocation letter & signature chain", step: "Pillar 3", status: "Passed ✓" },
                { title: "Coordinates Field Inspection", desc: "GPS mapping check against encroachment", step: "Pillar 4", status: "Verified ✓" }
              ].map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    border: `1px solid rgba(255, 255, 255, 0.08)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    transition: "transform 0.2s ease, border-color 0.2s ease",
                    cursor: "default"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateX(6px)";
                    e.currentTarget.style.borderColor = T.gold;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  {/* Step bubble */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: T.goldSoft,
                    color: T.gold,
                    fontSize: 11,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  {/* Detail */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: "#fff" }}>{p.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.mint }}>{p.status}</span>
                    </div>
                    <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2, color: "rgba(255,255,255,0.8)" }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
      <div className="deal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14, marginTop: 16 }}>
        {deals.map((d) => (
          <DealCard key={d.id} deal={d} cur={cur} onOpen={onOpen} savedIds={savedIds} onToggleSave={onToggleSave} compareIds={compareIds} onToggleCompare={onToggleCompare} />
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



/* ---------------- WhatsApp AI Concierge (live Gemini) ---------------- */

const WhatsAppPanel = ({ open, setOpen }) => {
  const [msgs, setMsgs] = useState([
    { me: false, t: "Welcome to The Landlord Property 🇳🇬 — I dey here 24/7. Ask in English or Pidgin: deals, titles, escrow, or shortlet earnings." },
  ]);
  const [inp, setInp] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const historyRef = useRef([]);
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [msgs, aiTyping, open]);

  const send = async () => {
    if (!inp.trim() || aiTyping) return;
    const mine = inp.trim();
    setMsgs((m) => [...m, { me: true, t: mine }]);
    setInp("");
    setAiTyping(true);
    try {
      // Map history to the role/parts format required by firebase/ai
      const chatHistory = msgs.map(m => ({
        role: m.me ? "user" : "model",
        parts: [{ text: m.t }]
      }));

      // Start client-side chat session with history
      const chat = aiModel.startChat({
        history: chatHistory,
      });

      // Send message to client-side generative model
      const result = await chat.sendMessage(mine);
      const reply = result.response.text();

      setMsgs((m) => [...m, { me: false, t: reply }]);
    } catch (err) {
      console.error("[Firebase AI] Chat failed:", err);
      setMsgs((m) => [...m, { me: false, t: "Network error — please check your connection. 🙏" }]);
    } finally {
      setAiTyping(false);
    }
  };
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Open WhatsApp AI assistant"
        className="wa-fab"
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
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
        WhatsApp AI
      </button>
      {open && (
        <div
          className="wa-panel"
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
              <div style={{ fontWeight: 700, fontSize: 14 }}>Landlord Property · WhatsApp</div>
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
            {aiTyping && (
              <div style={{ alignSelf: "flex-start", background: "#fff", borderRadius: "12px 12px 12px 3px", padding: "10px 14px", display: "flex", gap: 5, boxShadow: "0 1px 1px rgba(0,0,0,.08)" }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#aaa", display: "inline-block", animation: `waDot .9s ${i * 0.2}s infinite ease-in-out` }} />
                ))}
                <style>{`@keyframes waDot{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
              </div>
            )}
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
            <Btn kind="wa" small onClick={send} disabled={aiTyping}>Send</Btn>
          </div>
        </div>
      )}
    </>
  );
};

const OfferForm = ({ deal, user, cur, onToast }) => {
  const [stage, setStage] = useState("idle"); // idle | form | submitting | done
  const [pastOffers, setPastOffers] = useState([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [offerData, setOfferData] = useState({
    offerPrice: deal?.asking ? String(Math.round(deal.asking * 0.95)) : "",
    financing: "cash",
    timeline: "30",
    note: "",
  });

  const isInstalmentSupported = deal?.instalmentAllowed || deal?.id === "d1" || deal?.id === "d3" || deal?.id === "d6" || (deal?.urgency && deal.urgency.toLowerCase().includes("flexible"));
  const isFinancingInvalid = offerData?.financing === "mortgage" || (offerData?.financing === "installment" && !isInstalmentSupported);
  useEffect(() => {
    if (!user?.uid || !deal?.id) return;
    setLoadingPast(true);
    const q = query(
      collection(db, "offers"),
      where("userId", "==", user.uid),
      where("dealId", "==", deal.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPastOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingPast(false);
    }, (err) => {
      console.warn("[OfferForm] Could not load past offers:", err.message);
      setLoadingPast(false);
    });
    return unsub;
  }, [user?.uid, deal?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!offerData.offerPrice || !user) return;
    setStage("submitting");
    try {
      const offerPrice = Number(offerData.offerPrice);
      const discountFromAsking = Math.round(((deal.asking - offerPrice) / deal.asking) * 100);
      await addDoc(collection(db, "offers"), {
        userId: user.uid,
        userEmail: user.email || "",
        userName: user.displayName || user.email?.split("@")[0] || "Buyer",
        dealId: deal.id,
        dealName: deal.name,
        district: deal.district,
        askingPrice: deal.asking,
        offerPrice,
        discountFromAsking,
        financing: offerData.financing,
        timeline: Number(offerData.timeline),
        note: offerData.note,
        status: "Submitted",
        createdAt: serverTimestamp(),
      });

      // Log activity
      await addDoc(collection(db, "activity_logs"), {
        userId: user.uid,
        action: "offer_submitted",
        details: `Offer of ₦${offerPrice.toLocaleString()} submitted for "${deal.name}" (${deal.district}). ${discountFromAsking > 0 ? discountFromAsking + '% below asking.' : 'At or above asking price.'}`,
        createdAt: serverTimestamp(),
      });

      setStage("done");
      if (onToast) onToast(`Offer of ₦${offerPrice.toLocaleString()} submitted! The team will respond within 2 hours.`);
    } catch (err) {
      console.error("[OfferForm] Failed to submit offer:", err);
      setStage("form");
      if (onToast) onToast("Failed to submit offer — please try again.");
    }
  };

  const offerPriceNum = Number(offerData.offerPrice) || 0;
  const discountFromAsking = deal?.asking && offerPriceNum > 0
    ? Math.round(((deal.asking - offerPriceNum) / deal.asking) * 100)
    : 0;
  const negMin = deal?.negotiation?.[0] ?? deal?.negotiation_low ?? (deal?.asking ? Math.round(deal.asking * 0.9) : 0);
  const negMax = deal?.negotiation?.[1] ?? deal?.negotiation_high ?? (deal?.asking ? deal.asking : 0);

  const fmtCur = (n) => {
    if (cur === "USD") return "$" + Math.round(n / 1550).toLocaleString();
    return "₦" + n.toLocaleString();
  };

  const statusColor = (s) => {
    switch (s) {
      case "Accepted": return { bg: "#E7F2EC", color: "#0E5A3A" };
      case "Declined": return { bg: "#FBEAE8", color: "#B3261E" };
      case "Counter-Offer": return { bg: "#F6EFD8", color: "#7A5800" };
      default: return { bg: "#E3F0F2", color: "#0E6B75" };
    }
  };

  // Past offers panel
  if (stage === "idle") {
    return (
      <div id="offer-form-section" style={{ marginTop: 14 }}>
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: pastOffers.length > 0 ? 14 : 0 }}>
            <SectionLabel color={T.purple}>Make an Offer</SectionLabel>
            <button
              id="submit-offer-trigger-btn"
              onClick={() => setStage("form")}
              style={{
                background: `linear-gradient(135deg, ${T.purple}, #8B52C9)`,
                color: "#fff", border: "none", borderRadius: 10,
                padding: "8px 16px", fontWeight: 700, fontSize: 12,
                cursor: "pointer", boxShadow: "0 2px 8px rgba(107,63,160,0.3)",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              ✦ Submit an Offer
            </button>
          </div>

          {/* Past offers */}
          {loadingPast && (
            <div style={{ fontSize: 12, color: T.sub, padding: "8px 0" }}>Loading your previous offers…</div>
          )}
          {!loadingPast && pastOffers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pastOffers.map(offer => {
                const sc = statusColor(offer.status);
                return (
                  <div key={offer.id} style={{
                    background: T.paper, border: `1px solid ${T.line}`, borderRadius: 12, padding: 14,
                    display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap"
                  }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 17, color: T.ink }}>
                        {fmtCur(offer.offerPrice)}
                      </div>
                      <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>
                        {offer.financing === "cash" ? "💰 Cash offer" : offer.financing === "mortgage" ? "🏦 Mortgage financing" : "🤝 Instalment plan"} ·{" "}
                        {offer.timeline}-day close
                        {offer.discountFromAsking > 0 && <span style={{ color: T.amber, fontWeight: 700 }}> · {offer.discountFromAsking}% below asking</span>}
                      </div>
                      {offer.note && <div style={{ fontSize: 12, color: T.sub, marginTop: 4, fontStyle: "italic" }}>"{offer.note}"</div>}
                    </div>
                    <span style={{ background: sc.bg, color: sc.color, padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                      {offer.status}
                    </span>
                    <div style={{ fontSize: 10.5, color: "rgba(12,43,31,.4)", fontWeight: 600 }}>
                      {offer.createdAt ? new Date(offer.createdAt.seconds * 1000).toLocaleDateString([], { day: "numeric", month: "short" }) : "Just now"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loadingPast && pastOffers.length === 0 && (
            <p style={{ fontSize: 13, color: T.sub, margin: "8px 0 0 0", lineHeight: 1.5 }}>
              Submit a formal offer below. Our team will review and respond within 2 hours. Accepted offers move to escrow automatically.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div style={{ marginTop: 14, background: T.mint, border: `1.5px solid ${T.green}`, borderRadius: 14, padding: 20, display: "flex", gap: 14, alignItems: "flex-start", animation: "slideup .3s ease" }}>
        <div style={{ fontSize: 32, flexShrink: 0 }}>✅</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontFamily: "'Bricolage Grotesque'", fontSize: 16, color: T.green }}>
            Offer Submitted!
          </div>
          <div style={{ fontSize: 13.5, color: T.ink, marginTop: 4, lineHeight: 1.5 }}>
            Your offer of <strong>{fmtCur(Number(offerData.offerPrice))}</strong> on <strong>{deal?.name}</strong> has been received.
            Our negotiation team will respond within <strong>2 hours</strong> via WhatsApp.
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setStage("idle")}
              style={{ border: `1.5px solid ${T.green}`, background: "transparent", color: T.green, borderRadius: 9, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              View My Offers
            </button>
            <button
              onClick={() => { setStage("form"); setOfferData(prev => ({ ...prev, note: "" })); }}
              style={{ border: `1.5px solid ${T.line}`, background: "transparent", color: T.sub, borderRadius: 9, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              Revise Offer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Offer form
  return (
    <div id="offer-form-section" style={{ marginTop: 14, background: T.card, border: `1.5px solid ${T.purple}33`, borderRadius: 14, padding: 20, animation: "slideup .25s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionLabel color={T.purple}>✦ Submit Purchase Offer</SectionLabel>
        <button onClick={() => setStage("idle")} style={{ border: "none", background: "none", color: T.sub, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>✕</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Offer price */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 5 }}>
            Your Offer Price (₦) *
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="number"
              required
              value={offerData.offerPrice}
              onChange={e => setOfferData(prev => ({ ...prev, offerPrice: e.target.value }))}
              style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: "'Bricolage Grotesque'", color: T.ink, outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = T.purple}
              onBlur={e => e.target.style.borderColor = T.line}
            />
          </div>
          {offerPriceNum > 0 && (
            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
              <span style={{ color: T.sub }}>Asking: <strong>{fmtCur(deal?.asking)}</strong></span>
              {discountFromAsking > 0 && <span style={{ color: T.amber, fontWeight: 700 }}>−{discountFromAsking}% below asking</span>}
              {discountFromAsking < 0 && <span style={{ color: T.green, fontWeight: 700 }}>+{Math.abs(discountFromAsking)}% above asking</span>}
              {negMin > 0 && offerPriceNum >= negMin && offerPriceNum <= negMax && (
                <span style={{ color: T.green, fontWeight: 700 }}>✓ Within AI negotiation range</span>
              )}
            </div>
          )}
          {/* Quick offer buttons */}
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {[
              { label: "Asking", val: deal?.asking },
              { label: "−5%", val: Math.round(deal?.asking * 0.95) },
              { label: "−10%", val: Math.round(deal?.asking * 0.90) },
              { label: "−15%", val: Math.round(deal?.asking * 0.85) },
            ].map(({ label, val }) => (
              <button
                key={label}
                type="button"
                onClick={() => setOfferData(prev => ({ ...prev, offerPrice: String(val) }))}
                style={{
                  border: `1.5px solid ${Number(offerData.offerPrice) === val ? T.purple : T.line}`,
                  background: Number(offerData.offerPrice) === val ? `${T.purple}15` : "transparent",
                  color: Number(offerData.offerPrice) === val ? T.purple : T.sub,
                  borderRadius: 8, padding: "4px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", transition: "all .15s"
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Financing type */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 5 }}>Financing Type *</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { val: "cash", label: "💰 Full Cash", desc: "No financing — strongest offer" },
              { val: "mortgage", label: "🏦 Mortgage", desc: "Bank or HFI financing" },
              { val: "installment", label: "🤝 Instalment", desc: "Agreed payment plan" },
            ].map(f => (
              <button
                key={f.val}
                type="button"
                onClick={() => setOfferData(prev => ({ ...prev, financing: f.val }))}
                style={{
                  flex: "1 1 120px",
                  border: `1.5px solid ${offerData.financing === f.val ? T.purple : T.line}`,
                  background: offerData.financing === f.val ? `${T.purple}12` : T.paper,
                  borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                  textAlign: "left", transition: "all .15s"
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: offerData.financing === f.val ? T.purple : T.ink }}>{f.label}</div>
                <div style={{ fontSize: 10.5, color: T.sub, marginTop: 2 }}>{f.desc}</div>
              </button>
            ))}
          </div>

          {offerData.financing === "mortgage" && (
            <div style={{
              marginTop: 10,
              background: T.riskSoft,
              border: `1px solid ${T.risk}`,
              color: T.risk,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12.5,
              lineHeight: 1.45
            }}>
              <strong>🏦 Mortgage Financing Unavailable:</strong> Mortgage financing is not available at the moment. Try again later or you will be notified when it becomes available.
            </div>
          )}

          {offerData.financing === "installment" && !isInstalmentSupported && (
            <div style={{
              marginTop: 10,
              background: T.amberSoft,
              border: `1px solid ${T.gold}`,
              color: "#7A5800",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12.5,
              lineHeight: 1.45
            }}>
              <strong>🤝 Instalment Plan Restricted:</strong> Instalment payment plans are only applicable to select listings. This property requires full cash settlement.
            </div>
          )}

          {offerData.financing === "installment" && isInstalmentSupported && (
            <div style={{
              marginTop: 10,
              background: T.tealSoft,
              border: `1px solid ${T.teal}`,
              color: T.teal,
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12.5,
              lineHeight: 1.45
            }}>
              <strong>🤝 Instalment Plan Eligible:</strong> This property supports a flexible payment structure. Default layout is 60% down payment, 40% spread over 90 days.
            </div>
          )}
        </div>

        {/* Settlement timeline */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>Settlement Timeline</label>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.purple }}>{offerData.timeline} days</span>
          </div>
          <input
            type="range"
            min={14}
            max={90}
            step={7}
            value={offerData.timeline}
            onChange={e => setOfferData(prev => ({ ...prev, timeline: e.target.value }))}
            style={{ width: "100%", accentColor: T.purple }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.sub, marginTop: 3 }}>
            <span>14 days (urgent)</span>
            <span>90 days (standard)</span>
          </div>
        </div>

        {/* Buyer note */}
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 5 }}>
            Personal Note to Seller <span style={{ fontWeight: 400, color: T.sub }}>(optional)</span>
          </label>
          <textarea
            value={offerData.note}
            onChange={e => setOfferData(prev => ({ ...prev, note: e.target.value }))}
            placeholder="Introduce yourself, your reason for buying, or any flexibility you can offer…"
            style={{ width: "100%", height: 72, padding: "10px 12px", border: `1.5px solid ${T.line}`, borderRadius: 10, fontSize: 13, resize: "none", fontFamily: "'Instrument Sans'", boxSizing: "border-box", outline: "none" }}
            onFocus={e => e.target.style.borderColor = T.purple}
            onBlur={e => e.target.style.borderColor = T.line}
          />
        </div>

        {/* Summary + submit */}
        <div style={{ background: `${T.purple}08`, border: `1px solid ${T.purple}22`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Offer Summary</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 12.5 }}>
            <span style={{ color: T.sub }}>Offer Price:</span>
            <span style={{ fontWeight: 700, color: T.ink, fontFamily: "'Bricolage Grotesque'" }}>{offerPriceNum > 0 ? fmtCur(offerPriceNum) : "—"}</span>
            <span style={{ color: T.sub }}>Financing:</span>
            <span style={{ fontWeight: 600, color: T.ink, textTransform: "capitalize" }}>{offerData.financing}</span>
            <span style={{ color: T.sub }}>Close in:</span>
            <span style={{ fontWeight: 600, color: T.ink }}>{offerData.timeline} days</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={stage === "submitting" || !offerData.offerPrice || isFinancingInvalid}
          style={{
            background: stage === "submitting" || !offerData.offerPrice || isFinancingInvalid
              ? T.line
              : `linear-gradient(135deg, ${T.purple}, #8B52C9)`,
            color: stage === "submitting" || !offerData.offerPrice || isFinancingInvalid ? T.sub : "#fff",
            border: "none", borderRadius: 12, padding: "13px 0",
            fontWeight: 800, fontSize: 15, cursor: !offerData.offerPrice || isFinancingInvalid ? "default" : "pointer",
            transition: "all .15s", boxShadow: offerData.offerPrice && !isFinancingInvalid ? "0 4px 14px rgba(107,63,160,.3)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}
        >
          {stage === "submitting" ? (
            <>
              <span style={{ width: 16, height: 16, border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
              Submitting Offer…
            </>
          ) : isFinancingInvalid ? "Financing Option Restricted" : "✦ Submit Offer →"}
        </button>

        <div style={{ fontSize: 11.5, color: T.sub, textAlign: "center" }}>
          By submitting, you confirm this is a genuine intent to purchase. No money moves until escrow is agreed and formally executed.
        </div>
      </form>
    </div>
  );
};

/* ─── Real-time Notification Bell Component ─── */
const NotificationBell = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Listen to Firestore notifications in real-time
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setNotifications(list);
    }, (err) => {
      console.warn("[NotificationBell] Firestore read error (check security rules/emulator):", err.message);
    });
    return unsubscribe;
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        const docRef = doc(db, "notifications", n.id);
        batch.update(docRef, { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error("[NotificationBell] Failed to mark all as read:", err);
    }
  };

  const toggleRead = async (notif) => {
    try {
      const docRef = doc(db, "notifications", notif.id);
      await updateDoc(docRef, { read: !notif.read });
    } catch (err) {
      console.error("[NotificationBell] Failed to toggle read status:", err);
    }
  };

  const getChannelIcon = (type) => {
    switch (type) {
      case "email": return "[Email]";
      case "sms": return "[SMS]";
      case "whatsapp": return "[WA]";
      default: return "[Alert]";
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={`${unreadCount} unread notifications`}
        style={{
          background: "transparent",
          border: "none",
          fontSize: 18,
          cursor: "pointer",
          width: 36,
          height: 36,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: T.ink,
          position: "relative",
          transition: "background .15s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(12,43,31,0.06)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 2,
            right: 2,
            background: T.risk,
            color: "#fff",
            borderRadius: "50%",
            width: 16,
            height: 16,
            fontSize: 9.5,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 2px #fff",
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div style={{
          position: "absolute",
          top: 44,
          right: 0,
          width: 320,
          maxHeight: 400,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(12,43,31,0.15), 0 0 0 1px rgba(12,43,31,0.06)",
          zIndex: 100,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          animation: "lp-fadeup .2s cubic-bezier(.22,1,.36,1)",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${T.line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fcfdfb"
          }}>
            <span style={{ fontWeight: 700, color: T.ink, fontSize: 13.5 }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  border: "none",
                  background: "none",
                  color: T.green,
                  fontWeight: 700,
                  fontSize: 11.5,
                  cursor: "pointer",
                  padding: 0
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1, maxHeight: 340 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: T.sub, fontSize: 13 }}>
                <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>📭</span>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => toggleRead(n)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: `1px solid ${T.line}`,
                    background: n.read ? "transparent" : "rgba(14,90,58,0.03)",
                    cursor: "pointer",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    transition: "background .12s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = n.read ? "rgba(12,43,31,0.02)" : "rgba(14,90,58,0.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(14,90,58,0.03)"}
                >
                  <span style={{ fontSize: 16, marginTop: 1 }}>{getChannelIcon(n.type)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: n.read ? 600 : 700,
                      fontSize: 12.5,
                      color: T.ink,
                      lineHeight: 1.3
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: 11.5,
                      color: T.sub,
                      marginTop: 3,
                      lineHeight: 1.4,
                      whiteSpace: "pre-line"
                    }}>
                      {n.message}
                    </div>
                    <div style={{
                      fontSize: 9.5,
                      color: "rgba(12,43,31,0.4)",
                      marginTop: 4,
                      fontWeight: 600
                    }}>
                      {n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                    </div>
                  </div>
                  {!n.read && (
                    <span style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: T.green,
                      alignSelf: "center",
                      marginLeft: 4
                    }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- App ---------------- */

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const tab = useMemo(() => {
    const path = location.pathname;
    if (path === "/") return "deals";
    const key = path.substring(1);
    return ["deals", "listings", "marketplace", "shortlet", "profile", "admin", "about"].includes(key) ? key : "deals";
  }, [location.pathname]);

  const [cur, setCur] = useState("NGN");
  const [modal, setModal] = useState(null);
  const [waOpen, setWaOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [units, setUnits] = useState(BASE_UNITS);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [kycVerified, setKycVerified] = useState(false); // true only after real KYC claim or localStorage bypass
  const [showAuth, setShowAuth] = useState(false);
  const [pushPermission, setPushPermission] = useState(null); // null | 'default' | 'granted' | 'denied'
  const [pushBannerDismissed, setPushBannerDismissed] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [fcmForegroundNotif, setFcmForegroundNotif] = useState(null);

  // Saved / Watchlist deals state (Set of deal IDs)
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const stored = localStorage.getItem("lp_saved_deals");
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  // Compare deals state (array of up to 3 deal IDs)
  const [compareIds, setCompareIds] = useState([]);

  // Sync saved deals to localStorage on change
  useEffect(() => {
    localStorage.setItem("lp_saved_deals", JSON.stringify(Array.from(savedIds)));
  }, [savedIds]);

  // Load/sync saved deals from/to Firestore on authentication change
  useEffect(() => {
    if (!user) return;
    const loadFirestoreSaved = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.savedDeals) {
            setSavedIds(prev => {
              const next = new Set(prev);
              data.savedDeals.forEach(id => next.add(id));
              return next;
            });
          }
        }
      } catch (err) {
        console.warn("[App] Could not load saved deals from Firestore:", err.message);
      }
    };
    loadFirestoreSaved();
  }, [user]);

  // Handler to toggle saved status
  const toggleSave = async (dealId) => {
    let nextSaved;
    let isAdded = false;
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(dealId)) {
        next.delete(dealId);
      } else {
        next.add(dealId);
        isAdded = true;
      }
      nextSaved = next;
      return next;
    });

    if (isAdded) {
      setShowPushBanner(true);
    }

    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        await updateDoc(docRef, {
          savedDeals: isAdded ? arrayUnion(dealId) : arrayRemove(dealId)
        });
      } catch (err) {
        console.warn("[App] Could not sync saved deals update to Firestore:", err.message);
      }
    }
    
    setToast(isAdded ? "Deal added to saved watchlist! ❤️" : "Deal removed from saved watchlist.");
    setTimeout(() => setToast(null), 3000);
  };

  // Handler to toggle compare list (max 3)
  const toggleCompare = (dealId) => {
    setCompareIds(prev => {
      if (prev.includes(dealId)) {
        return prev.filter(id => id !== dealId);
      }
      if (prev.length >= 3) {
        setToast("Maximum 3 properties can be compared at once.");
        setTimeout(() => setToast(null), 3000);
        return prev;
      }
      return [...prev, dealId];
    });
  };

  // Initialize stateful deals list with diverse status configuration to test all pipeline states
  const [dealsList, setDealsList] = useState(() => {
    try {
      const stored = localStorage.getItem("lp_admin_deals_v2");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    const statusMap = {
      d1: "Published",
      d2: "Verified",
      d3: "Draft",
      d4: "Under Review",
      d5: "Published",
      d6: "Sold",
    };
    return DEALS.map(d => ({
      ...d,
      status: statusMap[d.id] || "Published",
      negotiation_low: d.negotiation ? d.negotiation[0] : "",
      negotiation_high: d.negotiation ? d.negotiation[1] : "",
      shortlet_nightly: d.shortlet ? d.shortlet.nightly : "",
      shortlet_occ: d.shortlet ? d.shortlet.occ : "",
      shortlet_monthlyNet: d.shortlet ? d.shortlet.monthlyNet : ""
    }));
  });

  const [usingEmulator, setUsingEmulator] = useState(false);
  const [dbProperties, setDbProperties] = useState([]);
  const [dbRefreshTrigger, setDbRefreshTrigger] = useState(0);

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


  // Check if emulator is active on startup by pinging the Emulator Hub
  useEffect(() => {
    const checkEmulator = async () => {
      try {
        const res = await fetch("http://localhost:4400/emulators", { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          if (data.dataconnect) {
            setUsingEmulator(true);
            console.log("SQL Connect emulator is active! Live database connection enabled.");
            return;
          }
        }
        setUsingEmulator(false);
      } catch (e) {
        console.warn("SQL Connect emulator not reachable. Falling back to local storage.");
        setUsingEmulator(false);
      }
    };
    checkEmulator();
  }, []);

  // Track Firebase Auth state — drives the KYC gate on SecureDistressSearch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Read kycVerified from Firebase custom claim, with localStorage bypass as fallback
        try {
          const tokenResult = await u.getIdTokenResult();
          const claimVerified = !!tokenResult.claims.kycVerified;
          const localBypass = localStorage.getItem(`lp_kyc_${u.uid}`) === "true";
          setKycVerified(claimVerified || localBypass);
        } catch {
          const localBypass = localStorage.getItem(`lp_kyc_${u.uid}`) === "true";
          setKycVerified(localBypass);
        }
        try {
          const userDocRef = doc(db, "users", u.uid);
          await updateDoc(userDocRef, {
            lastLogin: serverTimestamp()
          });
          console.log("[App] Updated user lastLogin in Firestore");
        } catch (err) {
          console.warn("[App] Could not update lastLogin in Firestore (user doc may not exist yet or is offline):", err.message);
        }
        // Check current push permission state after sign-in
        if ('Notification' in window) {
          setPushPermission(Notification.permission);
        }
      } else {
        setKycVerified(false);
      }
    });
    return unsubscribe; // cleans up listener on unmount
  }, []);

  // Register FCM service worker and listen for foreground messages
  useEffect(() => {
    if (!user) return;
    // Register FCM service worker for push support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
        .then(reg => console.log('[FCM] Service worker registered:', reg.scope))
        .catch(err => console.warn('[FCM] SW registration failed (dev mode):', err.message));
    }
    // Listen for in-app foreground push messages
    const unsub = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      setFcmForegroundNotif({ title: title || '🔔 Notification', body });
      setTimeout(() => setFcmForegroundNotif(null), 6000);
    });
    return unsub;
  }, [user]);

  // Seed database if emulator is active and not seeded yet
  useEffect(() => {
    if (!usingEmulator) return;
    const seedDatabase = async () => {
      try {
        const check = await listAllProperties(dataConnect, {
          checkIn: "2026-07-01",
          checkOut: "2026-07-08"
        });
        const hasData = check?.data?.properties && check.data.properties.length > 0;
        if (!hasData) {
          console.log("SQL Connect database is empty. Seeding database with mock listings & embeddings...");
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
          localStorage.setItem("lp_db_seeded_v3", "true");
          console.log("Seeding complete!");
          setDbRefreshTrigger(prev => prev + 1);
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
  }, [usingEmulator, parsedDistrict, dbRefreshTrigger]);

  const buyAndOnboard = async (deal) => {
    setModal(null);
    setShowPushBanner(true);

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
    navigate("/shortlet");
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
        onBack={() => navigate("/")}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.paper, fontFamily: "'Instrument Sans', system-ui, sans-serif", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { line-height: 1.5; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
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
        .diaspora-heading { color: #ffffff; }

        /* ── Nav label hiding ── */
        /* ── Nav scrollbar hiding ── */
        .header-container nav {
          overflow-x: auto !important;
          flex-wrap: nowrap !important;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .header-container nav::-webkit-scrollbar {
          display: none;
        }

        /* ── Tablet ── */
        @media (max-width: 768px) {
          .header-container {
            gap: 8px !important;
            padding: 10px 12px !important;
          }
          .nav-btn {
            padding: 8px 10px !important;
            min-height: 40px;
          }
        }

        /* ── Mobile 600px ── */
        @media (max-width: 600px) {
          .nav-btn {
            padding: 6px 12px !important;
            min-height: 38px !important;
            min-width: 0 !important;
            font-size: 12.5px !important;
            border-radius: 10px !important;
          }
          .header-container {
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
        }

        /* ═══════════════════════════════════════════════
           375px — Small Phone Audit
           ═══════════════════════════════════════════════ */
        @media (max-width: 440px) {

          /* Global — prevent any element causing scroll */
          html, body { max-width: 100vw; overflow-x: hidden; }

          /* Header + logo */
          .header-container {
            padding: 10px 10px !important;
            gap: 6px !important;
          }

          /* Main padding */
          main { padding: 12px 10px 100px !important; }

          /* ── Nav buttons: mobile overrides ── */
          .nav-btn {
            padding: 6px 10px !important;
            width: auto !important;
            height: auto !important;
            min-width: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            font-size: 12px !important;
            border-radius: 8px !important;
          }

          /* ── Deal cards: single col, no hover translate ── */
          .deal-grid {
            grid-template-columns: 1fr !important;
          }
          .deal-card:hover {
            transform: none !important;
          }

          /* ── Marketplace submit form: 1-col grids ── */
          .form-2col { grid-template-columns: 1fr !important; }
          .form-3col { grid-template-columns: 1fr !important; }

          /* ── Example chips: horizontal scroll ── */
          .example-chips {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            padding-bottom: 6px !important;
            -webkit-overflow-scrolling: touch;
          }
          .example-chips button {
            flex-shrink: 0 !important;
            white-space: nowrap !important;
          }

          /* ── Booking calendar: responsive cells ── */
          .booking-cal-grid {
            gap: 2px !important;
          }
          .booking-cal-cell {
            padding: 6px 1px 4px !important;
            font-size: 11px !important;
            border-radius: 6px !important;
          }
          .booking-cal-cell-price {
            display: none !important;  /* hide price labels on tiny screens */
          }

          /* ── Booking summary: stacked ── */
          .booking-summary-grid {
            grid-template-columns: 1fr !important;
          }

          /* ── Shortlet browse: 1-col ── */
          .shortlet-browse-grid {
            grid-template-columns: 1fr !important;
          }

          /* ── Deal modal: full width, safe close btn ── */
          .deal-modal-inner {
            border-radius: 16px 16px 0 0 !important;
            max-height: 96vh !important;
            padding: 0 !important;
          }
          .deal-modal-body { padding: 14px !important; }
          .deal-modal-photo { height: 210px !important; }

          /* ── Marketplace listing modal ── */
          .listing-modal-inner {
            border-radius: 16px 16px 0 0 !important;
            padding: 14px !important;
            max-height: 96vh !important;
          }

          /* ── Numbers grid in deal modal: 2-col ── */
          .deal-numbers-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          /* ── Footer: single column ── */
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }

          /* ── Diaspora banner ── */
          .diaspora-banner {
            padding: 24px 16px !important;
          }

          /* ── WhatsApp button: smaller, stays clear ── */
          .wa-fab {
            padding: 12px 16px !important;
            font-size: 13px !important;
            right: 24px !important;
            bottom: 24px !important;
          }
          .wa-panel {
            right: 8px !important;
            width: calc(100vw - 16px) !important;
            bottom: 70px !important;
          }

          /* ── Escrow steps: 1-col ── */
          .escrow-steps {
            flex-direction: column !important;
          }

          /* ── Verification gate grid ── */
          .verify-locked-grid {
            grid-template-columns: 1fr !important;
          }
          .verify-step-row {
            flex-direction: column !important;
          }

          /* ── Auth modal ── */
          .auth-modal-inner {
            padding: 20px 14px !important;
            border-radius: 14px !important;
          }

          /* ── Marketplace stats strip ── */
          .marketplace-stats {
            grid-template-columns: 1fr 1fr !important;
          }

          /* ── Confirm booking button — full width, 52px tall ── */
          #confirm-booking-btn {
            min-height: 52px !important;
            font-size: 15px !important;
          }
          #sign-in-btn {
            min-height: 44px !important;
            padding: 9px 16px !important;
          }

          /* ── Booking calendar sidebar: stack below calendar ── */
          .booking-view-grid {
            grid-template-columns: 1fr !important;
          }

          /* ── Host console form: 1-col ── */
          .host-post-form {
            grid-template-columns: 1fr !important;
          }

          /* ── Marketplace listing modal stats grid ── */
          .listing-stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          /* ── Map: shorter height on mobile ── */
          .abuja-map-container {
            height: 260px !important;
          }
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
        <div className="header-container" style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "nowrap" }}>
          
          {/* Logo & Typographic Brand Lockup */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto", flexShrink: 0, whiteSpace: "nowrap" }}>
            <img
              src="/logo_mark.png"
              alt="The Landlord Property AI"
              style={{
                height: 40,
                width: "auto",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, lineHeight: 1.1 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 17.5, color: T.ink }}>The Landlord</span>
                <span style={{ fontFamily: "'Instrument Sans'", fontWeight: 400, fontSize: 16.5, color: T.green }}>Property</span>
                <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 17.5, color: T.gold }}>AI</span>
              </div>
              <div style={{ fontSize: 9.5, color: T.sub, letterSpacing: 1.2, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>
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
              Live data
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
              ["deals", "Deals"],
              ["listings", "Listings", dealsList.filter(d => !d.status || d.status === "Published").length],
              ["marketplace", "Marketplace"],
              ["shortlet", "Shortlets"],
              ["profile", "Profile"],
              ["about", "About"],
              ...(user ? [["admin", "Admin"]] : []),
            ].map(([k, text, badge]) => {
              const active = tab === k;
              return (
                <button
                  key={k}
                  className="nav-btn"
                  onClick={() => navigate(k === "deals" ? "/" : "/" + k)}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: active ? 700 : 600,
                    cursor: "pointer",
                    background: active
                      ? (k === "deals" ? T.green : k === "listings" ? T.greenDark : k === "marketplace" ? T.green : k === "shortlet" ? T.teal : k === "profile" ? T.greenDark : k === "about" ? T.gold : T.ink)
                      : "transparent",
                    color: active ? "#fff" : T.sub,
                    transition: "all .2s ease",
                    display: "inline-flex",
                    alignItems: "center",
                    position: "relative",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span className="nav-label-text">{text}</span>
                  {badge > 0 && (
                    <span style={{
                      marginLeft: 5,
                      background: active ? "rgba(255,255,255,.25)" : T.mint,
                      color: active ? "#fff" : T.green,
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "1px 6px",
                      lineHeight: 1.6,
                    }}>{badge}</span>
                  )}
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
              <NotificationBell user={user} />
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

        {/* ── FCM Push Notification Banner ── */}
        {user && pushPermission === 'default' && showPushBanner && !pushBannerDismissed && (
          <div style={{
            background: `linear-gradient(135deg, ${T.ink}, #0A3420)`,
            color: "#fff",
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            animation: "slideup .3s ease",
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Enable push notifications</div>
              <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 2 }}>Get instant alerts when matching deals are found, or when your bids advance.</div>
            </div>
            <button
              onClick={async () => {
                const token = await requestNotificationPermission(user.uid);
                if (token) {
                  setPushPermission('granted');
                  setToast('Push notifications enabled! ✓');
                  setTimeout(() => setToast(null), 3500);
                } else {
                  setPushPermission(Notification.permission);
                }
                setPushBannerDismissed(true);
              }}
              style={{
                background: T.gold, color: T.ink, border: "none", borderRadius: 10,
                padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ✓ Enable
            </button>
            <button
              onClick={() => setPushBannerDismissed(true)}
              style={{ background: "rgba(255,255,255,.12)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 12px", cursor: "pointer", fontSize: 13 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── FCM Foreground notification toast ── */}
        {fcmForegroundNotif && (
          <div style={{
            position: "fixed", top: 80, right: 18, zIndex: 200,
            background: T.ink, color: "#fff", borderRadius: 14,
            padding: "14px 18px", maxWidth: 320,
            boxShadow: "0 12px 30px rgba(12,43,31,.35)",
            animation: "slideup .3s ease",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ flexShrink: 0, display: "flex", alignItems: "center", marginTop: 2 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: T.gold }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{fcmForegroundNotif.title}</div>
              {fcmForegroundNotif.body && <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 3 }}>{fcmForegroundNotif.body}</div>}
            </div>
            <button onClick={() => setFcmForegroundNotif(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", cursor: "pointer", padding: 0, fontSize: 14 }}>✕</button>
          </div>
        )}

        <Routes>
          <Route path="/" element={<DealsView cur={cur} onOpen={setModal} query={query} setQuery={setQuery} dealsList={usingEmulator ? dbProperties : dealsList} onAiSearch={handleAiSearch} aiResults={aiResults} aiSearching={aiSearching} usingEmulator={usingEmulator} savedIds={savedIds} onToggleSave={toggleSave} compareIds={compareIds} onToggleCompare={toggleCompare} />} />
          <Route path="/listings" element={<Listings dealsList={usingEmulator ? dbProperties : dealsList} cur={cur} onOpen={setModal} user={user} />} />
          <Route path="/marketplace" element={<Marketplace cur={cur} onWhatsAppOpen={() => setWaOpen(true)} usingEmulator={usingEmulator} dataConnect={dataConnect} user={user} onSignInRequest={() => setShowAuth(true)} distressDeals={usingEmulator ? dbProperties : dealsList.filter(d => d.status === "Published" || !d.status)} onOpenDeal={(deal) => setModal(deal)} />} />
          <Route path="/profile" element={<Profile user={user} cur={cur} onSignInRequest={() => setShowAuth(true)} onListingsChange={setDealsList} dealsList={usingEmulator ? dbProperties : dealsList} onToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); }} savedIds={savedIds} onToggleSave={toggleSave} onOpen={setModal} onBuyAndOnboard={buyAndOnboard} onRegisterDistressProperty={async (newProp) => {
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
            }} />} />
          <Route path="/about" element={<About cur={cur} onSignInRequest={() => setShowAuth(true)} />} />
          <Route path="/shortlet" element={<ShortletView cur={cur} units={units} user={user} onSignInRequest={() => setShowAuth(true)} />} />
          <Route path="*" element={<DealsView cur={cur} onOpen={setModal} query={query} setQuery={setQuery} dealsList={usingEmulator ? dbProperties : dealsList} onAiSearch={handleAiSearch} aiResults={aiResults} aiSearching={aiSearching} usingEmulator={usingEmulator} savedIds={savedIds} onToggleSave={toggleSave} compareIds={compareIds} onToggleCompare={toggleCompare} />} />
        </Routes>

        {/* ── Diaspora Wealth Accelerator CTA Banner ── */}
        {tab === "deals" && (
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
              <div className="diaspora-heading" style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: "clamp(22px, 4vw, 36px)", lineHeight: 1.2, marginBottom: 14, maxWidth: 700 }}>
                Live in London, Lagos, or Houston — <span style={{ color: T.gold }}>own in Abuja.</span>
              </div>
              <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.78)", maxWidth: 620, lineHeight: 1.65, marginBottom: 24 }}>
                Every deal supports USD, GBP, and CAD payments through our partner-bank escrow. Your AI concierge handles everything on the ground — from AGIS title searches to WhatsApp-verified tenant check-ins — while your portfolio generates verified monthly income.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <Btn kind="gold" onClick={() => setWaOpen(true)}>
                  Talk to a deal concierge
                </Btn>
                <Btn
                  kind="ghost"
                  style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
                  onClick={() => {
                    if (location.pathname === "/") {
                      const grid = document.querySelector(".deal-grid");
                      if (grid) {
                        grid.scrollIntoView({ behavior: "smooth" });
                      }
                    } else {
                      navigate("/");
                      setTimeout(() => {
                        const grid = document.querySelector(".deal-grid");
                        if (grid) {
                          grid.scrollIntoView({ behavior: "smooth" });
                        }
                      }, 100);
                    }
                  }}
                >
                  Browse verified deals →
                </Btn>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Premium content-rich footer */}
      <footer style={{ background: T.ink, color: "#fff", padding: "64px 24px 40px", borderTop: `1px solid ${T.line}` }}>
        <div className="footer-grid" style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 40 }}>
          {/* Column 1: Brand & About */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <img
                src="/logo_mark.png"
                alt="The Landlord Property"
                style={{
                  height: 40,
                  width: "auto",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: "#fff" }}>The Landlord</span>
                  <span style={{ fontFamily: "'Instrument Sans'", fontWeight: 400, fontSize: 17, color: "#4ade80" }}>Property</span>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.gold }}></span>
                </div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.6)", letterSpacing: 1.2, fontWeight: 700, textTransform: "uppercase", marginTop: 1 }}>
                  Verification &amp; Escrow Gateway
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13.5, opacity: 0.75, lineHeight: 1.6, margin: "0 0 20px 0" }}>
              Abuja's premier AI-powered distress deal marketplace and automated shortlet management platform. We bridge properties directly to verification pipelines.
            </p>
            {/* Social Media Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {[
                { name: "Twitter", href: "https://twitter.com/thelandlordai", icon: (
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>
                  </svg>
                )},
                { name: "LinkedIn", href: "https://linkedin.com/company/thelandlordai", icon: (
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                  </svg>
                )},
                { name: "Instagram", href: "https://instagram.com/thelandlordai", icon: (
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04 1.804.57 3.205 1.76 4.395 1.19 1.19 2.586 1.72 4.394 1.76 1.803.03 2.078.04 4.298.04 2.172 0 2.444-.01 3.298-.048 1.804-.04 3.205-.57 4.395-1.76 1.19-1.19 1.72-2.586 1.76-4.394.03-1.803.04-2.078.04-4.298 0-2.172-.01-2.444-.048-3.298c-.04-1.804-.57-3.205-1.76-4.395C14.004 1.72 12.607 1.2 10.8 1.049 8.996 1.01 8.72 8 8 8zm0 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 4.5A4.5 4.5 0 1 0 8 3.5a4.5 4.5 0 0 0 0 9z"/>
                  </svg>
                )},
                { name: "Facebook", href: "https://facebook.com/thelandlordai", icon: (
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
                  </svg>
                )}
              ].map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow us on ${s.name}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "rgba(255, 255, 255, 0.8)",
                    textDecoration: "none",
                    transition: "all 0.2s ease-in-out",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    translate: "0px 0px",
                    scale: "1",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = T.green;
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.translate = "0 -2px";
                    e.currentTarget.style.borderColor = T.green;
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(14, 90, 58, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                    e.currentTarget.style.translate = "0px 0px";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
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
              <li>Partner bank milestone escrow</li>
              <li>NIN / BVN identity verification</li>
              <li>Certified AGIS title chain search</li>
              <li>Integrated WhatsApp concierge</li>
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 12.5, letterSpacing: 1.4, textTransform: "uppercase", color: T.gold, marginBottom: 18 }}>Contact Info</div>
            <div style={{ fontSize: 13.5, opacity: 0.75, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>Address: Constitution Avenue, Central Business District, Abuja, FCT</div>
              <div>Email: info@thelandlordproperty.com</div>
              <div>Phone: +234 (0) 70 3699 0717</div>
              <div style={{ marginTop: 4 }}>
                <span style={{ color: T.gold, fontWeight: 700 }}>Concierge:</span> Chat on WhatsApp via the active bubble below
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ maxWidth: 1120, margin: "50px auto 0", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 20, fontSize: 12, opacity: 0.6 }}>
          <div>© {new Date().getFullYear()} The Landlord Property. All rights reserved.</div>
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
      <CompareBar compareIds={compareIds} dealsList={dealsList} onRemove={(id) => setCompareIds(prev => prev.filter(x => x !== id))} onOpen={setModal} onClear={() => setCompareIds([])} cur={cur} />
      <DealModal deal={modal} cur={cur} onClose={() => setModal(null)} onBuyAndOnboard={buyAndOnboard} user={user} kycVerified={kycVerified} onSignInRequest={() => setShowAuth(true)} savedIds={savedIds} onToggleSave={toggleSave} onToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); }} />
      <WhatsAppPanel open={waOpen} setOpen={setWaOpen} />
    </div>
  );
}
