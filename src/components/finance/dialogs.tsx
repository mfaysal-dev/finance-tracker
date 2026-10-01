"use client";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useFinance } from "@/lib/finance/store";
import type { Bill, Category, Goal, Txn, TxnType } from "@/lib/finance/types";
import { CURRENCIES } from "@/lib/finance/logic";
import { todayISO, cn } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { ICONS, SWATCHES } from "./icons";

function sym(cur: string) { return CURRENCIES.find((c) => c.code === cur)?.symbol ?? cur; }

export function TxnDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Partial<Txn> | null }) {
  const { categories, addTxn, updateTxn, currency } = useFinance();
  const [type, setType] = useState<TxnType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!open) return;
    const t = initial?.type ?? "expense";
    setType(t);
    setAmount(initial?.amount ? String(initial.amount) : "");
    setCategoryId(initial?.categoryId ?? categories.find((c) => c.kind === t)?.id ?? "");
    setDate(initial?.date ?? todayISO());
    setNote(initial?.note ?? "");
  }, [open, initial, categories]);
  const cats = categories.filter((c) => c.kind === type);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0 || !categoryId) return toast("Enter an amount and category", undefined, "danger");
    const payload = { type, amount: n, categoryId, date, note: note.trim() || (categories.find((c) => c.id === categoryId)?.name ?? "") };
    if (initial?.id) updateTxn(initial.id, payload); else addTxn(payload);
    toast(initial?.id ? "Transaction updated" : "Transaction added");
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title={initial?.id ? "Edit transaction" : "New transaction"}>
      <form onSubmit={save} className="space-y-4 pb-3">
        <Segmented id="txn-type" value={type} onChange={(v) => { setType(v); setCategoryId(categories.find((c) => c.kind === v)?.id ?? ""); }}
          options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} />
        <Field label={`Amount (${currency})`} htmlFor="t-amt">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{sym(currency)}</span>
            <Input id="t-amt" inputMode="decimal" type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-9 font-display text-lg" placeholder="0" autoFocus />
          </div>
        </Field>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Category</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
            {cats.map((c) => {
              const Icon = ICONS[c.icon] ?? ICONS.wallet;
              return (
                <button type="button" key={c.id} role="radio" aria-checked={categoryId === c.id} onClick={() => setCategoryId(c.id)}
                  className={cn("flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition", categoryId === c.id ? "border-transparent text-white" : "hover:bg-muted")}
                  style={categoryId === c.id ? { background: c.color } : undefined}>
                  <Icon className="size-3.5" style={categoryId === c.id ? undefined : { color: c.color }} />{c.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="t-date"><Input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <Field label="Note" htmlFor="t-note"><Input id="t-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lunch" /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">{initial?.id ? "Save" : "Add transaction"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CategoryDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Category | null }) {
  const { upsertCategory, currency } = useFinance();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [icon, setIcon] = useState("wallet");
  const [kind, setKind] = useState<TxnType>("expense");
  const [budget, setBudget] = useState("");
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? ""); setColor(initial?.color ?? SWATCHES[Math.floor(Math.random() * SWATCHES.length)]);
    setIcon(initial?.icon ?? "wallet"); setKind(initial?.kind ?? "expense"); setBudget(initial?.budget ? String(initial.budget) : "");
  }, [open, initial]);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    upsertCategory({ id: initial?.id, name: name.trim(), color, icon, kind, budget: kind === "expense" ? Number(budget) || 0 : 0 });
    toast(initial ? "Category updated" : "Category created");
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Edit category" : "New category"}>
      <form onSubmit={save} className="space-y-4 pb-3">
        <Segmented id="cat-kind" value={kind} onChange={setKind} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" htmlFor="c-name"><Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
          {kind === "expense" && <Field label={`Monthly budget (${currency})`} htmlFor="c-b"><Input id="c-b" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0 = none" /></Field>}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Color</p>
          <div className="flex flex-wrap gap-2">{SWATCHES.map((s) => <button type="button" key={s} aria-label={`Color ${s}`} onClick={() => setColor(s)} className={cn("size-7 rounded-full ring-offset-2 ring-offset-card", color === s && "ring-2 ring-foreground/50")} style={{ background: s }} />)}</div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Icon</p>
          <div className="flex flex-wrap gap-1.5">{Object.entries(ICONS).map(([k, I]) => <button type="button" key={k} aria-label={k} onClick={() => setIcon(k)} className={cn("grid size-9 place-items-center rounded-xl border", icon === k ? "text-white" : "hover:bg-muted")} style={icon === k ? { background: color, borderColor: color } : undefined}><I className="size-4" /></button>)}</div>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </Dialog>
  );
}

export function BillDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Bill | null }) {
  const { upsertBill, categories, currency } = useFinance();
  const [f, setF] = useState({ name: "", amount: "", categoryId: "", day: "1", frequency: "monthly" as Bill["frequency"], month: "1" });
  useEffect(() => {
    if (!open) return;
    setF({ name: initial?.name ?? "", amount: initial ? String(initial.amount) : "", categoryId: initial?.categoryId ?? categories.find((c) => c.kind === "expense")?.id ?? "",
      day: String(initial?.day ?? 1), frequency: initial?.frequency ?? "monthly", month: String(initial?.month ?? new Date().getMonth() + 1) });
  }, [open, initial, categories]);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !Number(f.amount)) return toast("Name and amount are required", undefined, "danger");
    upsertBill({ id: initial?.id, name: f.name.trim(), amount: Number(f.amount), categoryId: f.categoryId, day: Math.min(31, Math.max(1, Number(f.day) || 1)), frequency: f.frequency, month: f.frequency === "yearly" ? Number(f.month) : undefined });
    toast(initial ? "Bill updated" : "Recurring bill added");
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Edit bill" : "New recurring bill"}>
      <form onSubmit={save} className="grid grid-cols-2 gap-3 pb-3">
        <Field label="Name" htmlFor="b-n" className="col-span-2"><Input id="b-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus placeholder="e.g. Internet" /></Field>
        <Field label={`Amount (${currency})`} htmlFor="b-a"><Input id="b-a" type="number" min="0" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Category" htmlFor="b-c"><Select id="b-c" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>{categories.filter((c) => c.kind === "expense").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Repeats" htmlFor="b-f"><Select id="b-f" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value as Bill["frequency"] })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></Select></Field>
        <Field label="Due day" htmlFor="b-d"><Input id="b-d" type="number" min="1" max="31" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} /></Field>
        {f.frequency === "yearly" && <Field label="Month" htmlFor="b-m"><Select id="b-m" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleString("en-US", { month: "long" })}</option>)}</Select></Field>}
        <div className="col-span-2 flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </Dialog>
  );
}

