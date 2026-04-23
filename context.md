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

## Domain & Branding Strategy

**Primary Domain**: `planningo.mydailyworkspace.site`
**Alternative Domain**: `app.mydailyworkspace.site`
**Product Name**: Planningo (under My Daily Workspace company)

Configuration:
- `config/domains.ts` — Centralized domain config for multi-environment support
- `next.config.mjs` — Updated allowedOrigins for prod/staging/dev domains
- `.env.example` — Added NEXT_PUBLIC_MAIN_DOMAIN variable
- See `DOMAIN_STRATEGY.md` for full architecture and migration plan

## Completed Tasks

### Task: Domain & Branding Management (2026-04-23)
**Summary**: Set up centralized domain management strategy for Planningo as service under mydailyworkspace.site.

**Files Changed**:
- `config/domains.ts` — NEW: Centralized config with environment-specific URLs
- `apps/web/next.config.mjs` — Updated allowedOrigins for production/staging domains
- `.env.example` — Added NEXT_PUBLIC_MAIN_DOMAIN for company domain
- `DOMAIN_STRATEGY.md` — NEW: Complete guide for domain structure, branding, and migration

**Key Decisions**:
- Planningo as primary service: `planningo.mydailyworkspace.site`
- Branding stays "Planningo" (not "My Daily Workspace")
- Environment-specific subdomains: staging, production, local dev
- Centralized config allows future services (budget.*, travel.*, etc.)

### Task: Landing Page + Mobile UI Enhancements (2026-04-23)
**Summary**: Added a public marketing landing page and improved mobile responsiveness.

**Files Changed**:
- `apps/web/src/app/landing/page.tsx` — Public landing page
- `apps/web/src/middleware.ts` — Redirect unauthenticated `/` to `/landing`
- `apps/web/src/app/(auth)/layout.tsx` — Logo link to `/landing`
- `apps/web/src/components/dashboard/dashboard-overview.tsx` — Mobile responsiveness

**Key Decisions**:
- Landing at `/landing` (avoids conflict with dashboard route group)
- Middleware redirects to landing for unauthenticated users
- Uses existing CSS variables/Tailwind theme
- Features: Todos, Calendar, Planner, Reminders, Trips, Expenses
