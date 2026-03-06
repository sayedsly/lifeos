"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getTasksForDate, toggleTask, getRecurringTasks, addRecurringTask, deleteRecurringTask, seedRecurringTasksForToday } from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import TaskItem from "@/components/tasks/TaskItem";
import type { Task, RecurringTask } from "@/types";
import { format } from "date-fns";

export default function TasksPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurring, setRecurring] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<1|2|3>(2);
  const [newRecurring, setNewRecurring] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);

  const load = async () => {
    await seedRecurringTasksForToday(today);
    const [t, r] = await Promise.all([getTasksForDate(today), getRecurringTasks()]);
    setTasks(t); setRecurring(r); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id: string) => {
    await toggleTask(id);
    await computeMomentum(today);
    load();
  };

  const handleDelete = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
    await computeMomentum(today);
    load();
  };

  const handleEdit = async (id: string, title: string) => {
    await supabase.from("tasks").update({ title }).eq("id", id);
    load();
  };

  const handleAdd = async () => {
    if (!newTask.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("tasks").insert({ id: Math.random().toString(36).slice(2), user_id: user.id, date: today, title: newTask.trim(), completed: false, priority: newPriority, created_at: Date.now() });
      setNewTask("");
      await computeMomentum(today);
      load();
    }
    setSaving(false);
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
  const priorityColor = (p: number) => p === 1 ? "#ef4444" : p === 2 ? "#f59e0b" : "#9ca3af";

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#9ca3af", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "16px" }}>
      {/* Header */}
      <div style={{ padding: "0 4px" }}>
        <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>{format(new Date(), "EEEE, MMM d")}</p>
        <p style={{ fontSize: "26px", fontWeight: 900, color: "#111118", letterSpacing: "-0.5px" }}>Tasks</p>
      </div>

      {/* Progress card */}
      <div style={{ background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)", borderRadius: "24px", padding: "18px 20px", boxShadow: "0 4px 16px rgba(99,102,241,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "48px", fontWeight: 900, color: "#3730a3", letterSpacing: "-3px", lineHeight: 1 }}>{pct}%</p>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>{completed} of {tasks.length} done</p>
        </div>
        <div style={{ flex: 1, marginLeft: "20px" }}>
          <div style={{ height: "6px", background: "rgba(99,102,241,0.2)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#6366f1", borderRadius: "999px", transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
          </div>
        </div>
      </div>

      {/* Task list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
        ))}
        {tasks.length === 0 && (
          <div style={{ background: "white", borderRadius: "20px", padding: "32px 20px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "28px", marginBottom: "8px" }}>✅</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>No tasks yet</p>
            <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "4px" }}>Add a task below to get started</p>
          </div>
        )}
      </div>

      {/* Add task */}
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1, background: "white", borderRadius: "16px", padding: "4px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ display: "flex", gap: "2px", padding: "0 4px" }}>
            {([1,2,3] as const).map(p => (
              <button key={p} onClick={() => setNewPriority(p)}
                style={{ width: 10, height: 10, borderRadius: "50%", border: "none", cursor: "pointer", background: newPriority === p ? priorityColor(p) : "#e5e7eb" }} />
            ))}
          </div>
          <input value={newTask} onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Add a task..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", fontWeight: 600, color: "#111118", padding: "10px 4px", fontFamily: "inherit" }} />
        </div>
        <button className="btn-press" onClick={handleAdd} disabled={saving || !newTask.trim()}
          style={{ width: 46, height: 46, background: newTask.trim() ? "#111118" : "#e5e7eb", border: "none", borderRadius: "14px", color: newTask.trim() ? "white" : "#9ca3af", fontSize: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
      </div>

      {/* Recurring tasks */}
      <button onClick={() => setShowRecurring(!showRecurring)}
        style={{ background: "white", border: "none", borderRadius: "16px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", fontFamily: "inherit", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>🔁</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>Recurring Tasks</span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#9ca3af", background: "#f1f5f9", borderRadius: "6px", padding: "1px 6px" }}>{recurring.length}</span>
        </div>
        <span style={{ color: "#9ca3af", fontSize: "18px" }}>{showRecurring ? "▾" : "›"}</span>
      </button>

      {showRecurring && (
        <div style={{ background: "white", borderRadius: "20px", padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "8px" }}>
          {recurring.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: "1px solid #f7f8fc" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: priorityColor(r.priority), flexShrink: 0 }} />
              <p style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: "#374151" }}>{r.title}</p>
              <button onClick={() => handleDeleteRecurring(r.id)}
                style={{ width: 28, height: 28, borderRadius: "8px", background: "#fef2f2", border: "none", cursor: "pointer", fontSize: "16px", color: "#ef4444" }}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <input value={newRecurring} onChange={e => setNewRecurring(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddRecurring()}
              placeholder="New recurring task..."
              style={{ flex: 1, background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit" }} />
            <button className="btn-press" onClick={handleAddRecurring} disabled={saving || !newRecurring.trim()}
              style={{ padding: "10px 16px", background: "#111118", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}