# Meridian CardOps — Credit Card Customer Service & Complaint Resolution System

An enterprise credit card operations, complaint resolution, role-based identity verification, and ledger data validation console built with React, TypeScript, Tailwind CSS, Express, and a persistent document collection store.

---

## Core Capabilities

### 1. Service Request Simulation & Resolution Queue (168 Seeded Requests)
- **Four Operational Categories**:
  - **Billing Inquiry (42)**: Late fee waivers, trailing interest, foreign transaction fees, annual fee adjustments, minimum due discrepancies.
  - **Payment Issue (42)**: ACH autopay failures, duplicate payment holds, unapplied wires/checks, credit balance refunds, payment allocation disputes.
  - **Transaction Dispute (44)**: Unauthorized card-not-present charges, duplicate POS captures, merchant non-delivery, cancelled subscriptions, settlement discrepancies.
  - **Card Complaint (40)**: EMV/NFC hardware failures, rewards points miscalculations, precautionary travel freezes, courier delays, credit limit reductions.
- **Full Queue Workflow**: Live search, category segmented filters, status filters (`Open`, `In Review`, `Pending Customer`, `Escalated`, `Resolved`), server-side pagination, new ticket creation, SLA deadlines, provisional dispute credits, and full audit timelines.

### 2. Customer Verification (KBA) & Role-Based Access Control (RBAC)
- **Knowledge-Based Authentication (KBA)**: Confidential cardholder PII (full PAN, SSN last 4, date of birth, billing address, contact details) remains masked server-side until the operator verifies at least **2 of 3** customer factors (`DOB`, `SSN Last 4`, `Billing ZIP`). Includes a training-mode caller script helper that logs an audit event.
- **Three Server-Enforced Operator Roles**:
  - **Support Agent**: View service queue, add notes, verify KBA, and resolve Billing/Complaint tickets up to `$500`. Blocked (`403`) from issuing provisional credits, resolving Transaction Disputes, remediating ledger records, or viewing security audit logs.
  - **Dispute Specialist**: Resolve Transaction Disputes, issue provisional Reg Z dispute credits up to `$2,500`, run the validation suite (read-only), and inspect audit logs. Blocked (`403`) from modifying ledger remediation records.
  - **Compliance Admin**: Full access including unmasked cardholder records, unlimited provisional credits, executing and remediating all 46 validation scenarios, viewing audit logs, and resetting the baseline dataset.
- **Authentication & Session Security**:
  - Workspace passcode hashing with `crypto.scryptSync` and constant-time `crypto.timingSafeEqual`.
  - First-run passcode claim flow (`POST /api/auth/claim-admin`) when `ADMIN_PASSCODE` is not set in environment variables.
  - HMAC-SHA256 signed `Authorization: Bearer` tokens stored in React memory (not `localStorage` or `sessionStorage`).

### 3. Transaction & Account Validation Suite (46 Scenarios)
- **Automated Ledger Integrity Rules**: Evaluates **24 cardholder accounts** and **64 ledger transactions** across 8 categories:
  - `Duplicate Posting` · `Balance Mismatch` · `APR & Interest` · `Card Lifecycle` · `Credit Limit` · `FX & Fees` · `Rewards Ledger` · `Reg Z Compliance`
- **Anomaly Detection & Remediation**:
  - Starts with 32 passing checks and 14 seeded anomalies (e.g., duplicate merchant settlements sharing an `authCode`, available credit arithmetic drift, expired card still active, GBP-to-USD FX spread overcharge, refund misclassified as purchase debit, negative reward points balance, stale pending authorizations).
  - Side-by-side **Expected vs. Observed** record comparison and real-time **Dataset Accuracy %** calculation.
  - Compliance Admins can apply one-click **Ledger Remediation**, updating the underlying Account or Transaction document and logging an immutable audit record.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express 4, `tsx` (dev runtime)
- **Persistence**: Atomic JSON-backed MongoDB-style `DocumentCollection` store (`data/cardops_store.json`) with seeded accounts, transactions, service requests, validation scenarios, and audit logs
- **Security**: Node `node:crypto` (`scrypt`, `timingSafeEqual`, HMAC-SHA256 Bearer tokens), strict request payload validation, server-side PII redaction

---

## Project Structure

