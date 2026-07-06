import React, { useState, useEffect, useMemo, useRef } from "react";
import { db } from "./lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";

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

const ABUJA_DISTRICTS = ["Jabi", "Guzape", "Wuse 2", "Maitama", "Lugbe", "Life Camp", "Gwarinpa", "Katampe Ext.", "Kubwa"];

const TrustRing = ({ score, size = 44 }) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const col = score >= 85 ? T.green : score >= 70 ? T.gold : T.amber;
  return (
    <div style={{ flexShrink: 0, position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E5DF" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 700,
        fontSize: size * 0.28,
        color: T.ink
      }}>
        {score}
      </div>
    </div>
  );
};

const fmtN = (n, cur) => {
  if (cur === "USD") return "$" + Math.round(n / 1550).toLocaleString();
  if (n >= 1_000_000) return "₦" + (n / 1_000_000).toFixed(1) + "m";
  return "₦" + n.toLocaleString();
};

const getPhoto = (deal) => {
  const pType = (deal.type || "").toLowerCase();
  if (pType.includes("land")) return "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80";
  if (pType.includes("terrace")) return "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80";
  if (pType.includes("detached")) return "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80";
  return "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80";
};

const Pill = ({ children, bg, color, border }) => (
  <span
    style={{
      background: bg,
      color,
      border: border ? `1px solid ${border}` : "none",
      borderRadius: 999,
      padding: "3px 9px",
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    }}
  >
    {children}
  </span>
);

