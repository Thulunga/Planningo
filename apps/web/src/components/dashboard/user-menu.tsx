'use client'

import { useState } from 'react'
import { LogOut, User, Settings } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@planningo/ui'
import { signOut } from '@/lib/actions/auth'
import type { Tables } from '@planningo/database'
import Link from 'next/link'

interface UserMenuProps {
  profile: Tables<'profiles'> | null
  collapsed?: boolean
}

export function UserMenu({ profile, collapsed }: UserMenuProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  async function handleSignOut() {
    setIsSigningOut(true)
    await signOut()
  }

  const trigger = (
    <button className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent/50">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? 'User'} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-sidebar-foreground">
            {profile?.full_name ?? 'User'}
          </p>
          <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
        </div>
      )}
    </button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right">
              {profile?.full_name ?? 'User'}
            </TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel>
          <div>
            <p className="font-medium">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
