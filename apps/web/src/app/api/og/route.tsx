import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '40px',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Logo Circle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: '#00d4ff',
            color: '#1a1a2e',
            fontSize: '80px',
            fontWeight: 'bold',
            marginBottom: '20px',
          }}
        >
          📅
        </div>

        {/* Main Title */}
        <h1
          style={{
            fontSize: '96px',
            fontWeight: 'bold',
            margin: '0 0 20px 0',
            color: '#ffffff',
            letterSpacing: '-2px',
          }}
        >
          Planningo
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: '48px',
            color: '#b0b0b0',
            margin: '0 0 60px 0',
            fontWeight: '300',
          }}
        >
          Your All-in-One Productivity Platform
        </p>

        {/* Features Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '30px',
            marginBottom: '60px',
            width: '100%',
          }}
        >
          <div style={{ fontSize: '32px', color: '#00d4ff' }}>✓ Todos & Tasks</div>
          <div style={{ fontSize: '32px', color: '#00d4ff' }}>✓ Calendar & Events</div>
          <div style={{ fontSize: '32px', color: '#00d4ff' }}>✓ Trip Planning</div>
          <div style={{ fontSize: '32px', color: '#00d4ff' }}>✓ Expense Splitting</div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            right: '40px',
            fontSize: '32px',
            color: '#ffffff',
            fontWeight: '500',
          }}
        >
          www.mydailyworkspace.site
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
