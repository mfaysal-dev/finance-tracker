"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Bill, Category, FinanceData, Goal, Txn } from "./types";
import { demoData, emptyData } from "./demo";
import { billPeriod } from "./logic";
import { todayISO, uid } from "@/lib/utils";

type Actions = {
  addTxn: (t: Omit<Txn, "id">) => void;
  updateTxn: (id: string, t: Partial<Txn>) => void;
  deleteTxn: (id: string) => void;
  upsertCategory: (c: Omit<Category, "id"> & { id?: string }) => void;
  deleteCategory: (id: string) => void;
  setBudget: (id: string, amount: number) => void;
  upsertBill: (b: Omit<Bill, "id" | "paid"> & { id?: string }) => void;
  deleteBill: (id: string) => void;
  payBill: (id: string, period: string) => void;
  upsertGoal: (g: Omit<Goal, "id"> & { id?: string }) => void;
  deleteGoal: (id: string) => void;
  contribute: (goalId: string, amount: number) => void;
  setCurrency: (c: string) => void;
  setStartingBalance: (n: number) => void;
  clearDemo: () => void;
  loadDemo: () => void;
  importData: (d: unknown) => void;
};

export const useFinance = create<FinanceData & Actions>()(
  persist(
    (set, get) => ({
      ...demoData(),
      addTxn: (t) => set((s) => ({ txns: [{ ...t, id: uid() }, ...s.txns] })),
      updateTxn: (id, t) => set((s) => ({ txns: s.txns.map((x) => (x.id === id ? { ...x, ...t } : x)) })),
      deleteTxn: (id) => set((s) => ({ txns: s.txns.filter((x) => x.id !== id) })),
      upsertCategory: (c) => set((s) => (c.id && s.categories.some((x) => x.id === c.id)
        ? { categories: s.categories.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x)) }
        : { categories: [...s.categories, { ...c, id: c.id ?? uid() }] })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
      setBudget: (id, amount) => set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, budget: Math.max(0, amount) } : c)) })),
      upsertBill: (b) => set((s) => (b.id && s.bills.some((x) => x.id === b.id)
        ? { bills: s.bills.map((x) => (x.id === b.id ? { ...x, ...b, id: x.id } : x)) }
        : { bills: [...s.bills, { ...b, id: uid(), paid: [] }] })),
      deleteBill: (id) => set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),
      payBill: (id, period) => {
        const b = get().bills.find((x) => x.id === id);
        if (!b || b.paid.includes(period)) return;
        const date = todayISO();
        set((s) => ({
          bills: s.bills.map((x) => (x.id === id ? { ...x, paid: [...x.paid, period] } : x)),
          txns: [{ id: uid(), date, amount: b.amount, type: "expense", categoryId: b.categoryId, note: b.name, billId: b.id }, ...s.txns],
        }));
      },
      upsertGoal: (g) => set((s) => (g.id && s.goals.some((x) => x.id === g.id)
        ? { goals: s.goals.map((x) => (x.id === g.id ? { ...x, ...g, id: x.id } : x)) }
        : { goals: [...s.goals, { ...g, id: uid() }] })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      contribute: (goalId, amount) => set((s) => {
        const g = s.goals.find((x) => x.id === goalId);
        if (!g) return {};
        const hasSavings = s.categories.some((c) => c.id === "savings");
        return {
          goals: s.goals.map((x) => (x.id === goalId ? { ...x, saved: x.saved + amount } : x)),
          categories: hasSavings ? s.categories : [...s.categories, { id: "savings", name: "Savings", color: "#64748b", icon: "piggy-bank", kind: "expense", budget: 0 }],
          txns: [{ id: uid(), date: todayISO(), amount, type: "expense", categoryId: "savings", note: `Transfer → ${g.name}`, goalId }, ...s.txns],
        };
      }),
      setCurrency: (currency) => set({ currency }),
      setStartingBalance: (startingBalance) => set({ startingBalance }),
      clearDemo: () => set((s) => ({ ...emptyData(s.currency) })),
      loadDemo: () => set((s) => ({ ...demoData(), currency: s.currency })),
      importData: (d) => {
        const x = d as Partial<FinanceData>;
        if (!x || !Array.isArray(x.txns) || !Array.isArray(x.categories)) throw new Error("Backup is missing transactions/categories");
        set({ ...emptyData(), ...x, isDemo: Boolean(x.isDemo) });
      },
    }),
    { name: "hisab-data", version: 1 },
  ),
);

export function exportFinance(): FinanceData {
  const s = useFinance.getState();
  return { currency: s.currency, startingBalance: s.startingBalance, categories: s.categories, txns: s.txns, bills: s.bills, goals: s.goals, isDemo: s.isDemo };
}

export { billPeriod };
