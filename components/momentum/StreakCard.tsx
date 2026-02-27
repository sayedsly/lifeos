"use client";
interface Props { streak: number; }

export default function StreakCard({ streak }: Props) {
  if (streak === 0) return null;
  const getMessage = (s: number) => {
    if (s >= 30) return "Legendary consistency 🐐";
    if (s >= 14) return "Two weeks strong 💪";
    if (s >= 7) return "Full week locked in 🔥";
    if (s >= 3) return "Building momentum ⚡";
    return "Keep it going!";
  };
  return (
    <div style={{ background: "#18181b", border: `1px solid ${streak >= 7 ? "#f59e0b" : "#27272a"}`, borderRadius: "24px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: streak >= 7 ? "rgba(245,158,11,0.1)" : "#27272a", borderRadius: "16px", padding: "12px 16px", flexShrink: 0 }}>
        <p style={{ fontSize: "32px", fontWeight: 800, color: streak >= 7 ? "#f59e0b" : "white", lineHeight: 1 }}>{streak}</p>
        <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: streak >= 7 ? "#f59e0b" : "#52525b", textTransform: "uppercase", marginTop: "2px" }}>Day Streak</p>
      </div>
      <div>
        <p style={{ color: "white", fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>{getMessage(streak)}</p>
        <p style={{ color: "#52525b", fontSize: "12px" }}>
          {streak >= 7 ? "You've earned the 🔥 badge" : `${7 - streak} more days to earn 🔥`}
        </p>
      </div>
    </div>
  );
}