export default function Listings({ dealsList, cur, onOpen, user }) {
  const [searchText, setSearchText] = useState("");
  const [districtFilter, setDistrictFilter] = useState([]);
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("discount");
  const [trustMin, setTrustMin] = useState(0);
  const [firestoreProps, setFirestoreProps] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showMap, setShowMap] = useState(false);

  // Firestore sync for distress submissions
  useEffect(() => {
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.title || "Distress Deal Submission",
          district: data.district || "Abuja",
          type: data.type || "Apartment",
          asking: data.askingPrice || 0,
          market: data.marketValue || data.askingPrice * 1.25 || 0,
          title: data.titleType || "C of O",
          titleGrade: data.titleType === "C of O" ? "A" : "B",
          trust: data.trust || 80,
          inspected: data.inspected || false,
          agis: data.agisNumber || "Registered",
          urgency: data.description || "Relocation liquidating asset",
          days: 1,
          demolition: "none",
          flood: "none",
          verifiedBy: "AI Ingestion Search",
          status: "Published",
          _source: "firestore",
          _new: true,
          ...data
        });
      });
      setFirestoreProps(list);
    }, (err) => {
      console.warn("[Listings] Firestore properties error:", err.message);
    });
    return unsubscribe;
  }, []);

  // Merge and Filter properties
  const allListings = useMemo(() => {
    // Merge local deals with Firestore submitted deals
    const merged = [
      ...dealsList.filter(d => !d.status || d.status === "Published"),
      ...firestoreProps
    ];

    // Filter logic
    return merged.filter(d => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchText.toLowerCase()) ||
        d.district.toLowerCase().includes(searchText.toLowerCase()) ||
        (d.type || "").toLowerCase().includes(searchText.toLowerCase());

      const matchesDistrict = districtFilter.length === 0 || districtFilter.includes(d.district);
      const matchesType = typeFilter === "All" || d.type === typeFilter;
      const matchesTrust = (d.trust || 0) >= trustMin;

      return matchesSearch && matchesDistrict && matchesType && matchesTrust;
    }).sort((a, b) => {
      if (sortBy === "discount") {
        const discA = a.market ? ((a.market - a.asking) / a.market) : 0;
        const discB = b.market ? ((b.market - b.asking) / b.market) : 0;
        return discB - discA;
      }
      if (sortBy === "price_asc") return a.asking - b.asking;
      if (sortBy === "price_desc") return b.asking - a.asking;
      if (sortBy === "trust") return (b.trust || 0) - (a.trust || 0);
      if (sortBy === "newest") return (b.days || 99) - (a.days || 99); // smaller days value is newer
      return 0;
    });
  }, [dealsList, firestoreProps, searchText, districtFilter, typeFilter, trustMin, sortBy]);

  // Compute District Heat Map counts
  const districtCounts = useMemo(() => {
    const counts = {};
    allListings.forEach(d => {
      counts[d.district] = (counts[d.district] || 0) + 1;
    });
    return counts;
  }, [allListings]);

  const toggleDistrict = (dist) => {
    setDistrictFilter(prev =>
      prev.includes(dist) ? prev.filter(d => d !== dist) : [...prev, dist]
    );
  };

  const clearFilters = () => {
    setSearchText("");
    setDistrictFilter([]);
    setTypeFilter("All");
    setTrustMin(0);
    setSortBy("discount");
  };

  // SVG-based District Map coordinate positions (Abuja layout simulation)
  const mapPositions = {
    "Maitama": { x: "55%", y: "20%" },
    "Wuse 2": { x: "42%", y: "30%" },
    "Jabi": { x: "25%", y: "40%" },
    "Guzape": { x: "72%", y: "55%" },
    "Katampe Ext.": { x: "50%", y: "10%" },
    "Life Camp": { x: "15%", y: "35%" },
    "Lugbe": { x: "15%", y: "78%" },
    "Gwarinpa": { x: "32%", y: "20%" },
    "Kubwa": { x: "15%", y: "10%" }
  };

  return (
    <div style={{ animation: "slideup .3s ease", position: "relative" }}>
      {/* ── Hero Banner Strip ── */}
      <div style={{
        background: `linear-gradient(135deg, ${T.ink} 0%, #0A422B 65%, ${T.green} 100%)`,
        borderRadius: 20,
        padding: "32px 24px",
        color: "#fff",
        marginBottom: 20,
        boxShadow: "0 8px 30px rgba(12, 43, 31, 0.12)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", right: -50, top: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(201,162,39,.08)" }} />
        <div style={{ position: "absolute", left: -40, bottom: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(14,107,117,.12)" }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 32, margin: "0 0 8px" }}>
            🏡 Property Directory
          </h1>
          <p style={{ fontSize: 14.5, opacity: 0.85, maxWidth: 600, lineHeight: 1.5 }}>
            Verify legal land indices, trace title ownership chains, and lock exclusive discounts on Abuja distress deals.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <Pill bg="rgba(255,255,255,0.15)" color="#fff">{allListings.length} Total Verified</Pill>
            <Pill bg={T.goldSoft} color={T.ink}>✨ {firestoreProps.length} User Submissions</Pill>
          </div>
        </div>
      </div>

      {/* ── Filter Bar Card ── */}
      <div style={{
        background: T.card,
        border: `1px solid ${T.line}`,
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 4px 20px rgba(12,43,31,0.04)",
        marginBottom: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14
      }}>
        {/* Row 1: Search Input */}
        <div style={{ position: "relative", display: "flex", gap: 10 }}>
          <input
            type="text"
            placeholder="🔍 Search address, description, target district, or title grade..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              flex: 1,
              padding: "11px 16px",
              fontSize: 14,
              border: `1.5px solid ${T.line}`,
              borderRadius: 10,
              outline: "none",
              fontFamily: "'Instrument Sans', sans-serif"
            }}
            onFocus={(e) => (e.target.style.borderColor = T.green)}
            onBlur={(e) => (e.target.style.borderColor = T.line)}
          />
          { (searchText || districtFilter.length > 0 || typeFilter !== "All" || trustMin > 0) && (
            <button
              onClick={clearFilters}
              style={{
                background: T.riskSoft,
                color: T.risk,
                border: "none",
                borderRadius: 10,
                padding: "0 16px",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Row 2: District Filter Chips */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: T.sub, marginBottom: 8 }}>
            Abuja District Heat Map Filter
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ABUJA_DISTRICTS.map(dist => {
              const active = districtFilter.includes(dist);
              const count = districtCounts[dist] || 0;
              return (
                <button
                  key={dist}
                  onClick={() => toggleDistrict(dist)}
                  style={{
                    border: `1.5px solid ${active ? T.green : T.line}`,
                    background: active ? T.mint : "transparent",
                    color: active ? T.green : T.ink,
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease"
                  }}
                >
                  <span>{dist}</span>
                  {count > 0 && (
                    <span style={{
                      background: active ? T.green : T.line,
                      color: active ? "#fff" : T.sub,
                      borderRadius: 10,
                      padding: "1px 5px",
                      fontSize: 10,
                      fontWeight: 700
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Grid Control bar */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          borderTop: `1px solid ${T.line}`,
          paddingTop: 12
        }}>
          {/* Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.sub }}>Property:</span>
            <div style={{ display: "flex", gap: 4 }}>
              {["All", "Apartment", "Terrace", "Detached", "Land"].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    border: "none",
                    background: typeFilter === t ? T.ink : T.paper,
                    color: typeFilter === t ? "#fff" : T.sub,
                    padding: "5px 11px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Trust Score filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.sub }}>Min Trust:</span>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={trustMin}
              onChange={(e) => setTrustMin(Number(e.target.value))}
              style={{ width: 100, accentColor: T.green }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, minWidth: 24 }}>{trustMin}+</span>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.sub }}>Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1.5px solid ${T.line}`,
                fontSize: 12.5,
                fontWeight: 600,
                outline: "none",
                background: "#fff",
                color: T.ink
              }}
            >
              <option value="discount">⚡ Discount (Highest)</option>
              <option value="price_asc">₦ Price (Low to High)</option>
              <option value="price_desc">₦ Price (High to Low)</option>
              <option value="trust">🛡️ Trust Score</option>
              <option value="newest">⏱️ Newest Listings</option>
            </select>
          </div>

          {/* Map toggle */}
          <button
            onClick={() => setShowMap(!showMap)}
            style={{
              border: `1.5px solid ${showMap ? T.teal : T.line}`,
              background: showMap ? T.tealSoft : "#fff",
              color: showMap ? T.teal : T.sub,
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            🗺️ {showMap ? "Hide Map View" : "Show Map View"}
          </button>
        </div>
      </div>

      {/* ── Simple CSS/SVG Map view ── */}
      {showMap && (
        <div style={{
          background: T.card,
          border: `1px solid ${T.line}`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          boxShadow: "0 4px 15px rgba(12,43,31,0.03)",
          position: "relative"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.4, color: T.green }}>
              Abuja District Heat Map
            </div>
            <div style={{ fontSize: 11.5, color: T.sub }}>Click any district circle to filter listings</div>
          </div>

          {/* Map canvas */}
          <div style={{
            height: 280,
            background: "#EFF2EE",
            borderRadius: 12,
            position: "relative",
            overflow: "hidden",
            border: `1px solid ${T.line}`
          }}>
            {/* Grid lines background */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <defs>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(12,43,31,0.03)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Render absolute map tags */}
            {Object.entries(mapPositions).map(([district, pos]) => {
              const count = districtCounts[district] || 0;
              const hasMatches = count > 0;
              const isSelected = districtFilter.includes(district);

              return (
                <button
                  key={district}
                  onClick={() => toggleDistrict(district)}
                  style={{
                    position: "absolute",
                    left: pos.x,
                    top: pos.y,
                    transform: "translate(-50%, -50%)",
                    border: "none",
                    background: isSelected ? T.ink : hasMatches ? T.green : "#A9B3AD",
                    color: "#fff",
                    borderRadius: 99,
                    padding: "6px 14px",
                    cursor: "pointer",
                    boxShadow: isSelected
                      ? "0 0 0 4px rgba(12,43,31,0.18), 0 4px 10px rgba(0,0,0,0.12)"
                      : hasMatches
                        ? "0 2px 8px rgba(14,90,58,0.25)"
                        : "none",
                    fontWeight: 700,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                    zIndex: isSelected ? 10 : 1
                  }}
                >
                  <span>{district}</span>
                  <span style={{
                    background: "rgba(255, 255, 255, 0.22)",
                    borderRadius: "50%",
                    width: 18,
                    height: 18,
                    fontSize: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Listings Grid ── */}
      {allListings.length === 0 ? (
        <div style={{
          background: T.card,
          border: `1px solid ${T.line}`,
          borderRadius: 16,
          padding: "60px 20px",
          textAlign: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
        }}>
          <span style={{ fontSize: 48 }}>🔍</span>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 20, color: T.ink, marginTop: 16 }}>
            No Matching Properties Found
          </h2>
          <p style={{ color: T.sub, fontSize: 14, marginTop: 6, maxWidth: 360, margin: "6px auto 18px" }}>
            We couldn't find any properties matching your current filters. Try resetting the criteria or exploring nearby districts.
          </p>
          <button
            onClick={clearFilters}
            style={{
              background: T.green,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13
            }}
          >
            Reset Filters & Search
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
          gap: 20
        }}>
          {allListings.map(deal => {
            const disc = deal.market ? Math.round(((deal.market - deal.asking) / deal.market) * 100) : 0;
            const photo = getPhoto(deal);

            return (
              <div
                key={deal.id}
                onClick={() => setSelectedDeal(deal)}
                style={{
                  background: T.card,
                  border: `1px solid ${T.line}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 1px 3px rgba(12,43,31,.04)",
                  cursor: "pointer",
                  transition: "transform .2s ease, box-shadow .2s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(12,43,31,.1)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(12,43,31,.04)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Image */}
                <div style={{ position: "relative", height: 170, background: T.mint, overflow: "hidden" }}>
                  <img
                    src={photo}
                    alt={deal.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {/* Discount Badge */}
                  {disc > 0 && (
                    <div style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      background: T.amber,
                      color: "#fff",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 9px",
                      boxShadow: "0 2px 6px rgba(180,84,10,.3)",
                    }}>
                      −{disc}% below market
                    </div>
                  )}

                  {/* New Submission Badge */}
                  {deal._new && (
                    <div style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: T.gold,
                      color: T.ink,
                      borderRadius: 8,
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "4px 8px",
                      boxShadow: "0 2px 6px rgba(201,162,39,.3)",
                    }}>
                      ✨ User Ingested
                    </div>
                  )}

                  {/* Source indicator */}
                  {deal._source === "firestore" && (
                    <div style={{
                      position: "absolute",
                      bottom: 10,
                      left: 10,
                      background: "rgba(14,107,117,.8)",
                      backdropFilter: "blur(4px)",
                      color: "#fff",
                      borderRadius: 6,
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: "3px 8px",
                    }}>
                      Submitted
                    </div>
                  )}

                  {/* Trust overlay */}
                  <div style={{ position: "absolute", bottom: 10, right: 10 }}>
                    <TrustRing score={deal.trust || 80} size={38} />
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: 15, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 15.5, color: T.ink, lineHeight: 1.3 }}>
                      {deal.name}
                    </div>
                    <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>
                      {deal.district} · {deal.type} · Grade {deal.titleGrade} Title
                    </div>
                    <div style={{ fontSize: 11.5, color: T.amber, fontWeight: 600, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>⏱️</span>
                      <span style={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {deal.urgency}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    {/* Prices */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 19, color: T.ink }}>
                        {fmtN(deal.asking, cur)}
                      </span>
                      {deal.market > deal.asking && (
                        <span style={{ fontSize: 12, color: T.sub, textDecoration: "line-through" }}>
                          {fmtN(deal.market, cur)}
                        </span>
                      )}
                    </div>

                    {/* Footer pills */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
                      <Pill bg={deal.inspected ? T.mint : T.paper} color={deal.inspected ? T.green : T.sub}>
                        {deal.inspected ? "✓ Inspected" : "Pending Field Check"}
                      </Pill>
                      {deal.titleGrade === "A" && <Pill bg={T.tealSoft} color={T.teal}>C of O Verified</Pill>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Slide-over Detail Drawer ── */}
      {selectedDeal && (
        <>
          {/* Overlay mask */}
          <div
            onClick={() => setSelectedDeal(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(12,43,31,0.4)",
              zIndex: 100,
              animation: "lp-fadein .2s ease"
            }}
          />

          {/* Drawer container */}
          <div style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(390px, 100vw)",
            background: "#ffffff",
            boxShadow: "-10px 0 40px rgba(12,43,31,0.18)",
            zIndex: 101,
            display: "flex",
            flexDirection: "column",
            animation: "lp-slidein .25s cubic-bezier(0.22, 1, 0.36, 1)"
          }}>
            {/* Header */}
            <div style={{
              background: T.ink,
              color: "#fff",
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, color: T.gold, textTransform: "uppercase" }}>
                  Legal & Escrow Index
                </div>
                <div style={{
                  fontFamily: "'Bricolage Grotesque'",
                  fontWeight: 800,
                  fontSize: 15,
                  maxWidth: 280,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginTop: 2
                }}>
                  {selectedDeal.name}
                </div>
              </div>
              <button
                onClick={() => setSelectedDeal(null)}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Image */}
              <div style={{ height: 180, background: T.mint, position: "relative" }}>
                <img
                  src={getPhoto(selectedDeal)}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ position: "absolute", bottom: 10, right: 10 }}>
                  <TrustRing score={selectedDeal.trust || 80} size={48} />
                </div>
              </div>

              {/* Contents */}
              <div style={{ padding: 20 }}>
                {/* Price block */}
                <div style={{ background: T.paper, padding: 14, borderRadius: 12, marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Asking Price</div>
                  <div style={{ fontSize: 24, fontFamily: "'Bricolage Grotesque'", fontWeight: 800, color: T.green, marginTop: 4 }}>
                    {fmtN(selectedDeal.asking, cur)}
                  </div>
                  {selectedDeal.market > selectedDeal.asking && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 12.5, color: T.sub, textDecoration: "line-through" }}>
                        Market: {fmtN(selectedDeal.market, cur)}
                      </span>
                      <Pill bg={T.amberSoft} color={T.amber}>
                        Save {Math.round(((selectedDeal.market - selectedDeal.asking) / selectedDeal.market) * 100)}%
                      </Pill>
                    </div>
                  )}
                </div>

                {/* Specifications List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>District Location</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginTop: 2 }}>{selectedDeal.district}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Title Deed & Grade</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{selectedDeal.title}</span>
                      <Pill bg={selectedDeal.titleGrade === "A" ? T.mint : T.goldSoft} color={selectedDeal.titleGrade === "A" ? T.green : T.ink}>
                        Grade {selectedDeal.titleGrade}
                      </Pill>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>AGIS Registry Search</div>
                    <div style={{ fontSize: 13, color: T.ink, marginTop: 2, background: T.paper, padding: "6px 10px", borderRadius: 8 }}>
                      🔍 {selectedDeal.agis}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Urgency Reason / Notes</div>
                    <div style={{ fontSize: 13, color: T.ink, marginTop: 2, lineHeight: 1.4 }}>
                      ⏱️ {selectedDeal.urgency}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase" }}>Legal Verification Office</div>
                    <div style={{ fontSize: 13.5, color: T.ink, marginTop: 2 }}>{selectedDeal.verifiedBy}</div>
                  </div>

                  {/* Shortlet Project details */}
                  {selectedDeal.shortlet && (
                    <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14, marginTop: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: "uppercase", marginBottom: 8 }}>
                        Projected Shortlet Income
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div style={{ background: T.tealSoft, padding: 10, borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: T.teal, fontWeight: 700 }}>Monthly Net</div>
                          <div style={{ fontSize: 15, fontFamily: "'Bricolage Grotesque'", fontWeight: 800, color: T.teal, marginTop: 2 }}>
                            {fmtN(selectedDeal.shortlet.monthlyNet, cur)}/mo
                          </div>
                        </div>
                        <div style={{ background: T.tealSoft, padding: 10, borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: T.teal, fontWeight: 700 }}>AI Rental Yield</div>
                          <div style={{ fontSize: 15, fontFamily: "'Bricolage Grotesque'", fontWeight: 800, color: T.teal, marginTop: 2 }}>
                            {selectedDeal.yield}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div style={{
              padding: "16px 20px",
              borderTop: `1px solid ${T.line}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: T.paper
            }}>
              <button
                onClick={() => {
                  setSelectedDeal(null);
                  onOpen(selectedDeal);
                }}
                style={{
                  background: T.green,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer"
                }}
              >
                📷 Inspect Legal Documents & Photos
              </button>
              <a
                href={`https://wa.me/2349098234823?text=Hi,%20I'm%20interested%20in%20inspecting%20the%20${encodeURIComponent(selectedDeal.name)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#1FAF55",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "11px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "center",
                  textDecoration: "none"
                }}
              >
                💬 Chat with Deal Concierge
              </a>
            </div>
          </div>
        </>
      )}

      {/* CSS Styles */}
      <style>{`
        @keyframes lp-slidein {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes lp-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
