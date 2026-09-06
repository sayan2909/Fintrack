# FinTrack — Frontend Application

This folder contains the complete client-side frontend code for the FinTrack personal finance platform.

## Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router UI pages & layouts
│   │   ├── dashboard/       # Main dashboard with charts & metrics
│   │   ├── transactions/    # Income & expense tracking
│   │   ├── budgets/         # Category monthly budgets
│   │   ├── goals/           # Savings goals & progress
│   │   ├── analytics/       # Visual breakdown & financial trends
│   │   ├── recurring/       # Recurring bills & subscriptions
│   │   ├── reports/         # Financial reports & CSV export
│   │   ├── insights/        # Spending insights
│   │   ├── notifications/   # Notification center
│   │   ├── settings/        # Preferences & Active Sessions manager
│   │   ├── login/           # User authentication
│   │   ├── register/        # Account creation
│   │   ├── layout.tsx       # Root layout & theme providers
│   │   └── page.tsx         # Modern landing page
│   ├── components/          # Reusable UI components
│   │   ├── AppShell.tsx     # Navigation sidebar, header & mobile drawer
│   │   ├── OnboardingModal.tsx # Interactive feature tour
│   │   └── ui.tsx           # Design system (Cards, Badges, Buttons, Inputs)
│   ├── contexts/            # React contexts & custom hooks
│   │   ├── AuthContext.tsx  # useAuth() & useSession() hooks
│   │   └── ThemeContext.tsx # Light/Dark mode state
│   └── lib/                 # Client utilities
│       ├── api.ts           # Fetch wrapper with credentials
│       ├── currency.ts      # Indian currency & standard formatting
│       └── constants.ts     # Platform navigation & categories
├── next.config.ts
├── postcss.config.mjs
├── package.json
└── tsconfig.json
```
