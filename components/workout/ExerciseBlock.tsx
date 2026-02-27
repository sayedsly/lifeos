"use client";
import { useState } from "react";
import type { WorkoutExercise, WorkoutSet } from "@/types";
import SetRow from "./SetRow";
import RestTimer from "./RestTimer";

interface Props {
  exercise: WorkoutExercise;
  onChange: (updated: WorkoutExercise) => void;
}

export default function ExerciseBlock({ exercise, onChange }: Props) {
  const [resting, setResting] = useState(false);

  const addSet = () => {
    const prev = exercise.sets[exercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: Math.random().toString(36).slice(2),
      exerciseId: exercise.id,
      reps: prev?.reps || 8,
      weight: prev?.weight || 0,
      completed: false,
    };
    onChange({ ...exercise, sets: [...exercise.sets, newSet] });
  };

  const updateSet = (index: number, updated: WorkoutSet) => {
    const sets = [...exercise.sets];
    sets[index] = updated;
    onChange({ ...exercise, sets });
  };

  const completeSet = (index: number) => {
    const sets = [...exercise.sets];
    sets[index] = { ...sets[index], completed: true };
    onChange({ ...exercise, sets });
    setResting(true);
  };

  return (
    <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white font-semibold text-sm">{exercise.name}</p>
        <p className="text-[10px] text-zinc-600 tracking-widest uppercase">
          {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length} sets
        </p>
      </div>
      <div className="flex text-[9px] text-zinc-600 uppercase tracking-widest px-1 gap-3">
        <p className="w-4" />
        <p className="flex-1 text-center">LBS</p>
        <p className="w-3" />
        <p className="flex-1 text-center">Reps</p>
        <p className="w-9" />
      </div>
      <div className="space-y-1 divide-y divide-zinc-800">
        {exercise.sets.map((set, i) => (
          <SetRow
            key={set.id}
            set={set}
            index={i}
            onChange={updated => updateSet(i, updated)}
            onComplete={() => completeSet(i)}
          />
        ))}
      </div>
      {resting && (
        <RestTimer
          seconds={90}
          onComplete={() => setResting(false)}
          onSkip={() => setResting(false)}
        />
      )}
      <button
        onClick={addSet}
        className="w-full py-2.5 rounded-2xl border border-zinc-800 text-zinc-500 text-xs tracking-widest uppercase hover:border-zinc-600 transition-colors"
      >
        + Add Set
      </button>
    </div>
  );
}
