# AI-Based Budget Utilization Monitoring System

A centralized, web-based budget monitoring platform for government / institutional financial
management — a Final Year BE Computer Science project. It tracks budget allocation and
expenditure in real time, automatically computes utilization, detects anomalies using
rule-based analytical intelligence, generates alerts, and maintains a full audit trail.

---

## 1. Problem Statement

Traditional budget monitoring suffers from: no real-time visibility of allocation vs
spending, delayed detection of under/over-utilization, difficulty identifying excessive or
suspicious spending, risk of leakage and irregular expenditure, error-prone manual
reporting, limited transparency and accountability, and fragmented departmental records.

## 2. Objectives

1. Track budget allocation and expenditure
2. Compute utilization % automatically — `(Expenditure / Allocation) × 100`
3. Monitor department-wise usage
4. Detect abnormal / suspicious expenditure (rule-based)
5. Detect excessive utilization
6. Identify under-utilized budgets
7. Generate alerts on threshold breaches
8. Improve transparency & accountability
9. Centralized dashboards & reports
10. Maintain audit logs
11. Role-based access control (RBAC)

## 3. Features

- **3 roles with strict RBAC**: Admin, Finance Officer, Department Head
- **Role-specific dashboards** with KPI cards and real Chart.js charts fed by API data
- **Budget management** — automatic utilization, remaining balance, health status
- **Expenditure management** — with pre-save validation (budget exists, department match,
  positive amount, remaining-budget check)
- **Monitoring Center** — GREEN/YELLOW/ORANGE/RED health levels, filters, under-utilization watch
- **Anomaly Detection (rule-based)** — 7 explainable rules; every alert states *why* it fired
- **Alert Center** — severity levels, search/filter, resolve workflow
- **Reports** — 5 reports with charts, CSV export, PDF (print) export
- **Audit logs** — automatic, immutable, read-only, with IP address
- **Configurable monitoring rules** (thresholds, enable/disable)

## 4. Technology Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Angular 17 (standalone components), TypeScript, Reactive Forms, RxJS, Chart.js |
| Backend  | Node.js, Express.js, TypeScript, JWT, bcryptjs |
| Database | MongoDB (Mongoose ODM) |

## 5. Architecture

Controllers → Services → Models (backend). Standalone components + lazy routes (frontend).

```
backend/src
├── config/          # environment, database
├── middleware/      # auth (JWT), role RBAC, validation, error handling
├── models/          # 7 Mongoose models
├── modules/         # auth, users, departments, budgets, expenditures,
│                    # monitoring (+anomaly.service), alerts, reports,
│                    # audit, rules, dashboard
├── utils/           # response, logger, calculation, audit helper
├── server.ts        # Express app entry
└── seed.ts          # demo data

frontend/src/app
├── core/            # guards, interceptors, models, services
├── features/        # auth, dashboard, users, departments, budgets,
│                    # expenditures, monitoring, alerts, reports, audit, rules
├── shared/          # pipes (INR currency), ui utils, chart service
└── layout/          # sidebar + navbar shell
```

## 6. Database Schema (collections)

- **users** — name, email, passwordHash, role, departmentId, status
- **departments** — name, code, head, description, status
- **budgets** — departmentId, financialYear, category, allocatedAmount, status, createdBy, approvedBy
- **expenditures** — budgetId, departmentId, amount, date, description, vendor, invoiceNumber, category, status, createdBy
- **alerts** — type, departmentId, budgetId, expenditureId, severity, message, explanation, recommendedAction, status, resolvedBy/At
- **auditlogs** — userId, action, entity, entityId, details, ipAddress, createdAt
- **thresholdrules** — key, name, type, threshold, severity, enabled

Relationships use MongoDB ObjectId references with `populate()`:
`Department → Budget → Expenditure`, `User → Department`, `Expenditure → Alert`, `User → AuditLog`.

## 7. API Overview

