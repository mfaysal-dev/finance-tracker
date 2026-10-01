"use client";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart } from "recharts";
import { ArrowDownRight, ArrowUpRight, CalendarClock, CheckCircle2, LineChart, PieChart as PieIcon, Plus, Receipt, Sparkles, Target, Wallet, BarChart3, Gauge, Zap, History } from "lucide-react";
import type { WidgetDef } from "@/components/kit/dashboard";
import { AssistantBrief, type Insight } from "@/components/kit/assistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ring } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useFinance } from "@/lib/finance/store";
import { balance, balanceSeries, budgetStatus, cashflow, forecast, goalPlan, money, monthSummary, spendByCategory, upcomingBills, upTo } from "@/lib/finance/logic";
import { formatDate, monthKey, shiftMonth, todayISO, cn } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { CatIcon, ICONS } from "./icons";
import { useFinUI } from "./ui-state";

const tooltipStyle = { background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12, color: "var(--color-foreground)" };

function Delta({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  if (!prev) return null;
  const d = ((cur - prev) / prev) * 100;
  const good = invert ? d <= 0 : d >= 0;
  const Icon = d >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={cn("inline-flex items-center text-[11px] font-medium", good ? "text-success" : "text-danger")}><Icon className="size-3" />{Math.abs(Math.round(d))}%</span>;
}

function BalanceWidget({ size }: { size: string }) {
  const data = useFinance();
  const openTxn = useFinUI((s) => s.openTxn);
  const now = new Date();
  const bal = balance(data, now);
  const s = monthSummary(upTo(data.txns, now), monthKey(now));
  const p = monthSummary(data.txns, monthKey(shiftMonth(now, -1)));
  const m = (n: number) => money(n, data.currency);
  const series = balanceSeries(data, now, 30);
  return (
    <div className="flex h-full flex-col gap-4">
    <div className={cn("flex flex-col gap-5", size !== "s" && "sm:flex-row sm:items-center")}>
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total balance</p>
        <p className="tabular mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">{m(bal)}</p>
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={() => openTxn({ type: "expense" })}><Plus /> Expense</Button>
          <Button size="sm" variant="soft" onClick={() => openTxn({ type: "income" })}><Plus /> Income</Button>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-2">
        {[
          { label: "Income", v: s.income, prev: p.income, cls: "text-success" },
          { label: "Spent", v: s.expense, prev: p.expense, cls: "text-danger", invert: true },
          { label: "Net", v: s.net, prev: 0, cls: s.net >= 0 ? "text-foreground" : "text-danger" },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl bg-muted/60 p-3">
            <p className="text-[11px] text-muted-foreground">{x.label} <span className="hidden sm:inline">· this month</span></p>
            <p className={cn("tabular mt-1 font-display text-base font-semibold sm:text-lg", x.cls)}>{money(x.v, data.currency, { compact: true })}</p>
            {x.prev ? <p className="text-[10px] text-muted-foreground"><Delta cur={x.v} prev={x.prev} invert={x.invert} /> vs last mo</p> : <p className="text-[10px] text-muted-foreground">{s.income ? `${Math.round(s.savingsRate * 100)}% saved` : "—"}</p>}
          </div>
        ))}
      </div>
    </div>
      <div className="relative h-44">
        <p className="absolute left-0 top-0 text-[10px] uppercase tracking-wider text-muted-foreground">Balance · last 30 days</p>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 18, left: 0, right: 0, bottom: 0 }}>
            <defs><linearGradient id="bs" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient></defs>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [m(Number(v)), "Balance"]} labelFormatter={(_, p) => (p?.[0]?.payload?.date ? formatDate(p[0].payload.date) : "")} />
            <Area type="monotone" dataKey="balance" stroke="var(--color-primary)" strokeWidth={2} fill="url(#bs)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ForecastWidget() {
  const data = useFinance();
  const f = useMemo(() => forecast(data, new Date()), [data]);
  const m = (n: number) => money(Math.round(n), data.currency);
  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Projected month-end</p>
          <p className={cn("tabular font-display text-3xl font-bold", f.projected < 0 && "text-danger")}>{m(f.projected)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 pb-1 text-[11px]">
          <Badge tone="success">+{m(f.expectedIncome)} expected income</Badge>
          <Badge tone="warning">−{m(f.unpaidBills)} bills due</Badge>
          <Badge>−{m(f.discretionary)} est. spending</Badge>
        </div>
      </div>
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={f.series} margin={{ left: -10, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="fa" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" interval={4} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" tickFormatter={(v) => money(v, data.currency, { compact: true })} width={64} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [m(Number(v)), n === "actual" ? "Balance" : "Forecast"]} labelFormatter={(l) => `Day ${l}`} />
            <ReferenceLine y={0} stroke="var(--color-danger)" strokeOpacity={0.4} />
            <Area type="monotone" dataKey="actual" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#fa)" connectNulls={false} dot={false} />
            <Line type="monotone" dataKey="projected" stroke="var(--color-primary)" strokeWidth={2} strokeDasharray="6 5" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Based on your average pace of {m(f.dailyRate)}/day, unpaid bills and typical income. {f.daysLeft} days left.</p>
    </div>
  );
}

