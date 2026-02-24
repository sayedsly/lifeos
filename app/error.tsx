"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px" }}>
      <p style={{ color: "#f87171", fontWeight: 700, fontSize: "16px" }}>Something went wrong</p>
      <p style={{ color: "#52525b", fontSize: "12px", textAlign: "center" }}>{error.message}</p>
      <button onClick={reset} style={{ padding: "12px 24px", borderRadius: "12px", background: "white", color: "black", fontWeight: 700, fontSize: "12px", border: "none", cursor: "pointer" }}>
        Try Again
      </button>
      <button onClick={() => window.location.href = "/auth"} style={{ background: "none", border: "none", color: "#52525b", fontSize: "12px", cursor: "pointer" }}>
        Sign Out
      </button>
    </div>
  );
}
