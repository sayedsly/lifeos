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
          await supabase.from("profiles").insert({ id: data.user.id, username });
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: { minHeight: "100vh", background: "#09090b", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "24px" },
    wrap: { width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column" as const, gap: "24px" },
    input: { width: "100%", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px", color: "white", fontSize: "15px", outline: "none", boxSizing: "border-box" as const },
    btn: (active: boolean) => ({ width: "100%", padding: "16px", borderRadius: "16px", background: active ? "#a1a1aa" : "white", color: "black", fontWeight: 700, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" as const, border: "none", cursor: "pointer" }),
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div>
          <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.3em", color: "#52525b", textTransform: "uppercase" }}>LifeOS</p>
          <p style={{ fontSize: "28px", fontWeight: 700, color: "white", marginTop: "8px" }}>{mode === "login" ? "Welcome back." : "Create account."}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {mode === "signup" && <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={s.input} />}
          <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={s.input} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={s.input} />
        </div>
        {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}
        <button onClick={submit} disabled={loading} style={s.btn(loading)}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
          {mode === "login" ? "No account? Sign up →" : "Have an account? Sign in →"}
        </button>
      </div>
    </div>
  );
}
