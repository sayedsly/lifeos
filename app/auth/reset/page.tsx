"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  // If there's a hash in the URL, we're in update mode (came from email link)
  const isUpdate = typeof window !== "undefined" && window.location.hash.includes("access_token");

  const requestReset = async () => {
    if (!email.trim()) { setError("Email required."); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://lifeos-iota-wine.vercel.app/auth/reset",
    });
    if (err) setError(err.message);
    else setMessage("Check your email for a reset link.");
    setLoading(false);
  };

  const updatePassword = async () => {
    if (!password) { setError("Password required."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6) { setError("Must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError(err.message);
    else { setMessage("Password updated! Redirecting..."); setTimeout(() => router.push("/"), 1500); }
    setLoading(false);
  };

  const inputStyle = { width: "100%", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", color: "white", fontSize: "15px", outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.3em", color: "#52525b", textTransform: "uppercase", marginBottom: "8px" }}>LifeOS</p>
          <p style={{ fontSize: "26px", fontWeight: 700, color: "white" }}>{isUpdate ? "Set New Password" : "Reset Password"}</p>
        </div>

        {message ? (
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "20px" }}>
            <p style={{ color: "#34d399", fontSize: "14px" }}>{message}</p>
          </div>
        ) : (
          <>
            {!isUpdate && <input placeholder="Your email" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && requestReset()} style={inputStyle} />}
            {isUpdate && <>
              <input placeholder="New password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
              <input placeholder="Confirm password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === "Enter" && updatePassword()} style={inputStyle} />
            </>}
            {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}
            <button onClick={isUpdate ? updatePassword : requestReset} disabled={loading}
              style={{ width: "100%", padding: "16px", borderRadius: "16px", background: "white", color: "black", fontWeight: 700, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" as const, border: "none", cursor: "pointer" }}>
              {loading ? "Please wait..." : isUpdate ? "Update Password" : "Send Reset Link"}
            </button>
          </>
        )}

        <button onClick={() => router.push("/auth")} style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
          ← Back to Login
        </button>
      </div>
    </div>
  );
}
