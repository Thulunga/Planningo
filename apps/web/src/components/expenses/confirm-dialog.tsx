'use client'

import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogTitle } from '@planningo/ui'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Short heading, e.g. "Delete expense?" */
  title: string
  /** Longer explanation of what will happen */
  description: string
  /** Label for the destructive confirm button (default: "Delete") */
  confirmLabel?: string
  /** Whether the action is in progress */
  loading?: boolean
  /** Called when user confirms */
  onConfirm: () => void
  /** 'danger' = red, 'warning' = amber. Default: 'danger' */
  variant?: 'danger' | 'warning'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
  variant = 'danger',
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger'

  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {/* Coloured strip at the top */}
        <div className={`h-1.5 w-full ${isDanger ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} />

        <div className="p-5 space-y-4">
          {/* Icon + title */}
          <div className="flex items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDanger ? 'bg-red-500/12' : 'bg-amber-500/12'}`}>
              {isDanger
                ? <Trash2 className={`h-4.5 w-4.5 h-4 w-4 text-red-500`} />
                : <AlertTriangle className="h-4 w-4 text-amber-500" />}
            </div>
            <div>
              <p className="text-sm font-semibold leading-snug">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 px-4"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => { onConfirm(); }}
              className={`h-8 px-4 gap-1.5 border-0 text-white font-semibold ${
                isDanger
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600'
              }`}
            >
              {loading ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : null}
              {loading ? 'Deleting…' : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
