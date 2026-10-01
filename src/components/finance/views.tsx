"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, Pencil, Plus, Receipt, Search, Target, Trash2, Wallet, Tags, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ring } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty";
import { useFinance } from "@/lib/finance/store";
import type { Bill, Category, Goal } from "@/lib/finance/types";
import { budgetStatus, goalPlan, money, monthSummary, upcomingBills } from "@/lib/finance/logic";
import { cn, formatDate, monthKey, monthLabel, parseISO } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { CatIcon, ICONS } from "./icons";
import { BillDialog, CategoryDialog, GoalDialog } from "./dialogs";
import { useFinUI } from "./ui-state";

export function TransactionsView() {
  const { txns, categories, currency, deleteTxn } = useFinance();
  const { openTxn, catFilter, setCatFilter } = useFinUI();
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("all");
  const [type, setType] = useState("all");
  const months = useMemo(() => [...new Set(txns.map((t) => t.date.slice(0, 7)))].sort().reverse(), [txns]);
  const rows = useMemo(() => txns
    .filter((t) => (month === "all" || t.date.startsWith(month)) && (type === "all" || t.type === type) && (catFilter === "all" || t.categoryId === catFilter) && (!q || t.note.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (a.date < b.date ? 1 : -1)), [txns, month, type, catFilter, q]);
  const groups = useMemo(() => {
    const g = new Map<string, typeof rows>();
    for (const r of rows.slice(0, 400)) g.set(r.date, [...(g.get(r.date) ?? []), r]);
    return [...g.entries()];
  }, [rows]);
  const totals = rows.reduce((a, t) => ({ in: a.in + (t.type === "income" ? t.amount : 0), out: a.out + (t.type === "expense" ? t.amount : 0) }), { in: 0, out: 0 });
  const exportCSV = () => {
    const lines = ["date,type,category,amount,note", ...rows.map((t) => [t.date, t.type, categories.find((c) => c.id === t.categoryId)?.name ?? "", t.amount, `"${t.note.replace(/"/g, '""')}"`].join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = "hisab-transactions.csv"; a.click();
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" className="pl-9" aria-label="Search transactions" /></div>
        <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto" aria-label="Month"><option value="all">All months</option>{months.map((m) => <option key={m} value={m}>{monthLabel(m, true)}</option>)}</Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto" aria-label="Type"><option value="all">All types</option><option value="expense">Expenses</option><option value="income">Income</option></Select>
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="w-auto" aria-label="Category"><option value="all">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Button variant="outline" onClick={exportCSV} aria-label="Export CSV"><Download /> CSV</Button>
        <Button onClick={() => openTxn()}><Plus /> Add</Button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge tone="default">{rows.length} transactions</Badge>
        <Badge tone="success">In {money(totals.in, currency)}</Badge>
        <Badge tone="danger">Out {money(totals.out, currency)}</Badge>
        {catFilter !== "all" && <button className="text-xs text-primary underline" onClick={() => setCatFilter("all")}>Clear category filter</button>}
      </div>
      {groups.length === 0 ? <EmptyState icon={Receipt} title="No transactions found" hint="Add your first income or expense to get insights." action={<Button onClick={() => openTxn()}><Plus /> Add transaction</Button>} /> : (
        <Card className="divide-y overflow-hidden">
          {groups.map(([date, items]) => (
            <div key={date}>
              <p className="sticky top-14 z-10 bg-muted/70 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur lg:top-0">{formatDate(parseISO(date), { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</p>
              <ul>
                {items.map((t) => {
                  const c = categories.find((x) => x.id === t.categoryId);
                  return (
                    <li key={t.id} className="group flex items-center gap-3 px-5 py-2.5 hover:bg-muted/40">
                      <CatIcon name={c?.icon ?? "wallet"} color={c?.color ?? "#64748b"} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{t.note}</p><p className="text-xs text-muted-foreground">{c?.name ?? "Uncategorized"}{t.billId && " · bill"}{t.goalId && " · goal"}</p></div>
                      <span className={cn("tabular text-sm font-semibold", t.type === "income" ? "text-success" : "")}>{t.type === "income" ? "+" : "−"}{money(t.amount, currency)}</span>
                      <div className="flex opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => openTxn(t)}><Pencil /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => { deleteTxn(t.id); toast("Transaction deleted"); }}><Trash2 /></Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function BudgetsView() {
  const data = useFinance();
  const { setBudget, deleteCategory, categories, currency } = data;
  const [dlg, setDlg] = useState<Category | null | undefined>(undefined);
  const rows = budgetStatus(data, new Date());
  const totalBudget = rows.reduce((a, r) => a + r.budget, 0);
  const totalSpent = rows.reduce((a, r) => a + r.spent, 0);
  const s = monthSummary(data.txns, monthKey(new Date()));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs text-muted-foreground">Budgeted this month</p><p className="tabular mt-1 font-display text-2xl font-bold">{money(totalBudget, currency)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Spent in budgeted categories</p><p className="tabular mt-1 font-display text-2xl font-bold">{money(totalSpent, currency)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Unbudgeted spending</p><p className="tabular mt-1 font-display text-2xl font-bold">{money(Math.max(0, s.expense - totalSpent), currency)}</p></Card>
      </div>
      <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Categories</h2><Button onClick={() => setDlg(null)}><Plus /> New category</Button></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.filter((c) => c.kind === "expense").map((c, i) => {
          const r = rows.find((x) => x.category.id === c.id);
          const pct = r ? Math.min(100, (r.spent / r.budget) * 100) : 0;
          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}>
              <Card className="group p-5">
                <div className="flex items-center gap-3">
                  <CatIcon name={c.icon} color={c.color} />
                  <div className="min-w-0 flex-1"><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{r ? `${money(r.spent, currency)} spent · proj. ${money(Math.round(r.projected), currency)}` : "No budget"}</p></div>
                  {r && r.status !== "ok" && <Badge tone={r.status === "over" ? "danger" : "warning"}>{r.status === "over" ? "Over" : "At risk"}</Badge>}
                  <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setDlg(c)}><Pencil /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => { if (confirm(`Delete category "${c.name}"? Transactions stay but become uncategorized.`)) deleteCategory(c.id); }}><Trash2 /></Button>
                  </div>
                </div>
                {r && <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: r.status === "over" ? "var(--color-danger)" : r.status === "warn" ? "var(--color-warning)" : c.color }} /></div>}
                <label className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  Monthly budget
                  <Input type="number" min="0" step="100" defaultValue={c.budget || ""} key={c.budget} placeholder="none" className="h-8 flex-1 text-sm"
                    onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== c.budget) { setBudget(c.id, v); toast(`${c.name} budget set to ${money(v, currency)}`); } }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} aria-label={`${c.name} monthly budget`} />
                </label>
              </Card>
            </motion.div>
          );
        })}
      </div>
      <h2 className="font-display text-lg font-semibold">Income sources</h2>
      <div className="flex flex-wrap gap-2">
        {categories.filter((c) => c.kind === "income").map((c) => (
          <button key={c.id} onClick={() => setDlg(c)} className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-2 text-sm hover:bg-muted"><CatIcon name={c.icon} color={c.color} size="sm" />{c.name}<Pencil className="size-3 text-muted-foreground" /></button>
        ))}
        {categories.length === 0 && <EmptyState icon={Tags} title="No categories" />}
      </div>
      <CategoryDialog open={dlg !== undefined} onClose={() => setDlg(undefined)} initial={dlg ?? null} />
    </div>
  );
}

export function BillsView() {
  const { bills, categories, currency, payBill, deleteBill } = useFinance();
  const [dlg, setDlg] = useState<Bill | null | undefined>(undefined);
  const occ = upcomingBills(bills, new Date(), 45);
  const monthlyTotal = bills.reduce((a, b) => a + (b.frequency === "monthly" ? b.amount : b.amount / 12), 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Card className="flex-1 p-5"><p className="text-xs text-muted-foreground">Fixed costs per month (yearly averaged)</p><p className="tabular mt-1 font-display text-2xl font-bold">{money(Math.round(monthlyTotal), currency)}</p></Card>
        <Button onClick={() => setDlg(null)}><Plus /> New bill</Button>
      </div>
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Timeline · next 45 days</h2>
        {occ.length === 0 ? <EmptyState icon={CalendarClock} title="Nothing due soon" /> : (
          <ol className="relative space-y-3 border-l-2 border-dashed pl-6">
            {occ.map((o) => {
              const c = categories.find((x) => x.id === o.bill.categoryId);
              return (
                <li key={o.bill.id + o.period} className="relative">
                  <span className={cn("absolute -left-[33px] top-4 size-4 rounded-full border-4 border-background", o.paid ? "bg-success" : o.daysUntil < 0 ? "bg-danger" : o.daysUntil <= 3 ? "bg-warning" : "bg-muted-foreground/40")} />
                  <Card className="flex items-center gap-3 p-4">
                    <CatIcon name={c?.icon ?? "wallet"} color={c?.color ?? "#64748b"} />
                    <div className="min-w-0 flex-1"><p className="font-medium">{o.bill.name}</p><p className="text-xs text-muted-foreground">{formatDate(o.due, { weekday: "short", month: "short", day: "numeric" })} · {o.bill.frequency}</p></div>
                    <span className="tabular font-semibold">{money(o.bill.amount, currency)}</span>
                    {o.paid ? <Badge tone="success"><CheckCircle2 className="size-3" />Paid</Badge> : <Button size="sm" variant={o.daysUntil < 0 ? "destructive" : "soft"} onClick={() => { payBill(o.bill.id, o.period); toast(`${o.bill.name} paid`, "Logged as an expense."); }}>{o.daysUntil < 0 ? "Pay overdue" : "Mark paid"}</Button>}
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">All recurring bills</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {bills.map((b) => {
            const c = categories.find((x) => x.id === b.categoryId);
            return (
              <Card key={b.id} className="flex items-center gap-3 p-4">
                <CatIcon name={c?.icon ?? "wallet"} color={c?.color ?? "#64748b"} size="sm" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{b.name}</p><p className="text-xs text-muted-foreground">Day {b.day}{b.frequency === "yearly" && ` of ${new Date(2000, (b.month ?? 1) - 1).toLocaleString("en-US", { month: "short" })}`} · {money(b.amount, currency)}</p></div>
                <Button size="icon-sm" variant="ghost" aria-label="Edit bill" onClick={() => setDlg(b)}><Pencil /></Button>
                <Button size="icon-sm" variant="ghost" aria-label="Delete bill" onClick={() => { deleteBill(b.id); toast("Bill removed"); }}><Trash2 /></Button>
              </Card>
            );
          })}
          {bills.length === 0 && <EmptyState icon={Wallet} title="No recurring bills" hint="Add rent, internet, subscriptions — the assistant will remind you before they're due." />}
        </div>
      </section>
      <BillDialog open={dlg !== undefined} onClose={() => setDlg(undefined)} initial={dlg ?? null} />
    </div>
  );
}

export function GoalsView() {
  const { goals, currency, contribute, deleteGoal } = useFinance();
  const [dlg, setDlg] = useState<Goal | null | undefined>(undefined);
  const [amt, setAmt] = useState<Record<string, string>>({});
  return (
    <div className="space-y-5">
      <div className="flex justify-end"><Button onClick={() => setDlg(null)}><Plus /> New goal</Button></div>
      {goals.length === 0 ? <EmptyState icon={Target} title="No goals yet" hint="Saving for something? Create a goal and track progress." action={<Button onClick={() => setDlg(null)}><Plus /> Create goal</Button>} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const p = goalPlan(g);
            const Icon = ICONS[g.icon] ?? Target;
            return (
              <Card key={g.id} className="relative overflow-hidden p-6">
                <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full opacity-20 blur-2xl" style={{ background: g.color }} />
                <div className="relative flex items-start gap-4">
                  <Ring value={p.pct} size={84} stroke={8} color={g.color}><span className="tabular font-display text-base">{Math.round(p.pct)}%</span></Ring>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><Icon className="size-4" style={{ color: g.color }} /><p className="truncate font-display text-lg font-semibold">{g.name}</p></div>
                    <p className="tabular mt-1 text-sm">{money(g.saved, currency)} <span className="text-muted-foreground">/ {money(g.target, currency)}</span></p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.done ? "Completed 🎉" : g.deadline ? `${money(Math.round(p.perMonth ?? 0), currency)}/mo for ${p.monthsLeft} mo · by ${formatDate(g.deadline, { month: "short", year: "numeric" })}` : `${money(p.remaining, currency)} to go`}</p>
                  </div>
                </div>
                <div className="relative mt-5 flex gap-2">
                  <Input type="number" min="0" placeholder="Amount" value={amt[g.id] ?? ""} onChange={(e) => setAmt({ ...amt, [g.id]: e.target.value })} className="h-9" aria-label={`Contribute to ${g.name}`} />
                  <Button size="sm" className="h-9" onClick={() => { const n = Number(amt[g.id]); if (!n) return; contribute(g.id, n); setAmt({ ...amt, [g.id]: "" }); toast(`${money(n, currency)} added to ${g.name}`); }}>Add</Button>
                  <Button size="icon" variant="ghost" aria-label="Edit goal" onClick={() => setDlg(g)}><Pencil /></Button>
                  <Button size="icon" variant="ghost" aria-label="Delete goal" onClick={() => { if (confirm(`Delete goal "${g.name}"?`)) deleteGoal(g.id); }}><Trash2 /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <GoalDialog open={dlg !== undefined} onClose={() => setDlg(undefined)} initial={dlg ?? null} />
    </div>
  );
}
