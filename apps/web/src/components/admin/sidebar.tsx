'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  DollarSign,
  Settings,
  LogOut,
  Home,
} from 'lucide-react'
import { Button } from '@planningo/ui'
import { cn } from '@planningo/ui/lib/utils'

const navItems = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Feedback',
    href: '/admin/feedback',
    icon: MessageSquare,
  },
  {
    label: 'Expenses',
    href: '/admin/expenses',
    icon: DollarSign,
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-muted-foreground">Platform Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start"
                asChild
              >
                <span>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </span>
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        <Link href="/">
          <Button variant="outline" className="w-full justify-start" asChild>
            <span>
              <Home className="mr-2 h-4 w-4" />
              Back to App
            </span>
          </Button>
        </Link>
      </div>
    </aside>
  )
}
