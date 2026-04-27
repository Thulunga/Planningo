-- Migration: 00027_personal_expense_category
-- Adds a free-text expense_category column to personal_transactions so the
-- UI can store the same EXPENSE_CATEGORIES values used by group expenses
-- (e.g. 'food', 'taxi', 'rent') alongside the existing UUID category_id.

alter table public.personal_transactions
  add column if not exists expense_category text;

comment on column public.personal_transactions.expense_category is
  'Denormalized category slug (e.g. food, taxi, rent) from the shared EXPENSE_CATEGORIES list';
