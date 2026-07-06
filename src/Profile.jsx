import React, { useState, useEffect } from "react";
import { auth } from "./lib/firebase";

const T = {
  ink:      "#0C2B1F",
  green:    "#0E5A3A",
  greenDark:"#0A422B",
  mint:     "#E7F2EC",
  gold:     "#C9A227",
  goldSoft: "#F6EFD8",
  amber:    "#B4540A",
  amberSoft:"#FBEEDF",
  paper:    "#F5F6F2",
  card:     "#FFFFFF",
  line:     "#E2E5DF",
  sub:      "#5B6A61",
  risk:     "#B3261E",
  riskSoft: "#FBEAE8",
  teal:     "#0E6B75",
  tealSoft: "#E3F0F2",
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

export default function Profile({ user, cur, onSignInRequest, onListingsChange, dealsList, onToast, onRegisterDistressProperty }) {
  const [profileTab, setProfileTab] = useState("buyer"); // "buyer" | "seller"
  const [kycVerified, setKycVerified] = useState(false);
  const [kycSimulating, setKycSimulating] = useState(false);

  // Buyer preferences state
  const [buyerPrefs, setBuyerPrefs] = useState({
    budget: 120_000_000,
    preferredDistricts: ["Jabi", "Guzape"],
    waAlerts: true,
  });

  // Seller form state for submitting a new distress listing
  const [sellerForm, setSellerForm] = useState({
    title: "",
    askingPrice: "",
    marketValue: "",
    district: "Jabi",
    urgencyReason: "",
    titleType: "C of O",
    agisNumber: "",
  });

  // Mock initial submitted listings state (stored in localstorage for persistence)
  const [submittedListings, setSubmittedListings] = useState(() => {
    try {
      const stored = localStorage.getItem("lp_submitted_listings");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: "sub-1",
        title: "3-Bedroom Townhouse, Life Camp axis",
        askingPrice: 85_000_000,
        marketValue: 110_000_000,
        district: "Life Camp",
        urgencyReason: "Seller relocating to Canada — urgent liquidation",
        titleType: "R of O",
        kycStatus: "Passed", // Owner ID match
        agisStatus: "Verified",
        inspectionStatus: "Passed",
        documentForensics: "Passed",
        status: "Published", // Active on marketplace
      },
      {
        id: "sub-2",
        title: "Plot 492, Gwarinpa Extension (900sqm)",
        askingPrice: 45_000_000,
        marketValue: 60_000_000,
        district: "Gwarinpa",
        urgencyReason: "Debt settlement deadline close",
        titleType: "Area Council",
        kycStatus: "Passed",
        agisStatus: "Under Review", // AGIS check in progress
        inspectionStatus: "Pending",
        documentForensics: "Under Review",
        status: "Verifying", // Not yet visible on marketplace
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem("lp_submitted_listings", JSON.stringify(submittedListings));
  }, [submittedListings]);

  // Check custom claim for KYC
  useEffect(() => {
    if (!user) {
      setKycVerified(false);
      return;
    }
    // Check if custom claims exists
    user.getIdTokenResult().then((tokenResult) => {
      if (tokenResult.claims.kycVerified) {
        setKycVerified(true);
      } else {
        // Fallback to localstorage mocking for emulator/dev testing purposes
        const mockKyc = localStorage.getItem(`lp_kyc_${user.uid}`) === "true";
        setKycVerified(mockKyc);
      }
    }).catch(err => {
      console.error("Error reading token claims:", err);
    });
  }, [user]);

  // Simulate verification call
  const handleSimulateKyc = async () => {
    if (!user) return;
    setKycSimulating(true);
    // Real flow would call an HTTP cloud function or custom token endpoint
    setTimeout(() => {
      localStorage.setItem(`lp_kyc_${user.uid}`, "true");
      setKycVerified(true);
      setKycSimulating(false);
      if (onToast) onToast("NIN & BVN matching succeeded! Custom KYC Claim added to token.");
    }, 1500);
  };

  // Handle buyer preferences changes
  const handleBudgetChange = (e) => {
    setBuyerPrefs(prev => ({ ...prev, budget: Number(e.target.value) }));
  };

  const handleDistrictToggle = (dist) => {
    setBuyerPrefs(prev => {
      const districts = prev.preferredDistricts.includes(dist)
        ? prev.preferredDistricts.filter(d => d !== dist)
        : [...prev.preferredDistricts, dist];
      return { ...prev, preferredDistricts: districts };
    });
  };

  // Submit a new listing as a distressed seller
  const handleSellerSubmit = (e) => {
    e.preventDefault();
    if (!sellerForm.title || !sellerForm.askingPrice || !sellerForm.marketValue) {
      if (onToast) onToast("Please fill in all required fields.");
      return;
    }

    const newListing = {
      id: "sub-" + Date.now(),
      title: sellerForm.title,
      askingPrice: Number(sellerForm.askingPrice),
      marketValue: Number(sellerForm.marketValue),
      district: sellerForm.district,
      urgencyReason: sellerForm.urgencyReason || "Unspecified urgency sale",
      titleType: sellerForm.titleType,
      kycStatus: "Passed", // Since the logged-in seller is verified
      agisStatus: "Under Review",
      inspectionStatus: "Pending",
      documentForensics: "Under Review",
      status: "Verifying",
    };

    setSubmittedListings(prev => [newListing, ...prev]);

    // Also auto-add to local storage marketplace deals (pending publish or published)
    // To allow simulating, let's also push it to dealsList if requested
    if (onListingsChange) {
      const newDeal = {
        id: "deal-" + Date.now(),
        name: sellerForm.title,
        district: sellerForm.district,
        type: "Apartment",
        asking: Number(sellerForm.askingPrice),
        market: Number(sellerForm.marketValue),
        title: sellerForm.titleType,
        titleGrade: sellerForm.titleType === "C of O" ? "A" : "B",
        trust: 75,
        inspected: false,
        agis: "AGIS verification in progress",
        urgency: sellerForm.urgencyReason,
        days: 1,
        demolition: "none",
        flood: "none",
        negotiation: [Number(sellerForm.askingPrice) * 0.9, Number(sellerForm.askingPrice)],
        shortlet: null,
        yield: 12.5,
        verifiedBy: "AI Automated Ingest",
        status: "Verifying", // Wait for AGIS
      };
      onListingsChange([newDeal, ...dealsList]);
    }

    if (onRegisterDistressProperty) {
      onRegisterDistressProperty({
        title: sellerForm.title,
        askingPrice: Number(sellerForm.askingPrice),
        district: sellerForm.district,
        description: sellerForm.urgencyReason || "Unspecified urgency sale",
      });
    }

    // Reset form
    setSellerForm({
      title: "",
      askingPrice: "",
      marketValue: "",
      district: "Jabi",
      urgencyReason: "",
      titleType: "C of O",
      agisNumber: "",
    });

    if (onToast) onToast("Distress listing submitted! Legal & AGIS verification started.");
  };

  const fmtCurrency = (n) => {
    if (cur === "USD") {
      const rate = 1550;
      return "$" + Math.round(n / rate).toLocaleString();
    }
    return "₦" + n.toLocaleString();
  };

  // Active simulated buyer escrows
  const activeEscrows = [
    {
      id: "esc-1",
      property: "3-Bedroom Apartment, Jabi Lake axis",
      price: 95_000_000,
      stage: 2, // AGIS search
      status: "In Progress",
      milestones: ["Offer accepted", "AGIS Search & Deed Verification", "Documents Execution", "Possession / Fund Release"],
    }
  ];

  return (
    <div style={{ animation: "slideup .3s ease" }}>
      {/* Upper profile header card */}
      <div style={{
        background: `linear-gradient(135deg, ${T.ink}, ${T.green})`,
        borderRadius: 20,
        padding: "28px 24px",
        color: "#fff",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        marginBottom: 20
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: T.gold, color: T.ink,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 24,
            boxShadow: "0 4px 15px rgba(201,162,39,.35)",
            overflow: "hidden"
          }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              (user?.displayName || user?.email || "User")[0].toUpperCase()
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>WELCOME BACK</div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24, margin: 0 }}>
              {user?.displayName || user?.email?.split("@")[0] || "Abuja Client"}
            </h1>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
              Account ID: {user?.uid ? `${user.uid.slice(0, 8)}...` : "Anonymous"}
            </div>
          </div>
        </div>

        {/* KYC Verification Claim Status */}
        <div style={{
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: 14,
          padding: "12px 18px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          minWidth: 260
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 700 }}>KYC VERIFICATION STATUS</span>
            {kycVerified ? (
              <Pill bg={T.mint} color={T.green}>✓ Verified</Pill>
            ) : (
              <Pill bg={T.riskSoft} color={T.risk}>Pending</Pill>
            )}
          </div>

          {kycVerified ? (
            <p style={{ fontSize: 12, margin: 0, opacity: 0.8, lineHeight: 1.4 }}>
              Your NIN and BVN records match. Secure search & Escrow capabilities are active.
            </p>
          ) : (
            <div>
              <p style={{ fontSize: 12, margin: "0 0 10px 0", opacity: 0.8, lineHeight: 1.4 }}>
                Unverified accounts cannot perform AI search or place escrow offers.
              </p>
              <button
                onClick={handleSimulateKyc}
                disabled={kycSimulating}
                style={{
                  width: "100%",
                  border: "none",
                  background: T.gold,
                  color: T.ink,
                  fontWeight: 700,
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: kycSimulating ? "not-allowed" : "pointer",
                }}
              >
                {kycSimulating ? "Verifying with AGIS & Identity server..." : "⚡ Complete 2-Min KYC Verification"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Console Layout */}
      {!user ? (
        <div style={{
          background: T.card,
          border: `1px solid ${T.line}`,
          borderRadius: 16,
          padding: "40px 24px",
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(12,43,31,.06)"
        }}>
          <h2 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, color: T.ink }}>Please Sign In to Access Your Profile</h2>
          <p style={{ color: T.sub, fontSize: 14, maxWidth: 440, margin: "10px auto 20px" }}>
            Sign in to check your verification progress, manage distress listings, and update buyer criteria.
          </p>
          <button
            onClick={onSignInRequest}
            style={{
              background: T.green,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 24px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Authenticate Account
          </button>
        </div>
      ) : (
        <div>
          {/* Inner tab switcher */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              onClick={() => setProfileTab("buyer")}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14.5,
                background: profileTab === "buyer" ? T.green : T.card,
                color: profileTab === "buyer" ? "#fff" : T.sub,
                boxShadow: "0 1px 3px rgba(12,43,31,.06)",
                border: profileTab === "buyer" ? "none" : `1px solid ${T.line}`
              }}
            >
              💼 Buyer Hub & Alerts
            </button>
            <button
              onClick={() => setProfileTab("seller")}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14.5,
                background: profileTab === "seller" ? T.teal : T.card,
                color: profileTab === "seller" ? "#fff" : T.sub,
                boxShadow: "0 1px 3px rgba(12,43,31,.06)",
                border: profileTab === "seller" ? "none" : `1px solid ${T.line}`
              }}
            >
              🏷 Sell Distress Property
            </button>
          </div>

          {/* Tab contents */}
          {profileTab === "buyer" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              {/* Buyer preferences */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                <SectionLabel>AI Buyer Preferences</SectionLabel>
                <p style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>
                  Update your deal criteria. The Landlord AI matches distress sales to these requirements automatically.
                </p>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    <span>Max Purchase Budget</span>
                    <span style={{ color: T.green, fontWeight: 700 }}>{fmtCurrency(buyerPrefs.budget)}</span>
                  </div>
                  <input
                    type="range"
                    min={20_000_000}
                    max={500_000_000}
                    step={5_000_000}
                    value={buyerPrefs.budget}
                    onChange={handleBudgetChange}
                    style={{ width: "100%", accentColor: T.green }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.sub, marginTop: 4 }}>
                    <span>₦20m</span>
                    <span>₦500m+</span>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Target Abuja Districts</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {["Jabi", "Guzape", "Wuse 2", "Maitama", "Lugbe", "Life Camp"].map((dist) => {
                      const selected = buyerPrefs.preferredDistricts.includes(dist);
                      return (
                        <button
                          key={dist}
                          onClick={() => handleDistrictToggle(dist)}
                          style={{
                            border: `1.5px solid ${selected ? T.green : T.line}`,
                            background: selected ? T.mint : "transparent",
                            color: selected ? T.green : T.sub,
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          {dist}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>WhatsApp Alert Dispatch</div>
                    <div style={{ fontSize: 11, color: T.sub }}>Notify me instantly when deals pass verification</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={buyerPrefs.waAlerts}
                    onChange={(e) => setBuyerPrefs(prev => ({ ...prev, waAlerts: e.target.checked }))}
                    style={{ width: 20, height: 20, accentColor: T.green, cursor: "pointer" }}
                  />
                </div>
              </div>

              {/* Escrow tracking */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                <SectionLabel color={T.green}>Active Escrow Transactions</SectionLabel>
                {activeEscrows.map((esc) => (
                  <div key={esc.id} style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 16, background: T.paper }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>ESCROW ID: {esc.id}</span>
                      <Pill bg={T.tealSoft} color={T.teal}>{esc.status}</Pill>
                    </div>
                    <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 16, color: T.ink }}>
                      {esc.property}
                    </div>
                    <div style={{ fontSize: 18, fontFamily: "'Bricolage Grotesque'", fontWeight: 800, color: T.green, margin: "4px 0 16px" }}>
                      {fmtCurrency(esc.price)}
                    </div>

                    {/* Progress tracking */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, color: T.sub, marginBottom: 8 }}>
                        <span>Verification Phase</span>
                        <span>Stage {esc.stage} of 4</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, height: 6, background: T.line, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                        {esc.milestones.map((_, i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              background: i < esc.stage ? T.green : "transparent"
                            }}
                          />
                        ))}
                      </div>
                      <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12.5, color: T.ink, display: "flex", flexDirection: "column", gap: 6 }}>
                        {esc.milestones.map((m, i) => (
                          <li
                            key={i}
                            style={{
                              color: i < esc.stage ? T.green : i === esc.stage ? T.ink : T.sub,
                              fontWeight: i === esc.stage ? 700 : 500,
                              listStyleType: i < esc.stage ? "'✓ '" : "'○ '"
                            }}
                          >
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              {/* Distress Listing Submission Form */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                <SectionLabel color={T.teal}>Ingest New Distress Listing</SectionLabel>
                <p style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>
                  Sellers: Input property details to trigger automated legal forensics, AGIS registration verification, and field inspector dispatch.
                </p>

                <form onSubmit={handleSellerSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Property Title / Headline *</label>
                    <input
                      type="text"
                      placeholder="e.g. 4-Bedroom Terrace Duplex, Guzape Hill"
                      value={sellerForm.title}
                      onChange={e => setSellerForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                      style={{ width: "100%", padding: "10px", border: `1px solid ${T.line}`, borderRadius: 8 }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Asking Price (₦) *</label>
                      <input
                        type="number"
                        placeholder="180000000"
                        value={sellerForm.askingPrice}
                        onChange={e => setSellerForm(prev => ({ ...prev, askingPrice: e.target.value }))}
                        required
                        style={{ width: "100%", padding: "10px", border: `1px solid ${T.line}`, borderRadius: 8 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Market Value (₦) *</label>
                      <input
                        type="number"
                        placeholder="220000000"
                        value={sellerForm.marketValue}
                        onChange={e => setSellerForm(prev => ({ ...prev, marketValue: e.target.value }))}
                        required
                        style={{ width: "100%", padding: "10px", border: `1px solid ${T.line}`, borderRadius: 8 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>District *</label>
                      <select
                        value={sellerForm.district}
                        onChange={e => setSellerForm(prev => ({ ...prev, district: e.target.value }))}
                        style={{ width: "100%", padding: "10px", border: `1px solid ${T.line}`, borderRadius: 8 }}
                      >
                        {["Jabi", "Guzape", "Wuse 2", "Maitama", "Lugbe", "Life Camp", "Gwarinpa", "Katampe Ext."].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Document Title Type *</label>
                      <select
                        value={sellerForm.titleType}
                        onChange={e => setSellerForm(prev => ({ ...prev, titleType: e.target.value }))}
                        style={{ width: "100%", padding: "10px", border: `1px solid ${T.line}`, borderRadius: 8 }}
                      >
                        <option value="C of O">C of O (Certificate of Occupancy)</option>
                        <option value="R of O">R of O (Right of Occupancy)</option>
                        <option value="Area Council">Area Council Papers</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>AGIS File Reference Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. FCDA/AGIS/PL/9382"
                      value={sellerForm.agisNumber}
                      onChange={e => setSellerForm(prev => ({ ...prev, agisNumber: e.target.value }))}
                      style={{ width: "100%", padding: "10px", border: `1px solid ${T.line}`, borderRadius: 8 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Urgency Reason / Context *</label>
                    <textarea
                      placeholder="Explain why this is priced below market (e.g. Owner relocating abroad within 3 weeks)"
                      value={sellerForm.urgencyReason}
                      onChange={e => setSellerForm(prev => ({ ...prev, urgencyReason: e.target.value }))}
                      required
                      style={{ width: "100%", height: 60, padding: "10px", border: `1px solid ${T.line}`, borderRadius: 8, resize: "none" }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: T.teal,
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      marginTop: 8
                    }}
                  >
                    🚀 Register Distress Sale listing
                  </button>
                </form>
              </div>

              {/* Submitted Listing Status tracker */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                <SectionLabel color={T.teal}>Your Submitted Properties & Verification</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {submittedListings.map((list) => {
                    const pctDiff = Math.round(((list.marketValue - list.askingPrice) / list.marketValue) * 100);
                    return (
                      <div key={list.id} style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, background: T.paper }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 15, color: T.ink }}>{list.title}</div>
                            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{list.district} · {list.titleType}</div>
                          </div>
                          <Pill
                            bg={list.status === "Published" ? T.mint : T.goldSoft}
                            color={list.status === "Published" ? T.green : "#7A5800"}
                          >
                            {list.status}
                          </Pill>
                        </div>

                        <div style={{ display: "flex", gap: 12, alignItems: "baseline", margin: "10px 0" }}>
                          <span style={{ fontSize: 16, fontFamily: "'Bricolage Grotesque'", fontWeight: 800, color: T.ink }}>
                            {fmtCurrency(list.askingPrice)}
                          </span>
                          <span style={{ fontSize: 11, color: T.sub, textDecoration: "line-through" }}>
                            {fmtCurrency(list.marketValue)}
                          </span>
                          <span style={{ fontSize: 11, color: T.amber, fontWeight: 700 }}>-{pctDiff}%</span>
                        </div>

                        {/* Checklist steps */}
                        <div style={{
                          borderTop: `1px solid ${T.line}`,
                          paddingTop: 10,
                          marginTop: 10,
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px 12px"
                        }}>
                          {[
                            ["Identity Check", list.kycStatus],
                            ["AGIS Verification", list.agisStatus],
                            ["Field Inspection", list.inspectionStatus],
                            ["Deed Forensic Check", list.documentForensics]
                          ].map(([label, status]) => (
                            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                              <span style={{
                                color: status === "Passed" || status === "Verified" ? T.green : status === "Pending" ? T.sub : T.amber
                              }}>
                                {status === "Passed" || status === "Verified" ? "✓" : status === "Pending" ? "○" : "◷"}
                              </span>
                              <span style={{ color: T.ink, fontWeight: 500 }}>{label}:</span>
                              <span style={{
                                color: status === "Passed" || status === "Verified" ? T.green : status === "Pending" ? T.sub : T.amber,
                                fontWeight: 600
                              }}>{status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
