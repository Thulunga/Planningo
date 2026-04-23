# Domain & Branding Strategy

## Overview
This document describes how **Planningo** (the product) relates to **My Daily Workspace** (the company) across different domains.

## Domain Structure

### Production
```
mydailyworkspace.site          — Main company site (landing/info)
planningo.mydailyworkspace.site — Primary Planningo app (recommended)
app.mydailyworkspace.site       — Alternative app URL (alias)
```

### Staging
```
staging.mydailyworkspace.site              — Staging company site
planningo-staging.mydailyworkspace.site    — Staging Planningo app
```

### Development
```
localhost:3000 — Local development
```

## Branding

| Item | Value |
|------|-------|
| Product Name | Planningo |
| Company Name | My Daily Workspace |
| App Metadata | Branded as "Planningo" |
| Logo/Colors | Planningo-specific (not company-wide) |

## Configuration

### Environment Variables
```env
# Where the app is served
NEXT_PUBLIC_APP_URL=https://planningo.mydailyworkspace.site

# Main company domain (for future landing pages, etc)
NEXT_PUBLIC_MAIN_DOMAIN=mydailyworkspace.site
```

### Server Actions
Allowed origins configured in `next.config.mjs`:
- localhost:3000, localhost:3001
- planningo.mydailyworkspace.site
- app.mydailyworkspace.site
- planningo-staging.mydailyworkspace.site

### Domain Config
See `config/domains.ts` for centralized domain/branding configuration.

## Migration Notes

1. **DNS**: Create CNAME records:
   - `planningo.mydailyworkspace.site` → your hosting
   - `app.mydailyworkspace.site` → same destination (optional alias)

2. **Auth Redirects**: Update Supabase OAuth redirect URIs to:
   - `https://planningo.mydailyworkspace.site/auth/callback`
   - `https://app.mydailyworkspace.site/auth/callback` (if using alias)

3. **Analytics**: Update tracking domain to `planningo.mydailyworkspace.site`

4. **Email**: Update VAPID_SUBJECT to match domain:
   - `mailto:admin@planningo.mydailyworkspace.site`

## Future Expansion

When adding other services under `mydailyworkspace.site`:
- `budget.mydailyworkspace.site` — Separate budget/finance app
- `travel.mydailyworkspace.site` — Travel planning service
- `dashboard.mydailyworkspace.site` — Central dashboard

Each service keeps its own branding while being part of the ecosystem.
