import type { Metadata } from 'next'
import { generateMetadata } from '@/lib/seo'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = generateMetadata(
  'Sign In',
  'Sign in to your Planningo account to access your tasks, calendar, and productivity tools.',
  '/login'
)

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>
}) {
  const { error, redirectTo } = await searchParams
  return <LoginForm error={error} redirectTo={redirectTo} />
}
