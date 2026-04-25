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

