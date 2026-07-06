import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./lib/firebase";

const T = {
  ink:      "#0C2B1F",
  green:    "#0E5A3A",
  greenDark:"#0A422B",
  mint:     "#E7F2EC",
  gold:     "#C9A227",
  goldSoft: "#F6EFD8",
  amber:    "#B4540A",
  paper:    "#F5F6F2",
  card:     "#FFFFFF",
  line:     "#E2E5DF",
  sub:      "#5B6A61",
  risk:     "#B3261E",
  riskSoft: "#FBEAE8",
};

/* Google "G" colour-accurate SVG */
const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.5 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.3C9.7 35.7 16.3 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C36.9 39.8 44 34.7 44 24c0-1.3-.1-2.6-.4-3.9z"/>
  </svg>
);

const FRIENDLY = {
  "auth/user-not-found":       "No account found. Create one below.",
  "auth/wrong-password":       "Incorrect password — please try again.",
  "auth/invalid-credential":   "Email or password is incorrect.",
  "auth/email-already-in-use": "Email already registered — sign in instead.",
  "auth/weak-password":        "Password must be at least 6 characters.",
  "auth/invalid-email":        "Please enter a valid email address.",
  "auth/popup-closed-by-user": "Popup was closed — please try again.",
  "auth/popup-blocked":        "Popup was blocked by your browser — allow popups and try again.",
  "auth/network-request-failed": "Network error — check your connection and retry.",
};
const friendly = (code) => FRIENDLY[code] || "Something went wrong. Please try again.";

/* ─── Input helper ─── */
const Field = ({ type, value, onChange, placeholder, required, minLength }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      minLength={minLength}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        border: `1.5px solid ${focused ? T.green : T.line}`,
        borderRadius: 10,
        padding: "11px 14px",
        fontSize: 14,
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
        outline: "none",
        color: T.ink,
        background: "#fff",
        transition: "border-color .15s ease",
        boxSizing: "border-box",
      }}
    />
  );
};

/* ─── AuthModal ─── */
export default function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const reset = () => { setError(null); setEmail(""); setPassword(""); };

  /* Google */
  const handleGoogle = async () => {
    setLoading(true); setError(null);
    try {
      const r = await signInWithPopup(auth, new GoogleAuthProvider());
      onSuccess(r.user);
    } catch (e) {
      setError(friendly(e.code));
    } finally { setLoading(false); }
  };

  /* Email / password */
  const handleEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const fn = mode === "signup"
        ? createUserWithEmailAndPassword
        : signInWithEmailAndPassword;
      const r = await fn(auth, email, password);
      onSuccess(r.user);
    } catch (e) {
      setError(friendly(e.code));
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* keyframes */}
      <style>{`
        @keyframes lp-fadeup {
          from { opacity: 0; transform: translateY(14px) scale(.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        style={{
          position: "fixed", inset: 0, zIndex: 90,
          background: "rgba(12,43,31,.72)",
          backdropFilter: "blur(7px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
      >
        {/* Card */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "relative",
            background: T.card,
            borderRadius: 24,
            width: "min(440px, 100%)",
            padding: "36px 28px 28px",
            boxShadow: "0 28px 64px rgba(12,43,31,.38), 0 0 0 1px rgba(12,43,31,.06)",
            animation: "lp-fadeup .28s cubic-bezier(.22,1,.36,1)",
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: 16, right: 16,
              width: 32, height: 32, borderRadius: 10,
              border: "none", background: T.paper,
              color: T.sub, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>

          {/* ── Brand ── */}
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: T.green, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 24,
              marginBottom: 16,
              boxShadow: "0 4px 14px rgba(14,90,58,.35)",
            }}>L</div>

            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800, fontSize: 21, color: T.ink, lineHeight: 1.2,
            }}>
              {mode === "signup" ? "Create your account" : "Sign in to The Landlord AI"}
            </div>
            <div style={{ fontSize: 13.5, color: T.sub, marginTop: 7, lineHeight: 1.5 }}>
              {mode === "signup"
                ? "After sign-up, a 2-minute ID check unlocks AI deal search"
                : "AI distress deal search is KYC-gated to protect all users"}
            </div>
          </div>

          {/* ── Google button ── */}
          <button
            id="google-signin-btn"
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              background: "#fff", border: `1.5px solid ${T.line}`,
              borderRadius: 12, padding: "12px 16px",
              fontFamily: "'Instrument Sans', system-ui, sans-serif",
              fontWeight: 600, fontSize: 14, color: T.ink,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,.08)",
              transition: "box-shadow .15s ease, transform .12s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,.13)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.08)"; }}
            onMouseDown={e => { e.currentTarget.style.transform = "scale(.98)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <GoogleG />
            {loading ? "Connecting…" : "Continue with Google"}
          </button>

          {/* ── Divider ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: T.line }} />
            <span style={{ fontSize: 12, color: T.sub, fontWeight: 600, letterSpacing: 0.5 }}>or</span>
            <div style={{ flex: 1, height: 1, background: T.line }} />
          </div>

          {/* ── Email form ── */}
          <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Field
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address" required
            />
            <Field
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password" required minLength={6}
            />

            {error && (
              <div style={{
                background: T.riskSoft, color: T.risk,
                borderRadius: 9, padding: "10px 13px",
                fontSize: 13, fontWeight: 500, lineHeight: 1.4,
                display: "flex", gap: 7, alignItems: "flex-start",
              }}>
                <span style={{ flexShrink: 0 }}>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              id="email-signin-btn"
              disabled={loading}
              style={{
                background: T.green, color: "#fff",
                border: "none", borderRadius: 12,
                padding: "13px", marginTop: 2,
                fontFamily: "'Instrument Sans', system-ui, sans-serif",
                fontWeight: 700, fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.75 : 1,
                transition: "transform .12s ease",
                boxShadow: "0 2px 10px rgba(14,90,58,.28)",
              }}
              onMouseDown={e => { e.currentTarget.style.transform = "scale(.98)"; }}
              onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </button>
          </form>

          {/* ── Toggle ── */}
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13.5, color: T.sub }}>
            {mode === "signin" ? (
              <>Don&apos;t have an account?{" "}
                <button
                  onClick={() => { setMode("signup"); reset(); }}
                  style={{ border: "none", background: "none", color: T.green, fontWeight: 700, cursor: "pointer", fontSize: 13.5, padding: 0 }}
                >Create one</button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button
                  onClick={() => { setMode("signin"); reset(); }}
                  style={{ border: "none", background: "none", color: T.green, fontWeight: 700, cursor: "pointer", fontSize: 13.5, padding: 0 }}
                >Sign in</button>
              </>
            )}
          </div>

          {/* ── KYC info ── */}
          <div style={{
            marginTop: 20,
            background: T.goldSoft,
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 12.5,
            color: "#7A5800",
            lineHeight: 1.55,
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <span style={{ flexShrink: 0, fontSize: 15 }}>🪪</span>
            <span>
              <b>KYC unlocks AI search.</b> Once signed in, a quick identity
              check sets your <code style={{ fontFamily: "monospace", background: "rgba(0,0,0,.07)", borderRadius: 4, padding: "1px 5px" }}>kycVerified</code> Firebase
              Auth claim — the server enforces this on every <i>SecureDistressSearch</i> call.
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
