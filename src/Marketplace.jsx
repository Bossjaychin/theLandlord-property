import React, { useState, useMemo, useRef, useEffect } from "react";

/* ============================================================
   AI PROPERTY MARKETPLACE — Pillar 3
   Natural-language search across 12 property categories.
   Accent: purple #6B3FA0
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
  purple: "#6B3FA0",
  purpleSoft: "#F0EAF9",
  purpleDark: "#4E2D78",
  paper: "#F5F6F2",
  card: "#FFFFFF",
  line: "#E2E5DF",
  sub: "#5B6A61",
};

const FX = 1550;
const fmtN = (n, cur) => {
  if (cur === "USD") {
    const v = n / FX;
    return v >= 1000
      ? "$" + Math.round(v).toLocaleString()
      : "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (n >= 1_000_000_000) return "₦" + (n / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "bn";
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "m";
  return "₦" + n.toLocaleString();
};

/* ── Type meta ── */
const TYPE_META = {
  "Home":               { group: "residential", icon: "🏠", color: T.green,      colorSoft: T.mint },
  "Apartment":          { group: "residential", icon: "🏢", color: T.green,      colorSoft: T.mint },
  "Duplex":             { group: "residential", icon: "🏘️", color: T.green,      colorSoft: T.mint },
  "Luxury Home":        { group: "residential", icon: "✨", color: T.gold,       colorSoft: T.goldSoft },
  "Commercial Building":{ group: "commercial",  icon: "🏗️", color: T.teal,       colorSoft: T.tealSoft },
  "Office":             { group: "commercial",  icon: "🖥️", color: T.teal,       colorSoft: T.tealSoft },
  "Warehouse":          { group: "commercial",  icon: "🏭", color: T.teal,       colorSoft: T.tealSoft },
  "Hotel":              { group: "commercial",  icon: "🏨", color: T.teal,       colorSoft: T.tealSoft },
  "Land":               { group: "land",        icon: "🌍", color: T.purple,     colorSoft: T.purpleSoft },
  "Estate":             { group: "land",        icon: "🏡", color: T.purple,     colorSoft: T.purpleSoft },
  "Agricultural Land":  { group: "land",        icon: "🌾", color: T.purple,     colorSoft: T.purpleSoft },
  "Industrial":         { group: "land",        icon: "⚙️", color: T.amber,      colorSoft: T.amberSoft },
};

const GROUP_LABELS = { residential: "Residential", commercial: "Commercial", land: "Land & Estates" };

