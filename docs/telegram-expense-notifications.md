# Telegram notifications for group expenses

## Implementation plan

### Frontend
1. Fetch `telegram_is_active` and `telegram_invite_link` with the expense group record on the group detail page.
2. Render a notification banner in the group expense view:
   - Not connected: show “🔔 Stay updated! Set up Telegram notifications for this group.” and a **Set Up Notifications** CTA.
   - Connected: show “✅ Telegram notifications are active for this group.” and a **Join Telegram Group** CTA pointed at the saved invite link.
3. The setup dialog tells a member to create a Telegram group manually, add/promote the bot, and post `/connect_group_<expense_group_id>` in that group. The dialog also links to the bot deep link `t.me/<bot>?start=group_<expense_group_id>`.
4. Subscribe to realtime updates on `expense_groups` so every member sees the connected/disconnected state as soon as a webhook changes it.

### Backend
1. Add Telegram columns to `expense_groups` and a partial unique index on `telegram_chat_id`.
2. Add an atomic `connect_expense_group_telegram` RPC that row-locks the target expense group. The first completed setup wins; later attempts for a different Telegram chat return the existing connection instead of overwriting it.
3. Add a `/api/webhooks/telegram` route for Telegram Bot API updates.
4. When the bot sees `/connect_group_<uuid>` in a Telegram group/supergroup, export an invite link, call the atomic RPC, and send a confirmation/failure message back to Telegram.
5. When Telegram reports the bot was removed or kicked, call `disconnect_expense_group_telegram` to clear the mapping and return the UI to the not-connected state.
6. Add `/api/expense-groups/[groupId]/telegram` for authenticated group members to fetch connection status and invite link independently of the page payload.

## Database schema changes

The `expense_groups` table gains:

- `telegram_chat_id text` — unique when present; stores the Telegram group/supergroup ID.
- `telegram_invite_link text` — stores the permanent invite link returned by Telegram `exportChatInviteLink`.
- `telegram_is_active boolean not null default false` — drives the UI banner state.
- `telegram_connected_at timestamptz` — records when the active mapping was established.

## Webhook pseudocode

```ts
if (update.message?.text matches /connect_group_<uuid>/ in group chat) {
  inviteLink = await telegram.exportChatInviteLink(chatId)
  result = await db.rpc('connect_expense_group_telegram', { groupId, chatId, inviteLink })
  await telegram.sendMessage(chatId, result.connected ? 'Connected' : 'Already connected elsewhere')
}

if (update.message?.left_chat_member is bot || my_chat_member status is left/kicked) {
  await db.rpc('disconnect_expense_group_telegram', { chatId })
}
```

## Notification triggers

Send Telegram messages for these expense-domain events:

- New expense: “User X added Dinner for USD 50.00.”
- Expense update: “User X updated Dinner.”
- Expense deletion: “User X deleted Dinner.”
- Settlement creation/update: “User Y settled USD 20.00 with User Z.”
- Member added/removed: “User X joined/left the expense group.”
- Balance reminder: scheduled digest of outstanding balances.
- Shopping-list activity linked to the group, when relevant: list created, item completed, or shopping expense imported.
