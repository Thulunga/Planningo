import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/api/og'],
        disallow: ['/(dashboard)/', '/admin/', '/api/'],
        crawlDelay: 1,
      },
    ],
    sitemap: 'https://www.mydailyworkspace.site/sitemap.xml',
  }
}
