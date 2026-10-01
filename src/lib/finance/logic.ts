import type { Bill, Category, FinanceData, Goal, Txn } from "./types";
import { daysInMonth, diffDays, monthKey, monthLabel, parseISO, shiftMonth, todayISO } from "@/lib/utils";

export const CURRENCIES = [
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "PKR", symbol: "Rs", name: "Pakistani Rupee" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AED", symbol: "AED ", name: "UAE Dirham" },
  { code: "SAR", symbol: "SAR ", name: "Saudi Riyal" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
];

export function money(n: number, currency = "BDT", opts: { compact?: boolean; sign?: boolean } = {}) {
  const c = CURRENCIES.find((x) => x.code === currency);
  const symbol = c?.symbol ?? currency + " ";
  const abs = Math.abs(n);
  const body = opts.compact && abs >= 1000
    ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(abs)
    : abs.toLocaleString("en-US", { maximumFractionDigits: abs % 1 === 0 ? 0 : 2, minimumFractionDigits: 0 });
  const sign = n < 0 ? "−" : opts.sign && n > 0 ? "+" : "";
  return `${sign}${symbol}${body}`;
}

/** Round up to a "nice" number for budget suggestions */
export function niceRound(n: number) {
  const step = n >= 20000 ? 1000 : n >= 5000 ? 500 : n >= 1000 ? 100 : 50;
  return Math.ceil(n / step) * step;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function upTo(txns: Txn[], now: Date) {
  const t = todayISO(now);
  return txns.filter((x) => x.date <= t);
}

export function balance(data: FinanceData, now: Date = new Date()) {
  return upTo(data.txns, now).reduce((b, t) => b + (t.type === "income" ? t.amount : -t.amount), data.startingBalance);
}

export function monthTxns(txns: Txn[], key: string) {
  return txns.filter((t) => t.date.startsWith(key));
}

export function monthSummary(txns: Txn[], key: string) {
  const m = monthTxns(txns, key);
  const income = sum(m.filter((t) => t.type === "income").map((t) => t.amount));
  const expense = sum(m.filter((t) => t.type === "expense").map((t) => t.amount));
  return { income, expense, net: income - expense, savingsRate: income > 0 ? (income - expense) / income : 0 };
}

export function spendByCategory(data: FinanceData, from: string, to: string) {
  const map = new Map<string, number>();
  for (const t of data.txns) if (t.type === "expense" && t.date >= from && t.date <= to) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  return data.categories
    .filter((c) => map.has(c.id))
    .map((c) => ({ category: c, amount: map.get(c.id)! }))
    .sort((a, b) => b.amount - a.amount);
}

export function billPeriod(bill: Bill, d: Date) {
  return bill.frequency === "yearly" ? String(d.getFullYear()) : monthKey(d);
}

export function billDueDate(bill: Bill, d: Date) {
  const month = bill.frequency === "yearly" ? (bill.month ?? 1) - 1 : d.getMonth();
  const ref = new Date(d.getFullYear(), month, 1);
  return new Date(ref.getFullYear(), ref.getMonth(), Math.min(bill.day, daysInMonth(ref)));
}

export type BillOccurrence = { bill: Bill; due: Date; period: string; paid: boolean; daysUntil: number };

export function upcomingBills(bills: Bill[], now: Date, horizon = 35): BillOccurrence[] {
  const out: BillOccurrence[] = [];
  for (const b of bills) {
    const refs = b.frequency === "yearly" ? [now, new Date(now.getFullYear() + 1, 0, 1)] : [now, shiftMonth(now, 1)];
    for (const r of refs) {
      const due = billDueDate(b, r);
      const period = billPeriod(b, r);
      const paid = b.paid.includes(period);
      const daysUntil = diffDays(due, now);
      if ((daysUntil < 0 && !paid && r === now) || (daysUntil >= 0 && daysUntil <= horizon)) out.push({ bill: b, due, period, paid, daysUntil });
    }
  }
  return out.sort((a, b) => a.due.getTime() - b.due.getTime());
}

function unpaidBillsThisMonth(data: FinanceData, now: Date, categoryId?: string) {
  const key = monthKey(now);
  return sum(
    data.bills
      .filter((b) => (!categoryId || b.categoryId === categoryId) && monthKey(billDueDate(b, now)) === key && !b.paid.includes(billPeriod(b, now)))
      .map((b) => b.amount),
  );
}

/** Average daily non-bill spend, blending in last month when the current month is young. */
function dailyRate(data: FinanceData, now: Date, categoryId?: string) {
  const key = monthKey(now);
  const prevKey = monthKey(shiftMonth(now, -1));
  const filt = (t: Txn) => t.type === "expense" && !t.billId && !t.goalId && (!categoryId || t.categoryId === categoryId);
  const elapsed = now.getDate();
  const cur = sum(monthTxns(upTo(data.txns, now), key).filter(filt).map((t) => t.amount));
  if (elapsed >= 7) return cur / elapsed;
  const prev = sum(monthTxns(data.txns, prevKey).filter(filt).map((t) => t.amount));
  const prevRate = prev / daysInMonth(shiftMonth(now, -1));
  return (cur + prevRate * (7 - elapsed)) / 7;
}

export type BudgetRow = { category: Category; spent: number; budget: number; pct: number; projected: number; status: "ok" | "warn" | "over" };

export function budgetStatus(data: FinanceData, now: Date = new Date()): BudgetRow[] {
  const key = monthKey(now);
  const remaining = daysInMonth(now) - now.getDate();
  return data.categories
    .filter((c) => c.kind === "expense" && c.budget > 0)
    .map((c) => {
      const spent = sum(monthTxns(upTo(data.txns, now), key).filter((t) => t.type === "expense" && t.categoryId === c.id).map((t) => t.amount));
      const projected = spent + unpaidBillsThisMonth(data, now, c.id) + dailyRate(data, now, c.id) * remaining;
      const pct = (spent / c.budget) * 100;
      const status: BudgetRow["status"] = spent > c.budget ? "over" : projected > c.budget * 1.05 ? "warn" : "ok";
      return { category: c, spent, budget: c.budget, pct, projected, status };
    })
    .sort((a, b) => b.pct - a.pct);
}

export function avgMonthlyIncome(data: FinanceData, now: Date, months = 3) {
  const vals = Array.from({ length: months }, (_, i) => monthSummary(data.txns, monthKey(shiftMonth(now, -(i + 1)))).income);
  const nonZero = vals.filter((v) => v > 0);
  return nonZero.length ? sum(nonZero) / nonZero.length : 0;
}

export function forecast(data: FinanceData, now: Date = new Date()) {
  const key = monthKey(now);
  const dim = daysInMonth(now);
  const today = now.getDate();
  const current = balance(data, now);
  const incomeSoFar = monthSummary(upTo(data.txns, now), key).income;
  const expectedIncome = Math.max(0, avgMonthlyIncome(data, now) - incomeSoFar);
  const unpaidBills = unpaidBillsThisMonth(data, now);
  const rate = dailyRate(data, now);
  const discretionary = rate * (dim - today);
  const projected = current + expectedIncome - unpaidBills - discretionary;

  const startBal = current - monthTxns(upTo(data.txns, now), key).reduce((b, t) => b + (t.type === "income" ? t.amount : -t.amount), 0);
  const series: { day: number; actual: number | null; projected: number | null }[] = [];
  let run = startBal;
  const byDay = new Map<number, number>();
  for (const t of monthTxns(upTo(data.txns, now), key)) {
    const d = parseISO(t.date).getDate();
    byDay.set(d, (byDay.get(d) ?? 0) + (t.type === "income" ? t.amount : -t.amount));
  }
  for (let d = 1; d <= dim; d++) {
    if (d <= today) {
      run += byDay.get(d) ?? 0;
      series.push({ day: d, actual: Math.round(run), projected: d === today ? Math.round(run) : null });
    } else {
      const p = (d - today) / Math.max(1, dim - today);
      series.push({ day: d, actual: null, projected: Math.round(current + (expectedIncome - unpaidBills) * p - rate * (d - today)) });
    }
  }
  return { current, projected, expectedIncome, unpaidBills, discretionary, dailyRate: rate, series, daysLeft: dim - today };
}

export function cashflow(data: FinanceData, now: Date = new Date(), months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const key = monthKey(shiftMonth(now, -(months - 1 - i)));
    const s = monthSummary(upTo(data.txns, now), key);
    return { month: monthLabel(key), income: s.income, expense: s.expense, net: s.net };
  });
}

