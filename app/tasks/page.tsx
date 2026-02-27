"use client";
import { useEffect, useState } from "react";
import { getTasksForDate, upsertTask, toggleTask } from "@/lib/supabase/queries";
import { supabase } from "@/lib/supabase/client";
import { computeMomentum } from "@/lib/momentum/engine";
import TaskItem from "@/components/tasks/TaskItem";
import AddTaskBar from "@/components/tasks/AddTaskBar";
import { format } from "date-fns";
import type { Task } from "@/types";

const today = format(new Date(), "yyyy-MM-dd");

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const t = await getTasksForDate(today);
    setTasks(t);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id: string) => {
    await toggleTask(id);
    await computeMomentum(today);
    load();
  };

  const handleAdd = async (title: string, priority: number) => {
    await upsertTask({
      id: Math.random().toString(36).slice(2),
      date: today,
      title,
      completed: false,
      priority: priority as 1 | 2 | 3,
      created_at: Date.now(),
    });
    await computeMomentum(today);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    await computeMomentum(today);
    load();
  };

  const handleEdit = async (id: string, title: string) => {
    await supabase.from("tasks").update({ title }).eq("id", id);
    load();
  };

  const completed = tasks.filter(t => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ paddingTop: "8px" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Tasks</p>
        <p style={{ fontSize: "20px", fontWeight: 700, color: "white", marginTop: "4px" }}>{format(new Date(), "EEEE, MMM d")}</p>
      </div>

      {/* Progress card */}
      <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "12px" }}>
          <div>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Completion</p>
            <p style={{ fontSize: "36px", fontWeight: 700, color: "white", lineHeight: 1 }}>{pct}%</p>
          </div>
          <p style={{ color: "#52525b", fontSize: "13px" }}>{completed}/{tasks.length} done</p>
        </div>
        <div style={{ height: "3px", background: "#27272a", borderRadius: "999px" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#34d399" : "white", borderRadius: "999px", transition: "width 500ms ease-out" }} />
        </div>
      </div>

      <AddTaskBar onAdd={handleAdd} />

      {tasks.length === 0 ? (
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
          <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No tasks today</p>
          <p style={{ color: "#3f3f46", fontSize: "11px", marginTop: "8px" }}>Add something to get started</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {tasks
            .sort((a, b) => a.priority - b.priority || (a.completed ? 1 : -1))
            .map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
        </div>
      )}
    </div>
  );
}
