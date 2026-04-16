/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type errors are tracked separately — don't block production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@planningo/ui', '@planningo/database'],
  serverActions: {
    allowedOrigins: ['localhost:3000'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
}

export default nextConfig
