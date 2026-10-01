export type TxnType = "income" | "expense";
export type Txn = { id: string; date: string; amount: number; type: TxnType; categoryId: string; note: string; billId?: string; goalId?: string };
export type Category = { id: string; name: string; color: string; icon: string; kind: TxnType; budget: number };
export type Bill = { id: string; name: string; amount: number; categoryId: string; day: number; frequency: "monthly" | "yearly"; month?: number; paid: string[] };
export type Goal = { id: string; name: string; target: number; saved: number; deadline?: string; color: string; icon: string };
export type FinanceData = {
  currency: string;
  startingBalance: number;
  categories: Category[];
  txns: Txn[];
  bills: Bill[];
  goals: Goal[];
  isDemo: boolean;
};