/* ── 24 mock listings (2 per type) ── */
const LISTINGS = [
  /* ── Homes ── */
  {
    id: "m1", type: "Home", district: "Guzape", price: 185_000_000,
    title_doc: "C of O", verified: true, listed: 2,
    headline: "4-Bedroom Detached Home, Guzape Hills",
    size: "4 bedrooms · 350 sqm", sqm: 350,
    purpose: ["family living", "investment"],
    features: ["Swimming pool", "BQ", "24/7 power", "Perimeter fence", "3 car garage"],
    agent: "Lex Habitat Partners", photos: 18,
    description: "Spacious detached home in the serene Guzape Hills with unobstructed views. Solar panels, inverter system, and fully fitted kitchen.",
  },
  {
    id: "m2", type: "Home", district: "Maitama", price: 420_000_000,
    title_doc: "C of O", verified: true, listed: 5,
    headline: "5-Bedroom Mansion, Maitama (Ministers Hill)",
    size: "5 bedrooms · 620 sqm", sqm: 620,
    purpose: ["family living", "luxury", "investment"],
    features: ["Home cinema", "Gym", "Smart home", "4 BQ rooms", "Olympic pool"],
    agent: "Themis Chambers Realty", photos: 32,
    description: "Architecturally designed mansion on a 1,200 sqm plot. Fully automated smart home system, imported marble floors, and grand entertaining spaces.",
  },

  /* ── Apartments ── */
  {
    id: "m3", type: "Apartment", district: "Wuse 2", price: 75_000_000,
    title_doc: "R of O", verified: true, listed: 3,
    headline: "3-Bedroom Serviced Apartment, Wuse 2",
    size: "3 bedrooms · 185 sqm", sqm: 185,
    purpose: ["shortlet", "investment", "residence"],
    features: ["24/7 power", "Elevator", "CCTV", "Fitted kitchen", "Visitor parking"],
    agent: "Barr. A. Musa & Co.", photos: 14,
    description: "Premium serviced apartment in Wuse 2 commercial district. Ideal for shortlet or executive residency. High-speed fibre internet included.",
  },
  {
    id: "m4", type: "Apartment", district: "Jabi", price: 55_000_000,
    title_doc: "C of O", verified: true, listed: 7,
    headline: "2-Bedroom Apartment, Jabi Lake View",
    size: "2 bedrooms · 120 sqm", sqm: 120,
    purpose: ["shortlet", "residence", "investment"],
    features: ["Lake view", "Balcony", "24/7 power", "Gym", "Pool"],
    agent: "Barr. A. Musa & Co.", photos: 11,
    description: "Stunning lake-view apartment in a fully-serviced estate. The AI projects ₦980k/month net shortlet revenue at 81% occupancy.",
  },

  /* ── Duplexes ── */
  {
    id: "m5", type: "Duplex", district: "Gwarinpa", price: 120_000_000,
    title_doc: "C of O", verified: true, listed: 4,
    headline: "4-Bedroom Semi-Detached Duplex, Gwarinpa",
    size: "4 bedrooms · 280 sqm", sqm: 280,
    purpose: ["family living", "investment"],
    features: ["All-en-suite", "BQ", "Fully tiled", "Gated estate", "Parking"],
    agent: "Capital Assets Realty", photos: 16,
    description: "Brand-new semi-detached duplex in a secured estate. American-style kitchen, pop ceilings, Italian tiles throughout.",
  },
  {
    id: "m6", type: "Duplex", district: "Apo", price: 98_000_000,
    title_doc: "R of O", verified: true, listed: 9,
    headline: "3-Bedroom Terrace Duplex, Apo Resettlement",
    size: "3 bedrooms · 215 sqm", sqm: 215,
    purpose: ["family living", "investment"],
    features: ["Terrace", "2 sitting rooms", "BQ", "Parking", "CCTV"],
    agent: "Lex Habitat Partners", photos: 12,
    description: "Well-finished terrace duplex in a quiet Apo neighbourhood. Walking distance to the market and primary school.",
  },

  /* ── Luxury Homes ── */
  {
    id: "m7", type: "Luxury Home", district: "Katampe Extension", price: 850_000_000,
    title_doc: "C of O", verified: true, listed: 1,
    headline: "7-Bedroom Ultra-Luxury Villa, Katampe Ext.",
    size: "7 bedrooms · 1,200 sqm", sqm: 1200,
    purpose: ["luxury", "family living", "embassy residence"],
    features: ["Infinity pool", "Home theatre", "Wine cellar", "Helipad pad ready", "Smart home"],
    agent: "Themis Chambers Realty", photos: 45,
    description: "Abuja's most exceptional residential offering. Bespoke architecture, Italian marble, home automation, and diplomatic-grade security.",
  },
  {
    id: "m8", type: "Luxury Home", district: "Maitama", price: 650_000_000,
    title_doc: "C of O", verified: true, listed: 3,
    headline: "6-Bedroom Smart Mansion, Maitama",
    size: "6 bedrooms · 900 sqm", sqm: 900,
    purpose: ["luxury", "investment", "embassy residence"],
    features: ["Smart home", "4 BQ units", "Outdoor kitchen", "Solar system", "Tennis court ready"],
    agent: "Capital Assets Realty", photos: 38,
    description: "Fully integrated smart home with Crestron automation. Solar + NEPA + generator triple power, zero outage guarantee.",
  },

  /* ── Commercial Buildings ── */
  {
    id: "m9", type: "Commercial Building", district: "Wuse 2", price: 1_200_000_000,
    title_doc: "C of O", verified: true, listed: 6,
    headline: "7-Storey Commercial Plaza, Wuse 2",
    size: "7 floors · 4,200 sqm GFA", sqm: 4200,
    purpose: ["commercial investment", "office", "retail"],
    features: ["100% occupancy", "Lift", "Generator", "Basement parking", "Central A/C"],
    agent: "Lex Habitat Partners", photos: 22,
    description: "Fully tenanted commercial plaza generating ₦180m/year in rent. Anchor tenants include a bank and a telecom. Prime Wuse 2 main road frontage.",
  },
  {
    id: "m10", type: "Commercial Building", district: "Guzape", price: 580_000_000,
    title_doc: "C of O", verified: true, listed: 11,
    headline: "4-Storey Mixed-Use Building, Guzape",
    size: "4 floors · 1,800 sqm GFA", sqm: 1800,
    purpose: ["commercial investment", "mixed use"],
    features: ["Ground-floor retail", "Office floors", "Rooftop terrace", "Lift ready", "Parking"],
    agent: "Capital Assets Realty", photos: 19,
    description: "Newly completed mixed-use building — retail on ground, offices on 1–3, rooftop convertible. Shell and core upper floors for fit-out.",
  },

  /* ── Offices ── */
  {
    id: "m11", type: "Office", district: "Central Business District", price: 320_000_000,
    title_doc: "C of O", verified: true, listed: 4,
    headline: "Open-Plan Office Suite (1,000 sqm), CBD",
    size: "1,000 sqm · 4th floor", sqm: 1000,
    purpose: ["corporate office", "government", "NGO"],
    features: ["VRF A/C", "24/7 power", "High-speed fibre", "Lobby reception", "250-car parking"],
    agent: "Themis Chambers Realty", photos: 17,
    description: "Grade A office space in Abuja's CBD. Full-floor availability with panoramic city views. Fit-out budget negotiable.",
  },
  {
    id: "m12", type: "Office", district: "Maitama", price: 180_000_000,
    title_doc: "R of O", verified: true, listed: 8,
    headline: "Semi-Detached Office Building, Maitama",
    size: "3 floors · 450 sqm", sqm: 450,
    purpose: ["corporate office", "NGO", "embassy sub-office"],
    features: ["Private compound", "Generator", "A/C", "4 restrooms per floor", "Parking for 20"],
    agent: "Barr. A. Musa & Co.", photos: 13,
    description: "Freestanding office building with a private compound. Popular with embassies and NGOs. Ready for immediate occupancy.",
  },

  /* ── Warehouses ── */
  {
    id: "m13", type: "Warehouse", district: "Idu Industrial", price: 250_000_000,
    title_doc: "C of O", verified: true, listed: 3,
    headline: "2,500 sqm Warehouse & Logistics Hub, Idu",
    size: "2,500 sqm · 9m clear height", sqm: 2500,
    purpose: ["logistics", "manufacturing", "storage", "investment"],
    features: ["9m clear height", "3 dock levellers", "40-tonne floor load", "3-phase power", "CCTV"],
    agent: "Capital Assets Realty", photos: 15,
    description: "Grade A logistics warehouse minutes from Abuja airport. Three dock levellers, 40-tonne floor capacity, 3-phase industrial power.",
  },
  {
    id: "m14", type: "Warehouse", district: "Kubwa", price: 95_000_000,
    title_doc: "C of O", verified: true, listed: 14,
    headline: "800 sqm Storage Warehouse, Kubwa",
    size: "800 sqm · 6m height", sqm: 800,
    purpose: ["storage", "manufacturing", "distribution"],
    features: ["Roller shutter doors", "Office annex", "Borehole", "Perimeter fence", "Security post"],
    agent: "Barr. A. Musa & Co.", photos: 9,
    description: "Affordable warehouse with offices in Kubwa industrial zone. Ideal for FMCG distribution, light manufacturing, or cold-chain conversion.",
  },

  /* ── Hotels ── */
  {
    id: "m15", type: "Hotel", district: "Wuse 2", price: 2_500_000_000,
    title_doc: "C of O", verified: true, listed: 2,
    headline: "120-Room Boutique Hotel, Wuse 2 (Operating)",
    size: "120 rooms · 8 floors", sqm: 6000,
    purpose: ["hospitality investment", "leisure", "corporate stays"],
    features: ["Restaurant", "Rooftop bar", "Conference room", "Pool", "80% avg occupancy"],
    agent: "Themis Chambers Realty", photos: 40,
    description: "Fully operating 4-star boutique hotel generating ₦320m/year net. 80% average occupancy. Established corporate clientele.",
  },
  {
    id: "m16", type: "Hotel", district: "Guzape", price: 980_000_000,
    title_doc: "C of O", verified: true, listed: 7,
    headline: "40-Room Serviced Apartment Hotel, Guzape (Completed shell)",
    size: "40 suites · 5 floors", sqm: 2800,
    purpose: ["hospitality investment", "serviced apartments"],
    features: ["Completed structure", "Pool deck", "Restaurant space", "Gym area", "Parking"],
    agent: "Capital Assets Realty", photos: 28,
    description: "Completed shell serviced apartment hotel. Fit-out required. AI projects ₦180m/year at current Guzape corporate demand rates.",
  },

  /* ── Land ── */
  {
    id: "m17", type: "Land", district: "Lugbe", price: 185_000_000,
    title_doc: "Area Council (Regularization 80%)", verified: true, listed: 5,
    headline: "10 Plots (1,000 sqm each), Lugbe FHA Extension",
    size: "10 plots · 1,000 sqm each · 1 hectare total", sqm: 10000, plots: 10,
    purpose: ["estate development", "residential development", "investment"],
    features: ["10 contiguous plots", "Survey plan", "Corner piece", "Drainage access", "Tarred road frontage"],
    agent: "Barr. A. Musa & Co.", photos: 8,
    description: "10 contiguous plots ideal for private estate or block of flats development. Survey plan ready. Regularization at Stage 4 of 5.",
  },
  {
    id: "m18", type: "Land", district: "Gwarinpa", price: 65_000_000,
    title_doc: "C of O", verified: true, listed: 10,
    headline: "2 Plots (600 sqm each), Gwarinpa 2nd Avenue",
    size: "2 plots · 600 sqm each", sqm: 1200, plots: 2,
    purpose: ["residential development", "investment"],
    features: ["C of O ready", "Corner piece", "Tarred road", "Serene neighbourhood", "Drainage"],
    agent: "Lex Habitat Partners", photos: 7,
    description: "Premium residential land on Gwarinpa 2nd Avenue. Clean C of O, corner position, immediate construction-ready.",
  },

  /* ── Estates ── */
  {
    id: "m19", type: "Estate", district: "Katampe Extension", price: 3_200_000_000,
    title_doc: "C of O", verified: true, listed: 1,
    headline: "50-Unit Gated Estate (Mixed), Katampe Ext.",
    size: "50 units · 3.5 hectares", sqm: 35000,
    purpose: ["estate development", "residential investment", "luxury"],
    features: ["Perimeter fence", "Gatehouse", "Club house", "Roads", "Utilities backbone"],
    agent: "Themis Chambers Realty", photos: 35,
    description: "Turnkey 50-unit gated estate site. Roads, drainage, perimeter walls, gatehouse, and utility backbone complete. Superstructure your units.",
  },
  {
    id: "m20", type: "Estate", district: "Apo", price: 850_000_000,
    title_doc: "C of O", verified: true, listed: 4,
    headline: "12-Unit Mini Estate (Terrace Duplexes), Apo",
    size: "12 units · 2 hectares", sqm: 20000,
    purpose: ["estate development", "residential investment"],
    features: ["12 terrace plots", "Perimeter fence", "Tarred internal roads", "Borehole", "Security"],
    agent: "Capital Assets Realty", photos: 24,
    description: "12-unit mini estate fully fenced with internal tarred roads. Quick-win development opportunity — build and sell or let.",
  },

  /* ── Agricultural Land ── */
  {
    id: "m21", type: "Agricultural Land", district: "Bwari", price: 45_000_000,
    title_doc: "Area Council", verified: true, listed: 6,
    headline: "5 Hectares Farm Land, Bwari Area Council",
    size: "5 hectares · 50,000 sqm", sqm: 50000,
    purpose: ["farming", "agribusiness", "investment"],
    features: ["River frontage", "Year-round water", "Loamy soil", "Access road", "Fenced boundary"],
    agent: "Barr. A. Musa & Co.", photos: 6,
    description: "Fertile farmland with river frontage in Bwari. Ideal for greenhouse farming, fish ponds, or poultry. Year-round water availability.",
  },
  {
    id: "m22", type: "Agricultural Land", district: "Kuje", price: 28_000_000,
    title_doc: "Area Council", verified: false, listed: 12,
    headline: "3 Hectares Farmland, Kuje Axis",
    size: "3 hectares · 30,000 sqm", sqm: 30000,
    purpose: ["farming", "agribusiness"],
    features: ["Flat terrain", "Road access", "Community well nearby", "Survey available"],
    agent: "Local agent (inspection required)", photos: 4,
    description: "Affordable farmland suitable for crop cultivation or livestock. Survey plan available. Title under area council.",
  },

  /* ── Industrial ── */
  {
    id: "m23", type: "Industrial", district: "Idu Industrial", price: 420_000_000,
    title_doc: "C of O", verified: true, listed: 3,
    headline: "Industrial Plot (2 hectares), Idu Industrial Layout",
    size: "2 hectares · purpose-zoned industrial", sqm: 20000,
    purpose: ["manufacturing", "logistics hub", "industrial investment"],
    features: ["Industrial zoning", "3-phase power ready", "Rail siding access", "Heavy vehicle access", "Water mains"],
    agent: "Capital Assets Realty", photos: 11,
    description: "Premium industrial land in Idu with active 3-phase power stub, proximity to Abuja–Kaduna rail siding, and wide-access road for heavy trucks.",
  },
  {
    id: "m24", type: "Industrial", district: "Kubwa", price: 180_000_000,
    title_doc: "C of O", verified: true, listed: 9,
    headline: "Industrial Plot (0.8 hectare), Kubwa Industrial Zone",
    size: "0.8 hectare · light-industrial zoned", sqm: 8000,
    purpose: ["light manufacturing", "storage", "workshop"],
    features: ["Light industrial zoning", "Generator connection", "Security fence", "Office structure", "Motorable access"],
    agent: "Lex Habitat Partners", photos: 8,
    description: "Well-located light-industrial plot in Kubwa's busy industrial zone. Existing security fence, office block, and water borehole.",
  },
];