export function goalPlan(goal: Goal, now: Date = new Date()) {
  const remaining = Math.max(0, goal.target - goal.saved);
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  let monthsLeft: number | null = null;
  let perMonth: number | null = null;
  if (goal.deadline) {
    const d = parseISO(goal.deadline);
    monthsLeft = Math.max(1, (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth());
    perMonth = remaining / monthsLeft;
  }
  return { remaining, pct, monthsLeft, perMonth, done: remaining <= 0 };
}

/* ---------------- Assistant rules ---------------- */

export type FinAction =
  | { kind: "setBudget"; categoryId: string; amount: number }
  | { kind: "view"; view: string; categoryId?: string }
  | { kind: "payBill"; billId: string; period: string }
  | { kind: "contribute"; goalId: string; amount: number };

export type RawInsight = {
  id: string;
  tone: "alert" | "warn" | "tip" | "win";
  title: string;
  body: string;
  metric?: string;
  actions: { label: string; action: FinAction }[];
};

export function generateInsights(data: FinanceData, now: Date = new Date()): RawInsight[] {
  const cur = data.currency;
  const m = (n: number) => money(Math.round(n), cur);
  const key = monthKey(now);
  const out: RawInsight[] = [];
  const budgets = budgetStatus(data, now);

  // 1. Overspent budgets
  for (const b of budgets.filter((x) => x.status === "over")) {
    const suggestion = niceRound(Math.max(b.projected, b.spent) * 1.02);
    out.push({
      id: `over-${b.category.id}-${key}`, tone: "alert",
      title: `${b.category.name} is ${m(b.spent - b.budget)} over budget`,
      body: `You've spent ${m(b.spent)} of ${m(b.budget)} this month. Either trim spending for the rest of the month or set a realistic budget of ${m(suggestion)}.`,
      metric: `${Math.round(b.pct)}%`,
      actions: [
        { label: `Set budget to ${m(suggestion)}`, action: { kind: "setBudget", categoryId: b.category.id, amount: suggestion } },
        { label: "Review transactions", action: { kind: "view", view: "transactions", categoryId: b.category.id } },
      ],
    });
  }
  // 2. On pace to overspend
  for (const b of budgets.filter((x) => x.status === "warn")) {
    const suggestion = niceRound(b.projected);
    const daily = Math.max(0, (b.budget - b.spent) / Math.max(1, daysInMonth(now) - now.getDate()));
    out.push({
      id: `pace-${b.category.id}-${key}`, tone: "warn",
      title: `${b.category.name} is on pace to overshoot by ${m(b.projected - b.budget)}`,
      body: `At your current pace you'll land near ${m(b.projected)} vs a ${m(b.budget)} budget. Keeping it under ${m(daily)}/day gets you back on track.`,
      metric: `→ ${Math.round((b.projected / b.budget) * 100)}%`,
      actions: [
        { label: `Adjust budget to ${m(suggestion)}`, action: { kind: "setBudget", categoryId: b.category.id, amount: suggestion } },
        { label: "See spending", action: { kind: "view", view: "transactions", categoryId: b.category.id } },
      ],
    });
  }
  // 3. Forecast
  const f = forecast(data, now);
  const avgIncome = avgMonthlyIncome(data, now);
  if (f.projected < 0) {
    out.push({
      id: `forecast-neg-${key}`, tone: "alert",
      title: `Month-end balance forecast: ${m(f.projected)}`,
      body: `Bills of ${m(f.unpaidBills)} are still due and you're spending about ${m(f.dailyRate)}/day. Cutting discretionary spend by ${m(Math.abs(f.projected) / Math.max(1, f.daysLeft))}/day avoids going negative.`,
      actions: [{ label: "Review budgets", action: { kind: "view", view: "budgets" } }],
    });
  } else if (avgIncome > 0 && f.projected < avgIncome * 0.1) {
    out.push({
      id: `forecast-low-${key}`, tone: "warn",
      title: `Cushion is thin: ~${m(f.projected)} left at month-end`,
      body: `That's under 10% of your typical monthly income. Consider pausing non-essential purchases for the next ${f.daysLeft} days.`,
      actions: [{ label: "Review budgets", action: { kind: "view", view: "budgets" } }],
    });
  }
  // 4. Bills due / overdue
  for (const o of upcomingBills(data.bills, now, 3).filter((x) => !x.paid)) {
    const overdue = o.daysUntil < 0;
    out.push({
      id: `bill-${o.bill.id}-${o.period}`, tone: overdue ? "alert" : "warn",
      title: overdue ? `${o.bill.name} is ${-o.daysUntil} day${o.daysUntil === -1 ? "" : "s"} overdue` : o.daysUntil === 0 ? `${o.bill.name} is due today` : `${o.bill.name} is due in ${o.daysUntil} day${o.daysUntil === 1 ? "" : "s"}`,
      body: `${m(o.bill.amount)} · ${o.bill.frequency}. Mark it paid to log the expense automatically.`,
      metric: m(o.bill.amount),
      actions: [
        { label: "Mark as paid", action: { kind: "payBill", billId: o.bill.id, period: o.period } },
        { label: "Open bills", action: { kind: "view", view: "bills" } },
      ],
    });
  }
  // 5. Last-month recap (early in month)
  if (now.getDate() <= 7) {
    const prev = shiftMonth(now, -1);
    const pk = monthKey(prev);
    const s = monthSummary(data.txns, pk);
    for (const c of data.categories.filter((c) => c.kind === "expense" && c.budget > 0)) {
      const spent = sum(monthTxns(data.txns, pk).filter((t) => t.type === "expense" && t.categoryId === c.id).map((t) => t.amount));
      if (spent > c.budget * 1.1 && !out.some((o) => o.id.includes(c.id))) {
        const suggestion = niceRound(spent);
        out.push({
          id: `recap-${c.id}-${pk}`, tone: "tip",
          title: `${c.name} ran ${Math.round((spent / c.budget - 1) * 100)}% over in ${monthLabel(pk, true)}`,
          body: `You spent ${m(spent)} against ${m(c.budget)}. If that's your new normal, a budget of ${m(suggestion)} keeps alerts honest — or keep it and aim to cut back.`,
          actions: [{ label: `Set budget to ${m(suggestion)}`, action: { kind: "setBudget", categoryId: c.id, amount: suggestion } }],
        });
      }
    }
    if (s.income > 0 && s.savingsRate >= 0.2) {
      out.push({ id: `recap-save-${pk}`, tone: "win", title: `You saved ${Math.round(s.savingsRate * 100)}% of income in ${monthLabel(pk, true)}`, body: `${m(s.net)} kept after all expenses. That's above the 20% rule of thumb — nicely done.`, actions: [] });
    }
  }
  // 6. Unbudgeted heavy categories
  const from90 = todayISO(shiftMonth(now, -3));
  for (const c of data.categories.filter((c) => c.kind === "expense" && c.budget === 0 && c.id !== "savings")) {
    const total = sum(data.txns.filter((t) => t.type === "expense" && t.categoryId === c.id && t.date >= from90 && t.date <= todayISO(now)).map((t) => t.amount));
    const monthly = total / 3;
    if (monthly >= 1000) {
      const suggestion = niceRound(monthly * 1.1);
      out.push({
        id: `nobudget-${c.id}-${key}`, tone: "tip",
        title: `${c.name} has no budget (≈${m(monthly)}/mo)`,
        body: `Setting a ${m(suggestion)} cap gives you early warnings before this category drifts.`,
        actions: [{ label: `Create ${m(suggestion)} budget`, action: { kind: "setBudget", categoryId: c.id, amount: suggestion } }],
      });
    }
  }
  // 7. Underused budgets → reallocate
  if (now.getDate() >= 20) {
    for (const b of budgets.filter((x) => x.projected < x.budget * 0.6 && x.budget >= 1000)) {
      const suggestion = niceRound(Math.max(b.projected * 1.15, 500));
      out.push({
        id: `under-${b.category.id}-${key}`, tone: "tip",
        title: `${b.category.name} budget has room to spare`,
        body: `You're tracking toward ${m(b.projected)} of ${m(b.budget)}. Trimming it to ${m(suggestion)} frees ${m(b.budget - suggestion)} for goals.`,
        actions: [{ label: `Trim to ${m(suggestion)}`, action: { kind: "setBudget", categoryId: b.category.id, amount: suggestion } }],
      });
    }
  }
  // 8. Surplus → goals
  const behind = data.goals.map((g) => ({ g, p: goalPlan(g, now) })).filter((x) => !x.p.done).sort((a, b) => (b.p.perMonth ?? 0) - (a.p.perMonth ?? 0));
  if (f.projected > avgIncome * 0.25 && behind.length > 0) {
    const target = behind[0];
    const amt = niceRound(Math.min(target.p.remaining, Math.max(500, (f.projected - avgIncome * 0.15) * 0.5)));
    out.push({
      id: `surplus-${target.g.id}-${key}`, tone: "tip",
      title: `Projected surplus of ${m(f.projected)} — put some to work`,
      body: `Moving ${m(amt)} into "${target.g.name}" now${target.p.perMonth ? ` (needs ${m(target.p.perMonth)}/mo to hit its deadline)` : ""} keeps a healthy buffer while speeding up the goal.`,
      actions: [{ label: `Contribute ${m(amt)}`, action: { kind: "contribute", goalId: target.g.id, amount: amt } }],
    });
  }
  // 9. Goals reached / milestones
  for (const g of data.goals) {
    const p = goalPlan(g, now);
    if (p.done) out.push({ id: `goal-done-${g.id}`, tone: "win", title: `Goal reached: ${g.name} 🎉`, body: `You saved the full ${m(g.target)}. Time to celebrate — or raise the bar.`, actions: [] });
    else if (p.pct >= 75) out.push({ id: `goal-75-${g.id}`, tone: "win", title: `${g.name} is ${Math.round(p.pct)}% funded`, body: `Only ${m(p.remaining)} to go. Keep the streak going!`, actions: [] });
  }
  // 10. Spending spike vs 3-month average (last 30 days)
  const last30 = todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
  const recent = spendByCategory(data, last30, todayISO(now));
  for (const r of recent) {
    const prior = sum(data.txns.filter((t) => t.type === "expense" && t.categoryId === r.category.id && t.date < last30 && t.date >= todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 120))).map((t) => t.amount)) / 3;
    if (prior > 500 && r.amount > prior * 1.4 && !out.some((o) => o.id.includes(r.category.id))) {
      out.push({
        id: `spike-${r.category.id}-${key}`, tone: "warn",
        title: `${r.category.name} spending jumped ${Math.round((r.amount / prior - 1) * 100)}%`,
        body: `${m(r.amount)} in the last 30 days vs a ${m(prior)} monthly average before that.`,
        actions: [{ label: "Review transactions", action: { kind: "view", view: "transactions", categoryId: r.category.id } }],
      });
    }
  }
  // 11. Savings rate this month so far
  const ms = monthSummary(upTo(data.txns, now), key);
  if (now.getDate() > 7 && ms.income > 0 && ms.savingsRate >= 0.3) {
    out.push({ id: `rate-${key}`, tone: "win", title: `Saving ${Math.round(ms.savingsRate * 100)}% of income so far`, body: `Income ${m(ms.income)} vs spending ${m(ms.expense)} this month. Keep it up!`, actions: [] });
  }
  return out;
}

export function balanceSeries(data: FinanceData, now: Date = new Date(), days = 30) {
  const end = balance(data, now);
  const fromISO = todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1));
  const deltas = new Map<string, number>();
  for (const t of upTo(data.txns, now)) if (t.date >= fromISO) deltas.set(t.date, (deltas.get(t.date) ?? 0) + (t.type === "income" ? t.amount : -t.amount));
  const out: { date: string; balance: number }[] = [];
  let run = end;
  for (let i = 0; i < days; i++) {
    const d = todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
    out.push({ date: d, balance: run });
    run -= deltas.get(d) ?? 0;
  }
  return out.reverse();
}
