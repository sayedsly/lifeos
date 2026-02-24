"use client";
import { create } from "zustand";
import type { MomentumSnapshot, NutritionEntry, UserSettings } from "@/types";
import { computeMomentum } from "@/lib/momentum/engine";
import { getNutritionForDate, getSettings } from "@/lib/supabase/queries";
import { format } from "date-fns";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

interface LifeStore {
  momentum: MomentumSnapshot | null;
  nutritionEntries: NutritionEntry[];
  settings: UserSettings | null;
  isVoiceOpen: boolean;
  refreshMomentum: () => Promise<void>;
  refreshNutrition: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  setVoiceOpen: (open: boolean) => void;
}

export const useLifeStore = create<LifeStore>((set) => ({
  momentum: null,
  nutritionEntries: [],
  settings: null,
  isVoiceOpen: false,

  refreshMomentum: async () => {
    try {
      const snapshot = await computeMomentum(todayStr());
      set({ momentum: snapshot });
    } catch (e) {
      console.error("Momentum error:", e);
    }
  },

  refreshNutrition: async () => {
    try {
      const entries = await getNutritionForDate(todayStr());
      set({ nutritionEntries: entries });
    } catch (e) {
      console.error("Nutrition error:", e);
    }
  },

  refreshSettings: async () => {
    try {
      const s = await getSettings();
      set({ settings: s });
    } catch (e) {
      console.error("Settings error:", e);
    }
  },

  setVoiceOpen: (open) => set({ isVoiceOpen: open }),
}));
