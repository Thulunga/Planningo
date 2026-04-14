import type { Metadata } from 'next'
import { OtpForm } from '@/components/auth/otp-form'

export const metadata: Metadata = {
  title: 'Verify',
}

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { email?: string; mode?: string }
}) {
  return <OtpForm email={searchParams.email ?? ''} mode={searchParams.mode ?? 'otp'} />
}
