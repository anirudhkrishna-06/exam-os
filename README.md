# ExamOS — Intelligent Exam Preparation & Planning

> Minimal-input, intelligent exam preparation and planning web application. Single-user account-based architecture with deterministic automatic scheduling, progress analytics, and examination readiness insights.

---

## 🚀 Key Features

- **Personalized Daily Routine**: Configure preferred study time slots, durations, positions, and rest day defaults.
- **Hierarchical Syllabus Modeling**: Multi-subject configuration with 5 units per subject, each broken down into weighted activities (Theory 1, Theory 2, Numericals, Past Papers, Revision).
- **Deterministic Scheduling Engine**: Pure TypeScript planning module with subject balancing, urgency/proximity heuristics, slot locking, and zero external AI dependencies.
- **Intelligent Rescheduling**: Dynamic plan regeneration accommodating missed or skipped sessions, rest days, and slot capacity overrides while strictly preserving completed sessions.
- **Hierarchical Progress Analytics**: Normalized weight aggregation (`Activity → Unit → Subject → Season`) providing exact syllabus coverage without arbitrary confidence metrics.
- **Factual Examination Readiness**: Transparent countdowns, overload shortfall warnings, and unit-by-unit status reports.
- **Information-Rich Dashboard**: Today's schedule with 1-click completion, workload pacing, and countdown cards.
- **Secure Architecture**: Argon2id password hashing, HTTP-only cookie sessions, in-memory auth rate limiting, and Zod input validation across all routes.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Custom session-based auth with Argon2id password hashing
- **Styling**: Tailwind CSS v4, Lucide Icons, hand-built Radix UI primitives
- **Visualizations**: Recharts
- **Testing**: Vitest, tsx test suites

---

## 📁 Architecture Overview

```
src/ or root/
├── app/
│   ├── (auth)/             # Login, Register
│   ├── (onboarding)/       # Routine and Timezone Setup
│   ├── (dashboard)/        # Main application layout & views
│   │   ├── overview/       # Main information-rich dashboard
│   │   ├── planner/        # Daily planner & interactive calendar
│   │   ├── subjects/       # Subjects & 5-unit syllabus editor
│   │   ├── seasons/        # Exam season management & plan generation
│   │   ├── analytics/      # Charts & progress breakdowns (Recharts)
│   │   ├── reports/        # Exam readiness & shortfall warnings
│   │   └── settings/       # Routine slot customization & preferences
│   └── api/                # Fully validated Next.js Route Handlers
│
├── components/
│   ├── ui/                 # Accessible UI components (Card, Button, Dialog, etc.)
│   ├── layout/             # Sidebar with responsive mobile drawer
│   ├── dashboard/          # Dashboard widgets (Today's sessions, Stats, Workload)
│   ├── planner/            # Daily planner, calendar view, session cards
│   ├── analytics/          # Progress & velocity charts
│   ├── reports/            # Exam readiness tables & overload notices
│   └── syllabus/           # Unit editor and weight visualizer
│
├── db/
│   ├── index.ts            # Drizzle client & relation definitions
│   ├── schema/             # 13 relational Postgres schemas
│   └── migrations/         # Drizzle migration files
│
├── modules/
│   ├── planner/            # Pure TypeScript deterministic scheduling engine
│   └── progress/           # Pure TypeScript weighted progress calculator
│
└── services/               # Modular database queries & transactional operations
```

---

## 💻 Getting Started

### 1. Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)

### 2. Environment Configuration
Create a `.env.local` file:
```env
DATABASE_URL=postgresql://exam_user:exam_dev_password@localhost:5432/exam_os
NODE_ENV=development
```

### 3. Start PostgreSQL Database
```bash
docker run --name exam-os-postgres -e POSTGRES_USER=exam_user -e POSTGRES_PASSWORD=exam_dev_password -e POSTGRES_DB=exam_os -p 5432:5432 -d postgres:16-alpine
```

### 4. Install Dependencies & Run Migrations
```bash
npm install
npm run db:migrate
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

```bash
# Run all 29 pure TypeScript unit tests (planner + progress)
npm test

# Run Phase 1 integration tests (Auth, Seasons, Syllabus)
npm run test:phase1

# Run Phase 2 integration tests (Planning Engine, Capacity Overrides, Rescheduling)
npm run test:phase2

# Run Phase 3 integration tests (Analytics, Progress aggregation, Readiness)
npm run test:phase3
```

---

## 📦 Production Build

```bash
npx next build --webpack
```
ExamOS builds cleanly into optimized static and server-rendered routes without warnings or errors.
