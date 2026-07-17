import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "./lib/firebase";
import { collection, query, orderBy, limit, getDocs, getCountFromServer, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";


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

/* ---------- Admin Login Gate ---------- */

const AdminLoginGate = ({ onUnlock }) => {
  const [mode, setMode] = useState("login"); // "login" | "forgot" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Forgot password states
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPin, setRecoveryPin] = useState("");
  
  // Reset password states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Retrieve current active credentials
  const getCredentials = () => {
    try {
      const stored = localStorage.getItem("lp_admin_creds");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Could not read admin credentials:", e);
    }
    return { email: "admin@thelandlordproperty.com", password: "adminpass" };
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    const creds = getCredentials();
    if (email.toLowerCase().trim() === creds.email.toLowerCase().trim() && password === creds.password) {
      onUnlock();
    } else {
      setError("Invalid admin email or password. Please try again.");
    }
  };

  const handleVerifyRecovery = (e) => {
    e.preventDefault();
    setError("");
    const creds = getCredentials();
    if (recoveryEmail.toLowerCase().trim() !== creds.email.toLowerCase().trim()) {
      setError("Email address not recognized in compliance register.");
      return;
    }
    if (recoveryPin === "1234") {
      setMode("reset");
    } else {
      setError("Invalid Security Recovery PIN. Check your admin credentials.");
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const currentCreds = getCredentials();
      const updated = { ...currentCreds, password: newPassword };
      localStorage.setItem("lp_admin_creds", JSON.stringify(updated));
      setSuccess("Password reset successfully! Log in with your new credentials.");
      setError("");
      setMode("login");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("Failed to save new credentials.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#FFFFFF", borderRadius: 24, width: "min(400px, 100%)", padding: "36px 30px", boxShadow: "0 20px 48px rgba(12,43,31,0.3)" }}>
        
        {/* Logo and title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: "#fff", margin: "0 auto 12px" }}>
            L
          </div>
          <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 20, color: T.ink, margin: 0 }}>
            {mode === "login" ? "Admin Portal Access" : mode === "forgot" ? "Reset Admin Password" : "Set New Password"}
          </h3>
          <p style={{ fontSize: 12.5, color: T.sub, margin: "6px 0 0 0", lineHeight: 1.4 }}>
            {mode === "login" 
              ? "Authorized compliance officers and fund administrators only."
              : mode === "forgot"
              ? "Provide your email and the 4-digit safety recovery PIN (1234) to reset."
              : "Choose a secure password for your administrative account."}
          </p>
        </div>

        {error && (
          <div style={{ background: T.riskSoft, border: `1px solid ${T.risk}33`, color: T.risk, padding: "10px 12px", borderRadius: 10, fontSize: 12.5, marginBottom: 16, lineHeight: 1.4 }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ background: T.mint, border: `1px solid ${T.green}33`, color: T.green, padding: "10px 12px", borderRadius: 10, fontSize: 12.5, marginBottom: 16, lineHeight: 1.4 }}>
            ✅ {success}
          </div>
        )}

        {/* ── MODE: LOGIN ── */}
        {mode === "login" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Admin Email
              </label>
              <input
                type="email"
                required
                placeholder="admin@thelandlordproperty.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, outline: "none", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                  style={{ border: "none", background: "none", color: T.green, fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, outline: "none", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: T.ink, color: "#fff", border: "none", borderRadius: 12, padding: "13px",
                fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginTop: 4,
                boxShadow: "0 4px 14px rgba(12,43,31,.25)"
              }}
            >
              Sign In to Dashboard
            </button>
          </form>
        )}

        {/* ── MODE: FORGOT PASSWORD ── */}
        {mode === "forgot" && (
          <form onSubmit={handleVerifyRecovery} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="admin@thelandlordproperty.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, outline: "none", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                4-Digit Security Recovery Code
              </label>
              <input
                type="password"
                required
                maxLength={4}
                placeholder="e.g. 1234"
                value={recoveryPin}
                onChange={(e) => setRecoveryPin(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, outline: "none", fontSize: 13.5, boxSizing: "border-box", textAlign: "center", letterSpacing: 3, fontWeight: 800 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <button
                type="submit"
                style={{
                  background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: "13px",
                  fontWeight: 700, fontSize: 13.5, cursor: "pointer"
                }}
              >
                Verify Recovery Details
              </button>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                style={{
                  background: "transparent", color: T.sub, border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "11px",
                  fontWeight: 700, fontSize: 12.5, cursor: "pointer"
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* ── MODE: RESET PASSWORD ── */}
        {mode === "reset" && (
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, outline: "none", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="Retype password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", border: `1.5px solid ${T.line}`, borderRadius: 10, outline: "none", fontSize: 13.5, boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: T.green, color: "#fff", border: "none", borderRadius: 12, padding: "13px",
                fontWeight: 700, fontSize: 13.5, cursor: "pointer", marginTop: 4,
                boxShadow: "0 4px 14px rgba(14,90,58,.22)"
              }}
            >
              Save & Update Password
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

/* ---------- Change Password Modal ---------- */

const ChangePasswordModal = ({ onClose, showToast }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const getCredentials = () => {
    try {
      const stored = localStorage.getItem("lp_admin_creds");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { email: "admin@thelandlordproperty.com", password: "adminpass" };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const creds = getCredentials();
    if (currentPassword !== creds.password) {
      setError("Current password is incorrect.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      const updated = { ...creds, password: newPassword };
      localStorage.setItem("lp_admin_creds", JSON.stringify(updated));
      showToast("Password updated successfully! ✓");
      onClose();
    } catch (err) {
      setError("Failed to save new credentials.");
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,43,31,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.card, borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", color: T.ink }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, margin: 0 }}>🔑 Change Admin Password</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", color: T.sub, fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        {error && (
          <div style={{ background: T.riskSoft, color: T.risk, padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 4 }}>CURRENT PASSWORD</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, outline: "none", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 4 }}>NEW PASSWORD</label>
            <input
              type="password"
              required
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, outline: "none", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 4 }}>CONFIRM NEW PASSWORD</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, outline: "none", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, justifyContent: "flex-end" }}>
            <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
            <Btn type="submit" kind="primary">Update Password</Btn>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------- Deal Form Modal ---------- */

const DealFormModal = ({ deal, onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY_DEAL, ...deal });
  const [descLoading, setDescLoading] = useState(false);

  // ── Photo upload state
  const [imageUrls, setImageUrls] = useState(deal?.imageUrls || []);
  const [uploadProgress, setUploadProgress] = useState({}); // { filename: 0–100 }
  const [uploadError, setUploadError] = useState(null);
  const photoInputRef = useRef(null);

  const uploadPhotos = async (files) => {
    setUploadError(null);
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const toUpload = Array.from(files).filter((f) => {
      if (!allowed.includes(f.type)) { setUploadError('Only JPG, PNG, or WebP images are allowed.'); return false; }
      if (f.size > 8 * 1024 * 1024) { setUploadError('Each photo must be under 8 MB.'); return false; }
      return true;
    });

    for (const file of toUpload) {
      const dealId = form.id || ('d' + Date.now());
      const storageRef = ref(storage, `properties/${dealId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        task.on(
          'state_changed',
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setUploadProgress((p) => ({ ...p, [file.name]: pct }));
          },
          (err) => { setUploadError(err.message); reject(err); },
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            setImageUrls((prev) => [...prev, url]);
            setUploadProgress((p) => { const n = { ...p }; delete n[file.name]; return n; });
            resolve();
          }
        );
      }).catch(() => {});
    }
  };

  const removePhoto = async (url, idx) => {
    try {
      // Attempt to delete from Storage (may fail if URL is external — that's OK)
      const storageRef = ref(storage, url);
      await deleteObject(storageRef).catch(() => {});
    } catch {}
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

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
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
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

        {/* ── Property Photos ────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: T.sub }}>
              Property Photos ({imageUrls.length}/10)
            </div>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              style={{
                background: T.teal, color: '#fff', border: 'none', borderRadius: 8,
                padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              📷 Upload Photos
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => uploadPhotos(e.target.files)}
            />
          </div>

          {uploadError && (
            <div style={{ background: T.riskSoft, color: T.risk, padding: '8px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 10 }}>
              ⚠️ {uploadError}
            </div>
          )}

          {/* Upload progress bars */}
          {Object.entries(uploadProgress).map(([name, pct]) => (
            <div key={name} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11.5, color: T.sub, marginBottom: 3 }}>{name} — {pct}%</div>
              <div style={{ height: 4, background: T.line, borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: T.teal, borderRadius: 99, transition: 'width .2s' }} />
              </div>
            </div>
          ))}

          {/* Thumbnail grid */}
          {imageUrls.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
              {imageUrls.map((url, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '4/3', background: T.line }}>
                  <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(url, i)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: 'rgba(12,43,31,.75)', color: '#fff',
                      border: 'none', borderRadius: '50%',
                      width: 22, height: 22, cursor: 'pointer',
                      fontSize: 11, fontWeight: 700, lineHeight: '22px', textAlign: 'center',
                    }}
                  >
                    ✕
                  </button>
                  {i === 0 && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(14,90,58,.85)', color: '#fff', fontSize: 9, fontWeight: 700, textAlign: 'center', padding: '2px 0', letterSpacing: 0.5 }}>COVER</div>
                  )}
                </div>
              ))}
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{
                  borderRadius: 10, border: `2px dashed ${T.line}`, aspectRatio: '4/3',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', color: T.sub, gap: 4,
                  transition: 'border-color .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.line}
              >
                <span style={{ fontSize: 20 }}>+</span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>Add more</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => photoInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = T.teal; }}
              onDragLeave={(e) => e.currentTarget.style.borderColor = T.line}
              onDrop={(e) => { e.preventDefault(); uploadPhotos(e.dataTransfer.files); e.currentTarget.style.borderColor = T.line; }}
              style={{
                border: `2px dashed ${T.line}`, borderRadius: 12, padding: '28px 16px',
                textAlign: 'center', cursor: 'pointer', color: T.sub,
                transition: 'border-color .15s, background .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.teal; e.currentTarget.style.background = T.tealSoft; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>Drop photos here or click to upload</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>JPG, PNG, WebP — up to 8 MB each — up to 10 photos</div>
            </div>
          )}
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
   Escrow Manager Component
   ────────────────────────────────────────────── */
const EscrowManagerView = ({ showToast }) => {
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectType, setRejectType] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const q = query(collection(db, "escrows"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setEscrows(list);
      setLoading(false);
    }, (err) => {
      console.warn("[Admin EscrowManagerView] sync error:", err.message);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleApproveDeposit = async (escrow) => {
    try {
      const escRef = doc(db, "escrows", escrow.id);
      await updateDoc(escRef, {
        stage: 2, // Move to Deed Upload
        paymentStatus: "Paid",
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activity_logs"), {
        action: "escrow_deposit_approved",
        details: `Compliance verified Zenith/Access wire ref ${escrow.paymentRef} for "${escrow.propertyName}" (Price: ₦${escrow.price.toLocaleString()}).`,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: escrow.buyerId,
        type: "whatsapp",
        email: escrow.buyerEmail || "",
        status: "sent",
        sent: true,
        title: "Escrow Deposit Verified",
        message: `Escrow deposit verified for "${escrow.propertyName}".\n\nNext step: Execute and sign the Deed of Assignment on your profile page to start title checks.`,
        read: false,
        createdAt: serverTimestamp(),
      });

      if (showToast) showToast("Escrow wire deposit approved successfully!");
    } catch (err) {
      console.error("[Admin Escrow] Approve deposit error:", err);
      if (showToast) showToast("Failed to approve deposit.");
    }
  };

  const handleRejectDeposit = async (escrow) => {
    if (!rejectReason.trim()) {
      if (showToast) showToast("Please input a reason for rejection.");
      return;
    }
    try {
      const escRef = doc(db, "escrows", escrow.id);
      await updateDoc(escRef, {
        paymentStatus: "Failed",
        paymentRejectedReason: rejectReason,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activity_logs"), {
        action: "escrow_deposit_rejected",
        details: `Compliance rejected wire ref ${escrow.paymentRef} for "${escrow.propertyName}". Reason: ${rejectReason}`,
        createdAt: serverTimestamp(),
      });

      if (showToast) showToast("Escrow wire deposit rejected.");
      setRejectId(null);
      setRejectType(null);
      setRejectReason("");
    } catch (err) {
      console.error("[Admin Escrow] Reject deposit error:", err);
      if (showToast) showToast("Failed to reject deposit.");
    }
  };

  const handleApproveDeed = async (escrow) => {
    try {
      const escRef = doc(db, "escrows", escrow.id);
      await updateDoc(escRef, {
        stage: 3, // Move to Release / Possession
        deedStatus: "Verified",
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activity_logs"), {
        action: "escrow_deed_approved",
        details: `AGIS search verified for "${escrow.propertyName}". Deed of assignment transfer confirmed.`,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: escrow.buyerId,
        type: "whatsapp",
        email: escrow.buyerEmail || "",
        status: "sent",
        sent: true,
        title: "Title Transfer Verified",
        message: `Deed of assignment and AGIS checks completed successfully for "${escrow.propertyName}".\n\nNext step: Release funds upon taking possession.`,
        read: false,
        createdAt: serverTimestamp(),
      });

      if (showToast) showToast("AGIS Title Deed approved successfully!");
    } catch (err) {
      console.error("[Admin Escrow] Approve deed error:", err);
      if (showToast) showToast("Failed to verify title deed.");
    }
  };

  const handleRejectDeed = async (escrow) => {
    if (!rejectReason.trim()) {
      if (showToast) showToast("Please input a reason for rejection.");
      return;
    }
    try {
      const escRef = doc(db, "escrows", escrow.id);
      await updateDoc(escRef, {
        deedStatus: "Rejected",
        deedRejectedReason: rejectReason,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activity_logs"), {
        action: "escrow_deed_rejected",
        details: `Admin rejected Deed transfer check for "${escrow.propertyName}". Reason: ${rejectReason}`,
        createdAt: serverTimestamp(),
      });

      if (showToast) showToast("Title deed review rejected.");
      setRejectId(null);
      setRejectType(null);
      setRejectReason("");
    } catch (err) {
      console.error("[Admin Escrow] Reject deed error:", err);
      if (showToast) showToast("Failed to reject deed.");
    }
  };

  const pendingWires = escrows.filter(e => e.paymentStatus === "Pending Verification");
  const pendingDeeds = escrows.filter(e => e.stage === 2 && e.deedStatus === "Pending Verification");
  const activeTransactions = escrows.filter(e => e.paymentStatus !== "Pending Verification" && e.deedStatus !== "Pending Verification");

  return (
    <div style={{ background: T.ink, borderRadius: 20, padding: 24, color: "#fff", border: `1px solid ${T.line}22`, boxShadow: "0 4px 15px rgba(0,0,0,0.05)", marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.gold, marginBottom: 8 }}>Compliance & Audits</div>
      <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 26, color: "#fff", marginBottom: 18 }}>Escrow Transaction Manager</div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: T.sub }}>Syncing ledger...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 }}>
          {/* Left Column: Wires & Deed Reviews */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Wires */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.gold, textTransform: "uppercase", marginBottom: 14 }}>Pending Wire Deposits ({pendingWires.length})</div>
              {pendingWires.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>No pending bank wires to audit.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {pendingWires.map(esc => (
                    <div key={esc.id} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, padding: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{esc.propertyName}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.gold, marginTop: 4 }}>₦{esc.price.toLocaleString()}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
                        Buyer: {esc.buyerName} <br />
                        Bank: <strong>{esc.paymentBank}</strong> | Ref: <code>{esc.paymentRef}</code>
                      </div>
                      
                      {rejectId === esc.id && rejectType === "payment" ? (
                        <div style={{ marginTop: 12 }}>
                          <input
                            type="text"
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            style={{ width: "100%", padding: 8, borderRadius: 8, border: "none", fontSize: 12.5, outline: "none", background: "#fff", color: T.ink, marginBottom: 8 }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => handleRejectDeposit(esc)} style={{ background: T.risk, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Confirm Reject</button>
                            <button onClick={() => { setRejectId(null); setRejectType(null); }} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button onClick={() => handleApproveDeposit(esc)} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Approve Wire</button>
                          <button onClick={() => { setRejectId(esc.id); setRejectType("payment"); setRejectReason(""); }} style={{ background: "transparent", color: T.risk, border: `1.5px solid ${T.risk}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deeds */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.gold, textTransform: "uppercase", marginBottom: 14 }}>Pending Deed Reviews ({pendingDeeds.length})</div>
              {pendingDeeds.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>No pending title searches to verify.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {pendingDeeds.map(esc => (
                    <div key={esc.id} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, padding: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{esc.propertyName}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                        Buyer: {esc.buyerName} <br />
                        Deed Document: <code>{esc.deedUrl}</code>
                      </div>
                      
                      {esc.signatureUrl && (
                        <div style={{ marginTop: 10 }}>
                          <span style={{ fontSize: 11, color: T.gold, fontWeight: 700 }}>EXECUTION SIGNATURE:</span>
                          <div style={{ background: "#fff", padding: 6, borderRadius: 8, width: 140, marginTop: 4 }}>
                            <img src={esc.signatureUrl} alt="Signature" style={{ width: "100%", height: "auto", display: "block" }} />
                          </div>
                        </div>
                      )}

                      {rejectId === esc.id && rejectType === "deed" ? (
                        <div style={{ marginTop: 12 }}>
                          <input
                            type="text"
                            placeholder="Reason for deed rejection..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            style={{ width: "100%", padding: 8, borderRadius: 8, border: "none", fontSize: 12.5, outline: "none", background: "#fff", color: T.ink, marginBottom: 8 }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => handleRejectDeed(esc)} style={{ background: T.risk, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Confirm Reject</button>
                            <button onClick={() => { setRejectId(null); setRejectType(null); }} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button onClick={() => handleApproveDeed(esc)} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Verify Title (AGIS)</button>
                          <button onClick={() => { setRejectId(esc.id); setRejectType("deed"); setRejectReason(""); }} style={{ background: "transparent", color: T.risk, border: `1.5px solid ${T.risk}`, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reject Deed</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Ledger Summary */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", marginBottom: 14 }}>Active Escrow Ledger ({activeTransactions.length})</div>
            {activeTransactions.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>No active escrows registered.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activeTransactions.map(esc => (
                  <div key={esc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{esc.propertyName}</div>
                      <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 2 }}>Buyer: {esc.buyerName} | Stage {esc.stage} of 4</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>₦{esc.price.toLocaleString()}</div>
                      <span style={{ fontSize: 10, color: esc.status === "Completed" ? T.mint : T.teal, fontWeight: 700 }}>{esc.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
        
        // Initialize escrow document in Firestore
        await addDoc(collection(db, "escrows"), {
          propertyId: offer.dealId || "",
          propertyName: offer.dealName,
          price: offer.offerPrice,
          buyerId: offer.userId,
          buyerName: offer.userName || "Buyer",
          buyerEmail: offer.userEmail || "",
          offerId: offer.id,
          status: "In Progress",
          stage: 1, // Stage 1: Awaiting Deposit
          paymentStatus: "Unpaid",
          fundsReleased: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
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


const VerificationsView = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingInspections, setLoadingInspections] = useState(true);
  const [kycFilter, setKycFilter] = useState("Pending"); // "Pending" | "All"
  const [inspectFilter, setInspectFilter] = useState("Pending"); // "Pending" | "All"

  // Fetch users (specifically checking for KYC submissions)
  useEffect(() => {
    setLoadingUsers(true);
    const q = query(collection(db, "users"), limit(200));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(list);
      setLoadingUsers(false);
    }, (err) => {
      console.warn("[Admin VerificationsView] Firestore users error:", err.message);
      setLoadingUsers(false);
    });
    return unsub;
  }, []);

  // Fetch inspections
  useEffect(() => {
    setLoadingInspections(true);
    const q = query(collection(db, "inspection_requests"), orderBy("createdAt", "desc"), limit(200));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setInspections(list);
      setLoadingInspections(false);
    }, (err) => {
      console.warn("[Admin VerificationsView] Firestore inspections error:", err.message);
      setLoadingInspections(false);
    });
    return unsub;
  }, []);

  // Approve KYC
  const handleApproveKyc = async (userRecord) => {
    try {
      const userRef = doc(db, "users", userRecord.id);
      await updateDoc(userRef, {
        verified: true,
        kycStatus: "Passed"
      });

      // Send compliance notification to the user
      await addDoc(collection(db, "notifications"), {
        userId: userRecord.id,
        title: "🛡️ KYC Verification Approved",
        message: `Congratulations ${userRecord.kycDetails?.fullName || "there"}! Your compliance documents have been verified. Secure distress bidding & match queries are now fully active.`,
        createdAt: serverTimestamp(),
        read: false
      });

      // Log activity
      await addDoc(collection(db, "activity_logs"), {
        userId: userRecord.id,
        action: "kyc_approved",
        details: `KYC document verification approved by compliance admin.`,
        createdAt: serverTimestamp()
      });

      showToast(`Approved KYC for ${userRecord.kycDetails?.fullName || userRecord.email} successfully!`);
    } catch (err) {
      console.error("KYC approval failed:", err);
      showToast("KYC approval failed. Try again.");
    }
  };

  // Reject KYC
  const handleRejectKyc = async (userRecord) => {
    try {
      const userRef = doc(db, "users", userRecord.id);
      await updateDoc(userRef, {
        verified: false,
        kycStatus: "Failed"
      });

      // Send failure notification
      await addDoc(collection(db, "notifications"), {
        userId: userRecord.id,
        title: "⚠️ KYC Verification Mismatch",
        message: `Your identity document verification failed to match BVN/NIN registers. Please check your credentials and resubmit.`,
        createdAt: serverTimestamp(),
        read: false
      });

      showToast(`Rejected KYC for ${userRecord.kycDetails?.fullName || userRecord.email}. Notification dispatched.`);
    } catch (err) {
      console.error("KYC rejection failed:", err);
      showToast("KYC rejection failed. Try again.");
    }
  };

  // Update inspection status
  const handleUpdateInspectionStatus = async (insp, newStatus) => {
    try {
      const inspRef = doc(db, "inspection_requests", insp.id);
      await updateDoc(inspRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Send notification to the user requesting inspection
      if (insp.userId && insp.userId !== "anonymous") {
        await addDoc(collection(db, "notifications"), {
          userId: insp.userId,
          title: `Inspection Request Update`,
          message: `Your request to inspect "${insp.dealName}" has been updated to: ${newStatus.toUpperCase()}.${newStatus === "Scheduled" ? ` Scheduled date: ${insp.preferredDate}.` : ""}`,
          createdAt: serverTimestamp(),
          read: false
        });
      }

      showToast(`Inspection request status set to ${newStatus}.`);
    } catch (err) {
      console.error("Failed to update inspection status:", err);
      showToast("Action failed. Try again.");
    }
  };

  const pendingKycUsers = users.filter(u => u.kycStatus === "Pending");
  const filteredKycUsers = kycFilter === "Pending" ? pendingKycUsers : users.filter(u => u.kycDetails);

  const pendingInspections = inspections.filter(i => !i.status || i.status === "Pending");
  const filteredInspections = inspectFilter === "Pending" ? pendingInspections : inspections;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, animation: "slideup .25s ease-out" }}>
      
      {/* KYC QUEUE PANEL */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.ink, margin: 0 }}>
              🛡️ KYC Compliance Verification Queue
            </h3>
            <p style={{ fontSize: 12.5, color: T.sub, margin: "2px 0 0 0" }}>
              Approve or reject BVN/NIN identity registration requests from active buyers.
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 2 }}>
            {["Pending", "All"].map((f) => (
              <button
                key={f}
                onClick={() => setKycFilter(f)}
                style={{
                  border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontWeight: 700,
                  cursor: "pointer", background: kycFilter === f ? T.ink : "transparent",
                  color: kycFilter === f ? "#fff" : T.sub, transition: "all .12s"
                }}
              >
                {f === "Pending" ? `Pending (${pendingKycUsers.length})` : "All Submissions"}
              </button>
            ))}
          </div>
        </div>

        {loadingUsers ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: T.sub, fontSize: 13.5 }}>
            Fetching compliance register...
          </div>
        ) : filteredKycUsers.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", background: T.paper, borderRadius: 12, border: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.ink, marginTop: 8 }}>
              {kycFilter === "Pending" ? "KYC Queue is Empty" : "No Compliance Records"}
            </div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
              All buyer identity requests are currently fully up to date.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: `1.5px solid ${T.line}`, color: T.sub, fontWeight: 700 }}>
                  <th style={{ padding: "10px 12px" }}>Buyer Details</th>
                  <th style={{ padding: "10px 12px" }}>Identity Verified</th>
                  <th style={{ padding: "10px 12px" }}>Doc Type & ID</th>
                  <th style={{ padding: "10px 12px" }}>File Attachment</th>
                  <th style={{ padding: "10px 12px" }}>Submitted At</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKycUsers.map((u) => {
                  const details = u.kycDetails || {};
                  return (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: 700, color: T.ink }}>{details.fullName || "Unspecified Name"}</div>
                        <div style={{ fontSize: 11, color: T.sub }}>UID: {u.id.slice(0, 8)}... · {u.email}</div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {u.verified ? (
                          <span style={{ color: T.green, fontWeight: 700 }}>✓ Yes</span>
                        ) : (
                          <span style={{ color: T.risk, fontWeight: 700 }}>✗ No</span>
                        )}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: 600 }}>{details.idType || "N/A"}</div>
                        <div style={{ fontSize: 11.5, color: T.sub, fontFamily: "monospace" }}>{details.idNumber || "—"}</div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        {details.documentName ? (
                          <span style={{ color: T.teal, fontSize: 12.5, textDecoration: "underline", cursor: "pointer" }} title="Attachment Preview">
                            📄 {details.documentName.length > 20 ? details.documentName.slice(0, 18) + "..." : details.documentName}
                          </span>
                        ) : (
                          <span style={{ color: T.sub, fontStyle: "italic" }}>No upload</span>
                        )}
                      </td>
                      <td style={{ padding: "12px", color: T.sub, fontSize: 12 }}>
                        {details.submittedAt ? new Date(details.submittedAt).toLocaleDateString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          background: u.kycStatus === "Passed" ? T.mint : u.kycStatus === "Pending" ? T.goldSoft : T.riskSoft,
                          color: u.kycStatus === "Passed" ? T.green : u.kycStatus === "Pending" ? "#7A5800" : T.risk,
                          padding: "2.5px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, display: "inline-block"
                        }}>
                          {u.kycStatus || "Unsubmitted"}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {u.kycStatus === "Pending" && (
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleRejectKyc(u)}
                              style={{
                                border: "none", background: T.riskSoft, color: T.risk,
                                padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                cursor: "pointer", transition: "opacity .15s"
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                            >
                              ✕ Reject
                            </button>
                            <button
                              onClick={() => handleApproveKyc(u)}
                              style={{
                                border: "none", background: T.mint, color: T.green,
                                padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                cursor: "pointer", transition: "opacity .15s"
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
                              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                            >
                              ✓ Approve
                            </button>
                          </div>
                        )}
                        {u.kycStatus === "Passed" && (
                          <span style={{ color: T.green, fontSize: 12.5, fontWeight: 600 }}>Approved</span>
                        )}
                        {u.kycStatus === "Failed" && (
                          <span style={{ color: T.risk, fontSize: 12.5, fontWeight: 600 }}>Rejected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECTION MANAGER PANEL */}
      <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 18, color: T.ink, margin: 0 }}>
              📋 Physical Inspection Request Manager
            </h3>
            <p style={{ fontSize: 12.5, color: T.sub, margin: "2px 0 0 0" }}>
              Coordinate on-site site visits for prospective property buyers.
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 8, padding: 2 }}>
            {["Pending", "All"].map((f) => (
              <button
                key={f}
                onClick={() => setInspectFilter(f)}
                style={{
                  border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11.5, fontWeight: 700,
                  cursor: "pointer", background: inspectFilter === f ? T.ink : "transparent",
                  color: inspectFilter === f ? "#fff" : T.sub, transition: "all .12s"
                }}
              >
                {f === "Pending" ? `Pending (${pendingInspections.length})` : "All Requests"}
              </button>
            ))}
          </div>
        </div>

        {loadingInspections ? (
          <div style={{ padding: "30px 0", textAlign: "center", color: T.sub, fontSize: 13.5 }}>
            Loading inspection schedules...
          </div>
        ) : filteredInspections.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", background: T.paper, borderRadius: 12, border: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 24 }}>📅</span>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.ink, marginTop: 8 }}>
              {inspectFilter === "Pending" ? "No Pending Inspections" : "No Inspection Requests"}
            </div>
            <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>
              There are no buyer requests for site visits currently.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: `1.5px solid ${T.line}`, color: T.sub, fontWeight: 700 }}>
                  <th style={{ padding: "10px 12px" }}>Property</th>
                  <th style={{ padding: "10px 12px" }}>Buyer Details</th>
                  <th style={{ padding: "10px 12px" }}>Requested Date</th>
                  <th style={{ padding: "10px 12px" }}>Created At</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((i) => {
                  const status = i.status || "Pending";
                  return (
                    <tr key={i.id} style={{ borderBottom: `1px solid ${T.line}` }}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: 700, color: T.ink }}>{i.dealName}</div>
                        <div style={{ fontSize: 11.5, color: T.sub }}>📍 {i.district} · Ref ID: {i.dealId?.slice(0, 8)}...</div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: 600 }}>{i.userEmail || "anonymous"}</div>
                        <div style={{ fontSize: 11, color: T.sub }}>UID: {i.userId?.slice(0, 8) || "—"}</div>
                      </td>
                      <td style={{ padding: "12px", fontWeight: 700, color: T.green }}>
                        📅 {i.preferredDate || "—"}
                      </td>
                      <td style={{ padding: "12px", color: T.sub, fontSize: 12 }}>
                        {i.createdAt ? (i.createdAt.toDate ? i.createdAt.toDate().toLocaleDateString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : new Date(i.createdAt).toLocaleString()) : "—"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          background: status === "Scheduled" ? T.tealSoft : status === "Completed" ? T.mint : status === "Cancelled" ? T.riskSoft : T.goldSoft,
                          color: status === "Scheduled" ? T.teal : status === "Completed" ? T.green : status === "Cancelled" ? T.risk : "#7A5800",
                          padding: "2.5px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, display: "inline-block"
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {(status === "Pending" || status === "Scheduled") && (
                            <button
                              onClick={() => handleUpdateInspectionStatus(i, "Cancelled")}
                              style={{
                                border: "none", background: "transparent", color: T.risk,
                                padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                cursor: "pointer", border: `1.5px solid ${T.risk}33`
                              }}
                            >
                              Decline
                            </button>
                          )}
                          {status === "Pending" && (
                            <button
                              onClick={() => handleUpdateInspectionStatus(i, "Scheduled")}
                              style={{
                                border: "none", background: T.teal, color: "#fff",
                                padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                cursor: "pointer", boxShadow: "0 2px 8px rgba(14,107,117,.18)"
                              }}
                            >
                              Schedule Visit
                            </button>
                          )}
                          {status === "Scheduled" && (
                            <button
                              onClick={() => handleUpdateInspectionStatus(i, "Completed")}
                              style={{
                                border: "none", background: T.green, color: "#fff",
                                padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                                cursor: "pointer", boxShadow: "0 2px 8px rgba(14,90,58,.18)"
                              }}
                            >
                              ✓ Mark Done
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};


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
  const [showChangePassword, setShowChangePassword] = useState(false);

  // ── Live unread counters for nav badges ──────────────────────────────────
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [pendingKycCount, setPendingKycCount] = useState(0);
  const [pendingInspectCount, setPendingInspectCount] = useState(0);
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [unreadAdminNotifs, setUnreadAdminNotifs] = useState(0);

  useEffect(() => {
    // Pending offers count
    const q1 = query(collection(db, "offers"), orderBy("createdAt", "desc"));
    const u1 = onSnapshot(q1, (s) => {
      setPendingOffersCount(s.docs.filter(d => d.data().status === "Submitted").length);
    }, () => {});

    // Pending KYC count
    const q2 = query(collection(db, "users"), limit(200));
    const u2 = onSnapshot(q2, (s) => {
      setPendingKycCount(s.docs.filter(d => d.data().kycStatus === "Pending").length);
    }, () => {});

    // Pending inspection requests count
    const q3 = query(collection(db, "inspection_requests"), orderBy("createdAt", "desc"), limit(200));
    const u3 = onSnapshot(q3, (s) => {
      setPendingInspectCount(s.docs.filter(d => !d.data().status || d.data().status === "Pending").length);
    }, () => {});

    // Admin notification inbox
    const q4 = query(collection(db, "admin_notifications"), orderBy("createdAt", "desc"), limit(50));
    const u4 = onSnapshot(q4, (s) => {
      const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setAdminNotifs(list);
      setUnreadAdminNotifs(list.filter(n => !n.read).length);
    }, () => {});

    return () => { u1(); u2(); u3(); u4(); };
  }, []);

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

  if (!unlocked) return <AdminLoginGate onUnlock={() => setUnlocked(true)} />;


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

          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,.7)", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: 3 }}>
            {[
              ["deals", "Deal Management", 0],
              ["inbox", "📬 Inbox", unreadAdminNotifs],
              ["offers", "Buyer Offers", pendingOffersCount],
              ["escrow", "Escrow Manager", 0],
              ["verifications", `KYC & Inspections`, pendingKycCount + pendingInspectCount],
              ["analytics", "Analytics", 0]
            ].map(([k, label, badge]) => (
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
                  background: adminTab === k ? T.green : "transparent",
                  color: adminTab === k ? "#fff" : T.sub,
                  transition: "all .18s ease",
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                {label}
                {badge > 0 && (
                  <span style={{
                    background: adminTab === k ? "rgba(255,255,255,.3)" : T.risk,
                    color: "#fff",
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 5px",
                    minWidth: 16,
                    textAlign: "center",
                    lineHeight: "14px",
                  }}>{badge}</span>
                )}
              </button>
            ))}
          </div>

          <Btn kind="ghost" small onClick={() => setShowChangePassword(true)}>Change Password</Btn>
          <Btn kind="ghost" small onClick={onBack}>Back to App</Btn>
          {adminTab === "deals" && <Btn kind="primary" small onClick={() => setModal("new")}>New Deal</Btn>}
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 20px 80px" }}>

        {/* Inbox tab — admin_notifications from Cloud Functions */}
        {adminTab === "inbox" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "slideup .25s ease-out" }}>
            <div style={{ background: `linear-gradient(135deg, ${T.ink} 0%, #1A3E31 100%)`, borderRadius: 18, padding: "24px", color: "#fff" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.gold, marginBottom: 8 }}>Operations Inbox</div>
              <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: 24 }}>📬 Admin Notifications</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 4 }}>Real-time alerts from buyer activity — new offers and inspection requests.</div>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ background: T.mint, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: T.green }}>
                  Inbox ({adminNotifs.length}) · {unreadAdminNotifs} unread
                </div>
                {unreadAdminNotifs > 0 && (
                  <button
                    onClick={async () => {
                      const unread = adminNotifs.filter(n => !n.read);
                      await Promise.all(unread.map(n => updateDoc(doc(db, "admin_notifications", n.id), { read: true })));
                      showToast("All marked as read ✓");
                    }}
                    style={{ border: "none", background: T.green, color: "#fff", padding: "5px 12px", borderRadius: 7, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {adminNotifs.length === 0 ? (
                <div style={{ padding: "40px 24px", textAlign: "center", color: T.sub }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>✉️</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Inbox is empty</div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>New buyer offers and inspection requests will appear here automatically.</div>
                </div>
              ) : (
                adminNotifs.map((n, i) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "16px 20px",
                      borderBottom: i < adminNotifs.length - 1 ? `1px solid ${T.line}` : "none",
                      background: n.read ? "#fff" : "#FAFDF9",
                      display: "flex", gap: 14, alignItems: "flex-start",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: n.type === "offer_received" ? T.mint : T.tealSoft,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>
                      {n.type === "offer_received" ? "🏡" : "📋"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink, display: "flex", alignItems: "center", gap: 8 }}>
                        {n.title}
                        {!n.read && <span style={{ background: T.risk, color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800, padding: "1px 5px" }}>NEW</span>}
                      </div>
                      {n.buyerName && <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>From: <strong>{n.buyerName}</strong> · {n.buyerEmail}</div>}
                      {n.offerPrice && <div style={{ fontSize: 13, fontWeight: 800, color: T.green, marginTop: 4 }}>₦{Number(n.offerPrice).toLocaleString()}</div>}
                      {n.dealName && <div style={{ fontSize: 12, color: T.sub }}>Property: {n.dealName} · {n.district}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: T.sub }}>
                        {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => updateDoc(doc(db, "admin_notifications", n.id), { read: true })}
                          style={{ border: "none", background: "transparent", color: T.teal, fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => { setAdminTab(n.type === "offer_received" ? "offers" : "verifications"); }}
                        style={{ border: `1.5px solid ${T.green}`, background: "transparent", color: T.green, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "3px 8px", borderRadius: 6 }}
                      >
                        View →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Escrow Manager tab */}
        {adminTab === "escrow" && <EscrowManagerView showToast={showToast} />}

        {/* Offers tab */}
        {adminTab === "offers" && <OffersView showToast={showToast} />}

        {/* Verifications tab */}
        {adminTab === "verifications" && <VerificationsView showToast={showToast} />}

        {/* Analytics tab */}
        {adminTab === "analytics" && <AnalyticsView deals={deals} />}
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

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          showToast={showToast}
        />
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
