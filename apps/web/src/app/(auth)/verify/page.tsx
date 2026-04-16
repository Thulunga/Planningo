import type { Metadata } from 'next'
import { OtpForm } from '@/components/auth/otp-form'

export const metadata: Metadata = {
  title: 'Verify',
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; mode?: string }>
}) {
  const { email, mode } = await searchParams
  return <OtpForm email={email ?? ''} mode={mode ?? 'otp'} />
}
