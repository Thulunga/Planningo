import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from '@/components/providers'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" theme="dark" />
          <ServiceWorkerRegistration />
        </Providers>
      </body>
    </html>
  )
}
