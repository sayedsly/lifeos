"use client";
import { useState } from "react";
import type { Task } from "@/types";

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const priorityColor = task.priority === 1 ? "#ef4444" : task.priority === 2 ? "#f59e0b" : "#9ca3af";

  const saveEdit = () => {
    if (editValue.trim() && editValue.trim() !== task.title) onEdit(task.id, editValue.trim());
    setEditing(false);
  };

  if (editing) return (
    <div style={{ background: "white", borderRadius: "16px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: priorityColor, flexShrink: 0 }} />
      <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
        style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "14px", fontWeight: 600, color: "#111118", fontFamily: "inherit" }} />
      <button onClick={saveEdit} style={{ padding: "6px 12px", borderRadius: "8px", background: "#111118", border: "none", color: "white", fontWeight: 700, fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
      <button onClick={() => setEditing(false)} style={{ padding: "6px 10px", borderRadius: "8px", background: "#f1f5f9", border: "none", color: "#6b7280", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
    </div>
  );

  if (confirmDelete) return (
    <div style={{ background: "white", borderRadius: "16px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 2px 12px rgba(239,68,68,0.15)", border: "1.5px solid #fecaca" }}>
      <p style={{ flex: 1, color: "#ef4444", fontSize: "13px", fontWeight: 600 }}>Delete "{task.title}"?</p>
      <button onClick={() => onDelete(task.id)} style={{ padding: "6px 12px", borderRadius: "8px", background: "#ef4444", border: "none", color: "white", fontWeight: 700, fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
      <button onClick={() => setConfirmDelete(false)} style={{ padding: "6px 10px", borderRadius: "8px", background: "#f1f5f9", border: "none", color: "#6b7280", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
    </div>
  );

  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "13px 14px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <button onClick={() => onToggle(task.id)} style={{
        width: 22, height: 22, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
        background: task.completed ? "#22c55e" : "none",
        border: task.completed ? "none" : "2px solid #d1d5db",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {task.completed && <span style={{ fontSize: "12px", color: "white" }}>✓</span>}
      </button>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: priorityColor, flexShrink: 0 }} />
      <p onClick={() => { setEditValue(task.title); setEditing(true); }} style={{ flex: 1, fontSize: "14px", fontWeight: 600, color: task.completed ? "#9ca3af" : "#111118", textDecoration: task.completed ? "line-through" : "none", transition: "all 0.15s", cursor: "text" }}>
        {task.title}
      </p>
      <button onClick={() => setConfirmDelete(true)}
        style={{ width: 28, height: 28, borderRadius: "8px", background: "#fef2f2", border: "none", cursor: "pointer", fontSize: "15px", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
    </div>
  );
}