function CategoriesWidget() {
  const data = useFinance();
  const now = new Date();
  const rows = spendByCategory(data, todayISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)), todayISO(now)).filter((r) => r.category.id !== "savings");
  const total = rows.reduce((a, b) => a + b.amount, 0);
  return (
    <div>
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows.map((r) => ({ name: r.category.name, value: r.amount, color: r.category.color }))} dataKey="value" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {rows.map((r) => <Cell key={r.category.id} fill={r.category.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(Number(v), data.currency)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Last 30 days</p><p className="tabular font-display text-lg font-bold">{money(total, data.currency, { compact: true })}</p></div>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.slice(0, 5).map((r) => (
          <li key={r.category.id} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-full" style={{ background: r.category.color }} />
            <span className="flex-1 truncate">{r.category.name}</span>
            <span className="tabular text-muted-foreground">{Math.round((r.amount / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BudgetsWidget() {
  const data = useFinance();
  const setView = useFinUI((s) => s.setView);
  const rows = budgetStatus(data, new Date());
  const m = (n: number) => money(Math.round(n), data.currency, { compact: true });
  if (!rows.length) return <div className="py-8 text-center text-sm text-muted-foreground">No budgets yet. <button className="text-primary underline" onClick={() => setView("budgets")}>Set one up</button></div>;
  return (
    <ul className="space-y-3.5">
      {rows.slice(0, 6).map((r) => {
        const pct = Math.min(100, (r.spent / r.budget) * 100);
        const proj = Math.min(100, (r.projected / r.budget) * 100);
        const color = r.status === "over" ? "var(--color-danger)" : r.status === "warn" ? "var(--color-warning)" : r.category.color;
        return (
          <li key={r.category.id}>
            <div className="mb-1.5 flex items-center gap-2 text-sm">
              <CatIcon name={r.category.icon} color={r.category.color} size="sm" />
              <span className="flex-1 truncate font-medium">{r.category.name}</span>
              {r.status !== "ok" && <Badge tone={r.status === "over" ? "danger" : "warning"}>{r.status === "over" ? "Over" : "At risk"}</Badge>}
              <span className="tabular text-xs text-muted-foreground">{m(r.spent)} / {m(r.budget)}</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${r.category.name} budget`} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="absolute inset-y-0 left-0 rounded-full opacity-25" style={{ width: `${proj}%`, background: color }} />
              <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} />
            </div>
          </li>
        );
      })}
      <li className="text-[11px] text-muted-foreground">Faded bar = projected by month-end.</li>
    </ul>
  );
}

function CashflowWidget() {
  const data = useFinance();
  const rows = cashflow(data, new Date(), 6);
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: -10, right: 4, top: 8 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" tickFormatter={(v) => money(v, data.currency, { compact: true })} width={60} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} formatter={(v, n) => [money(Number(v), data.currency), n === "income" ? "Income" : "Expenses"]} />
          <Bar dataKey="income" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BillsWidget() {
  const data = useFinance();
  const payBill = useFinance((s) => s.payBill);
  const rows = upcomingBills(data.bills, new Date(), 30).slice(0, 5);
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">No upcoming bills 🎉</p>;
  return (
    <ul className="space-y-2">
      {rows.map((o) => {
        const cat = data.categories.find((c) => c.id === o.bill.categoryId);
        return (
          <li key={o.bill.id + o.period} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-muted/50">
            <CatIcon name={cat?.icon ?? "wallet"} color={cat?.color ?? "#64748b"} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{o.bill.name}</p>
              <p className={cn("text-[11px]", o.paid ? "text-success" : o.daysUntil < 0 ? "text-danger" : o.daysUntil <= 3 ? "text-[color-mix(in_oklch,var(--color-warning)_70%,black)] dark:text-warning" : "text-muted-foreground")}>
                {o.paid ? "Paid" : o.daysUntil < 0 ? `Overdue ${-o.daysUntil}d` : o.daysUntil === 0 ? "Due today" : `Due ${formatDate(o.due)} · in ${o.daysUntil}d`}
              </p>
            </div>
            <span className="tabular text-sm font-medium">{money(o.bill.amount, data.currency)}</span>
            {!o.paid && <Button size="icon-sm" variant="soft" aria-label={`Mark ${o.bill.name} paid`} onClick={() => { payBill(o.bill.id, o.period); toast(`${o.bill.name} marked paid`); }}><CheckCircle2 /></Button>}
          </li>
        );
      })}
    </ul>
  );
}

function GoalsWidget() {
  const data = useFinance();
  const contribute = useFinance((s) => s.contribute);
  if (!data.goals.length) return <p className="py-8 text-center text-sm text-muted-foreground">No savings goals yet.</p>;
  return (
    <ul className="space-y-3">
      {data.goals.map((g) => {
        const p = goalPlan(g);
        const Icon = ICONS[g.icon] ?? Target;
        return (
          <li key={g.id} className="flex items-center gap-3">
            <Ring value={p.pct} size={48} stroke={5} color={g.color}><Icon className="size-4" style={{ color: g.color }} /></Ring>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{g.name}</p>
              <p className="tabular text-[11px] text-muted-foreground">{money(g.saved, data.currency, { compact: true })} of {money(g.target, data.currency, { compact: true })} · {Math.round(p.pct)}%</p>
            </div>
            {!p.done && <Button size="sm" variant="outline" onClick={() => { const amt = Math.min(p.remaining, 1000); contribute(g.id, amt); toast(`Added ${money(amt, data.currency)} to ${g.name}`); }}>+{money(1000, data.currency, { compact: true })}</Button>}
          </li>
        );
      })}
    </ul>
  );
}

function RecentWidget() {
  const data = useFinance();
  const openTxn = useFinUI((s) => s.openTxn);
  const rows = [...upTo(data.txns, new Date())].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet.</p>;
  return (
    <ul className="space-y-1">
      {rows.map((t) => {
        const c = data.categories.find((x) => x.id === t.categoryId);
        return (
          <li key={t.id}>
            <button onClick={() => openTxn(t)} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-muted/50">
              <CatIcon name={c?.icon ?? "wallet"} color={c?.color ?? "#64748b"} size="sm" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm">{t.note}</p><p className="text-[11px] text-muted-foreground">{formatDate(t.date)} · {c?.name}</p></div>
              <span className={cn("tabular text-sm font-medium", t.type === "income" && "text-success")}>{t.type === "income" ? "+" : "−"}{money(t.amount, data.currency)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function QuickAddWidget() {
  const { categories, addTxn, currency } = useFinance();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("");
  const [note, setNote] = useState("");
  const cats = categories.filter((c) => c.kind === type);
  const catId = cats.some((c) => c.id === cat) ? cat : cats[0]?.id ?? "";
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const n = Number(amount); if (!n) return; addTxn({ type, amount: n, categoryId: catId, note: note || categories.find((c) => c.id === catId)?.name || "", date: todayISO() }); toast(`${type === "income" ? "Income" : "Expense"} of ${money(n, currency)} added`); setAmount(""); setNote(""); }}>
      <Segmented id="qa" value={type} onChange={setType} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} />
      <Input type="number" min="0" step="any" placeholder={`Amount (${currency})`} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
      <div className="flex flex-wrap gap-1.5">
        {cats.slice(0, 8).map((c) => (
          <button type="button" key={c.id} onClick={() => setCat(c.id)} aria-pressed={catId === c.id} className={cn("rounded-lg border px-2 py-1 text-[11px]", catId === c.id ? "border-transparent text-white" : "hover:bg-muted")} style={catId === c.id ? { background: c.color } : undefined}>{c.name}</button>
        ))}
      </div>
      <div className="flex gap-2"><Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" /><Button type="submit" size="icon" aria-label="Add"><Plus /></Button></div>
    </form>
  );
}

function SavingsRateWidget() {
  const data = useFinance();
  const rows = cashflow(data, new Date(), 6).map((r) => ({ ...r, rate: r.income ? Math.round((r.net / r.income) * 100) : 0 }));
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: -24, right: 4, top: 8 }}>
          <defs><linearGradient id="sr" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" unit="%" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Savings rate"]} />
          <ReferenceLine y={20} stroke="var(--color-success)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="rate" stroke="var(--color-chart-3)" strokeWidth={2.5} fill="url(#sr)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function useWidgetRegistry(insights: Insight[]): WidgetDef[] {
  const setView = useFinUI((s) => s.setView);
  return [
    { type: "balance", title: "Balance & this month", description: "Total balance, income, spend and net.", icon: Wallet, defaultSize: "l", render: (s) => <BalanceWidget size={s} /> },
    { type: "assistant", title: "Assistant brief", description: "Top insights with one-click fixes.", icon: Sparkles, defaultSize: "s", render: (s) => <AssistantBrief insights={insights} limit={s === "s" ? 2 : 4} /> },
    { type: "forecast", title: "Month-end forecast", description: "Projected balance through the end of the month.", icon: LineChart, defaultSize: "l", render: () => <ForecastWidget /> },
    { type: "categories", title: "Spending mix", description: "Donut of where your money went (30 days).", icon: PieIcon, defaultSize: "s", render: () => <CategoriesWidget /> },
    { type: "budgets", title: "Budgets", description: "Spent vs budget with projections.", icon: Gauge, defaultSize: "m", render: () => <BudgetsWidget />, action: <Button size="sm" variant="ghost" onClick={() => setView("budgets")}>Manage</Button> },
    { type: "cashflow", title: "Cash flow", description: "Income vs expenses over 6 months.", icon: BarChart3, defaultSize: "m", render: () => <CashflowWidget /> },
    { type: "bills", title: "Upcoming bills", description: "Recurring bills due in the next 30 days.", icon: CalendarClock, defaultSize: "s", render: () => <BillsWidget />, action: <Button size="sm" variant="ghost" onClick={() => setView("bills")}>All</Button> },
    { type: "goals", title: "Savings goals", description: "Progress toward your goals.", icon: Target, defaultSize: "s", render: () => <GoalsWidget />, action: <Button size="sm" variant="ghost" onClick={() => setView("goals")}>All</Button> },
    { type: "recent", title: "Recent activity", description: "Latest transactions.", icon: History, defaultSize: "s", render: () => <RecentWidget />, action: <Button size="sm" variant="ghost" onClick={() => setView("transactions")}>All</Button> },
    { type: "quickadd", title: "Quick add", description: "Log an expense in two taps.", icon: Zap, defaultSize: "s", render: () => <QuickAddWidget /> },
    { type: "savingsrate", title: "Savings rate", description: "Share of income kept each month.", icon: Receipt, defaultSize: "s", render: () => <SavingsRateWidget /> },
  ];
}
