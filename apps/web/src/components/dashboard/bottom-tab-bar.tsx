'use client'

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

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex h-16 items-stretch border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ href, icon: Icon, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
