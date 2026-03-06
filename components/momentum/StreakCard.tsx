"use client";
interface Props { streak: number; }
export default function StreakCard({ streak }: Props) {
  if (!streak) return null;
  return (
    <div style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)", borderRadius: "24px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px", boxShadow: "0 4px 16px rgba(245,158,11,0.2)" }}>
      <span style={{ fontSize: "40px", filter: "drop-shadow(0 2px 8px rgba(245,158,11,0.4))" }}>🔥</span>
      <div>
        <p style={{ fontSize: "40px", fontWeight: 900, color: "#92400e", letterSpacing: "-2px", lineHeight: 1 }}>{streak}</p>
        <p style={{ fontSize: "10px", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: "2px" }}>day streak</p>
      </div>
      <p style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 700, color: "#92400e", opacity: 0.6 }}>Keep it up!</p>
    </div>
  );
}