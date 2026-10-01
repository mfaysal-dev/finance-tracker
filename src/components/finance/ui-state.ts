"use client";
import { create } from "zustand";
import type { Txn } from "@/lib/finance/types";

type S = {
  view: string;
  setView: (v: string) => void;
  txnDialog: Partial<Txn> | null;
  openTxn: (t?: Partial<Txn>) => void;
  closeTxn: () => void;
  catFilter: string;
  setCatFilter: (c: string) => void;
};
export const useFinUI = create<S>((set) => ({
  view: "dashboard",
  setView: (view) => { set({ view }); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); },
  txnDialog: null,
  openTxn: (t) => set({ txnDialog: t ?? {} }),
  closeTxn: () => set({ txnDialog: null }),
  catFilter: "all",
  setCatFilter: (catFilter) => set({ catFilter }),
}));
