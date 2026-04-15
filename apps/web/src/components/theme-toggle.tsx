'use client'

import { Sun, Moon } from 'lucide-react'
import { Button } from '@planningo/ui'
import { useUIStore } from '@/stores/ui-store'

export function ThemeToggle() {
  const { theme, toggleTheme } = useUIStore()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="h-11 w-11"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}
