import type { Metadata } from 'next'
import { generateMetadata } from '@/lib/seo'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = generateMetadata(
  'Create Account',
  'Sign up for Planningo - your all-in-one productivity platform. Manage tasks, calendar, and expenses in one place.',
  '/register'
)

export default function RegisterPage() {
  return <RegisterForm />
}
