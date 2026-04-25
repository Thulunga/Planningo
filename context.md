# Planningo — Project Context

## Overview
Planningo is a full-stack all-in-one productivity platform built as a Next.js 15 monorepo (Turborepo + pnpm workspaces).

## Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (auth, postgres DB, realtime)
- **Monorepo**: Turborepo + pnpm workspaces
- **Packages**: `@planningo/ui` (shared UI), `@planningo/database` (types/client), `@planningo/trading-core`
- **Styling**: CSS variables for theming (dark default, light optional), Inter font

## App Routes
- `/` — Dashboard home (auth-protected via dashboard layout)
- `/login`, `/register`, `/verify` — Auth pages (public)
- `/landing` — Public marketing/landing page (unauthenticated entry point)
- `/todos`, `/planner`, `/calendar`, `/reminders` — Core productivity features
- `/trips`, `/expenses` — Travel and finance features
- `/settings/*` — User settings
- `/admin/*`, `/trading/*` — Admin-only routes (gated by ADMIN_EMAIL env var)

## Project Structure
```
apps/web/src/
  app/
    (auth)/          — auth layout wrapping login/register/verify
    (dashboard)/     — dashboard layout (requires auth)
    landing/         — public landing page
    admin/           — admin-only pages
  components/
    dashboard/       — sidebar, header, bottom-tab-bar, dashboard-overview
    auth/            — login-form, register-form, otp-form
    calendar/, todos/, planner/, reminders/, trips/, expenses/, settings/
  lib/
    actions/         — Next.js server actions per feature
    supabase/        — client/server/admin supabase helpers
  stores/            — Zustand stores (ui-store, calendar-store, trading-config-store)
```

## Key Architecture Decisions
- Auth via Supabase; middleware refreshes session on every request
- Dashboard layout checks `getUserProfile()` and redirects to `/login` if not found
- Middleware handles: unauthenticated → redirect, auth routes when logged-in → redirect to `/`, admin gate
- Theme persisted in localStorage via Zustand (`planningo-ui` key); dark is default
- Mobile navigation: bottom tab bar on mobile, sidebar (collapsible) on desktop
- All pages use server components where possible; client components marked `'use client'`

## Completed Tasks

### Task: Landing Page + Mobile UI Enhancements (2026-04-23)
**Summary**: Added a public marketing landing page and improved mobile responsiveness across the app.

**Files Changed**:
- `apps/web/src/app/landing/page.tsx` — NEW: Full public landing page
- `apps/web/src/middleware.ts` — Added `/landing` as public route; unauthenticated `/` redirects to `/landing`
- `apps/web/src/app/(auth)/layout.tsx` — Updated logo link to `/landing` instead of `/`
- `apps/web/src/components/dashboard/dashboard-overview.tsx` — Enhanced mobile card layout, stats strip, responsive grid

**Key Decisions**:
- Landing page lives at `/landing` (not `/`) to avoid conflicting with the dashboard route group
- Middleware now redirects unauthenticated visitors of `/` to `/landing`
- Landing page uses same CSS variables/Tailwind theme as the rest of the app — no extra dependencies
- Features shown: Todos, Calendar, Day Planner, Reminders, Trips, Expenses (+ Budget)
- Key messaging: "Manage from anywhere, ditch the spreadsheet"

**Assumptions**:
- No backend changes needed for the landing page (it's purely static/marketing)
- Landing page intentionally has no auth check — it's public
