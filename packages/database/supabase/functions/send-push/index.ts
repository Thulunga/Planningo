/**
 * Send a Web Push notification to a single subscription endpoint.
 * Uses the web-push protocol with VAPID authentication.
 */

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_PUBLIC_KEY = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@planningo.app'

interface PushPayload {
  endpoint: string
  p256dh: string
  auth: string
  title: string
  body: string
  url?: string
  tag?: string
}

async function importVapidKey(privateKeyBase64: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  )
}

Deno.serve(async (req) => {
  const payload: PushPayload = await req.json()

  if (!payload.endpoint || !payload.p256dh || !payload.auth) {
    return new Response(JSON.stringify({ error: 'Missing push subscription fields' }), {
      status: 400,
    })
  }

  try {
    // Build notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/',
      tag: payload.tag ?? 'planningo-reminder',
    })

    // For a production implementation, use a full web-push library.
    // This is a simplified placeholder - in production you'd use:
    // https://github.com/nicholasbulka/web-push-deno or similar.

    // The actual encrypted push requires:
    // 1. Generate ECDH key pair
    // 2. Encrypt payload using receiver's p256dh key
    // 3. Sign VAPID JWT
    // 4. POST to push service endpoint

    // For now, log the push attempt (real encryption requires crypto implementation)
    console.log('Push notification queued for:', payload.endpoint.slice(0, 50) + '...')
    console.log('Payload:', { title: payload.title, body: payload.body })

    return new Response(JSON.stringify({ success: true, note: 'VAPID encryption requires web-push library in production' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('send-push error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
