'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Progress,
  Textarea,
} from '@planningo/ui'
import { addShoppingItem, deleteShoppingList, updateShoppingList } from '@/lib/actions/shopping-lists'
import { ShoppingItemRow } from './shopping-item-row'

interface ShoppingItem {
  id: string
  list_id: string
  name: string
  quantity: number | null
  unit: string | null
  notes: string | null
  status: 'pending' | 'bought' | 'buy_later' | 'on_hold' | 'skipped'
  hold_until: string | null
  added_by: string
  updated_by: string | null
  sort_order: number
}

interface ShoppingList {
  id: string
  group_id: string
  name: string
  description: string | null
  created_by: string
  shopping_list_items: ShoppingItem[]
}

interface ShoppingListCardProps {
  list: ShoppingList
  groupId: string
  onUpdate: () => void
}

export function ShoppingListCard({ list, groupId, onUpdate }: ShoppingListCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit list state
  const [editName, setEditName] = useState(list.name)
  const [editDescription, setEditDescription] = useState(list.description ?? '')

  // Add item state
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState('')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newItemNotes, setNewItemNotes] = useState('')

  const items = list.shopping_list_items ?? []
  const totalItems = items.length
  const boughtItems = items.filter((i) => i.status === 'bought').length
  const activeItems = items.filter((i) => i.status !== 'skipped')
  const progress = activeItems.length > 0 ? Math.round((boughtItems / activeItems.length) * 100) : 0

  async function handleUpdateList() {
    if (!editName.trim()) return
    setSaving(true)
    const res = await updateShoppingList(list.id, groupId, {
      name: editName.trim(),
      description: editDescription.trim() || null,
    })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('List updated')
      setIsEditOpen(false)
      onUpdate()
    }
  }

  async function handleDeleteList() {
    setSaving(true)
    const res = await deleteShoppingList(list.id, groupId)
    setSaving(false)
    if (res.error) toast.error(res.error)
    else onUpdate()
  }

  async function handleAddItem() {
    if (!newItemName.trim()) return
    setSaving(true)
    const res = await addShoppingItem(list.id, groupId, {
      name: newItemName.trim(),
      quantity: newItemQty ? parseFloat(newItemQty) : null,
      unit: newItemUnit.trim() || null,
      notes: newItemNotes.trim() || null,
    })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      setNewItemName('')
      setNewItemQty('')
      setNewItemUnit('')
      setNewItemNotes('')
      setIsAddItemOpen(false)
      onUpdate()
    }
  }

  return (
    <Card className="overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
          <ShoppingBag className="h-4 w-4 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{list.name}</p>
          {list.description && (
            <p className="text-xs text-muted-foreground truncate">{list.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {boughtItems}/{totalItems}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => { setEditName(list.name); setEditDescription(list.description ?? ''); setIsEditOpen(true) }} className="gap-2 text-xs">
                <Pencil className="h-3.5 w-3.5" /> Edit List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsAddItemOpen(true)} className="gap-2 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Item
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteList}
                className="gap-2 text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsExpanded((v) => !v)}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {totalItems > 0 && (
        <div className="px-4 py-2 border-b border-border/20">
          <Progress value={progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1">
            {boughtItems} of {activeItems.length} item{activeItems.length !== 1 ? 's' : ''} bought
            {progress === 100 && activeItems.length > 0 && ' 🎉'}
          </p>
        </div>
      )}

      {/* Items */}
      {isExpanded && (
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <ShoppingBag className="h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No items yet</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs gap-1.5"
                onClick={() => setIsAddItemOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Add first item
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {[...items]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    groupId={groupId}
                    onUpdate={onUpdate}
                  />
                ))}
              {/* Quick add row at bottom */}
              <div className="flex items-center gap-2 px-3 py-2">
                <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <button
                  className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsAddItemOpen(true)}
                >
                  Add item…
                </button>
              </div>
            </div>
          )}
        </CardContent>
      )}

      {/* Edit List Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Shopping List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>List Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Weekly Groceries"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateList() }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Any notes about this list…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateList} disabled={saving || !editName.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Item to "{list.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Item Name *</Label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Milk, Bread, Eggs…"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem() }}
              />
            </div>
            <div className="flex gap-2">
              <div className="space-y-1.5 w-24">
                <Label>Qty</Label>
                <Input
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  placeholder="1"
                  type="number"
                  min="0"
                  step="any"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5 flex-1">
                <Label>Unit</Label>
                <Input
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                  placeholder="kg, pcs, L…"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Brand, details…"
                className="text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddItemOpen(false)
                  setNewItemName('')
                  setNewItemQty('')
                  setNewItemUnit('')
                  setNewItemNotes('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddItem} disabled={saving || !newItemName.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
