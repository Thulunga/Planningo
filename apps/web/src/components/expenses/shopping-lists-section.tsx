'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, ShoppingBag } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@planningo/ui'
import { createShoppingList } from '@/lib/actions/shopping-lists'
import { ShoppingListCard } from './shopping-list-card'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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

interface ShoppingListsSectionProps {
  groupId: string
  initialLists: ShoppingList[]
}

export function ShoppingListsSection({ groupId, initialLists }: ShoppingListsSectionProps) {
  const router = useRouter()
  const [lists, setLists] = useState<ShoppingList[]>(initialLists)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Keep in sync with server-provided prop
  useEffect(() => { setLists(initialLists) }, [initialLists])

  // Realtime subscription for live updates across all group members
  useEffect(() => {
    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`shopping-${groupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_lists', filter: `group_id=eq.${groupId}` },
        () => router.refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_list_items' },
        () => router.refresh(),
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [groupId, router])

  async function handleCreateList() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await createShoppingList(groupId, {
      name: newName.trim(),
      description: newDescription.trim() || null,
    })
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Shopping list created!')
      setIsCreateOpen(false)
      setNewName('')
      setNewDescription('')
      router.refresh()
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Shopping Lists ({lists.length})
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-7 text-xs"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New List
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ShoppingBag className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No shopping lists yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a list to track what to buy together
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-1.5"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Create first list
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {lists.map((list) => (
            <ShoppingListCard
              key={list.id}
              list={list}
              groupId={groupId}
              onUpdate={() => router.refresh()}
            />
          ))}
        </div>
      )}

      {/* Create List Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Shopping List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>List Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Weekly Groceries, Party Supplies…"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList() }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Description{' '}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Any notes about this list…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false)
                  setNewName('')
                  setNewDescription('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateList} disabled={saving || !newName.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
