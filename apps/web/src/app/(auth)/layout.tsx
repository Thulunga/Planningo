import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { generateMetadata } from '@/lib/seo'

export const metadata: Metadata = generateMetadata(
  'Authentication',
  'Sign in or create an account to access your Planningo dashboard',
  '/login'
)

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarDays className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">Planningo</span>
        </Link>
        <p className="text-sm text-muted-foreground">Your all-in-one productivity platform</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
