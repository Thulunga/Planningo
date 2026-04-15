'use client'

import Link from 'next/link'
import { Menu, CalendarDays } from 'lucide-react'
import {
  Button,
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@planningo/ui'
import { RealTimeClock } from '@/components/clock/real-time-clock'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileNav } from './mobile-nav'
import type { Tables } from '@planningo/database'

interface HeaderProps {
  profile: Tables<'profiles'> | null
}

export function Header({ profile }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile: hamburger button + logo */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <MobileNav profile={profile} />
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <CalendarDays className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Planningo</span>
        </Link>
      </div>

      {/* Desktop: empty left side — logo lives in sidebar */}
      <div className="hidden md:flex" />

      {/* Right side: clock + theme toggle */}
      <div className="flex items-center gap-2">
        <RealTimeClock
          timezone={profile?.timezone ?? 'UTC'}
          className="hidden sm:flex flex-col items-end"
        />
        <ThemeToggle />
      </div>
    </header>
  )
}