```text
├── index.html                        # HTML entry point & typography setup
├── package.json                      # Scripts and dependencies
├── server.ts                         # Express REST API server & Vite middleware
├── .env.example                      # Environment variable template
└── src/
    ├── App.tsx                       # Main workspace layout, navigation, & role switcher
    ├── index.css                     # Tailwind CSS v4 & font definitions
    ├── lib/
    │   └── api.ts                    # Typed REST API client & in-memory token store
    ├── shared/
    │   └── types.ts                  # Shared TypeScript interfaces
    ├── server/
    │   ├── auth.ts                   # scrypt hashing, HMAC tokens, RBAC guards, PII masking
    │   ├── seed.ts                   # Deterministic generator (168 requests, 46 scenarios)
    │   └── store.ts                  # DocumentCollection persistence & validation engine
    └── components/
        ├── AuthGate.tsx              # First-run passcode setup & operator sign-in
        ├── OverviewMetrics.tsx       # KPI strip & category distribution summary
        ├── ServiceQueueView.tsx      # Filterable, paginated 168-request queue & modal
        ├── TicketDetailDrawer.tsx    # Ticket timeline, KBA verification, & credit controls
        ├── CustomerDirectoryView.tsx # 24 cardholder accounts & KBA inspection
        ├── ValidationSuiteView.tsx   # 46 validation scenarios, live runner, & remediation
        ├── AuditAndRbacView.tsx      # RBAC permissions matrix & security audit trail
        └── StatusIndicator.tsx       # Semantic status & priority indicators
```

---

## REST API Reference

All routes except `/api/health`, `/api/auth/status`, `/api/auth/claim-admin`, and `/api/auth/login` require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Health check |
| `GET` | `/api/auth/status` | Public | Check whether workspace passcode setup is required |
| `POST` | `/api/auth/claim-admin` | Public (One-time) | Claim initial workspace passcode using `scrypt` |
| `POST` | `/api/auth/login` | Public | Authenticate operator and issue signed Bearer token |
| `POST` | `/api/auth/switch-role` | Authenticated | Switch active RBAC role within an authenticated session |
| `GET` | `/api/dashboard/summary` | Authenticated | Aggregate queue metrics, dispute volume, and accuracy % |
| `GET` | `/api/requests` | Authenticated | Paginated, filterable service request queue (`category`, `status`, `search`) |
| `POST` | `/api/requests` | Authenticated | Create a new credit card service request |
| `GET` | `/api/requests/:id` | Authenticated | Ticket detail, linked transactions, and role-redacted customer profile |
| `PATCH` | `/api/requests/:id` | RBAC Enforced | Update ticket status or add investigation notes |
| `POST` | `/api/requests/:id/provisional-credit` | Specialist / Admin | Issue Reg Z provisional dispute credit (`<= $2,500` for Specialist) |
| `GET` | `/api/customers` | Authenticated | List 24 cardholder accounts (PII masked per role/KBA status) |
| `GET` | `/api/customers/:id` | Authenticated | Cardholder profile, transactions, and linked tickets |
| `POST` | `/api/customers/:id/verify` | Authenticated | Verify 2 of 3 KBA factors (`dob`, `ssnLast4`, `billingZip`) |
| `POST` | `/api/customers/:id/caller-script` | Authenticated | Generate simulated caller answers for QA testing (audited) |
| `GET` | `/api/validation/scenarios` | Authenticated | List all 46 transaction & account validation scenarios |
| `POST` | `/api/validation/run` | Specialist / Admin | Execute validation checks across live accounts and transactions |
| `POST` | `/api/validation/:id/remediate` | Compliance Admin | Repair an anomalous Account or Transaction record |
| `POST` | `/api/validation/reset` | Compliance Admin | Reset and reseed the baseline dataset |
| `GET` | `/api/audit-logs` | Specialist / Admin | Retrieve immutable security & operations audit trail |

---

## Getting Started

### Prerequisites
- Node.js `v22+`
- npm

### Installation & Local Development

```bash
# Install dependencies
npm install

# Start development server (Express API + Vite middleware on port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser. On first launch, claim your workspace passcode via the setup screen (or configure `ADMIN_PASSCODE` in your environment).

### Build & Production

```bash
# Type-check codebase
npm run lint

# Build frontend bundle into dist/
npm run build

# Run production server
NODE_ENV=production npm start
```

### Environment Variables

Defined in `.env.example`:
- `ADMIN_PASSCODE` *(optional)* — Pre-configured workspace passcode for operator sign-in. If omitted, the UI presents a one-time setup form on first boot.
- `SESSION_SECRET` *(optional)* — HMAC signing secret for Bearer tokens (defaults to a cryptographically random in-memory key if unset).
- `PORT` *(optional)* — Server port (defaults to `3000`).
