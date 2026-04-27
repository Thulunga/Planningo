'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, Calendar, Clock3, Bell } from 'lucide-react'
import { cn } from '@planningo/ui'

const tabs = [
  { href: '/', icon: LayoutDashboard, label: 'Home' },
  { href: '/todos', icon: CheckSquare, label: 'Todos' },
  { href: '/planner', icon: Clock3, label: 'Planner' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/reminders', icon: Bell, label: 'Alerts' },
]

export function BottomTabBar() {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Clear pending when navigation completes (pathname changed)
  const prevPathname = pendingHref
  if (prevPathname !== null && pathname === pendingHref) {
    setPendingHref(null)
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-stretch border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ href, icon: Icon, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        const isPending = pendingHref === href && !isActive

        return (
          <Link
            key={href}
            href={href}
            onClick={() => {
              if (!isActive) setPendingHref(href)
            }}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
              isActive
                ? 'text-primary'
                : isPending
                  ? 'text-primary/60'
                  : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className={cn('relative', isPending && 'animate-pulse')}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
