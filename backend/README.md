# FinTrack — Backend Application

This folder contains the complete REST API backend, database schema, session management, and authentication services for the FinTrack personal finance platform.

## Structure

```
backend/
├── src/
│   ├── app/api/             # Next.js App Router REST API endpoints
│   │   ├── auth/            # Auth & Sessions
│   │   │   ├── login/       # POST /api/auth/login
│   │   │   ├── register/    # POST /api/auth/register
│   │   │   ├── logout/      # POST /api/auth/logout
│   │   │   ├── session/     # GET  /api/auth/session (Active session)
│   │   │   ├── sessions/    # GET/DELETE /api/auth/sessions (Multi-device management)
│   │   │   ├── profile/     # PUT  /api/auth/profile
│   │   │   └── password/    # PUT  /api/auth/password
│   │   ├── transactions/    # CRUD for transactions
│   │   ├── budgets/         # Monthly budgets management
│   │   ├── categories/      # Custom categories
│   │   ├── goals/           # Savings goals & contributions
│   │   ├── recurring/       # Recurring transactions engine
│   │   ├── analytics/       # Spending/income aggregations
│   │   ├── dashboard/       # Aggregated metrics for home cards
│   │   ├── reports/         # Report generator & CSV export
│   │   ├── insights/        # Spending rule engine
│   │   ├── notifications/   # Alerts & push notifications
│   │   ├── health/          # System healthcheck
│   │   └── seed-demo/       # Demo data seeder
│   ├── db/                  # Database layer
│   │   ├── schema.ts        # Drizzle ORM PostgreSQL schema
│   │   └── index.ts         # Connection pool & auto-DDL execution
│   ├── lib/                 # Backend utilities
│   │   ├── auth.ts          # JWT, bcrypt, and cookie security
│   │   ├── session.ts       # Device parser & session management
│   │   ├── server-utils.ts  # Default categories & server helpers
│   │   ├── response.ts      # Standard JSON response helpers
│   │   └── currency.ts      # Formatter & digit grouping
│   └── middleware.ts        # Route & session protection middleware
├── drizzle.config.json
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env
```