```
POST /api/auth/login          GET /api/auth/me            POST /api/auth/logout
GET|POST /api/users           GET|PUT|DELETE /api/users/:id
GET|POST /api/departments     GET|PUT|DELETE /api/departments/:id
GET|POST /api/budgets         GET|PUT|DELETE /api/budgets/:id
GET|POST /api/expenditures    GET|PUT|DELETE /api/expenditures/:id
GET  /api/monitoring/summary | /departments | /anomalies | /under-utilized | /high-value-transactions
GET  /api/alerts              GET /api/alerts/:id         PATCH /api/alerts/:id/resolve
GET  /api/reports/summary | /budgets | /expenditures | /utilization | /alerts | /audit
GET  /api/audit-logs
GET  /api/rules               PUT|DELETE /api/rules/:id
GET  /api/dashboard/admin | /finance | /department
GET  /api/health
```

All responses use a consistent envelope:
`{ success: boolean, message: string, data: ... }`.

## 8. Monitoring & Anomaly Logic (Phase 1 — rule-based)

| # | Rule | Result |
|---|------|--------|
| 1 | Utilization ≥ 75% (warning threshold) | MEDIUM alert |
| 2 | Utilization ≥ 90% (high-risk threshold) | HIGH alert |
| 3 | Utilization ≥ 100% | CRITICAL over-budget alert |
| 4 | Single transaction > 25% of its budget | HIGH large-transaction alert |
| 5 | ≥3 transactions >10% of budget within 7 days | HIGH suspicious-spending alert |
| 6 | Utilization < 25% within 90 days of FY end | MEDIUM under-utilization alert |
| 7 | Expenditure exceeds remaining budget | Blocked at API; critical state flagged |

Every alert stores a human-readable **explanation** (e.g. *"₹8,50,000 expenditure was
flagged because it represents 31.5% of the allocated department budget"*) and a
**recommended action**. Rules are configurable at **Settings → Monitoring Rules**.

## 9. Security

- bcrypt password hashing (cost 10) · JWT with 8h expiry · role-based authorization middleware
- Input validation middleware (types, required fields, ObjectId checks)
- CORS restricted to the Angular origin · environment variables for all secrets
- Consistent error responses · no secrets in frontend · no sensitive data in logs
- Department Heads are server-side restricted to their own department's data

## 10. Installation & Setup

**Prerequisites:** Node.js 18+, MongoDB running locally (`mongod`), Angular CLI optional.

```bash
# 1. Backend
cd backend
cp .env.example .env          # adjust if needed
npm install
npm run seed                  # loads demo data + generates alerts
npm run build && npm start    # API on http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm start                     # app on http://localhost:4200
```

Health check: `GET http://localhost:5000/api/health`

## 11. Demo Accounts (password for all: `Admin@123`)

| Role | Email |
|------|-------|
| Admin | admin@budget.gov |
| Finance Officer | finance@budget.gov |
| Department Head (IT) | head@budget.gov |

## 12. Seed Data Highlights

- 6 departments (IT, Finance, HR, Public Works, Education, Healthcare)
- 12 budgets across realistic categories (Infrastructure, Software & Services, Training, Equipment, Scholarships, Public Health…)
- 35 expenditures with realistic INR values and vendors
- Pre-triggered alerts: **critical** over-budget (Finance Audit ~112%), **high-risk** utilization (IT Infra ~92%), **large transaction** (PWD ₹12.5L = 30% of budget), **suspicious cluster** (3 Healthcare purchases in 5 days), **under-utilization** (Education Equipment ~20%)

## 13. Screenshots

_Add screenshots here after running the application: login page, admin dashboard,
monitoring center, anomaly detection, alert center, reports._

## 14. Future Enhancements

- Machine-learning based anomaly detection (this phase is explicitly rule-based)
- Predictive budget forecasting · Treasury / banking integration
- Mobile application · Email/SMS alert notifications
- Advanced AI recommendations · Government ERP integration
