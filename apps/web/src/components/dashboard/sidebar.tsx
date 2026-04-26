'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Clock3,
  Bell,
  Gamepad2,
  MessageSquare,
  Plane,
  DollarSign,
  Settings,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { cn, Button, Tooltip, TooltipContent, TooltipTrigger } from '@planningo/ui'
import { useUIStore } from '@/stores/ui-store'
import { UserMenu } from './user-menu'
import type { Tables } from '@planningo/database'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/todos', icon: CheckSquare, label: 'Todos' },
  { href: '/planner', icon: Clock3, label: 'Day Planner' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/reminders', icon: Bell, label: 'Reminders' },
  { href: '/feedback', icon: MessageSquare, label: 'Feedback' },
  { href: '/games', icon: Gamepad2, label: 'Games' },
  { href: '/trips', icon: Plane, label: 'Trips' },
  { href: '/expenses', icon: DollarSign, label: 'Expenses' },
]

interface SidebarProps {
  profile: Tables<'profiles'> | null
  isAdmin?: boolean
}

export function Sidebar({ profile, isAdmin = false }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside
      className={cn(
        'relative hidden md:flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-14 items-center border-b border-sidebar-border px-3', sidebarCollapsed ? 'justify-center' : 'gap-2 px-4')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <CalendarDays className="h-4 w-4" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold tracking-tight text-sidebar-foreground">Planningo</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {[
            ...navItems,
            ...(isAdmin
              ? [
                  { href: '/trading', icon: TrendingUp, label: 'Trading Bot' },
                ]
              : []),
          ].map((item) => {
            const isActive = item.href === '/expenses'
              ? pathname.startsWith('/expenses')
              : item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            const Icon = item.icon

            if (sidebarCollapsed) {
              return (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex h-11 w-full items-center justify-center rounded-md transition-colors',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                </li>
              )
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Settings + User */}
      <div className="border-t border-sidebar-border p-2">
        {sidebarCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  'flex h-11 w-full items-center justify-center rounded-md transition-colors',
                  pathname.startsWith('/settings')
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Settings className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/settings"
            className={cn(
              'flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors',
              pathname.startsWith('/settings')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
        )}

        <UserMenu profile={profile} collapsed={sidebarCollapsed} />
      </div>

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-16 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-accent"
        onClick={toggleSidebar}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
        <span className="sr-only">Toggle sidebar</span>
      </Button>
    </aside>
  )
}
