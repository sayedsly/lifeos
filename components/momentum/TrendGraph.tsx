"use client";
import type { MomentumSnapshot } from "@/types";
import { format, subDays } from "date-fns";

interface Props { data: MomentumSnapshot[]; }

export default function TrendGraph({ data }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const snap = data.find(d => d.date === date);
    return { date, score: snap?.score || 0, label: format(subDays(new Date(), 6 - i), "EEE") };
  });

  const max = Math.max(...days.map(d => d.score), 1);
  const BAR_HEIGHT = 56;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: `${BAR_HEIGHT + 40}px` }}>
      {days.map((day, i) => {
        const isToday = i === 6;
        const barH = day.score > 0 ? Math.max((day.score / max) * BAR_HEIGHT, 4) : 3;
        return (
          <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%", justifyContent: "flex-end" }}>
            {day.score > 0 && (
              <p style={{ fontSize: "9px", fontWeight: 700, color: isToday ? "#111118" : "#9ca3af" }}>{day.score}</p>
            )}
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
              <div style={{
                width: "100%", height: `${barH}px`,
                background: isToday ? "#111118" : day.score > 0 ? "#d1d5db" : "#f1f5f9",
                borderRadius: "4px 4px 2px 2px",
                transition: "height 0.7s ease-out",
              }} />
            </div>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: isToday ? "#111118" : "#9ca3af" }}>
              {day.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}