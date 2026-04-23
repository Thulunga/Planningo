// Domain and environment configuration
// Centralized place to manage domain strategy and URL handling

export const DOMAIN_CONFIG = {
  // Primary domains by environment
  production: {
    main: 'mydailyworkspace.site',
    app: 'planningo.mydailyworkspace.site', // Primary app domain
    alternatives: ['app.mydailyworkspace.site'], // Alternative domains
  },
  staging: {
    main: 'staging.mydailyworkspace.site',
    app: 'planningo-staging.mydailyworkspace.site',
  },
  development: {
    main: 'localhost',
    app: 'localhost:3000',
  },
} as const

export const BRANDING = {
  productName: 'Planningo',
  companyName: 'My Daily Workspace',
  mainSiteUrl: `https://${DOMAIN_CONFIG.production.main}`,
  appUrl: `https://${DOMAIN_CONFIG.production.app}`,
} as const

// Get current environment URLs
export function getUrlConfig() {
  const env = process.env.NODE_ENV || 'development'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return {
    appUrl,
    mainUrl: appUrl.replace('planningo.', '').replace('app.', ''),
    environment: env,
  }
}

// Determine if a domain is allowed for server actions
export function isAllowedOrigin(hostname: string): boolean {
  const allowed = [
    'localhost:3000',
    'localhost:3001',
    'planningo.mydailyworkspace.site',
    'app.mydailyworkspace.site',
    'planningo-staging.mydailyworkspace.site',
  ]
  return allowed.includes(hostname)
}
