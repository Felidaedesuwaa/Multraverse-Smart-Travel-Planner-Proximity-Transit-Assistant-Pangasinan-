import { create } from 'zustand';

export const useBudgetStore = create((set) => ({
  entries: [],
  settings: { monthlyBudget: null, savingsTarget: null },
  setEntries: (value) => set(state => ({ entries: typeof value === 'function' ? value(state.entries) : value })),
  setSettings: (settings) => set({ settings }),
  reset: () => set({ entries: [], settings: { monthlyBudget: null, savingsTarget: null } }),
}));