/* ══════════════════════════════════════════════════════════
   NL PARSER
   ══════════════════════════════════════════════════════════ */
function parseQuery(raw) {
  const q = raw.toLowerCase();

  /* type keywords → type matches */
  const typeMap = {
    "home": ["Home"],
    "house": ["Home"],
    "bungalow": ["Home"],
    "mansion": ["Luxury Home", "Home"],
    "luxury": ["Luxury Home"],
    "apartment": ["Apartment"],
    "flat": ["Apartment"],
    "studio": ["Apartment"],
    "duplex": ["Duplex"],
    "terrace": ["Duplex"],
    "semi-detached": ["Duplex"],
    "commercial": ["Commercial Building"],
    "plaza": ["Commercial Building"],
    "office": ["Office"],
    "warehouse": ["Warehouse"],
    "logistics": ["Warehouse"],
    "storage": ["Warehouse"],
    "hotel": ["Hotel"],
    "hospitality": ["Hotel"],
    "land": ["Land"],
    "plot": ["Land"],
    "plots": ["Land"],
    "estate": ["Estate"],
    "gated estate": ["Estate"],
    "farm": ["Agricultural Land"],
    "farmland": ["Agricultural Land"],
    "agricultural": ["Agricultural Land"],
    "hectare": ["Agricultural Land", "Industrial", "Land"],
    "industrial": ["Industrial"],
    "factory": ["Industrial"],
    "manufacturing": ["Industrial"],
  };

  const matchedTypes = new Set();
  for (const [kw, types] of Object.entries(typeMap)) {
    if (q.includes(kw)) types.forEach(t => matchedTypes.add(t));
  }

  /* group shortcuts */
  if (q.includes("residential")) ["Home", "Apartment", "Duplex", "Luxury Home"].forEach(t => matchedTypes.add(t));
  if (q.includes("commercial building") || (q.includes("commercial") && !q.includes("land")))
    ["Commercial Building", "Office", "Warehouse", "Hotel"].forEach(t => matchedTypes.add(t));

  /* quantity of plots */
  const plotsMatch = q.match(/(\d+)\s*plot/);
  const quantity = plotsMatch ? parseInt(plotsMatch[1]) : null;

  /* budget */
  let maxPrice = null;
  const billions = q.match(/(?:under|below|max|maximum|around|≤)?\s*₦?\s*(\d+(?:\.\d+)?)\s*(?:bn|billion)/);
  const millions = q.match(/(?:under|below|max|maximum|around|≤)?\s*₦?\s*(\d+(?:\.\d+)?)\s*(?:m|million)/);
  const raw_num = q.match(/(?:under|below|max|maximum)\s+₦?\s*(\d[\d,]+)/);
  if (billions) maxPrice = parseFloat(billions[1]) * 1_000_000_000;
  else if (millions) maxPrice = parseFloat(millions[1]) * 1_000_000;
  else if (raw_num) maxPrice = parseInt(raw_num[1].replace(/,/g, ""));

  /* district */
  const districts = [
    "jabi", "guzape", "wuse", "maitama", "katampe", "lugbe",
    "kubwa", "apo", "gwarinpa", "idu", "bwari", "kuje",
    "central business district", "cbd",
  ];
  const district = districts.find(d => q.includes(d)) || null;

  /* purpose hints */
  const purposes = [];
  if (q.includes("shortlet") || q.includes("short let")) purposes.push("shortlet");
  if (q.includes("estate development") || q.includes("develop")) purposes.push("estate development");
  if (q.includes("investment") || q.includes("invest")) purposes.push("investment");
  if (q.includes("family") || q.includes("residential")) purposes.push("family living");
  if (q.includes("farm") || q.includes("agri")) purposes.push("farming");
  if (q.includes("manufacturing") || q.includes("factory")) purposes.push("manufacturing");
  if (q.includes("logistics") || q.includes("warehouse")) purposes.push("logistics");
  if (q.includes("corporate") || q.includes("office")) purposes.push("corporate office");
  if (q.includes("luxury") || q.includes("premium")) purposes.push("luxury");

  /* bedroom count */
  const bedMatch = q.match(/(\d)\s*(?:bed|bedroom)/);
  const beds = bedMatch ? parseInt(bedMatch[1]) : null;

  /* size hints */
  const sqmMatch = q.match(/(\d[\d,]+)\s*sqm/);
  const minSqm = sqmMatch ? parseInt(sqmMatch[1].replace(/,/g, "")) * 0.7 : null;

  return { matchedTypes: [...matchedTypes], quantity, maxPrice, district, purposes, beds, minSqm };
}

