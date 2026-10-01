import { describe, expect, it } from "vitest";
import { balance, budgetStatus, forecast, generateInsights, goalPlan, money, niceRound, upcomingBills } from "@/lib/finance/logic";
import { demoData, emptyData } from "@/lib/finance/demo";
import type { FinanceData } from "@/lib/finance/types";

const NOW = new Date(2026, 9, 15); // 15 Oct 2026

function base(): FinanceData {
  const d = emptyData("BDT");
  d.startingBalance = 10000;
  d.categories = d.categories.map((c) => (c.id === "dining" ? { ...c, budget: 3000 } : c.id === "groceries" ? { ...c, budget: 10000 } : c));
  return d;
}

describe("money formatting", () => {
  it("formats BDT with the taka sign", () => {
    expect(money(1234, "BDT")).toBe("৳1,234");
    expect(money(-50.5, "USD")).toBe("−$50.5");
    expect(money(2500, "BDT", { compact: true })).toBe("৳2.5K");
  });
  it("rounds budget suggestions to nice numbers", () => {
    expect(niceRound(4120)).toBe(4200);
    expect(niceRound(5210)).toBe(5500);
    expect(niceRound(23100)).toBe(24000);
  });
});

describe("balances and budgets", () => {
  it("computes balance ignoring future-dated transactions", () => {
    const d = base();
    d.txns = [
      { id: "1", date: "2026-10-01", amount: 50000, type: "income", categoryId: "salary", note: "" },
      { id: "2", date: "2026-10-02", amount: 2000, type: "expense", categoryId: "dining", note: "" },
      { id: "3", date: "2026-10-30", amount: 9999, type: "expense", categoryId: "dining", note: "future" },
    ];
    expect(balance(d, NOW)).toBe(58000);
  });

  it("flags an overspent category and suggests a higher budget", () => {
    const d = base();
    d.txns = [
      { id: "1", date: "2026-10-03", amount: 2500, type: "expense", categoryId: "dining", note: "" },
      { id: "2", date: "2026-10-10", amount: 1500, type: "expense", categoryId: "dining", note: "" },
    ];
    const row = budgetStatus(d, NOW).find((r) => r.category.id === "dining")!;
    expect(row.status).toBe("over");
    const ins = generateInsights(d, NOW).find((i) => i.id.startsWith("over-dining"));
    expect(ins).toBeDefined();
    const act = ins!.actions[0].action;
    expect(act.kind).toBe("setBudget");
    if (act.kind === "setBudget") expect(act.amount).toBeGreaterThan(4000);
  });

  it("warns when pace projects an overshoot", () => {
    const d = base();
    d.txns = [{ id: "1", date: "2026-10-14", amount: 6000, type: "expense", categoryId: "groceries", note: "" }];
    const row = budgetStatus(d, NOW).find((r) => r.category.id === "groceries")!;
    expect(row.status).toBe("warn");
    expect(row.projected).toBeCloseTo(6000 + (6000 / 15) * 16, 0);
  });
});

describe("forecast & bills", () => {
  it("subtracts unpaid bills and adds expected income", () => {
    const d = base();
    d.bills = [{ id: "b", name: "Rent", amount: 20000, categoryId: "rent", day: 20, frequency: "monthly", paid: [] }];
    d.txns = [
      { id: "s1", date: "2026-09-01", amount: 60000, type: "income", categoryId: "salary", note: "" },
      { id: "s2", date: "2026-08-01", amount: 60000, type: "income", categoryId: "salary", note: "" },
    ];
    const f = forecast(d, NOW);
    expect(f.unpaidBills).toBe(20000);
    expect(f.expectedIncome).toBe(60000);
    expect(f.projected).toBe(f.current + 60000 - 20000 - f.discretionary);
    expect(f.series).toHaveLength(31);
  });

  it("detects overdue bills", () => {
    const d = base();
    d.bills = [{ id: "b", name: "Internet", amount: 1500, categoryId: "utilities", day: 10, frequency: "monthly", paid: [] }];
    const occ = upcomingBills(d.bills, NOW, 30);
    expect(occ[0].daysUntil).toBe(-5);
    expect(generateInsights(d, NOW).some((i) => i.id === "bill-b-2026-10" && i.tone === "alert")).toBe(true);
  });

  it("computes goal plans", () => {
    const p = goalPlan({ id: "g", name: "Trip", target: 12000, saved: 6000, deadline: "2027-01-15", color: "", icon: "" }, NOW);
    expect(p.pct).toBe(50);
    expect(p.monthsLeft).toBe(3);
    expect(p.perMonth).toBe(2000);
  });
});

describe("demo data", () => {
  it("generates a rich, assistant-worthy dataset", () => {
    const d = demoData(NOW);
    expect(d.isDemo).toBe(true);
    expect(d.txns.length).toBeGreaterThan(150);
    expect(generateInsights(d, NOW).length).toBeGreaterThan(2);
  });
});
