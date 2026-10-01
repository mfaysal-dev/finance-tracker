import type { WidgetSize } from "@/lib/ui-store";

export const APP = {
  name: "Hisab",
  tagline: "Money, made mindful",
  storageKey: "hisab",
  defaultAccent: 160,
  defaultLayout: [
    { type: "balance", size: "l" },
    { type: "assistant", size: "s" },
    { type: "forecast", size: "l" },
    { type: "categories", size: "s" },
    { type: "budgets", size: "m" },
    { type: "cashflow", size: "m" },
    { type: "bills", size: "s" },
    { type: "goals", size: "s" },
    { type: "recent", size: "s" },
  ] as { type: string; size: WidgetSize }[],
};
