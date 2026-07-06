import React, { useState, useEffect } from "react";
import { auth, db } from "./lib/firebase";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, onSnapshot, where, orderBy } from "firebase/firestore";

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

export default function Profile({
  user,
  cur,
  onSignInRequest,
  onListingsChange,
  dealsList = [],
  onToast,
  savedIds = new Set(),
  onToggleSave,
  onOpen,
  onRegisterDistressProperty
}) {
  const [profileTab, setProfileTab] = useState(() => {
    const mockKyc = typeof window !== "undefined" && localStorage.getItem(`lp_kyc_${user?.uid}`) === "true";
    return mockKyc ? "buyer" : "saved";
  });
  const [kycVerified, setKycVerified] = useState(false);
  const [kycSimulating, setKycSimulating] = useState(false);
  const [firestoreProps, setFirestoreProps] = useState([]);

  // Sync firestore properties to display them if saved
  useEffect(() => {
    const q = query(collection(db, "properties"));
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
      console.warn("[Profile] Firestore properties sync error:", err.message);
    });
    return unsubscribe;
  }, []);

  // Buyer preferences state
  const [buyerPrefs, setBuyerPrefs] = useState({
    budget: 120_000_000,
    preferredDistricts: ["Jabi", "Guzape"],
    waAlerts: true,
  });

  const [myOffers, setMyOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // Sync real-time offers submitted by this buyer
  useEffect(() => {
    if (!user) return;
    setLoadingOffers(true);
    const q = query(
      collection(db, "offers"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMyOffers(list);
      setLoadingOffers(false);
    }, (err) => {
      console.warn("[Profile] Offers sync error:", err.message);
      setLoadingOffers(false);
    });
    return unsubscribe;
  }, [user]);


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

  // Load profile and preferences from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.preferences) {
            setBuyerPrefs(data.preferences);
          }
          if (data.verified) {
            setKycVerified(true);
          }
        }
      } catch (err) {
        console.warn("Could not fetch user profile from Firestore:", err.message);
      }
    };
    fetchProfile();
  }, [user]);

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
        // Fallback to localstorage/Firestore mocking for emulator/dev testing purposes
        const mockKyc = localStorage.getItem(`lp_kyc_${user.uid}`) === "true";
        if (mockKyc) {
          setKycVerified(true);
        }
      }
    }).catch(err => {
      console.error("Error reading token claims:", err);
    });
  }, [user]);

  // Helper to save buyer preferences to Firestore
  const savePrefs = async (newPrefs) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        preferences: newPrefs
      });
      console.log("Saved buyer preferences to Firestore:", newPrefs);
    } catch (err) {
      console.warn("Could not save preferences to Firestore:", err.message);
    }
  };

  // Simulate verification call
  const handleSimulateKyc = async () => {
    if (!user) return;
    setKycSimulating(true);
    // Real flow would call an HTTP cloud function or custom token endpoint
    setTimeout(async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
          verified: true
        });
        localStorage.setItem(`lp_kyc_${user.uid}`, "true");
        setKycVerified(true);
        setKycSimulating(false);
        if (onToast) onToast("NIN & BVN matching succeeded! Custom KYC Claim added to token.");
      } catch (err) {
        console.error("Failed to update verification status in Firestore:", err);
        setKycSimulating(false);
      }
    }, 1500);
  };

  // Handle buyer preferences changes
  const handleBudgetChange = (e) => {
    const val = Number(e.target.value);
    setBuyerPrefs(prev => {
      const next = { ...prev, budget: val };
      savePrefs(next);
      return next;
    });
  };

  const handleDistrictToggle = (dist) => {
    setBuyerPrefs(prev => {
      const districts = prev.preferredDistricts.includes(dist)
        ? prev.preferredDistricts.filter(d => d !== dist)
        : [...prev.preferredDistricts, dist];
      const next = { ...prev, preferredDistricts: districts };
      savePrefs(next);
      return next;
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

    // Save to Firestore to trigger Cloud Function matching
    const savePropertyToFirestore = async () => {
      try {
        await addDoc(collection(db, "properties"), {
          title: sellerForm.title,
          askingPrice: Number(sellerForm.askingPrice),
          district: sellerForm.district,
          description: sellerForm.urgencyReason || "Unspecified urgency sale",
          isDistressSale: true,
          agisStatus: "Under Review",
          investmentScore: "9.6/10",
          createdAt: serverTimestamp()
        });
        console.log("Successfully saved property listing to Firestore to trigger AI matching");
      } catch (err) {
        console.error("Failed to save property listing to Firestore:", err);
      }
    };
    savePropertyToFirestore();

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

  if (!user) {
    return (
      <div style={{ animation: "slideup .3s ease", display: "flex", justifyContent: "center", padding: "40px 0" }}>
        <div style={{
          background: T.card,
          border: `1px solid ${T.line}`,
          borderRadius: 24,
          padding: "48px 32px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(12,43,31,.05)",
          maxWidth: 480,
          width: "100%",
        }}>
          <img
            src="/logo_mark.png"
            alt="The Landlord Property"
            style={{
              height: 72,
              width: "auto",
              objectFit: "contain",
              display: "block",
              margin: "0 auto 20px",
            }}
          />
          <h2 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24, color: T.ink, margin: "0 0 12px" }}>Sign in to Access Your Profile</h2>
          <p style={{ color: T.sub, fontSize: 14.5, lineHeight: 1.5, margin: "0 0 28px 0" }}>
            Sign in to check your verification progress, manage distress listings, track escrow payments, and update buyer criteria.
          </p>
          <button
            onClick={onSignInRequest}
            style={{
              background: T.green,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 28px",
              fontWeight: 700,
              fontSize: 14.5,
              cursor: "pointer",
              transition: "transform 0.12s ease",
              boxShadow: "0 4px 12px rgba(14,90,58,0.2)"
            }}
            onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

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
            {user.photoURL ? (
              <img src={user.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              (user.displayName || user.email || "User")[0].toUpperCase()
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>WELCOME BACK</div>
            <h1 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24, margin: 0 }}>
              {user.displayName || (user.email ? user.email.split("@")[0] : "Client")}
            </h1>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
              Account ID: {user.uid ? `${user.uid.slice(0, 8)}...` : "Unknown"}
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

      {/* Tab Switcher & Contents (always rendered for signed-in users) */}
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
          <button
            onClick={() => setProfileTab("saved")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14.5,
              background: profileTab === "saved" ? T.gold : T.card,
              color: profileTab === "saved" ? T.ink : T.sub,
              boxShadow: "0 1px 3px rgba(12,43,31,.06)",
              border: profileTab === "saved" ? "none" : `1px solid ${T.line}`
            }}
          >
            ❤️ Saved Watchlist
          </button>
          <button
            onClick={() => setProfileTab("matches")}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14.5,
              background: profileTab === "matches" ? "#6B3FA0" : T.card,
              color: profileTab === "matches" ? "#fff" : T.sub,
              boxShadow: "0 1px 3px rgba(12,43,31,.06)",
              border: profileTab === "matches" ? "none" : `1px solid ${T.line}`
            }}
          >
            🤖 Your Matches
          </button>
        </div>

        {/* Tab contents */}
        {profileTab === "buyer" && (
          kycVerified ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              {/* Buyer preferences */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                <SectionLabel>AI Buyer Preferences</SectionLabel>
                <p style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>
                  Update your deal criteria. The Landlord Property matches distress sales to these requirements automatically.
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
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setBuyerPrefs(prev => {
                        const next = { ...prev, waAlerts: checked };
                        savePrefs(next);
                        return next;
                      });
                    }}
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

              {/* My Submitted Offers */}
              <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
                <SectionLabel color="#6B3FA0">My Submitted Offers</SectionLabel>
                <p style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>
                  Track negotiation status on properties you've submitted active purchase offers for.
                </p>

                {loadingOffers ? (
                  <div style={{ fontSize: 13, color: T.sub, textAlign: "center", padding: "20px 0" }}>
                    Syncing offers from ledger...
                  </div>
                ) : myOffers.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "30px 20px", background: T.paper, borderRadius: 12, color: T.sub }}>
                    <span style={{ fontSize: 28, display: "block", marginBottom: 8 }}>🤝</span>
                    <span style={{ fontWeight: 600, fontSize: 13.5, color: T.ink }}>No Offers Submitted</span>
                    <p style={{ fontSize: 12, marginTop: 4, maxWidth: 240, margin: "4px auto 0" }}>
                      Click on any Distress Deal details page to submit a purchase offer.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {myOffers.map((offer) => {
                      const badge = offer.status === "Accepted" ? { bg: T.mint, color: T.green }
                                  : offer.status === "Declined" ? { bg: T.riskSoft, color: T.risk }
                                  : offer.status === "Counter-Offer" ? { bg: T.goldSoft, color: "#7A5800" }
                                  : { bg: T.tealSoft, color: T.teal };
                      return (
                        <div key={offer.id} style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: 14, background: T.paper }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div>
                              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: 14.5, color: T.ink, lineHeight: 1.25 }}>
                                {offer.dealName}
                              </div>
                              <div style={{ fontSize: 11.5, color: T.sub, marginTop: 2 }}>
                                {offer.district} · {offer.financing === "cash" ? "Cash" : offer.financing === "mortgage" ? "Mortgage" : "Instalment"}
                              </div>
                            </div>
                            <Pill bg={badge.bg} color={badge.color}>
                              {offer.status}
                            </Pill>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${T.line}` }}>
                            <div>
                              <span style={{ fontSize: 11, color: T.sub }}>YOUR OFFER</span>
                              <div style={{ fontSize: 16, fontFamily: "'Bricolage Grotesque'", fontWeight: 800, color: T.green }}>
                                {fmtCurrency(offer.offerPrice)}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: 11, color: T.sub }}>ASKING</span>
                              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
                                {fmtCurrency(offer.askingPrice)}
                              </div>
                            </div>
                          </div>

                          {offer.note && (
                            <div style={{ fontSize: 11.5, color: T.sub, fontStyle: "italic", background: T.card, padding: "6px 10px", borderRadius: 8, marginTop: 10, border: `1px solid ${T.line}` }}>
                              "{offer.note}"
                            </div>
                          )}

                          <div style={{ fontSize: 9.5, color: "rgba(12,43,31,0.4)", marginTop: 8, textAlign: "right", fontWeight: 600 }}>
                            Submitted {offer.createdAt ? (offer.createdAt.toDate ? offer.createdAt.toDate().toLocaleDateString() : new Date(offer.createdAt).toLocaleDateString()) : "Just now"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 36, textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
              <span style={{ fontSize: 44, display: "block", marginBottom: 12 }}>🔒</span>
              <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.ink, margin: "0 0 6px" }}>KYC Verification Required</h3>
              <p style={{ color: T.sub, fontSize: 13.5, margin: "0 auto 20px", maxWidth: 380, lineHeight: 1.5 }}>
                You must complete your identity verification to configure buyer budget alerts, access automated matches, and track active escrow transactions.
              </p>
            </div>
          )
        )}

        {profileTab === "seller" && (
          kycVerified ? (
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
          ) : (
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 36, textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
              <span style={{ fontSize: 44, display: "block", marginBottom: 12 }}>🔒</span>
              <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.ink, margin: "0 0 6px" }}>KYC Verification Required</h3>
              <p style={{ color: T.sub, fontSize: 13.5, margin: "0 auto 20px", maxWidth: 380, lineHeight: 1.5 }}>
                You must complete your identity verification (NIN/BVN match) to register and verify new distress property sales on the marketplace.
              </p>
            </div>
          )
        )}

        {profileTab === "saved" && (() => {
          // Merge mock deals and live Firestore deals to look up saved items
          const allDealsPool = [
            ...dealsList,
            ...firestoreProps
          ];
          const savedDeals = allDealsPool.filter(d => savedIds && savedIds.has(d.id));

          return (
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20 }}>
              <SectionLabel>❤️ Saved Watchlist</SectionLabel>
              <p style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>
                Deals you have bookmarked for quick comparison and monitoring.
              </p>
              
              {savedDeals.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: T.sub }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>❤️</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>Your Watchlist is Empty</div>
                  <p style={{ fontSize: 12.5, marginTop: 4, color: T.sub, maxWidth: 280, margin: "4px auto 0" }}>
                    Heart properties in the Distress Deals or Listings tab to save them here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                  {savedDeals.map(deal => {
                    const disc = deal.market ? Math.round(((deal.market - deal.asking) / deal.market) * 100) : 0;
                    const pType = (deal.type || "").toLowerCase();
                    const photo = pType.includes("land") ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80"
                                : pType.includes("terrace") ? "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80"
                                : pType.includes("detached") ? "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80"
                                : "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80";

                    return (
                      <div
                        key={deal.id}
                        style={{
                          background: T.card,
                          border: `1px solid ${T.line}`,
                          borderRadius: 14,
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          boxShadow: "0 1px 3px rgba(12,43,31,.04)",
                          position: "relative"
                        }}
                      >
                        {/* Photo area */}
                        <div style={{ position: "relative", height: 140, background: T.mint, overflow: "hidden" }}>
                          <img src={photo} alt={deal.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button
                            onClick={() => onToggleSave(deal.id)}
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              border: "none",
                              background: "rgba(255,255,255,.9)",
                              borderRadius: "50%",
                              width: 28,
                              height: 28,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                              fontSize: 14,
                              color: T.risk
                            }}
                            title="Remove from watchlist"
                          >
                            ❤️
                          </button>
                          {disc > 0 && (
                            <div style={{
                              position: "absolute",
                              top: 8,
                              left: 8,
                              background: T.amber,
                              color: "#fff",
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                            }}>
                              −{disc}%
                            </div>
                          )}
                        </div>

                        {/* Text details */}
                        <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink, lineHeight: 1.25, display: "-webkit-box", overflow: "hidden", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {deal.name}
                            </div>
                            <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
                              {deal.district} · {deal.type}
                            </div>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                              <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 15, color: T.ink }}>
                                {fmtCurrency(deal.asking)}
                              </span>
                              {deal.market > deal.asking && (
                                <span style={{ fontSize: 10.5, color: T.sub, textDecoration: "line-through" }}>
                                  {fmtCurrency(deal.market)}
                                </span>
                              )}
                            </div>
                            
                            <button
                              onClick={() => onOpen(deal)}
                              style={{
                                width: "100%",
                                marginTop: 10,
                                border: `1.5px solid ${T.green}`,
                                background: "transparent",
                                color: T.green,
                                borderRadius: 8,
                                padding: "6px 0",
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all .15s ease"
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = T.mint; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>

        {profileTab === "matches" && (
          <MatchesTab
            db={db}
            user={user}
            cur={cur}
            dealsList={dealsList}
            firestoreProps={firestoreProps}
            buyerPrefs={buyerPrefs}
            kycVerified={kycVerified}
            onOpen={onOpen}
          />
        )}
      </div>
  );
}

function MatchesTab({ db, user, cur, dealsList, firestoreProps, buyerPrefs, kycVerified, onOpen }) {
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    setLoadingLogs(true);
    const q = query(
      collection(db, "activity_logs"),
      where("userId", "==", user.uid),
      where("action", "==", "property_matched"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setLogs(list);
      setLoadingLogs(false);
    }, (err) => {
      console.warn("[MatchesTab] Error fetching matched logs:", err.message);
      setLoadingLogs(false);
    });
    return unsubscribe;
  }, [user?.uid]);

  const fmtCurrency = (n) => {
    if (cur === "USD") {
      const rate = 1550;
      return "$" + Math.round(n / rate).toLocaleString();
    }
    return "₦" + n.toLocaleString();
  };

  // Client-side computed matches
  const allDeals = [...dealsList, ...firestoreProps];
  const activeMatches = allDeals.filter(d => {
    const districtMatch = buyerPrefs?.preferredDistricts?.includes(d.district);
    const budgetMatch = (d.asking || d.askingPrice || 0) <= (buyerPrefs?.budget || Infinity);
    const notOwnListing = d.userId !== user?.uid;
    return districtMatch && budgetMatch && notOwnListing;
  });

  return (
    <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: 20, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <SectionLabel color="#6B3FA0">🤖 Real-Time Match Engine</SectionLabel>
        {kycVerified ? (
          <Pill bg={T.mint} color={T.green}>✓ Match Engine Active</Pill>
        ) : (
          <Pill bg={T.riskSoft} color={T.risk}>⚠️ Verify to Unlock Matches</Pill>
        )}
      </div>

      <p style={{ fontSize: 13, color: T.sub, marginBottom: 20 }}>
        The Landlord Property AI continuously scans the FCT real estate ledger to find deals matching your preferences in real-time.
      </p>

      {!kycVerified ? (
        <div style={{ textAlign: "center", padding: "30px 20px", background: T.paper, borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>Verification Required</div>
          <p style={{ fontSize: 12.5, color: T.sub, maxWidth: 300, margin: "6px auto 0", lineHeight: 1.4 }}>
            Please complete your NIN/BVN check in the Buyer Hub to configure search parameters and unlock AI matches.
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 16, color: T.ink, margin: "0 0 12px 0" }}>
              🎯 Live Matches ({activeMatches.length})
            </h4>

            {activeMatches.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center", background: T.paper, borderRadius: 12, color: T.sub }}>
                <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>🔍</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: T.ink }}>No Live Matches Found</span>
                <p style={{ fontSize: 12, margin: "4px auto 0", maxWidth: 280 }}>
                  Adjust your budget slider or select more districts in the <b>Buyer Hub</b> tab to widen search parameters.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {activeMatches.map(deal => {
                  const disc = deal.market ? Math.round(((deal.market - deal.asking) / deal.market) * 100) : 0;
                  const pType = (deal.type || "").toLowerCase();
                  const photo = pType.includes("land") ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80"
                              : pType.includes("terrace") ? "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80"
                              : pType.includes("detached") ? "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80"
                              : "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80";

                  return (
                    <div
                      key={deal.id}
                      style={{
                        background: T.card,
                        border: `1px solid ${T.line}`,
                        borderRadius: 14,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "0 2px 5px rgba(12,43,31,.03)"
                      }}
                    >
                      <div style={{ position: "relative", height: 130, background: T.mint, overflow: "hidden" }}>
                        <img src={photo} alt={deal.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <span style={{
                          position: "absolute", top: 8, left: 8,
                          background: "#6B3FA0", color: "#fff",
                          padding: "3px 8px", borderRadius: 6,
                          fontSize: 10, fontWeight: 700
                        }}>🤖 AI MATCH</span>
                        {disc > 0 && (
                          <span style={{
                            position: "absolute", top: 8, right: 8,
                            background: T.amber, color: "#fff",
                            padding: "3px 8px", borderRadius: 6,
                            fontSize: 10, fontWeight: 700
                          }}>−{disc}%</span>
                        )}
                      </div>

                      <div style={{ padding: 12, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink, lineHeight: 1.25 }}>{deal.name}</div>
                          <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{deal.district} · {deal.type}</div>
                        </div>

                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                            <span style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 15, color: T.ink }}>
                              {fmtCurrency(deal.asking)}
                            </span>
                            {deal.market > deal.asking && (
                              <span style={{ fontSize: 10.5, color: T.sub, textDecoration: "line-through" }}>
                                {fmtCurrency(deal.market)}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => onOpen(deal)}
                            style={{
                              width: "100%", marginTop: 10,
                              background: "transparent", border: `1.5px solid ${T.green}`,
                              color: T.green, borderRadius: 8, padding: "6px 0",
                              fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                              transition: "all .15s ease"
                            }}
                          >
                            View Match Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 18 }}>
            <h4 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 15, color: T.ink, margin: "0 0 10px 0" }}>
              📋 AI Agent Activity Log
            </h4>
            {loadingLogs ? (
              <div style={{ fontSize: 12, color: T.sub }}>Syncing dispatch logs from cloud...</div>
            ) : logs.length === 0 ? (
              <div style={{ padding: 12, background: T.paper, borderRadius: 8, fontSize: 12.5, color: T.sub, fontStyle: "italic" }}>
                No past match events logged yet. Matches will populate here as new distress listings are published.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {logs.map(log => (
                  <div key={log.id} style={{ padding: 10, background: T.paper, borderRadius: 8, fontSize: 12.5, border: `1px solid ${T.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: "#6B3FA0", fontSize: 11 }}>AI DISPATCH EVENT</span>
                      <span style={{ fontSize: 11, color: T.sub }}>
                        {log.createdAt ? (log.createdAt.toDate ? log.createdAt.toDate().toLocaleString() : new Date(log.createdAt).toLocaleString()) : ""}
                      </span>
                    </div>
                    <div style={{ color: T.ink, lineHeight: 1.4 }}>{log.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

