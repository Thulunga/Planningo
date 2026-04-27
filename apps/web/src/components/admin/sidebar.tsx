'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  DollarSign,
  Settings,
  Home,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@planningo/ui'
import { cn } from '@planningo/ui'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Feedback',  href: '/admin/feedback', icon: MessageSquare },
  { label: 'Expenses',  href: '/admin/expenses', icon: DollarSign },
  { label: 'Settings',  href: '/admin/settings', icon: Settings },
]

function NavContent({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} onClick={onNav}>
              <span
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t">
        <Link href="/" onClick={onNav}>
          <span className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Home className="h-4 w-4 shrink-0" />
            Back to App
          </span>
        </Link>
      </div>
    </>
  )
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex w-60 border-r bg-card flex-col h-screen shrink-0">
        <div className="px-6 py-5 border-b">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Planningo</p>
          <h1 className="text-lg font-bold">Admin</h1>
        </div>
        <NavContent pathname={pathname} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b bg-card/95 backdrop-blur px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">Planningo</p>
          <h1 className="text-sm font-bold leading-tight">Admin</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative z-10 flex w-72 flex-col bg-card h-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Planningo</p>
                <h1 className="text-base font-bold">Admin</h1>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavContent pathname={pathname} onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