export function GoalDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Goal | null }) {
  const { upsertGoal, currency } = useFinance();
  const [f, setF] = useState({ name: "", target: "", saved: "", deadline: "", color: SWATCHES[0], icon: "target" });
  useEffect(() => {
    if (!open) return;
    setF({ name: initial?.name ?? "", target: initial ? String(initial.target) : "", saved: initial ? String(initial.saved) : "0", deadline: initial?.deadline ?? "", color: initial?.color ?? SWATCHES[2], icon: initial?.icon ?? "target" });
  }, [open, initial]);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !Number(f.target)) return toast("Name and target are required", undefined, "danger");
    upsertGoal({ id: initial?.id, name: f.name.trim(), target: Number(f.target), saved: Number(f.saved) || 0, deadline: f.deadline || undefined, color: f.color, icon: f.icon });
    toast(initial ? "Goal updated" : "Savings goal created");
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title={initial ? "Edit goal" : "New savings goal"}>
      <form onSubmit={save} className="grid grid-cols-2 gap-3 pb-3">
        <Field label="Goal name" htmlFor="g-n" className="col-span-2"><Input id="g-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus placeholder="e.g. Hajj fund, New bike" /></Field>
        <Field label={`Target (${currency})`} htmlFor="g-t"><Input id="g-t" type="number" min="0" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></Field>
        <Field label="Already saved" htmlFor="g-s"><Input id="g-s" type="number" min="0" value={f.saved} onChange={(e) => setF({ ...f, saved: e.target.value })} /></Field>
        <Field label="Deadline (optional)" htmlFor="g-d" className="col-span-2"><Input id="g-d" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
        <div className="col-span-2 flex flex-wrap gap-2">{SWATCHES.map((s) => <button type="button" key={s} aria-label={`Color ${s}`} onClick={() => setF({ ...f, color: s })} className={cn("size-7 rounded-full ring-offset-2 ring-offset-card", f.color === s && "ring-2 ring-foreground/50")} style={{ background: s }} />)}</div>
        <div className="col-span-2 flex flex-wrap gap-1.5">{["target", "shield", "plane", "laptop", "home", "car", "gift", "graduation", "baby", "phone"].map((k) => { const I = ICONS[k]; return <button type="button" key={k} aria-label={k} onClick={() => setF({ ...f, icon: k })} className={cn("grid size-9 place-items-center rounded-xl border", f.icon === k ? "text-white" : "hover:bg-muted")} style={f.icon === k ? { background: f.color, borderColor: f.color } : undefined}><I className="size-4" /></button>; })}</div>
        <div className="col-span-2 flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div>
      </form>
    </Dialog>
  );
}
