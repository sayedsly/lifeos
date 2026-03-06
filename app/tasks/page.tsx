"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getTasksForDate, toggleTask, getRecurringTasks, addRecurringTask, deleteRecurringTask, seedRecurringTasksForToday } from "@/lib/supabase/queries";
import { computeMomentum } from "@/lib/momentum/engine";
import TaskItem from "@/components/tasks/TaskItem";
import type { Task, RecurringTask } from "@/types";
import { format } from "date-fns";

const PRIORITY_CONFIG = [
  { val: 1, label: "High", color: "#ef4444", bg: "#fee2e2" },
  { val: 2, label: "Med", color: "#f59e0b", bg: "#fef3c7" },
  { val: 3, label: "Low", color: "#9ca3af", bg: "#f3f4f6" },
] as const;

const FREQ_OPTIONS = [
  { val: "daily", label: "Daily", emoji: "📅" },
  { val: "weekdays", label: "Weekdays", emoji: "💼" },
  { val: "weekly", label: "Weekly", emoji: "📆" },
  { val: "monthly", label: "Monthly", emoji: "🗓️" },
] as const;

export default function TasksPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recurring, setRecurring] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<1|2|3>(2);
  const [newRecurring, setNewRecurring] = useState("");
  const [newRecurringPriority, setNewRecurringPriority] = useState<1|2|3>(2);
  const [newFrequency, setNewFrequency] = useState<"daily"|"weekdays"|"weekly"|"monthly">("daily");
  const [saving, setSaving] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [addingRecurring, setAddingRecurring] = useState(false);

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
    await addRecurringTask({ id: Math.random().toString(36).slice(2), title: newRecurring.trim(), priority: newRecurringPriority, frequency: newFrequency, createdAt: Date.now() });
    setNewRecurring(""); setAddingRecurring(false);
    setSaving(false);
    load();
  };

  const handleDeleteRecurring = async (id: string) => {
    await deleteRecurringTask(id);
    load();
  };

  const completed = tasks.filter(t => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

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
          <p style={{ fontSize: "10px", color: "#6366f1", fontWeight: 600, marginTop: "6px" }}>
            {pct === 100 ? "🎉 All done!" : `${tasks.length - completed} remaining`}
          </p>
        </div>
      </div>

      {/* Priority filter chips */}
      <div style={{ display: "flex", gap: "6px" }}>
        {PRIORITY_CONFIG.map(p => {
          const count = tasks.filter(t => t.priority === p.val && !t.completed).length;
          if (count === 0) return null;
          return (
            <div key={p.val} style={{ padding: "5px 12px", borderRadius: "999px", background: p.bg, display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
              <p style={{ fontSize: "10px", fontWeight: 700, color: p.color }}>{count} {p.label}</p>
            </div>
          );
        })}
      </div>

      {/* Task list - sorted by priority */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {[...tasks].sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return a.priority - b.priority;
        }).map(task => (
          <TaskItem key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleEdit} />
        ))}
        {tasks.length === 0 && (
          <div style={{ background: "white", borderRadius: "20px", padding: "32px 20px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "28px", marginBottom: "8px" }}>✅</p>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>No tasks yet</p>
            <p style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, marginTop: "4px" }}>Add a task below</p>
          </div>
        )}
      </div>

      {/* Add task */}
      <div style={{ background: "white", borderRadius: "20px", padding: "14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Priority picker */}
        <div style={{ display: "flex", gap: "6px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.12em", alignSelf: "center", marginRight: "4px" }}>Priority</p>
          {PRIORITY_CONFIG.map(p => (
            <button key={p.val} onClick={() => setNewPriority(p.val)}
              style={{ flex: 1, padding: "7px", borderRadius: "10px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "11px", fontWeight: 700,
                background: newPriority === p.val ? p.bg : "#f7f8fc",
                color: newPriority === p.val ? p.color : "#9ca3af",
                outline: newPriority === p.val ? `2px solid ${p.color}` : "none",
                transition: "all 0.15s",
              }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input value={newTask} onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Add a task..."
            style={{ flex: 1, background: "#f7f8fc", border: "1.5px solid #e5e7eb", borderRadius: "12px", padding: "11px 14px", fontSize: "14px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit" }} />
          <button onClick={handleAdd} disabled={saving || !newTask.trim()}
            style={{ width: 46, height: 46, background: newTask.trim() ? "#111118" : "#e5e7eb", border: "none", borderRadius: "14px", color: newTask.trim() ? "white" : "#9ca3af", fontSize: "22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
        </div>
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
          {recurring.map(r => {
            const pc = PRIORITY_CONFIG.find(p => p.val === r.priority)!;
            const fc = FREQ_OPTIONS.find(f => f.val === r.frequency)!;
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: "1px solid #f7f8fc" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: pc.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{r.title}</p>
                  <div style={{ display: "flex", gap: "4px", marginTop: "3px" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: pc.color, background: pc.bg, padding: "1px 6px", borderRadius: "4px" }}>{pc.label}</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px" }}>{fc?.emoji} {fc?.label}</span>
                  </div>
                </div>
                <button onClick={() => handleDeleteRecurring(r.id)}
                  style={{ width: 28, height: 28, borderRadius: "8px", background: "#fef2f2", border: "none", cursor: "pointer", fontSize: "16px", color: "#ef4444" }}>×</button>
              </div>
            );
          })}

          {!addingRecurring ? (
            <button onClick={() => setAddingRecurring(true)}
              style={{ padding: "11px", borderRadius: "12px", background: "#f7f8fc", border: "1.5px dashed #e5e7eb", color: "#6b7280", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              + Add Recurring Task
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", background: "#f7f8fc", borderRadius: "14px" }}>
              <input value={newRecurring} onChange={e => setNewRecurring(e.target.value)}
                placeholder="Task name..."
                autoFocus
                style={{ background: "white", border: "1.5px solid #e5e7eb", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", fontWeight: 600, color: "#111118", outline: "none", fontFamily: "inherit" }} />
              
              <div style={{ display: "flex", gap: "5px" }}>
                <p style={{ fontSize: "9px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "center", marginRight: "2px" }}>Priority</p>
                {PRIORITY_CONFIG.map(p => (
                  <button key={p.val} onClick={() => setNewRecurringPriority(p.val)}
                    style={{ flex: 1, padding: "6px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "10px", fontWeight: 700,
                      background: newRecurringPriority === p.val ? p.bg : "white",
                      color: newRecurringPriority === p.val ? p.color : "#9ca3af",
                      outline: newRecurringPriority === p.val ? `1.5px solid ${p.color}` : "none",
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "5px" }}>
                <p style={{ fontSize: "9px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "center", marginRight: "2px" }}>Repeat</p>
                {FREQ_OPTIONS.map(f => (
                  <button key={f.val} onClick={() => setNewFrequency(f.val)}
                    style={{ flex: 1, padding: "6px 4px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "9px", fontWeight: 700,
                      background: newFrequency === f.val ? "#e0e7ff" : "white",
                      color: newFrequency === f.val ? "#4338ca" : "#9ca3af",
                      outline: newFrequency === f.val ? "1.5px solid #6366f1" : "none",
                    }}>
                    {f.emoji}<br/>{f.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleAddRecurring} disabled={saving || !newRecurring.trim()}
                  style={{ flex: 1, padding: "10px", background: "#111118", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                  Add
                </button>
                <button onClick={() => { setAddingRecurring(false); setNewRecurring(""); }}
                  style={{ padding: "10px 14px", background: "white", border: "none", borderRadius: "10px", color: "#6b7280", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}