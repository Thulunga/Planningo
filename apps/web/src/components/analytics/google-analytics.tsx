import Script from 'next/script'

/**
 * Google Analytics Component
 * 
 * Usage in apps/web/src/app/layout.tsx:
 * 
 * import { GoogleAnalytics } from '@/components/analytics/google-analytics'
 * 
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <html>
 *       <head>
 *         <GoogleAnalytics />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   )
 * }
 */

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID

  if (!measurementId) {
    console.warn('Google Analytics ID (NEXT_PUBLIC_GA_ID) is not set')
    return null
  }

  return (
    <>
      {/* Google Analytics Script */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />

      {/* Initialize Google Analytics */}
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
              send_page_view: true,
            });
          `,
        }}
      />
    </>
  )
}

/**
 * Alternative: Using gtag-react for better React integration
 * 
 * Install: npm install @react-ga/core
 * 
 * import { useEffect } from 'react'
 * import { usePathname, useSearchParams } from 'next/navigation'
 * import { event } from '@react-ga/core'
 * 
 * export function GoogleAnalyticsTracker() {
 *   const pathname = usePathname()
 *   const searchParams = useSearchParams()
 * 
 *   useEffect(() => {
 *     if (typeof window !== 'undefined' && window.gtag) {
 *       window.gtag('event', 'page_view', {
 *         page_path: pathname + (searchParams?.toString() ? `?${searchParams}` : ''),
 *         page_title: document.title,
 *       })
 *     }
 *   }, [pathname, searchParams])
 * 
 *   return null
 * }
 */
