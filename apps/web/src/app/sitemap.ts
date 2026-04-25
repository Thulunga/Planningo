import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.mydailyworkspace.site',
      lastModified: new Date('2026-04-24'),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: 'https://www.mydailyworkspace.site/login',
      lastModified: new Date('2026-04-24'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://www.mydailyworkspace.site/register',
      lastModified: new Date('2026-04-24'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ]
}
