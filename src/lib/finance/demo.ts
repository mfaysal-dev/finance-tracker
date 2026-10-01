import type { Bill, Category, FinanceData, Goal, Txn } from "./types";
import { daysInMonth, seeded, shiftMonth, todayISO, uid } from "@/lib/utils";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "salary", name: "Salary", color: "#10b981", icon: "briefcase", kind: "income", budget: 0 },
  { id: "freelance", name: "Freelance", color: "#06b6d4", icon: "laptop", kind: "income", budget: 0 },
  { id: "groceries", name: "Groceries", color: "#22c55e", icon: "shopping-basket", kind: "expense", budget: 12000 },
  { id: "dining", name: "Dining out", color: "#f97316", icon: "utensils", kind: "expense", budget: 5000 },
  { id: "transport", name: "Transport", color: "#3b82f6", icon: "car", kind: "expense", budget: 4500 },
  { id: "rent", name: "Rent", color: "#8b5cf6", icon: "home", kind: "expense", budget: 25000 },
  { id: "utilities", name: "Utilities", color: "#eab308", icon: "zap", kind: "expense", budget: 4500 },
  { id: "shopping", name: "Shopping", color: "#ec4899", icon: "shopping-bag", kind: "expense", budget: 6000 },
  { id: "health", name: "Health", color: "#ef4444", icon: "heart-pulse", kind: "expense", budget: 3500 },
  { id: "entertainment", name: "Fun", color: "#a855f7", icon: "gamepad", kind: "expense", budget: 2500 },
  { id: "education", name: "Learning", color: "#14b8a6", icon: "book", kind: "expense", budget: 0 },
  { id: "savings", name: "Savings", color: "#64748b", icon: "piggy-bank", kind: "expense", budget: 0 },
];

export function emptyData(currency = "BDT"): FinanceData {
  return { currency, startingBalance: 0, categories: DEFAULT_CATEGORIES.map((c) => ({ ...c, budget: 0 })), txns: [], bills: [], goals: [], isDemo: false };
}

export function demoData(now: Date = new Date()): FinanceData {
  const rnd = seeded(42);
  const r = (a: number, b: number) => Math.round((a + rnd() * (b - a)) / 10) * 10;
  const txns: Txn[] = [];
  const today = todayISO(now);
  const add = (d: Date, amount: number, type: Txn["type"], categoryId: string, note: string, extra: Partial<Txn> = {}) => {
    const date = todayISO(d);
    if (date > today) return;
    txns.push({ id: uid(), date, amount, type, categoryId, note, ...extra });
  };
  const bills: Bill[] = [
    { id: "b-rent", name: "Apartment rent", amount: 25000, categoryId: "rent", day: 5, frequency: "monthly", paid: [] },
    { id: "b-net", name: "Fiber internet", amount: 1500, categoryId: "utilities", day: 10, frequency: "monthly", paid: [] },
    { id: "b-elec", name: "Electricity (DESCO)", amount: 2200, categoryId: "utilities", day: 2, frequency: "monthly", paid: [] },
    { id: "b-gym", name: "Gym membership", amount: 2000, categoryId: "health", day: 3, frequency: "monthly", paid: [] },
    { id: "b-stream", name: "Streaming bundle", amount: 650, categoryId: "entertainment", day: 20, frequency: "monthly", paid: [] },
    { id: "b-domain", name: "Domain & hosting", amount: 4800, categoryId: "education", day: 15, frequency: "yearly", month: ((now.getMonth() + 1) % 12) + 1, paid: [] },
  ];
  for (let mOff = -5; mOff <= 0; mOff++) {
    const m = shiftMonth(now, mOff);
    const y = m.getFullYear(), mo = m.getMonth();
    const dim = daysInMonth(m);
    const at = (d: number) => new Date(y, mo, Math.min(d, dim));
    add(at(1), 85000, "income", "salary", "Monthly salary — Brightline Ltd.");
    if (mOff !== -3) add(at(18), r(9000, 22000), "income", "freelance", ["Logo design for Kacchi House", "Landing page — Dhaka Bikes", "Upwork: dashboard UI"][(mOff + 6) % 3]);
    for (const b of bills.filter((b) => b.frequency === "monthly")) {
      const due = at(b.day);
      const isCurrent = mOff === 0;
      if (todayISO(due) > today) continue;
      if (isCurrent && b.id === "b-elec") continue; // leave one overdue for the assistant to catch
      const amount = b.id === "b-elec" ? r(1800, 2600) : b.amount;
      add(due, amount, "expense", b.categoryId, b.name, { billId: b.id });
      b.paid.push(`${y}-${String(mo + 1).padStart(2, "0")}`);
    }
    const diningBoost = mOff >= -1 ? 1.5 : 1;
    for (let d = 1; d <= dim; d++) {
      const date = at(d);
      if (d % 4 === 1) add(date, r(900, 2300), "expense", "groceries", ["Shwapno", "Agora", "Meena Bazar", "Local bazar"][d % 4 === 1 ? Math.floor(rnd() * 4) : 0]);
      if (rnd() < 0.42 * diningBoost) add(date, r(250, 1100), "expense", "dining", ["Coffee at North End", "Kacchi Bhai", "Pizza night", "Lunch with team", "Foodpanda order"][Math.floor(rnd() * 5)]);
      if (rnd() < 0.55) add(date, r(120, 450), "expense", "transport", ["Pathao ride", "Uber", "CNG", "Metro rail"][Math.floor(rnd() * 4)]);
      if (rnd() < 0.08) add(date, r(900, 3800), "expense", "shopping", ["Aarong kurta", "Daraz order", "Sneakers", "Home decor"][Math.floor(rnd() * 4)]);
      if (rnd() < 0.05) add(date, r(300, 1500), "expense", "health", ["Pharmacy", "Doctor visit", "Vitamins"][Math.floor(rnd() * 3)]);
      if (rnd() < 0.06) add(date, r(300, 1200), "expense", "entertainment", ["Cinema — Star Cineplex", "Steam game", "Concert ticket"][Math.floor(rnd() * 3)]);
      if (rnd() < 0.05) add(date, r(800, 2500), "expense", "education", ["Udemy course", "Books — Rokomari", "Workshop fee"][Math.floor(rnd() * 3)]);
    }
    add(at(25), 5000, "expense", "savings", "Transfer → Emergency fund", { goalId: "g-emerg" });
  }
  const goals: Goal[] = [
    { id: "g-emerg", name: "Emergency fund", target: 150000, saved: 96000, color: "#10b981", icon: "shield" },
    { id: "g-trip", name: "Cox's Bazar trip", target: 40000, saved: 31500, deadline: todayISO(shiftMonth(now, 3)), color: "#0ea5e9", icon: "plane" },
    { id: "g-laptop", name: "New laptop", target: 180000, saved: 42000, deadline: todayISO(shiftMonth(now, 8)), color: "#a855f7", icon: "laptop" },
  ];
  txns.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { currency: "BDT", startingBalance: 48000, categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), txns, bills, goals, isDemo: true };
}
