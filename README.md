# Hisab — personal finance, made mindful

A premium, privacy-first expense tracker that runs **entirely in your browser**. No accounts, no backend, no API keys — your data lives in `localStorage` and can be exported/imported as JSON.

**Live:** https://finance-tracker-seven-topaz.vercel.app

## Features
- **Transactions** — income & expenses with categories, search, filters, CSV export.
- **Categories & budgets** — monthly budgets with live pace projections ("at risk" before you overspend).
- **Recurring bills** — monthly / yearly bills, a due-date timeline, one-click "mark paid" (logs the expense).
- **Savings goals** — targets, deadlines, required monthly contributions, progress rings.
- **Customizable dashboard** — drag to reorder, S/M/L/XL resize, add/remove widgets (balance, forecast, spending mix, budgets, cash flow, bills, goals, recent, quick add, savings rate). Layout is saved.
- **Hisab Copilot** — a rule-based, fully on-device assistant that proactively flags overspending, overdue bills, spending spikes and unbudgeted categories, forecasts your month-end balance, and offers one-click fixes (adjust budget, mark bill paid, move surplus to a goal).
- Command palette (`Ctrl/⌘ + K`), assistant toggle (`Ctrl/⌘ + .`), dark/light/system theme, accent color picker, selectable currency (default **BDT ৳**), friendly demo data with "Clear demo data".

## Stack
Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn-style components · framer-motion · lucide-react · recharts · dnd-kit · zustand · vitest

## Develop
```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm test        # vitest unit tests for the finance engine
npm run build
```

## Author

Built by [Mahir Faysal](https://mfaysal.com), a web developer in Bangladesh.

- Project page: [Hisab on mfaysal.com](https://mfaysal.com/projects/finance-tracker)
- More projects: [mfaysal.com/projects](https://mfaysal.com/projects) · Blog: [mfaysal.com/blog](https://mfaysal.com/blog)
