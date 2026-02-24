"use client";
import type { Task } from "@/types";
import { toggleTask } from "@/lib/db/queries";

interface Props {
  task: Task;
  onToggle: () => void;
}

const priorityColor: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-zinc-500",
  3: "bg-zinc-700",
};

export default function TaskItem({ task, onToggle }: Props) {
  const handle = async () => {
    await toggleTask(task.id);
    onToggle();
  };

  return (
    <button
      onClick={handle}
      className="w-full flex items-center gap-4 px-5 py-4 text-left transition-opacity duration-150"
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
        task.completed ? "bg-white border-white" : "border-zinc-600"
      }`}>
        {task.completed && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium transition-colors duration-200 ${task.completed ? "text-zinc-600 line-through" : "text-white"}`}>
          {task.title}
        </p>
      </div>
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColor[task.priority]}`} />
    </button>
  );
}
