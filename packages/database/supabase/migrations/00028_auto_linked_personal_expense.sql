-- Migration: 00028_auto_linked_personal_expense
-- Adds support for auto-tracking a user's group-expense share as a personal
-- expense. When a group expense is created/edited with the "Track my share
-- in personal expenses" toggle ON, a personal_transactions row is created
-- and kept in sync (one row per user per group expense). These auto-managed
-- rows are flagged via auto_linked = true so manually-linked rows are never
-- mutated by the auto-sync logic.

alter table public.personal_transactions
  add column if not exists auto_linked boolean not null default false;

comment on column public.personal_transactions.auto_linked is
  'True when this row was auto-created/synced by the group expense "Track my share in personal expenses" toggle. The row is kept in lockstep with the linked group expense; manual personal links remain user-managed (auto_linked = false).';

-- One auto-linked personal transaction per user per group expense (active rows
-- only). Prevents duplicates if the toggle is flipped repeatedly under race
-- conditions, while still allowing a manual personal link on top of an
-- auto-linked one (different auto_linked value).
create unique index if not exists idx_personal_txn_auto_link_unique
  on public.personal_transactions (user_id, linked_group_expense_id)
  where auto_linked = true and deleted_at is null;