function scoreListings(listings, signals) {
  return listings.map(l => {
    let score = 0;
    const meta = TYPE_META[l.type] || {};

    // Type match (highest weight)
    if (signals.matchedTypes.length > 0) {
      if (signals.matchedTypes.includes(l.type)) score += 35;
      else {
        // partial group match
        const lGroup = meta.group;
        const hasGroupMatch = signals.matchedTypes.some(t => TYPE_META[t]?.group === lGroup);
        if (hasGroupMatch) score += 15;
      }
    } else {
      score += 15; // neutral — show everything
    }

    // District match
    if (signals.district) {
      const dist = l.district.toLowerCase();
      if (dist.includes(signals.district) || signals.district.includes(dist.split(" ")[0])) score += 25;
    } else {
      score += 10;
    }

    // Price within budget
    if (signals.maxPrice) {
      if (l.price <= signals.maxPrice) score += 20;
      else if (l.price <= signals.maxPrice * 1.15) score += 8; // slightly over budget
    } else {
      score += 10;
    }

    // Purpose match
    if (signals.purposes.length > 0) {
      const matched = signals.purposes.filter(p => l.purpose.some(lp => lp.toLowerCase().includes(p.toLowerCase())));
      score += Math.min(matched.length * 6, 12);
    } else {
      score += 6;
    }

    // Bedroom match
    if (signals.beds) {
      if (l.size && l.size.includes(signals.beds + " bed")) score += 8;
    }

    // Quantity (plots) — prefer listings with ≥ quantity plots
    if (signals.quantity && l.plots) {
      if (l.plots >= signals.quantity) score += 10;
      else score -= 5;
    }

    // Sqm match
    if (signals.minSqm && l.sqm >= signals.minSqm) score += 5;

    // Verified bonus
    if (l.verified) score += 3;

    return { ...l, _score: Math.min(Math.round(score), 100) };
  });
}

