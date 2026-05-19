'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Check,
  Clock,
  ShoppingCart,
  SkipForward,
  Trash2,
  Pencil,
  X,
  Loader2,
  CalendarClock,
} from 'lucide-react'
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@planningo/ui'
import {
  updateItemStatus,
  updateShoppingItem,
  deleteShoppingItem,
  type ShoppingItemStatus,
} from '@/lib/actions/shopping-lists'

interface ShoppingItem {
  id: string
  list_id: string
  name: string
  quantity: number | null
  unit: string | null
  notes: string | null
  status: ShoppingItemStatus
  hold_until: string | null
  added_by: string
  updated_by: string | null
  sort_order: number
}

interface ShoppingItemRowProps {
  item: ShoppingItem
  groupId: string
  onUpdate: () => void
}

const STATUS_CONFIG: Record<ShoppingItemStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-muted text-muted-foreground',            icon: <ShoppingCart className="h-3 w-3" /> },
  bought:    { label: 'Bought',    color: 'bg-emerald-500/15 text-emerald-500',         icon: <Check className="h-3 w-3" /> },
  buy_later: { label: 'Buy Later', color: 'bg-blue-500/15 text-blue-500',              icon: <Clock className="h-3 w-3" /> },
  on_hold:   { label: 'On Hold',   color: 'bg-amber-500/15 text-amber-500',            icon: <CalendarClock className="h-3 w-3" /> },
  skipped:   { label: 'Skipped',   color: 'bg-rose-500/15 text-rose-500',              icon: <SkipForward className="h-3 w-3" /> },
}

export function ShoppingItemRow({ item, groupId, onUpdate }: ShoppingItemRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editQty, setEditQty] = useState(item.quantity?.toString() ?? '')
  const [editUnit, setEditUnit] = useState(item.unit ?? '')
  const [editNotes, setEditNotes] = useState(item.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [showHoldPicker, setShowHoldPicker] = useState(false)
  const [holdDate, setHoldDate] = useState(item.hold_until ?? '')

  const statusCfg = STATUS_CONFIG[item.status]

  async function handleToggleBought() {
    const newStatus: ShoppingItemStatus = item.status === 'bought' ? 'pending' : 'bought'
    setSaving(true)
    const res = await updateItemStatus(item.id, item.list_id, groupId, newStatus)
    setSaving(false)
    if (res.error) toast.error(res.error)
    else onUpdate()
  }

  async function handleSetStatus(status: ShoppingItemStatus, holdUntil?: string) {
    setSaving(true)
    const res = await updateItemStatus(item.id, item.list_id, groupId, status, holdUntil)
    setSaving(false)
    setShowHoldPicker(false)
    if (res.error) toast.error(res.error)
    else onUpdate()
  }

  async function handleSaveEdit() {
    if (!editName.trim()) return
    setSaving(true)
    const res = await updateShoppingItem(item.id, item.list_id, groupId, {
      name: editName.trim(),
      quantity: editQty ? parseFloat(editQty) : null,
      unit: editUnit.trim() || null,
      notes: editNotes.trim() || null,
    })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      setIsEditing(false)
      onUpdate()
    }
  }

  async function handleDelete() {
    setSaving(true)
    const res = await deleteShoppingItem(item.id, item.list_id, groupId)
    setSaving(false)
    if (res.error) toast.error(res.error)
    else onUpdate()
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Item name"
          className="h-8 text-sm"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit() }}
        />
        <div className="flex gap-2">
          <Input
            value={editQty}
            onChange={(e) => setEditQty(e.target.value)}
            placeholder="Qty"
            type="number"
            min="0"
            step="any"
            className="h-7 w-20 text-xs"
          />
          <Input
            value={editUnit}
            onChange={(e) => setEditUnit(e.target.value)}
            placeholder="Unit (kg, pcs…)"
            className="h-7 flex-1 text-xs"
          />
        </div>
        <Input
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="h-7 text-xs"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setIsEditing(false)
              setEditName(item.name)
              setEditQty(item.quantity?.toString() ?? '')
              setEditUnit(item.unit ?? '')
              setEditNotes(item.notes ?? '')
            }}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={handleSaveEdit}
            disabled={saving || !editName.trim()}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/40 ${item.status === 'bought' || item.status === 'skipped' ? 'opacity-60' : ''}`}>
      <Checkbox
        checked={item.status === 'bought'}
        onCheckedChange={handleToggleBought}
        disabled={saving}
        className="mt-0.5 shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${item.status === 'bought' || item.status === 'skipped' ? 'line-through text-muted-foreground' : ''}`}>
            {item.name}
          </span>
          {(item.quantity || item.unit) && (
            <span className="text-xs text-muted-foreground">
              {item.quantity}{item.quantity && item.unit ? '\u00a0' : ''}{item.unit}
            </span>
          )}
          {item.status !== 'pending' && (
            <Badge className={`text-[10px] h-4 px-1.5 gap-0.5 border-0 ${statusCfg.color}`}>
              {statusCfg.icon}
              <span>{statusCfg.label}</span>
              {item.status === 'on_hold' && item.hold_until && (
                <span className="ml-0.5">until {format(new Date(item.hold_until), 'MMM\u00a0d')}</span>
              )}
            </Badge>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" title="Change status">
              <Clock className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleSetStatus('pending')} className="gap-2 text-xs">
              <ShoppingCart className="h-3.5 w-3.5" /> Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetStatus('bought')} className="gap-2 text-xs text-emerald-500">
              <Check className="h-3.5 w-3.5" /> Bought ✓
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSetStatus('buy_later')} className="gap-2 text-xs text-blue-500">
              <Clock className="h-3.5 w-3.5" /> Buy Later
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowHoldPicker(true)} className="gap-2 text-xs text-amber-500">
              <CalendarClock className="h-3.5 w-3.5" /> On Hold…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSetStatus('skipped')} className="gap-2 text-xs text-rose-500">
              <SkipForward className="h-3.5 w-3.5" /> Skip
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground"
          title="Edit item"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Delete item"
          onClick={handleDelete}
          disabled={saving}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {showHoldPicker && (
        <div className="absolute right-0 top-8 z-30 flex items-end gap-2 rounded-lg border bg-popover p-3 shadow-md">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Hold until</label>
            <Input
              type="date"
              value={holdDate}
              onChange={(e) => setHoldDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={() => handleSetStatus('on_hold', holdDate || undefined)}>
            Set
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowHoldPicker(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
