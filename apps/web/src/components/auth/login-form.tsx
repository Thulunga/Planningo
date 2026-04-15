'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@planningo/ui'
import { signInWithPassword, signInWithOtp } from '@/lib/actions/auth'

const passwordSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const otpSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type PasswordForm = z.infer<typeof passwordSchema>
type OtpEmailForm = z.infer<typeof otpSchema>

interface LoginFormProps {
  error?: string
  redirectTo?: string
}

export function LoginForm({ error, redirectTo }: LoginFormProps) {
  const router = useRouter()
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const otpForm = useForm<OtpEmailForm>({
    resolver: zodResolver(otpSchema),
  })

  async function onPasswordSubmit(data: PasswordForm) {
    const result = await signInWithPassword(data)
    if (result?.error) {
      toast.error(result.error)
    }
  }

  async function onOtpSubmit(data: OtpEmailForm) {
    const result = await signInWithOtp(data.email)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success('Check your email for the verification code')
      router.push(`/verify?email=${encodeURIComponent(data.email)}&mode=otp`)
    }
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your Planningo account</CardDescription>
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {decodeURIComponent(error)}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="password">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="otp">Magic Link</TabsTrigger>
          </TabsList>

          {/* Password tab */}
          <TabsContent value="password">
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="email-pw">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email-pw"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    {...passwordForm.register('email')}
                  />
                </div>
                {passwordForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    {...passwordForm.register('password')}
                  />
                </div>
                {passwordForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Sign In
              </Button>
            </form>
          </TabsContent>

          {/* OTP / Magic Link tab */}
          <TabsContent value="otp">
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="email-otp">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email-otp"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    {...otpForm.register('email')}
                  />
                </div>
                {otpForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {otpForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={otpForm.formState.isSubmitting}
              >
                {otpForm.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Magic Code
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We&apos;ll email you a 6-digit code. No password needed.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-0">
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
