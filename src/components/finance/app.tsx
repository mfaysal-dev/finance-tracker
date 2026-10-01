"use client";
import { useMemo } from "react";
import { CalendarClock, Coins, Gauge, LayoutDashboard, Plus, Receipt, Target, TrendingUp, Wallet } from "lucide-react";
import { AppShell, type NavItem } from "@/components/kit/shell";
import { Dashboard } from "@/components/kit/dashboard";
import { useAssistant, type Insight } from "@/components/kit/assistant";
import type { Command } from "@/components/kit/command-palette";
import { Field, Input, Select } from "@/components/ui/input";
import { useFinance, exportFinance } from "@/lib/finance/store";
import { CURRENCIES, forecast, generateInsights, money, type FinAction } from "@/lib/finance/logic";
import { greeting, monthKey, monthLabel } from "@/lib/utils";
import { useWidgetRegistry } from "./widgets";
import { BillsView, BudgetsView, GoalsView, TransactionsView } from "./views";
import { TxnDialog } from "./dialogs";
import { useFinUI } from "./ui-state";

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: Receipt },
  { id: "budgets", label: "Budgets", icon: Gauge },
  { id: "bills", label: "Bills", icon: CalendarClock },
  { id: "goals", label: "Goals", icon: Target },
];

export default function FinanceApp() {
  const data = useFinance();
  const { view, setView, txnDialog, openTxn, closeTxn, setCatFilter } = useFinUI();
  const setAssistantOpen = useAssistant((s) => s.setOpen);

  const insights: Insight[] = useMemo(() => {
    const m = (n: number) => money(n, data.currency);
    const exec = (a: FinAction) => {
      const st = useFinance.getState();
      switch (a.kind) {
        case "setBudget": return st.setBudget(a.categoryId, a.amount);
        case "payBill": return st.payBill(a.billId, a.period);
        case "contribute": return st.contribute(a.goalId, a.amount);
        case "view": setCatFilter(a.categoryId ?? "all"); setView(a.view); setAssistantOpen(false);
      }
    };
    const doneMsg = (a: FinAction) =>
      a.kind === "setBudget" ? `Budget updated to ${m(a.amount)}` : a.kind === "payBill" ? "Bill marked as paid" : a.kind === "contribute" ? `${m(a.amount)} moved to your goal` : undefined;
    return generateInsights(data, new Date()).map((r) => ({
      ...r,
      actions: r.actions.map((x) => ({ label: x.label, run: () => exec(x.action), resolves: x.action.kind !== "view", done: doneMsg(x.action) })),
    }));
  }, [data, setView, setCatFilter, setAssistantOpen]);

  const registry = useWidgetRegistry(insights);
  const f = useMemo(() => forecast(data, new Date()), [data]);

  const commands: Command[] = useMemo(() => [
    { id: "add-exp", label: "Add expense", group: "Create", icon: Plus, run: () => openTxn({ type: "expense" }), keywords: "new spend" },
    { id: "add-inc", label: "Add income", group: "Create", icon: Coins, run: () => openTxn({ type: "income" }), keywords: "salary" },
    { id: "budgets", label: "Adjust budgets", group: "Create", icon: Gauge, run: () => setView("budgets") },
    { id: "goal", label: "New savings goal", group: "Create", icon: Target, run: () => setView("goals") },
  ], [openTxn, setView]);

  const scanSteps = [
    `Reading ${data.txns.length} transactions`,
    `Checking ${data.categories.filter((c) => c.budget > 0).length} budgets against your pace`,
    `Scanning ${data.bills.length} recurring bills`,
    "Projecting month-end balance",
    "Drafting suggestions",
  ];

  const intro = (
    <div>
      <p className="text-sm text-muted-foreground">{greeting()} 👋</p>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{monthLabel(monthKey(new Date()), true)} at a glance</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><TrendingUp className="size-4 shrink-0 text-primary" /> <span>On track to end the month with <b className="text-foreground">{money(Math.round(f.projected), data.currency)}</b></span></p>
    </div>
  );

  return (
    <AppShell
      nav={NAV} view={view} onView={setView} logo={Wallet} insights={insights} scanSteps={scanSteps} commands={commands} assistantName="Hisab Copilot"
      hooks={{ exportData: exportFinance, importData: data.importData, clearDemo: data.clearDemo, loadDemo: data.loadDemo, isDemo: data.isDemo }}
      settingsExtra={
        <div>
          <h3 className="mb-2 text-sm font-semibold">Money</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency" htmlFor="cur"><Select id="cur" value={data.currency} onChange={(e) => data.setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol.trim()} · {c.name}</option>)}</Select></Field>
            <Field label="Opening balance" htmlFor="ob"><Input id="ob" type="number" defaultValue={data.startingBalance} key={data.startingBalance} onBlur={(e) => data.setStartingBalance(Number(e.target.value) || 0)} /></Field>
          </div>
        </div>
      }
    >
      {view === "dashboard" && <Dashboard registry={registry} intro={intro} />}
      {view === "transactions" && <TransactionsView />}
      {view === "budgets" && <BudgetsView />}
      {view === "bills" && <BillsView />}
      {view === "goals" && <GoalsView />}
      <TxnDialog open={txnDialog !== null} onClose={closeTxn} initial={txnDialog} />
    </AppShell>
  );
}
