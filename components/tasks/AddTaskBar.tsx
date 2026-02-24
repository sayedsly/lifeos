"use client";
import { useState } from "react";
import type { Task } from "@/types";
import { upsertTask } from "@/lib/db/queries";
import { format } from "date-fns";

interface Props {
  onAdd: () => void;
}

export default function AddTaskBar({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<1 | 2 | 3>(2);

  const submit = async () => {
    if (!title.trim()) return;
    const task: Task = {
      id: Math.random().toString(36).slice(2),
      date: format(new Date(), "yyyy-MM-dd"),
      title: title.trim(),
      completed: false,
      priority,
      createdAt: Date.now(),
    };
    await upsertTask(task);
    setTitle("");
    onAdd();
  };

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
      <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Add Task</p>
      <input
        placeholder="What needs to get done?"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        className="w-full bg-zinc-800 rounded-2xl px-4 py-3 text-white text-sm placeholder-zinc-600 outline-none"
      />
      <div className="flex items-center gap-3">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Priority</p>
        {([1, 2, 3] as const).map(p => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-widest transition-colors ${
              priority === p ? "bg-white text-black" : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {p === 1 ? "High" : p === 2 ? "Mid" : "Low"}
          </button>
        ))}
        <button
          onClick={submit}
          className="ml-auto px-5 py-2 rounded-xl bg-white text-black text-xs font-semibold tracking-widest"
        >
          Add
        </button>
      </div>
    </div>
  );
}
