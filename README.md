# Planningo

Your all-in-one productivity platform — todos, calendar, day planner, reminders, trip planning, and expense splitting.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| UI Components | shadcn/ui (custom dark theme) |
| State | Zustand (UI) + TanStack Query v5 (server) |
| Calendar | react-big-calendar + date-fns |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Push Notifications | Web Push API + VAPID keys |
| Auth | Supabase Auth — Email/Password, Email OTP, Google OAuth |

## Features

- **Dashboard** — Overview of todos, upcoming events, today's schedule
- **Todos** — Create, filter, and manage todos with priorities, tags, and due dates
- **Day Planner** — Time-blocked daily planning with color-coded blocks
- **Calendar** — Full monthly/weekly/daily calendar (react-big-calendar)
- **Reminders** — Set reminders on events and todos (browser push + in-app)
- **Trip Planner** — Plan trips with day-by-day itineraries, booking references, costs
- **Expenses** — Splitwise-style group expense tracking with balance calculation
- **Dark mode** — Default dark theme with light mode toggle

## Project Structure

```
Planningo/
├── apps/
│   └── web/              # Next.js 14 App Router application
├── packages/
│   ├── ui/               # Shared shadcn/ui component library
│   ├── database/         # Supabase client factory + TypeScript types + migrations
│   └── config/           # Shared tsconfig + ESLint presets
├── turbo.json
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase CLI (`npm install -g supabase`)

### 1. Clone and install

```bash
cd Planningo
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example apps/web/.env.local
# Fill in your Supabase project URL and anon key
```

### 3. Set up Supabase

**Option A: Supabase Cloud (recommended for production)**
1. Create a project at [supabase.com](https://supabase.com)
2. Copy the project URL and anon key to your `.env.local`
3. Enable Google OAuth in Authentication > Providers > Google
4. Add `http://localhost:3000/auth/callback` to redirect URLs
5. Run migrations: copy SQL from `packages/database/supabase/migrations/` and run in Supabase SQL Editor

**Option B: Local development**
```bash
cd packages/database
supabase start          # starts local Supabase stack
supabase db reset       # runs all migrations
```

### 4. Generate VAPID keys (for push notifications)

```bash
npx web-push generate-vapid-keys
# Add the keys to your .env.local
```

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Migrations

All migrations are in `packages/database/supabase/migrations/`:

| File | Description |
|------|-------------|
| `00001_create_profiles.sql` | User profiles (auto-created on signup) |
| `00002_create_todos.sql` | Todo items with status/priority enums |
| `00003_create_calendar_events.sql` | Calendar events with recurrence support |
| `00004_create_reminders.sql` | Reminder system for events and todos |
| `00005_create_planner_entries.sql` | Day planner time blocks |
| `00006_create_trips.sql` | Trip planning with collaborators |
| `00007_create_itinerary_items.sql` | Trip itinerary items |
| `00008_create_expense_system.sql` | Full Splitwise-like expense splitting |
| `00009_create_notifications.sql` | Push subscriptions + notification queue |

## Auth

Three sign-in methods, all via Supabase Auth:

1. **Email + Password** → email confirmation required
2. **Magic Link / OTP** → 6-digit code sent to email
3. **Google OAuth** → one-click sign-in

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
# GOOGLE_CLIENT_ID (if using Google OAuth)
# GOOGLE_CLIENT_SECRET
# NEXT_PUBLIC_VAPID_PUBLIC_KEY
# VAPID_PRIVATE_KEY
# VAPID_SUBJECT
```

## Edge Functions (Reminders)

Deploy Supabase Edge Functions for reminder processing:

```bash
cd packages/database
supabase functions deploy process-reminders
supabase functions deploy send-push

# Set up cron job in Supabase Dashboard:
# Schedule: every minute
# Function: process-reminders
```
