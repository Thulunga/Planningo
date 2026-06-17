import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@planningo/database'

const GROUP_CONNECT_RE = /(?:^|\s)\/connect_group_([0-9a-fA-F-]{36})(?:@\w+)?(?:\s|$)/

interface TelegramUser { id: number; is_bot?: boolean; username?: string }
interface TelegramChat { id: number; type: string; title?: string }
interface TelegramMessage {
  message_id: number
  text?: string
  chat: TelegramChat
  from?: TelegramUser
  group_chat_created?: boolean
  new_chat_members?: TelegramUser[]
  left_chat_member?: TelegramUser
}
interface TelegramUpdate { update_id: number; message?: TelegramMessage; my_chat_member?: { chat: TelegramChat; new_chat_member: { status: string; user: TelegramUser } } }

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN
}

async function telegram(method: string, body: Record<string, unknown>) {
  const token = botToken()
  if (!token) throw new Error('Missing TELEGRAM_BOT_TOKEN')
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Telegram ${method} failed: ${await res.text()}`)
  return res.json() as Promise<{ ok: boolean; result?: string }>
}

async function sendMessage(chatId: string, text: string) {
  await telegram('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true })
}

async function exportInviteLink(chatId: string) {
  const data = await telegram('exportChatInviteLink', { chat_id: chatId })
  if (!data.result) throw new Error('Telegram did not return an invite link')
  return data.result
}

function extractGroupId(message: TelegramMessage) {
  const match = message.text?.match(GROUP_CONNECT_RE)
  return match?.[1]
}

async function handleConnect(message: TelegramMessage) {
  const groupId = extractGroupId(message)
  if (!groupId) return

  const chatId = String(message.chat.id)
  const inviteLink = await exportInviteLink(chatId)
  const supabase = createSupabaseServiceClient() as any
  const { data, error } = await supabase.rpc('connect_expense_group_telegram', {
    p_group_id: groupId,
    p_chat_id: chatId,
    p_invite_link: inviteLink,
  })

  if (error) throw error
  const result = (Array.isArray(data) ? data[0] : data) as { connected?: boolean; invite_link?: string | null } | null

  if (result?.connected) {
    await sendMessage(chatId, '✅ Telegram notifications are now active for this Planningo expense group.')
  } else {
    await sendMessage(chatId, '⚠️ This Planningo expense group is already connected to another Telegram group.')
  }
}

async function handleDisconnect(chatId: string) {
  const supabase = createSupabaseServiceClient() as any
  const { error } = await supabase.rpc('disconnect_expense_group_telegram', { p_chat_id: chatId })
  if (error) throw error
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret && request.headers.get('x-telegram-bot-api-secret-token') !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const update = (await request.json()) as TelegramUpdate
  const message = update.message

  if (message?.left_chat_member?.is_bot) {
    await handleDisconnect(String(message.chat.id))
    return NextResponse.json({ ok: true })
  }

  if (update.my_chat_member?.new_chat_member.user.is_bot && ['left', 'kicked'].includes(update.my_chat_member.new_chat_member.status)) {
    await handleDisconnect(String(update.my_chat_member.chat.id))
    return NextResponse.json({ ok: true })
  }

  if (message?.text && ['group', 'supergroup'].includes(message.chat.type)) {
    await handleConnect(message)
  }

  return NextResponse.json({ ok: true })
}
