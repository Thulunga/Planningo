# Planningo - Project Context

## Project Overview
**Planningo** - All-in-one productivity platform (todos, calendar, day planner, reminders, trip planning, expense splitting).

## Tech Stack
- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 16.0.0 (App Router), TypeScript, React 19
- **UI**: shadcn/ui with custom dark theme
- **State**: Zustand (UI) + TanStack Query v5
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Auth**: Email/Password, Email OTP, Google OAuth

## Routing Strategy
```
/ → Landing page (public, SEO-optimized)
/login → Auth login (public, SEO)
/signup → Auth signup (public, SEO)
/(dashboard)/* → Protected routes (private, noindex)
  /dashboard → Overview
  /todos → Todo management
  /calendar → Calendar view
  /expenses → Expense tracking
  /trips → Trip planning
  /admin/* → Admin routes (private)
```

## SEO Implementation Summary (v1.1)

### Technical SEO ✅
- **robots.txt**: Public routes indexable, dashboard/admin disallowed
- **sitemap.xml**: Static sitemap with public routes (update domain in production)
- **Canonical URLs**: Set via metadata API on all pages
- **Meta Tags**: Title, description, Open Graph, Twitter cards
- **Robots directives**: max-snippet, max-image-preview, max-video-preview configured
- **Color scheme**: Dark/light mode specified in viewport

### On-Page SEO ✅
- **Proper H1 usage**: Landing page has H1 "All-in-One Productivity Platform"
- **Heading hierarchy**: H1 → H2 → descriptive text structure maintained
- **Page titles**: Descriptive, keyword-rich titles for all pages
- **Meta descriptions**: Written for public pages with keywords
- **Page structure**: Semantic HTML with proper sections

### Schema Markup ✅
- **Organization schema**: JSON-LD with name, URL, logo, description
- **Web Application schema**: For searchability and rich results
- **Properly inserted**: In root layout with `type="application/ld+json"`

### Public Pages Metadata ✅
| Page | Title | Description | Robots |
|------|-------|-------------|--------|
| / | Planningo - All-in-One Productivity Platform | Full description with keywords | index, follow |
| /login | Sign In \| Planningo | Sign in focused description | index, follow |
| /signup | Create Account \| Planningo | Sign up focused description | index, follow |
| /(dashboard)/* | Dashboard \| Planningo | Dashboard specific description | noindex, nofollow |
| /404 | Page Not Found \| Planningo | 404 error page | noindex |

## Files Changed
- ✅ `apps/web/public/robots.txt` (new)
- ✅ `apps/web/public/sitemap.xml` (new)
- ✅ `apps/web/src/lib/seo.ts` (new - SEO utilities)
- ✅ `apps/web/src/app/layout.tsx` (enhanced metadata + JSON-LD)
- ✅ `apps/web/src/app/page.tsx` (new landing page)
- ✅ `apps/web/src/app/(auth)/layout.tsx` (updated metadata)
- ✅ `apps/web/src/app/(auth)/login/page.tsx` (updated metadata)
- ✅ `apps/web/src/app/(auth)/register/page.tsx` (updated metadata)
- ✅ `apps/web/src/app/(dashboard)/layout.tsx` (added noindex)
- ✅ `apps/web/src/app/(dashboard)/page.tsx` (updated metadata)
- ✅ `apps/web/src/app/not-found.tsx` (added metadata)

## SEO Utilities (seo.ts)
- `siteConfig`: Global site configuration (name, description, URLs, OG image)
- `generateMetadata()`: Helper to generate consistent metadata with OG/Twitter cards
- `generateOrganizationSchema()`: JSON-LD Organization schema
- `generateWebApplicationSchema()`: JSON-LD WebApplication schema

## Next Steps for Production
1. ✅ **Set actual domain**: Updated to `https://www.mydailyworkspace.site`
2. ✅ **OG Image**: Created dynamic API endpoint at `/api/og`
3. ✅ **robots.txt**: Updated sitemap URL to production domain
4. 📋 **Google Search Console**: See [GOOGLE_SETUP_GUIDE.md](GOOGLE_SETUP_GUIDE.md)
   - Add property: `mydailyworkspace.site`
   - Verify ownership via DNS
   - Submit sitemap
5. 📋 **Google Analytics**: See [GOOGLE_SETUP_GUIDE.md](GOOGLE_SETUP_GUIDE.md)
   - Create GA4 property
   - Get Measurement ID (G-XXXXXXXXXX)
   - Add to `.env.local`: `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX`
   - Install GoogleAnalytics component in layout.tsx
6. 📋 **Lighthouse SEO Audit**: See [LIGHTHOUSE_AUDIT_GUIDE.md](LIGHTHOUSE_AUDIT_GUIDE.md)
   - Target: 90+ SEO score
   - Use Chrome DevTools Lighthouse or PageSpeed Insights
   - Fix any failing audits

## Key Decisions
1. **Protected routes noindex**: Dashboard routes are not indexed (private content)
2. **Static sitemap**: Only public routes included (login, signup, home)
3. **JSON-LD placement**: In root layout for organization-wide schema
4. **Template pattern**: Used metadata API template for consistent title formatting
5. **Landing page**: Created from scratch with feature list and proper SEO structure

## Breaking Changes
⚠️ **NONE** - All changes are additive and backward compatible

## Performance Considerations
- No additional dependencies added
- Meta tags generated at build time (static)
- Schema markup added in head (minimal overhead)
- Landing page uses Next.js best practices

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
