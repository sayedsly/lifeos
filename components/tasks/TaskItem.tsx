"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
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

  const priorityColor = task.priority === 1 ? "#ef4444" : task.priority === 2 ? "#f59e0b" : "#52525b";

  const saveEdit = () => {
    if (editValue.trim() && editValue.trim() !== task.title) {
      onEdit(task.id, editValue.trim());
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", background: "#18181b", border: "1px solid #3f3f46", borderRadius: "16px" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: priorityColor, flexShrink: 0 }} />
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
          style={{ flex: 1, background: "none", border: "none", color: "white", fontSize: "14px", outline: "none" }}
        />
        <button onClick={saveEdit} style={{ padding: "6px 12px", borderRadius: "8px", background: "white", border: "none", color: "black", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
          Save
        </button>
        <button onClick={() => setEditing(false)} style={{ padding: "6px 10px", borderRadius: "8px", background: "none", border: "1px solid #27272a", color: "#71717a", fontSize: "11px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", background: "#18181b", border: "1px solid #ef4444", borderRadius: "16px" }}>
        <p style={{ flex: 1, color: "#f87171", fontSize: "13px" }}>Delete "{task.title}"?</p>
        <button onClick={() => onDelete(task.id)} style={{ padding: "6px 12px", borderRadius: "8px", background: "#ef4444", border: "none", color: "white", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
          Delete
        </button>
        <button onClick={() => setConfirmDelete(false)} style={{ padding: "6px 10px", borderRadius: "8px", background: "none", border: "1px solid #27272a", color: "#71717a", fontSize: "11px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "#18181b", border: "1px solid #27272a", borderRadius: "16px" }}>
      {/* Completion toggle */}
      <button onClick={() => onToggle(task.id)} style={{
        width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0, cursor: "pointer",
        background: task.completed ? "white" : "none",
        border: task.completed ? "none" : "2px solid #3f3f46",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {task.completed && <span style={{ fontSize: "11px", color: "black" }}>✓</span>}
      </button>

      {/* Priority dot */}
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: priorityColor, flexShrink: 0 }} />

      {/* Title */}
      <p style={{ flex: 1, fontSize: "14px", color: task.completed ? "#52525b" : "white", textDecoration: task.completed ? "line-through" : "none", lineHeight: 1.4 }}>
        {task.title}
      </p>

      {/* Edit + Delete */}
      <button onClick={() => { setEditValue(task.title); setEditing(true); }}
        style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "14px", cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>
        ✎
      </button>
      <button onClick={() => setConfirmDelete(true)}
        style={{ background: "none", border: "none", color: "#3f3f46", fontSize: "16px", cursor: "pointer", padding: "2px 6px", lineHeight: 1 }}>
        ×
      </button>
    </div>
  );
}
