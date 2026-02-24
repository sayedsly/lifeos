"use client";
import { useEffect, useState } from "react";
import { getTasksForDate, upsertTask, toggleTask } from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import { useLifeStore } from "@/store/useLifeStore";
import TaskItem from "@/components/tasks/TaskItem";
import AddTaskBar from "@/components/tasks/AddTaskBar";
import type { Task } from "@/types";
import { format } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { refreshMomentum } = useLifeStore();

  const load = async () => {
    const t = await getTasksForDate(today());
    setTasks(t.sort((a, b) => a.priority - b.priority));
  };

  const refresh = async () => {
    await computeMomentum(today());
    refreshMomentum();
    load();
  };

  useEffect(() => { load(); }, []);

  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="pt-2 pb-1">
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Tasks</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{format(new Date(), "EEEE, MMM d")}</p>
      </div>

      {total > 0 && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Completion</p>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em", color: "#a1a1aa", textTransform: "uppercase" }}>{completed}/{total}</p>
          </div>
          <div style={{ height: "3px", background: "#27272a", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: pct === 100 ? "#34d399" : "white",
              borderRadius: "999px", transition: "width 500ms ease-out"
            }} />
          </div>
        </div>
      )}

      <AddTaskBar onAdd={refresh} />

      {tasks.length > 0 && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", overflow: "hidden" }}>
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} onToggle={refresh} />
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
          <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No tasks today</p>
        </div>
      )}
    </div>
  );
}