/* ══════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ══════════════════════════════════════════════════════════ */
const Pill = ({ children, bg, color, border }) => (
  <span style={{
    background: bg, color,
    border: border ? `1px solid ${border}` : "none",
    borderRadius: 999, padding: "3px 10px",
    fontSize: 11.5, fontWeight: 600, letterSpacing: 0.2,
    whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5,
  }}>
    {children}
  </span>
);

const SectionLabel = ({ children, color = T.purple }) => (
  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color, marginBottom: 8 }}>
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════════
   EXAMPLE QUERIES
   ══════════════════════════════════════════════════════════ */
const EXAMPLES = [
  "10 plots of land in Lugbe for estate development under ₦200 million",
  "Luxury 5-bedroom home in Maitama or Katampe",
  "Warehouse in Idu for logistics, at least 2,000 sqm",
  "2-bedroom apartment in Jabi or Wuse 2 good for shortlet",
  "Agricultural farmland around Bwari, at least 3 hectares",
  "Operating hotel in Abuja under ₦3 billion",
  "Office space in CBD or Maitama for corporate use",
];

/* ══════════════════════════════════════════════════════════
   LISTING DETAIL MODAL
   ══════════════════════════════════════════════════════════ */
const ListingModal = ({ listing, cur, onClose, onWhatsApp }) => {
  if (!listing) return null;
  const meta = TYPE_META[listing.type] || {};
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(12,43,31,.45)", zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.paper, borderRadius: 20, width: "min(740px,100%)", maxHeight: "92vh", overflowY: "auto", padding: 24 }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{meta.icon}</span>
              <Pill bg={meta.colorSoft} color={meta.color}>{listing.type}</Pill>
              {listing.verified && <Pill bg={T.mint} color={T.green}>✓ Verified</Pill>}
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: T.ink, lineHeight: 1.2 }}>{listing.headline}</div>
            <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{listing.district}, Abuja · {listing.photos} photos · Listed {listing.listed} day{listing.listed !== 1 ? "s" : ""} ago</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: T.card, borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>
        </div>

        {/* Price + size */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 18 }}>
          {[
            ["Asking Price", fmtN(listing.price, cur), T.ink],
            ["Size", listing.size, T.purple],
            ["Title Document", listing.title_doc, listing.verified ? T.green : T.amber],
            ["Agent", listing.agent, T.sub],
          ].map(([k, v, c]) => (
            <div key={k} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{k}</div>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 15, color: c, marginTop: 4, lineHeight: 1.3 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginTop: 14 }}>
          <SectionLabel>Property Description</SectionLabel>
          <p style={{ fontSize: 14, color: T.ink, lineHeight: 1.6, margin: 0 }}>{listing.description}</p>
        </div>

        {/* Features */}
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, marginTop: 14 }}>
          <SectionLabel>Key Features</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {listing.features.map(f => (
              <Pill key={f} bg={meta.colorSoft} color={meta.color}>✓ {f}</Pill>
            ))}
          </div>
        </div>

        {/* Purpose tags */}
        <div style={{ marginTop: 14 }}>
          <SectionLabel color={T.sub}>Suitable For</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {listing.purpose.map(p => (
              <Pill key={p} bg={T.paper} color={T.sub} border={T.line}>{p}</Pill>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <button
            onClick={() => onWhatsApp && onWhatsApp(listing)}
            style={{ flex: 1, minWidth: 200, background: "#1FAF55", color: "#fff", border: "none", borderRadius: 12, padding: "13px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            💬 Enquire on WhatsApp
          </button>
          <button
            style={{ flex: "0 0 auto", background: T.card, color: T.sub, border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "13px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            📅 Request Viewing
          </button>
        </div>

        <div style={{ fontSize: 12, color: T.sub, marginTop: 12, lineHeight: 1.4 }}>
          AI verification supports — never replaces — your own lawyer. Always engage a licensed solicitor before any transaction.
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   LISTING CARD
   ══════════════════════════════════════════════════════════ */
const ListingCard = ({ listing, cur, onOpen, showScore }) => {
  const [hovered, setHovered] = useState(false);
  const meta = TYPE_META[listing.type] || {};
  return (
    <div
      onClick={() => onOpen(listing)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.card,
        border: `1px solid ${hovered ? meta.color + "55" : T.line}`,
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? `0 8px 24px rgba(0,0,0,.09)` : "0 1px 3px rgba(12,43,31,.05)",
      }}
    >
      {/* Colour header strip */}
      <div style={{
        background: meta.colorSoft,
        padding: "14px 16px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 8,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 18 }}>{meta.icon}</span>
            <Pill bg={meta.color} color="#fff">{listing.type}</Pill>
            {listing.verified && <Pill bg={T.mint} color={T.green}>✓</Pill>}
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 15.5, color: T.ink, lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {listing.headline}
          </div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>
            {listing.district}, Abuja · {listing.photos} 📷 · {listing.listed}d ago
          </div>
        </div>
        {showScore && listing._score != null && (
          <div style={{ flexShrink: 0, textAlign: "center", background: T.card, borderRadius: 10, padding: "6px 10px", minWidth: 50 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.purple, textTransform: "uppercase", letterSpacing: 0.5 }}>Match</div>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: listing._score >= 70 ? T.green : listing._score >= 45 ? T.gold : T.amber }}>
              {listing._score}%
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "12px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: T.ink }}>
          {fmtN(listing.price, cur)}
        </div>
        <div style={{ fontSize: 12.5, color: T.sub, marginTop: 2, marginBottom: 10 }}>{listing.size}</div>

        {/* Feature pills — top 3 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1, alignContent: "flex-start" }}>
          {listing.features.slice(0, 3).map(f => (
            <Pill key={f} bg={meta.colorSoft} color={meta.color}>{f}</Pill>
          ))}
          {listing.features.length > 3 && (
            <Pill bg={T.paper} color={T.sub} border={T.line}>+{listing.features.length - 3} more</Pill>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 16px 14px", borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
        <span style={{ fontSize: 12, color: T.sub, fontWeight: 500 }}>{listing.title_doc}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: meta.color }}>View details →</span>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN MARKETPLACE VIEW
   ══════════════════════════════════════════════════════════ */
export default function Marketplace({ cur, onWhatsAppOpen }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const textareaRef = useRef(null);

  const handleSearch = () => {
    setSubmitted(query.trim());
  };

  const handleExample = (ex) => {
    setQuery(ex);
    setSubmitted(ex);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleWhatsApp = (listing) => {
    if (onWhatsAppOpen) onWhatsAppOpen();
    // Pre-fill context — passed via whatsapp panel in parent
  };

  const signals = useMemo(() => submitted ? parseQuery(submitted) : null, [submitted]);

  const results = useMemo(() => {
    let base = LISTINGS;

    // group filter
    if (groupFilter !== "all") {
      base = base.filter(l => TYPE_META[l.type]?.group === groupFilter);
    }

    if (!signals) {
      // No query — sort by recency
      return base.sort((a, b) => a.listed - b.listed).map(l => ({ ...l, _score: null }));
    }

    const scored = scoreListings(base, signals);
    return scored.sort((a, b) => b._score - a._score);
  }, [signals, groupFilter]);

  const hasQuery = submitted.length > 0;

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{
        background: `linear-gradient(135deg, ${T.purpleDark} 0%, ${T.purple} 55%, #0E3B4E 100%)`,
        borderRadius: 20, padding: "32px 28px", color: "#fff",
        position: "relative", overflow: "hidden",
        boxShadow: "0 8px 28px rgba(78,45,120,0.22)",
      }}>
        <div style={{ position: "absolute", right: -50, top: -50, width: 220, height: 220, borderRadius: "50%", background: "rgba(201,162,39,.1)" }} />
        <div style={{ position: "absolute", left: "50%", bottom: -70, width: 180, height: 180, borderRadius: "50%", background: "rgba(14,107,117,.15)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <SectionLabel color={T.gold}>Pillar 3 · AI Property Marketplace — Abuja</SectionLabel>
          <h1 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: "clamp(22px,4vw,34px)", lineHeight: 1.15, margin: "0 0 10px", maxWidth: 600 }}>
            Describe exactly what you need. The AI finds it.
          </h1>
          <p style={{ fontSize: 14.5, opacity: 0.85, maxWidth: 560, marginBottom: 20, lineHeight: 1.5 }}>
            12 property categories — from studio apartments to industrial estates. No basic filters. Just tell the AI what you're looking for.
          </p>

          {/* NL Search bar */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 12, maxWidth: 700 }}>
            <textarea
              ref={textareaRef}
              id="marketplace-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSearch(); }}
              placeholder='e.g. "I need 10 plots of land in Lugbe for estate development under ₦200 million"'
              rows={2}
              aria-label="Describe the property you are looking for"
              style={{
                width: "100%", border: "none", outline: "none", resize: "none",
                fontSize: 14.5, color: T.ink, fontFamily: "'Instrument Sans'",
                background: "transparent", lineHeight: 1.5,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: 11.5, color: T.sub }}>Ctrl+Enter or press Search</span>
              <div style={{ display: "flex", gap: 8 }}>
                {submitted && (
                  <button
                    onClick={() => { setQuery(""); setSubmitted(""); }}
                    style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, color: T.sub, cursor: "pointer" }}
                  >
                    Clear
                  </button>
                )}
                <button
                  id="marketplace-search-btn"
                  onClick={handleSearch}
                  disabled={!query.trim()}
                  style={{
                    background: query.trim() ? `linear-gradient(135deg, ${T.purple}, ${T.purpleDark})` : T.line,
                    color: query.trim() ? "#fff" : T.sub,
                    border: "none", borderRadius: 10, padding: "9px 20px",
                    fontWeight: 700, fontSize: 13.5, cursor: query.trim() ? "pointer" : "default",
                    transition: "background .2s ease",
                  }}
                >
                  ✦ AI Search
                </button>
              </div>
            </div>
          </div>

          {/* Example chips */}
          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 11.5, opacity: 0.7, alignSelf: "center" }}>Try:</span>
            {EXAMPLES.slice(0, 4).map(ex => (
              <button
                key={ex}
                onClick={() => handleExample(ex)}
                style={{
                  background: "rgba(255,255,255,.12)", color: "#fff",
                  border: "1px solid rgba(255,255,255,.2)", borderRadius: 999,
                  padding: "5px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  transition: "background .15s ease",
                  maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.22)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.12)"}
                title={ex}
              >
                {ex.length > 48 ? ex.slice(0, 48) + "…" : ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Parse Result Banner ── */}
      {hasQuery && signals && (
        <div style={{ marginTop: 14, background: T.purpleSoft, border: `1px solid ${T.purple}33`, borderRadius: 12, padding: "10px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.purple }}>✦ AI understood:</span>
          {signals.matchedTypes.length > 0 && <Pill bg={T.purple} color="#fff">{signals.matchedTypes.join(", ")}</Pill>}
          {signals.district && <Pill bg={T.mint} color={T.green}>📍 {signals.district.replace(/\b\w/g, c => c.toUpperCase())}</Pill>}
          {signals.maxPrice && <Pill bg={T.goldSoft} color="#8A6D0B">≤ {fmtN(signals.maxPrice, cur)}</Pill>}
          {signals.quantity && <Pill bg={T.purpleSoft} color={T.purple} border={T.purple}>{signals.quantity} plots</Pill>}
          {signals.purposes.length > 0 && <Pill bg={T.tealSoft} color={T.teal}>{signals.purposes[0]}</Pill>}
          <span style={{ fontSize: 12, color: T.sub }}>— {results.length} listing{results.length !== 1 ? "s" : ""} ranked by relevance</span>
        </div>
      )}

      {/* ── Category filter chips ── */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>Browse:</span>
        {[
          { id: "all", label: "🔍 All Categories", color: T.ink },
          { id: "residential", label: "🏠 Residential", color: T.green },
          { id: "commercial", label: "🏢 Commercial", color: T.teal },
          { id: "land", label: "🌍 Land & Estates", color: T.purple },
        ].map(({ id, label, color }) => {
          const active = groupFilter === id;
          return (
            <button
              key={id}
              onClick={() => setGroupFilter(id)}
              style={{
                border: active ? "none" : `1.5px solid ${T.line}`,
                background: active ? color : T.card,
                color: active ? "#fff" : T.sub,
                borderRadius: 999, padding: "7px 16px",
                fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                transition: "all .18s ease",
              }}
            >
              {label}
            </button>
          );
        })}
        <span style={{ fontSize: 12, color: T.sub, marginLeft: "auto" }}>
          {results.length} listing{results.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginTop: 14 }}>
        {[
          { label: "Property Types", value: "12" },
          { label: "Abuja Districts", value: "12+" },
          { label: "Verified Listings", value: LISTINGS.filter(l => l.verified).length + "" },
          { label: "AI-Matched Today", value: "347" },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 22, color: T.purple }}>{value}</div>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Results grid ── */}
      {results.length > 0 ? (
        <>
          {/* Group them by type category when no query */}
          {!hasQuery ? (
            ["residential", "commercial", "land"].map(group => {
              const groupListings = results.filter(l => TYPE_META[l.type]?.group === group);
              if (groupFilter !== "all" && groupFilter !== group) return null;
              if (groupListings.length === 0) return null;
              return (
                <div key={group} style={{ marginTop: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ height: 2, width: 28, background: group === "residential" ? T.green : group === "commercial" ? T.teal : T.purple, borderRadius: 2 }} />
                    <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 17, color: T.ink }}>
                      {GROUP_LABELS[group]}
                    </div>
                    <div style={{ height: 1, flex: 1, background: T.line }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
                    {groupListings.map(l => (
                      <ListingCard key={l.id} listing={l} cur={cur} onOpen={setModal} showScore={false} />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 10 }}>
                Results ranked by AI relevance score — highest match first
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
                {results.filter(l => l._score == null || l._score >= 20).map(l => (
                  <ListingCard key={l.id} listing={l} cur={cur} onOpen={setModal} showScore={true} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ background: T.card, border: `1px dashed ${T.line}`, borderRadius: 14, padding: 32, textAlign: "center", color: T.sub, fontSize: 14, marginTop: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ fontWeight: 700, color: T.ink, marginBottom: 6 }}>No matching listings found</div>
          <div>Try broadening your search — remove the price limit or try a different district.</div>
          <button
            onClick={() => { setQuery(""); setSubmitted(""); setGroupFilter("all"); }}
            style={{ marginTop: 14, background: T.purple, color: "#fff", border: "none", borderRadius: 10, padding: "9px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Show all listings
          </button>
        </div>
      )}

      {/* ── List your property CTA ── */}
      <div style={{
        marginTop: 40,
        background: `linear-gradient(135deg, ${T.ink}, #0A3420)`,
        borderRadius: 20, padding: "36px 32px",
        position: "relative", overflow: "hidden",
        boxShadow: "0 10px 32px rgba(12,43,31,0.15)",
      }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(107,63,160,.12)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.gold, marginBottom: 10 }}>Are You Selling?</div>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: "clamp(18px,3vw,26px)", color: "#fff", lineHeight: 1.2, marginBottom: 8, maxWidth: 480 }}>
              List any property type and reach AI-matched buyers directly.
            </div>
            <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.75)", margin: 0, maxWidth: 440, lineHeight: 1.5 }}>
              The AI verifies your listing, generates the marketing description, and matches it to buyers searching on WhatsApp and this platform — all automatically.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={onWhatsAppOpen}
              style={{ background: "#1FAF55", color: "#fff", border: "none", borderRadius: 12, padding: "13px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}
            >
              💬 List via WhatsApp
            </button>
            <button
              style={{ background: "rgba(255,255,255,.1)", color: "#fff", border: "1.5px solid rgba(255,255,255,.2)", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              📋 Submit listing form
            </button>
          </div>
        </div>
      </div>

      {/* Listing modal */}
      <ListingModal listing={modal} cur={cur} onClose={() => setModal(null)} onWhatsApp={handleWhatsApp} />
    </div>
  );
}
