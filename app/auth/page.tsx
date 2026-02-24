"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async () => {
    setError("");
    if (!email || !password) { setError("Email and password required."); return; }
    if (mode === "signup" && !username) { setError("Username required."); return; }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.user) {
          const { error: profileErr } = await supabase
            .from("profiles")
            .insert({ id: data.user.id, username });
          if (profileErr) throw profileErr;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#09090b",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "32px" }}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.3em", color: "#52525b", textTransform: "uppercase" }}>
            LifeOS
          </p>
          <p style={{ fontSize: "28px", fontWeight: 700, color: "white", marginTop: "8px" }}>
            {mode === "login" ? "Welcome back." : "Create account."}
          </p>
          <p style={{ color: "#52525b", fontSize: "14px", marginTop: "4px" }}>
            {mode === "login" ? "Sign in to continue." : "Start optimizing your life."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mode === "signup" && (
            <input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{
                width: "100%", background: "#18181b", border: "1px solid #27272a",
                borderRadius: "16px", padding: "16px", color: "white",
                fontSize: "14px", outline: "none", boxSizing: "border-box",
              }}
            />
          )}
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: "100%", background: "#18181b", border: "1px solid #27272a",
              borderRadius: "16px", padding: "16px", color: "white",
              fontSize: "14px", outline: "none", boxSizing: "border-box",
            }}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            style={{
              width: "100%", background: "#18181b", border: "1px solid #27272a",
              borderRadius: "16px", padding: "16px", color: "white",
              fontSize: "14px", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>
        )}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            width: "100%", padding: "16px", borderRadius: "16px",
            background: loading ? "#a1a1aa" : "white", color: "black",
            fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em",
            textTransform: "uppercase", border: "none", cursor: "pointer",
          }}
        >
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          style={{
            background: "none", border: "none", color: "#52525b",
            fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", padding: "8px",
          }}
        >
          {mode === "login" ? "No account? Sign up →" : "Have an account? Sign in →"}
        </button>
      </div>
    </div>
  );
}
