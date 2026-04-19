import { create } from 'zustand';
import type { UserProfile, AiSettings, DailyEntry } from './api';

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface AppState {
  profile: UserProfile | null;
  aiSettings: AiSettings | null;
  selectedDate: string;
  entry: DailyEntry | null;

  setProfile: (p: UserProfile | null) => void;
  setAiSettings: (s: AiSettings | null) => void;
  setSelectedDate: (d: string) => void;
  setEntry: (e: DailyEntry | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  aiSettings: null,
  selectedDate: todayISO(),
  entry: null,

  setProfile: (p) => set({ profile: p }),
  setAiSettings: (s) => set({ aiSettings: s }),
  setSelectedDate: (d) => set({ selectedDate: d }),
  setEntry: (e) => set({ entry: e }),
}));
