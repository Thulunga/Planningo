import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { ThemedToaster } from '@/components/themed-toaster'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import { generateOrganizationSchema, siteConfig } from '@/lib/seo'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark light',
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Planningo - All-in-One Productivity Platform',
    template: '%s | Planningo',
  },
  description: 'Your all-in-one productivity platform - todos, calendar, day planner, reminders, trip planning, and expense splitting.',
  keywords: [
    'productivity',
    'todo',
    'task management',
    'calendar',
    'planner',
    'trip planner',
    'expense splitting',
    'day planner',
    'reminders',
  ],
  authors: [{ name: 'Planningo' }],
  creator: 'Planningo',
  publisher: 'Planningo',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: 'Planningo',
    title: 'Planningo - All-in-One Productivity Platform',
    description: 'Your all-in-one productivity platform - todos, calendar, day planner, reminders, trip planning, and expense splitting.',
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: 'Planningo - Productivity Platform',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Planningo - All-in-One Productivity Platform',
    description: 'Your all-in-one productivity platform - todos, calendar, day planner, reminders, trip planning, and expense splitting.',
    images: [siteConfig.ogImage],
  },
  alternates: {
    canonical: siteConfig.url,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = generateOrganizationSchema()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
        <GoogleAnalytics />

        {/* JSON-LD Schema Markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
          suppressHydrationWarning
        />

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
