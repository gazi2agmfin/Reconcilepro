# Reconcilepro — A streamlined bank reconciliation tool.

Reconcilepro is a lightweight, developer-friendly bank reconciliation application built with Next.js and Firebase. It helps finance teams quickly reconcile bank statements, track differences between bank and book balances, and manage reconciliation statements across users and banks.

Key features:
- Create, edit, and print reconciliation statements.
- Track corrected bank/book balances and per-statement differences.
- Admin dashboard for managing users, banks, and system-wide reconciliations.
- Monthly overview charts and per-user analytics.
- Export reconciliations and user data to Excel/PDF.

Developer
---------
Ariful Islam ,AGM Finance,PBS,BREB

Getting started
---------------
1. Install dependencies: `npm install` or `pnpm install`.
2. Start the dev server: `npm run dev`.
3. Open the app at `http://localhost:9002` (or the port shown in console).

Where to look
--------------
- Main app pages: `src/app`
- Reconciliation form and print: `src/components/reconciliations/reconciliation-form.tsx`
- Admin pages: `src/app/admin`
- Firebase helpers: `src/firebase`

If you'd like me to add a small footer or about page with the developer credit inside the app UI, tell me and I will add it.
