import { Metadata } from 'next'

export const siteConfig = {
  name: 'Planningo',
  description: 'Your all-in-one productivity platform - todos, calendar, day planner, reminders, trip planning, and expense splitting.',
  url: 'https://www.mydailyworkspace.site',
  ogImage: 'https://www.mydailyworkspace.site/api/og',
  links: {
    twitter: 'https://twitter.com/planningo',
    github: 'https://github.com/planningo',
  },
}

export function generateMetadata(
  title?: string,
  description?: string,
  path?: string
): Metadata {
  const fullTitle = title ? `${title} | Planningo` : 'Planningo'
  const fullDescription = description || siteConfig.description
  const canonicalUrl = path ? `${siteConfig.url}${path}` : siteConfig.url

  return {
    title: fullTitle,
    description: fullDescription,
    canonical: canonicalUrl,
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: canonicalUrl,
      siteName: 'Planningo',
      title: fullTitle,
      description: fullDescription,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: 'Planningo',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  }
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Planningo',
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description: siteConfig.description,
    sameAs: [
      siteConfig.links.twitter,
      siteConfig.links.github,
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@planningo.com',
    },
  }
}

export function generateWebApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Planningo',
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }
}
