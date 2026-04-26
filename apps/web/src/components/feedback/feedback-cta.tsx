'use client'

import Link from 'next/link'

interface FeedbackCtaProps {
  heading: string
  description: string
  buttonLabel?: string
  className?: string
}

export function FeedbackCta({
  heading,
  description,
  buttonLabel = 'Feedback',
  className,
}: FeedbackCtaProps) {
  return (
    <section className={`rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground ${className ?? ''}`}>
      {heading} {description}{' '}
      <Link href="/feedback" className="font-medium text-primary hover:underline">
        {buttonLabel}
      </Link>
      .
    </section>
  )
}
