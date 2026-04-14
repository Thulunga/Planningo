'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@planningo/ui'
import { verifyOtp, signInWithOtp } from '@/lib/actions/auth'

const otpSchema = z.object({
  token: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d+$/, 'Code must be numbers only'),
})

type OtpForm = z.infer<typeof otpSchema>

interface OtpFormProps {
  email: string
  mode: string
}

export function OtpForm({ email, mode }: OtpFormProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const countdownRef = useRef<NodeJS.Timeout>()

  const form = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
  })

  async function onSubmit(data: OtpForm) {
    const result = await verifyOtp({ email, token: data.token })
    if (result?.error) {
      toast.error(result.error)
      form.reset()
    }
  }

  async function handleResend() {
    setIsResending(true)
    const result = await signInWithOtp(email)
    setIsResending(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('New code sent to your email')
      // Start 60s cooldown
      setResendCountdown(60)
      countdownRef.current = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  const isEmailConfirm = mode === 'email-confirm'

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {isEmailConfirm ? 'Confirm your email' : 'Enter verification code'}
          </CardTitle>
        </div>
        <CardDescription>
          {isEmailConfirm ? (
            <>
              We sent a confirmation link to{' '}
              <span className="font-medium text-foreground">{email}</span>. Click the link in your
              email to activate your account.
            </>
          ) : (
            <>
              We sent a 6-digit code to{' '}
              <span className="font-medium text-foreground">{email}</span>. Enter it below.
            </>
          )}
        </CardDescription>
      </CardHeader>

      {isEmailConfirm ? (
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Check your inbox and click the confirmation link. Then{' '}
              <a href="/login" className="text-primary hover:underline">
                sign in
              </a>
              .
            </p>
          </div>

          <Button variant="outline" className="w-full" onClick={handleResend} disabled={isResending}>
            {isResending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Resend confirmation email
          </Button>
        </CardContent>
      ) : (
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="token">6-Digit Code</Label>
              <Input
                id="token"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="text-center text-2xl tracking-[0.5em]"
                {...form.register('token')}
              />
              {form.formState.errors.token && (
                <p className="text-xs text-destructive">{form.formState.errors.token.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Verify Code
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || resendCountdown > 0}
                className="text-sm text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResending ? (
                  'Sending...'
                ) : resendCountdown > 0 ? (
                  `Resend in ${resendCountdown}s`
                ) : (
                  "Didn't receive it? Resend code"
                )}
              </button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  )
}
