"use client";
import { useEffect, useState } from "react";
import { getTasksForDate, toggleTask, getRecurringTasks, addRecurringTask, deleteRecurringTask, seedRecurringTasksForToday } from "@/lib/supabase/queries";
import { supabase } from "@/lib/supabase/client";
import { computeMomentum } from "@/lib/momentum/engine";
import TaskItem from "@/components/tasks/TaskItem";
import AddTaskBar from "@/components/tasks/AddTaskBar";
import { format } from "date-fns";
import type { Task, RecurringTask } from "@/types";

const today = format(new Date(), "yyyy-MM-dd");

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurring, setRecurring] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "recurring">("today");
  const [newRecurring, setNewRecurring] = useState("");
  const [newPriority, setNewPriority] = useState<1|2|3>(2);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    await seedRecurringTasksForToday(today);
    const [t, r] = await Promise.all([getTasksForDate(today), getRecurringTasks()]);
    setTasks(t);
    setRecurring(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id: string) => {
    await toggleTask(id);
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

  const handleAddRecurring = async () => {
    if (!newRecurring.trim()) return;
    setSaving(true);
    await addRecurringTask({ id: Math.random().toString(36).slice(2), title: newRecurring.trim(), priority: newPriority, createdAt: Date.now() });
    setNewRecurring("");
    setSaving(false);
    load();
  };

  const handleDeleteRecurring = async (id: string) => {
    await deleteRecurringTask(id);
    load();
  };

  const completed = tasks.filter(t => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const priorityColor = (p: number) => p === 1 ? "#ef4444" : p === 2 ? "#f59e0b" : "#52525b";

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

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "4px" }}>
        {(["today", "recurring"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, background: tab === t ? "white" : "transparent", color: tab === t ? "black" : "#52525b" }}>
            {t === "today" ? `Today${tasks.length > 0 ? ` (${completed}/${tasks.length})` : ""}` : `🔁 Daily (${recurring.length})`}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <>
          {/* Progress */}
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

          <AddTaskBar onAdd={load} />

          {tasks.length === 0 ? (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No tasks today</p>
              <p style={{ color: "#3f3f46", fontSize: "11px", marginTop: "8px" }}>Add something or set up daily tasks</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {tasks
                .sort((a, b) => a.priority - b.priority || (a.completed ? 1 : -1))
                .map(task => (
                  <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
                ))}
            </div>
          )}
        </>
      )}

      {tab === "recurring" && (
        <>
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.2em", color: "#52525b", textTransform: "uppercase" }}>Add Daily Task</p>
            <input placeholder="Task that repeats every day..." value={newRecurring} onChange={e => setNewRecurring(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddRecurring()}
              style={{ width: "100%", background: "#27272a", border: "none", borderRadius: "14px", padding: "12px 16px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" as const }} />
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <p style={{ fontSize: "10px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em", flexShrink: 0 }}>Priority</p>
              {([1, 2, 3] as const).map(p => (
                <button key={p} onClick={() => setNewPriority(p)}
                  style={{ padding: "8px 14px", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700, background: newPriority === p ? "white" : "#27272a", color: newPriority === p ? "black" : "#52525b" }}>
                  {p === 1 ? "High" : p === 2 ? "Mid" : "Low"}
                </button>
              ))}
              <button onClick={handleAddRecurring} disabled={saving || !newRecurring.trim()}
                style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: "10px", background: newRecurring.trim() ? "white" : "#27272a", border: "none", color: newRecurring.trim() ? "black" : "#52525b", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
                Add
              </button>
            </div>
          </div>

          {recurring.length === 0 ? (
            <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "40px 20px", textAlign: "center" }}>
              <p style={{ color: "#52525b", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase" }}>No daily tasks yet</p>
              <p style={{ color: "#3f3f46", fontSize: "11px", marginTop: "8px" }}>Add tasks that auto-appear every day</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recurring.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: priorityColor(r.priority), flexShrink: 0 }} />
                  <p style={{ flex: 1, color: "white", fontSize: "14px" }}>{r.title}</p>
                  <p style={{ fontSize: "10px", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {r.priority === 1 ? "High" : r.priority === 2 ? "Mid" : "Low"}
                  </p>
                  <button onClick={() => handleDeleteRecurring(r.id)}
                    style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "18px", cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "16px", padding: "16px 20px" }}>
            <p style={{ color: "#52525b", fontSize: "12px", lineHeight: "1.6" }}>
              Daily tasks automatically appear in Today's list every morning. Completing them resets the next day.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
