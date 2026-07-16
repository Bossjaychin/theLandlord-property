import React, { useState } from "react";

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
};

const FX = 1550; // NGN per USD

export default function About({ cur, onSignInRequest }) {
  // Slider state (Purchase price in NGN)
  const [purchasePrice, setPurchasePrice] = useState(120_000_000);
  
  // Accordion active index
  const [activeFaq, setActiveFaq] = useState(null);

  // Formatter functions
  const fmt = (val) => {
    if (cur === "USD") {
      const usdVal = val / FX;
      return "$" + Math.round(usdVal).toLocaleString();
    }
    return "₦" + val.toLocaleString();
  };

  const fmtMillions = (val) => {
    if (cur === "USD") {
      const usdVal = val / FX;
      return "$" + Math.round(usdVal).toLocaleString();
    }
    return "₦" + (val / 1_000_000).toFixed(1) + "M";
  };

  // Calculations
  const escrowFee = purchasePrice * 0.012; // 1.2% escrow verification
  const titleSearchFee = cur === "USD" ? 250 * FX : 380_000; // Flat local verification
  const totalUpfront = purchasePrice + escrowFee + titleSearchFee;

  // Shortlet projection calculations
  const projectedNightly = Math.round(purchasePrice * 0.0009); // e.g. 120m -> ~108k
  const occupancyRate = 0.68; // 68% avg occupancy
  const grossMonthly = projectedNightly * 30 * occupancyRate;
  const netMonthly = grossMonthly * 0.72; // 28% management/maintenance fee
  const annualYield = (netMonthly * 12 / purchasePrice) * 100;

  const faqs = [
    {
      q: "What is an AGIS search & why is it critical?",
      a: "AGIS (Abuja Geographic Information Systems) is the official land registry database for the Federal Capital Territory. Over 40% of Abuja land transactions suffer from double-allocation or invalid titles. We run real-time digital file checks directly in the AGIS database, cross-check coordinate maps for greenbelt/demolition buffer zone violations, and trace histories to guarantee clear title transfers."
    },
    {
      q: "How does the Escrow Gateway protect my funds?",
      a: "When you lock a property, your funds are deposited into our escrow account. These funds are legally locked and never released to the seller until: (1) Our legal partners confirm the AGIS file is clean, (2) Physical boundaries are validated, and (3) Deed of Assignment is signed and authenticated. If any legal defects are uncovered, the contract is cancelled and your funds are refunded immediately."
    },
    {
      q: "How does the 'Buy ⇄ Earn' flip work?",
      a: "Rather than letting your property sit empty, our platform lets you purchase distress-priced properties and immediately list them on our Shortlet Network. We handle everything on the ground: interior design coordination, smart lock installation, guest checks, cleaning, and security, allowing you to generate up to 22% annual yield paid directly to your USD or NGN bank account."
    },
    {
      q: "Can I invest if I am in London, Houston, or Lagos?",
      a: "Absolutely. The Landlord was built specifically for the diaspora. Our escrow account supports direct USD, GBP, CAD, and NGN payments. Your entire inspection, title search, and transaction history are digitized, verified by regulated lawyers, and accessible via your dashboard with real-time WhatsApp updates."
    }
  ];

  return (
    <div style={{ fontFamily: "'Instrument Sans', sans-serif", color: T.ink, lineHeight: 1.6 }}>
      
      {/* Dynamic CSS styles for animations and hovers */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(201, 162, 39, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(201, 162, 39, 0); }
          100% { box-shadow: 0 0 0 0 rgba(201, 162, 39, 0); }
        }
        .glow-circle {
          animation: pulseGlow 2.5s infinite;
        }
        .pillar-card {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
        }
        .pillar-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(12, 43, 31, 0.08);
        }
        .faq-button {
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .faq-button:hover {
          background-color: ${T.mint};
          color: ${T.greenDark};
        }
        .accordion-content {
          transition: max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
        }
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${T.gold};
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: transform 0.1s ease;
        }
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .btn-glow {
          position: relative;
          overflow: hidden;
        }
        .btn-glow::after {
          content: '';
          position: absolute;
          top: 0; left: -50%; width: 200%; height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent);
          transform: skewX(-25deg);
          transition: 0.75s;
        }
        .btn-glow:hover::after {
          left: 125%;
        }
      `}} />

      {/* ── HERO BANNER ── */}
      <section style={{
        background: `linear-gradient(135deg, ${T.ink} 0%, #082218 100%)`,
        borderRadius: 24,
        padding: "56px 40px",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        marginBottom: 40,
        boxShadow: "0 10px 30px rgba(12,43,31,0.12)"
      }}>
        {/* Abstract background graphics */}
        <div style={{ position: "absolute", right: -50, top: -50, width: 260, height: 260, borderRadius: "50%", background: `rgba(201,162,39,0.06)` }} />
        <div style={{ position: "absolute", left: "30%", bottom: -60, width: 180, height: 180, borderRadius: "50%", background: `rgba(14,107,117,0.08)` }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 760 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(201, 162, 39, 0.15)",
            border: `1px solid rgba(201, 162, 39, 0.3)`,
            borderRadius: 99,
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 700,
            color: T.goldSoft,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            marginBottom: 20
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.gold }} className="glow-circle" />
            Diaspora Real Estate Gateway
          </div>

          <h1 style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: "clamp(28px, 5vw, 46px)",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#fff",
            marginBottom: 16
          }}>
            Invest in Abuja real estate with <span style={{ color: T.gold }}>absolute verification.</span>
          </h1>

          <p style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.85)",
            marginBottom: 28,
            maxWidth: 640
          }}>
            The Landlord bridges the trust gap for diaspora investors in Abuja. We eliminate ownership fraud, verify legal titles through AGIS, secure transaction funds in escrow, and maximize passive income by automatically onboarding properties to our premium shortlet network.
          </p>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={onSignInRequest}
              className="btn-glow"
              style={{
                border: "none",
                background: T.gold,
                color: T.ink,
                borderRadius: 12,
                padding: "12px 24px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(201,162,39,0.3)"
              }}
            >
              Get started today
            </button>
            <a
              href="#estimator"
              style={{
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                border: "1.5px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                borderRadius: 12,
                padding: "12px 24px",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                transition: "border-color 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#fff"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
            >
              Try Yield Calculator ↓
            </a>
          </div>
        </div>
      </section>

      {/* ── THE THREE PILLARS ── */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 24,
          fontWeight: 800,
          color: T.ink,
          marginBottom: 8
        }}>
          Built on Three Pillars of Trust
        </h2>
        <p style={{ color: T.sub, fontSize: 15, marginBottom: 24, maxWidth: 600 }}>
          How we protect your hard-earned capital and guarantee recurring shortlet yields in Abuja's prime districts.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20
        }}>
          
          {/* Pillar 1 */}
          <div className="pillar-card" style={{
            background: "#fff",
            border: `1.5px solid ${T.line}`,
            borderRadius: 18,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: T.goldSoft, color: T.gold,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, color: T.ink }}>1. TrustRing Title Verification</h3>
            <p style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.55 }}>
              We perform rigorous AGIS database searches, physical zoning inspections, and verify structural demolition markers. Every deal has an explicit letter grade (A, B, or C) from certified real estate lawyers.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="pillar-card" style={{
            background: "#fff",
            border: `1.5px solid ${T.line}`,
            borderRadius: 18,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: T.tealSoft, color: T.teal,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, color: T.ink }}>2. Buy ⇄ Earn Shortlet Flipping</h3>
            <p style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.55 }}>
              Buy at distressed discount rates and instantly switch properties onto our shortlet management track. Generate passive USD or NGN cash flow via curated tenant experiences, smart lock keys, and professional host cleaning.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="pillar-card" style={{
            background: "#fff",
            border: `1.5px solid ${T.line}`,
            borderRadius: 18,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: T.mint, color: T.green,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, color: T.ink }}>3. Escrow Gateway Payments</h3>
            <p style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.55 }}>
              Your money never goes directly to a seller or agent upfront. It remains locked in our secure escrow gateway. Funds are disbursed in milestones only after title validation, survey review, and contract authentication succeed.
            </p>
          </div>

        </div>
      </section>

      {/* ── INTERACTIVE ESTIMATOR ── */}
      <section id="estimator" style={{
        background: "#fff",
        border: `1.5px solid ${T.line}`,
        borderRadius: 20,
        padding: "32px 30px",
        marginBottom: 48,
        boxShadow: "0 2px 10px rgba(0,0,0,0.01)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24
        }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: T.green }}>Interactive Estimator</span>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, color: T.ink, marginTop: 4 }}>
              Diaspora Yield &amp; Escrow Calculator
            </h2>
          </div>
          <div style={{
            background: T.mint,
            color: T.green,
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: 20,
            border: `1px solid ${T.green}15`
          }}>
            1 USD = ₦1,550
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", lgGridTemplateColumns: "1.2fr 1fr", gap: 32 }}>
          
          {/* Left panel: sliders */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                <span>Target Property Price</span>
                <span style={{ color: T.green }}>{fmt(purchasePrice)}</span>
              </div>
              <input
                type="range"
                min={30_000_000}
                max={450_000_000}
                step={5_000_000}
                value={purchasePrice}
                onChange={e => setPurchasePrice(Number(e.target.value))}
                className="slider-thumb"
                style={{
                  width: "100%",
                  height: 6,
                  borderRadius: 3,
                  background: T.line,
                  outline: "none",
                  WebkitAppearance: "none",
                  cursor: "pointer"
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.sub, marginTop: 6 }}>
                <span>{fmtMillions(30_000_000)}</span>
                <span>{fmtMillions(240_000_000)}</span>
                <span>{fmtMillions(450_000_000)}</span>
              </div>
            </div>

            {/* Visual Steps representation of escrow verification */}
            <div style={{
              background: T.paper,
              borderRadius: 14,
              padding: 16,
              border: `1px solid ${T.line}`
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Secure Verification Milestones
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                <div style={{ display: "flex", gap: 8, opacity: 0.9 }}>
                  <span style={{ color: T.green, fontWeight: 700 }}>Step 1:</span>
                  <span style={{ color: T.sub }}>AGIS File Digital Search &amp; Coordinate Survey Check</span>
                </div>
                <div style={{ display: "flex", gap: 8, opacity: 0.9 }}>
                  <span style={{ color: T.green, fontWeight: 700 }}>Step 2:</span>
                  <span style={{ color: T.sub }}>Legal Due Diligence by Partner Chamber ({fmt(titleSearchFee)})</span>
                </div>
                <div style={{ display: "flex", gap: 8, opacity: 0.9 }}>
                  <span style={{ color: T.green, fontWeight: 700 }}>Step 3:</span>
                  <span style={{ color: T.sub }}>Title Escrow Hold on 1.2% Gateway Verification Fee</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: yield and totals grid */}
          <div style={{
            background: T.mint,
            borderRadius: 18,
            padding: 24,
            border: `1.5px solid ${T.green}18`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 20
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: T.green, marginBottom: 12 }}>
                Purchase Breakdowns
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: `1px solid ${T.green}10`, paddingBottom: 6 }}>
                  <span style={{ color: T.sub }}>Property Cost:</span>
                  <span style={{ fontWeight: 700, color: T.ink }}>{fmt(purchasePrice)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: `1px solid ${T.green}10`, paddingBottom: 6 }}>
                  <span style={{ color: T.sub }}>Escrow gateway fee (1.2%):</span>
                  <span style={{ fontWeight: 700, color: T.ink }}>{fmt(escrowFee)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: `1px solid ${T.green}10`, paddingBottom: 6 }}>
                  <span style={{ color: T.sub }}>AGIS &amp; Legal Search:</span>
                  <span style={{ fontWeight: 700, color: T.ink }}>{fmt(titleSearchFee)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, paddingBottom: 6, paddingTop: 4 }}>
                  <span style={{ color: T.ink }}>Total Upfront Cost:</span>
                  <span style={{ color: T.greenDark }}>{fmt(totalUpfront)}</span>
                </div>
              </div>
            </div>

            <div style={{
              background: "#fff",
              borderRadius: 14,
              padding: 16,
              boxShadow: "0 2px 8px rgba(12,43,31,0.02)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12
            }}>
              <div>
                <div style={{ fontSize: 10.5, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>Est. Nightly Rate</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, marginTop: 2 }}>{fmt(projectedNightly)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>Projected Net Yield</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.gold, marginTop: 2 }}>{annualYield.toFixed(1)}% / yr</div>
              </div>
              <div style={{ gridColumn: "span 2", borderTop: `1.5px solid ${T.line}`, paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: "uppercase" }}>Est. Passive Monthly Income (Net)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.green, marginTop: 2 }}>{fmt(netMonthly)} / month</div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: 24,
          fontWeight: 800,
          color: T.ink,
          marginBottom: 16
        }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faqs.map((faq, idx) => {
            const open = activeFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  background: "#fff",
                  border: `1.5px solid ${open ? T.green + "40" : T.line}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  boxShadow: open ? "0 4px 12px rgba(12,43,31,0.02)" : "none",
                  transition: "border-color 0.2s"
                }}
              >
                <button
                  onClick={() => setActiveFaq(open ? null : idx)}
                  className="faq-button"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: "16px 20px",
                    fontSize: 14.5,
                    fontWeight: 700,
                    color: open ? T.green : T.ink,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{
                    fontSize: 16,
                    transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                    color: open ? T.green : T.sub
                  }}>
                    ▼
                  </span>
                </button>

                <div
                  className="accordion-content"
                  style={{
                    maxHeight: open ? 220 : 0,
                    opacity: open ? 1 : 0,
                    overflow: "hidden"
                  }}
                >
                  <p style={{
                    padding: "0 20px 18px",
                    fontSize: 13.5,
                    color: T.sub,
                    lineHeight: 1.6,
                    borderTop: `1px solid ${T.line}80`,
                    paddingTop: 12
                  }}>
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TRUSTED BY BANNER ── */}
      <section style={{
        background: T.mint,
        borderRadius: 20,
        padding: "24px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 18,
        border: `1px solid ${T.green}10`
      }}>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.ink }}>Vetted Legal Network</div>
          <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>Every transaction verified by Abuja's leading conveyancing chambers.</div>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", opacity: 0.8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: 0.5 }}>Lex Habitat Partners</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: 0.5 }}>Barr. A. Musa &amp; Co.</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: 0.5 }}>Themis Chambers</span>
        </div>
      </section>

    </div>
  );
}
