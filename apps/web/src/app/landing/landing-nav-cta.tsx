'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

/** Renders different CTAs depending on whether the visitor is logged in. */
export function LandingNavCta() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // While resolving, render nothing to avoid a flash of wrong buttons
  if (loggedIn === null) return null

  if (loggedIn) {
    return (
      <Link
        href="/"
        className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Go to Dashboard
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    )
  }

  return (
    <>
      <Link
        href="/login"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign In
      </Link>
      <Link
        href="/register"
        className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Get Started
      </Link>
    </>
  )
}

/** Hero primary CTA - shows "Go to Dashboard" when logged in. */
export function LandingHeroCta() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loggedIn === null) {
    // Skeleton placeholders so layout doesn't jump
    return (
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <div className="h-12 w-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-12 w-44 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (loggedIn) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
        >
          Go to your Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <Link
        href="/register"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
      >
        Start for free
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href="/login"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent sm:w-auto"
      >
        Sign in to your account
      </Link>
    </div>
  )
}

/** Bottom CTA section button - "Create free account" or "Go to Dashboard". */
export function LandingBottomCta() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loggedIn === null) {
    return <div className="mt-8 h-12 w-52 animate-pulse rounded-lg bg-muted/50 mx-auto" />
  }

  if (loggedIn) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
        >
          Go to Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <Link
        href="/register"
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
      >
        Create your free account
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
