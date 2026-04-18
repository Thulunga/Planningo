# Trading Engine — Railway Deployment

## Critical: Build Context

This service lives inside a pnpm monorepo. The Dockerfile copies source from
`packages/trading-core/` (a workspace dependency), so the Docker **build
context must be the monorepo root**, not this service directory.

### Railway Dashboard Settings

| Setting | Value |
|---|---|
| **Root Directory** | `/` *(monorepo root — do NOT leave it as `services/trading-engine`)* |
| **Dockerfile Path** | `services/trading-engine/Dockerfile` |
| **Build Command** | *(leave empty — handled by Dockerfile)* |
| **Start Command** | *(leave empty — handled by `CMD` in Dockerfile)* |

> If Root Directory is set to `services/trading-engine`, Railway will set the
> build context to that subdirectory and `COPY packages/trading-core/ ...`
> will fail with "path not found".

---

## Environment Variables

Set these in the Railway service's "Variables" tab:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (bypasses RLS) |
| `ADMIN_USER_ID` | UUID of the admin user whose portfolio is traded |
| `SCAN_INTERVAL_SECONDS` | Candle poll interval, e.g. `300` (5 min) |

---

## Cron Schedule

The engine starts at market open and exits cleanly at 3:45 PM IST. Deploy it
as a Railway **Cron Job** (not a long-running service) to avoid overnight costs:

- **Schedule**: `25 3 * * 1-5`  *(3:25 AM UTC = 8:55 AM IST, weekdays)*
- **Timeout**: `28800` seconds (8 hours — covers full NSE session)

The service calls `process.exit(0)` after the shutdown window so Railway
marks the run as succeeded.

---

## Restart Safety

Daily risk state (`startOfDayEquity`, `lastLossTime`) is persisted to the
`engine_state` Supabase table. If Railway restarts the container mid-session
the engine reloads the state on startup and resumes with the correct daily
loss counter and cooldown timer.
