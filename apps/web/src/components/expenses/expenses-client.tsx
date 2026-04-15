'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, DollarSign, Users, ArrowRight, Loader2 } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@planningo/ui'
import { createExpenseGroup } from '@/lib/actions/expenses'
import { useRouter } from 'next/navigation'

interface Group {
  id: string
  name: string
  description: string | null
  currency: string
  category: string
  created_by: string
  group_members: { user_id: string; role: string }[]
}

interface ExpensesClientProps {
  groups: Group[]
  userId: string
}

export function ExpensesClient({ groups, userId }: ExpensesClientProps) {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    currency: 'USD',
    category: 'general',
  })

  async function handleCreate() {
    if (!newGroup.name.trim()) {
      toast.error('Group name is required')
      return
    }
    setSaving(true)
    const result = await createExpenseGroup({
      name: newGroup.name.trim(),
      description: newGroup.description || null,
      currency: newGroup.currency,
      category: newGroup.category,
    })
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Group created!')
      setIsCreateOpen(false)
      if (result.group) router.push(`/expenses/${result.group.id}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">{groups.length} group(s)</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          New Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No expense groups yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a group to start splitting expenses with friends
            </p>
            <Button variant="ghost" className="mt-2" onClick={() => setIsCreateOpen(true)}>
              Create a group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <span className="text-xs text-muted-foreground capitalize">{group.category}</span>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                )}
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {group.group_members.length} member(s) · {group.currency}
                </div>
                <Button variant="ghost" size="sm" asChild className="mt-2 h-7 gap-1 text-xs">
                  <Link href={`/expenses/${group.id}`}>
                    View expenses <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Expense Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Group Name *</Label>
              <Input
                placeholder="e.g. Tokyo Trip, Apartment"
                value={newGroup.name}
                onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="Optional"
                value={newGroup.description}
                onChange={(e) => setNewGroup((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select
                  value={newGroup.currency}
                  onValueChange={(v) => setNewGroup((p) => ({ ...p, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={newGroup.category}
                  onValueChange={(v) => setNewGroup((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['general', 'trip', 'home', 'couple', 'work'].map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
