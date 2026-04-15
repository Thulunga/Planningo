import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { ThemedToaster } from '@/components/themed-toaster'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'Planningo',
    template: '%s | Planningo',
  },
  description: 'Your all-in-one productivity platform — todos, calendar, trips, and expenses.',
  keywords: ['productivity', 'todo', 'calendar', 'planner', 'trip planner', 'expense splitting'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script: reads persisted theme from localStorage before first paint to prevent flash.
            Key 'planningo-ui' must match the name in ui-store.ts persist config. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem('planningo-ui')||'{}');var theme=t.state&&t.state.theme||'dark';document.documentElement.classList.add(theme);}catch(e){document.documentElement.classList.add('dark');}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {children}
          <ThemedToaster />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  )
}
