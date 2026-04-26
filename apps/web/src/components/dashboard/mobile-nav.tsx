'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Clock3,
  Bell,
  MessageSquare,
  Plane,
  DollarSign,
  Settings,
  TrendingUp,
} from 'lucide-react'
import { cn, SheetClose } from '@planningo/ui'
import { UserMenu } from './user-menu'
import type { Tables } from '@planningo/database'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/todos', icon: CheckSquare, label: 'Todos' },
  { href: '/planner', icon: Clock3, label: 'Day Planner' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
  { href: '/feedback', icon: MessageSquare, label: 'Feedback' },
  { href: '/trips', icon: Plane, label: 'Trips' },
  { href: '/expenses', icon: DollarSign, label: 'Expenses' },
]

export function MobileNav({ profile, isAdmin = false }: { profile: Tables<'profiles'> | null; isAdmin?: boolean }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      {/* Logo header */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <CalendarDays className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sidebar-foreground">Planningo</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {[
            ...navItems,
            ...(isAdmin
              ? [
                  { href: '/trading', icon: TrendingUp, label: 'Trading Bot' },
                ]
              : []),
          ].map(({ href, icon: Icon, label }) => {
            const isActive = href === '/expenses'
              ? pathname.startsWith('/expenses')
              : href === '/'
                ? pathname === '/'
                : pathname.startsWith(href)
            return (
              <li key={href}>
                <SheetClose asChild>
                  <Link
                    href={href}
                    className={cn(
                      'flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </SheetClose>
              </li>
            )
          })}
          <li>
            <SheetClose asChild>
              <Link
                href="/settings"
                className={cn(
                  'flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                  pathname.startsWith('/settings')
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                Settings
              </Link>
            </SheetClose>
          </li>
        </ul>
      </nav>

      {/* User menu at bottom */}
      <div className="border-t border-sidebar-border p-2">
        <UserMenu profile={profile} collapsed={false} />
      </div>
    </div>
  )
}
