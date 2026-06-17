-- Migration: 00033_telegram_expense_notifications
-- Adds one Telegram notification chat mapping per expense group.

alter table public.expense_groups
  add column telegram_chat_id text,
  add column telegram_invite_link text,
  add column telegram_is_active boolean not null default false,
  add column telegram_connected_at timestamptz;

create unique index expense_groups_telegram_chat_id_key
  on public.expense_groups (telegram_chat_id)
  where telegram_chat_id is not null;

create index idx_expense_groups_telegram_active
  on public.expense_groups (telegram_is_active)
  where telegram_is_active = true;

create or replace function public.connect_expense_group_telegram(
  p_group_id uuid,
  p_chat_id text,
  p_invite_link text
)
returns table (connected boolean, group_id uuid, invite_link text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.expense_groups%rowtype;
begin
  select * into v_group
  from public.expense_groups
  where id = p_group_id
  for update;

  if not found then
    return query select false, p_group_id, null::text;
    return;
  end if;

  if v_group.telegram_is_active and v_group.telegram_chat_id is not null and v_group.telegram_chat_id <> p_chat_id then
    return query select false, v_group.id, v_group.telegram_invite_link;
    return;
  end if;

  update public.expense_groups
  set telegram_chat_id = p_chat_id,
      telegram_invite_link = p_invite_link,
      telegram_is_active = true,
      telegram_connected_at = now(),
      updated_at = now()
  where id = p_group_id;

  return query select true, p_group_id, p_invite_link;
end;
$$;

create or replace function public.disconnect_expense_group_telegram(p_chat_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.expense_groups
  set telegram_chat_id = null,
      telegram_invite_link = null,
      telegram_is_active = false,
      telegram_connected_at = null,
      updated_at = now()
  where telegram_chat_id = p_chat_id;
$$;
