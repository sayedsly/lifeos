"use client";
import type { MomentumSnapshot } from "@/types";
import { format, subDays } from "date-fns";

interface Props {
  data: MomentumSnapshot[];
}

export default function TrendGraph({ data }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const snap = data.find(d => d.date === date);
    return {
      date,
      score: snap?.score || 0,
      label: format(subDays(new Date(), 6 - i), "EEE"),
    };
  });

  const max = Math.max(...days.map(d => d.score), 1);
  const BAR_HEIGHT = 56;

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5">
      <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "16px" }}>
        7-Day Trend
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: `${BAR_HEIGHT + 32}px` }}>
        {days.map((day, i) => {
          const isToday = i === 6;
          const barH = day.score > 0 ? Math.max((day.score / max) * BAR_HEIGHT, 4) : 2;
          return (
            <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              {day.score > 0 && (
                <p style={{ fontSize: "9px", color: isToday ? "white" : "#52525b" }}>{day.score}</p>
              )}
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                <div style={{
                  width: "100%",
                  height: `${barH}px`,
                  background: isToday ? "white" : day.score > 0 ? "#52525b" : "#27272a",
                  borderRadius: "3px 3px 0 0",
                  transition: "height 700ms ease-out",
                }} />
              </div>
              <p style={{
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: isToday ? "white" : "#3f3f46",
              }}>
                {day.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
