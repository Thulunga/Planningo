'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Tag,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
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
  Textarea,
} from '@planningo/ui'
import { createTodo, updateTodo, deleteTodo, toggleTodoStatus } from '@/lib/actions/todos'
import type { Tables } from '@planningo/database'

const priorityConfig = {
  low: { label: 'Low', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  medium: { label: 'Medium', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  high: { label: 'High', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  urgent: { label: 'Urgent', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

const statusConfig = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

interface TodosClientProps {
  todos: Tables<'todos'>[]
}

export function TodosClient({ todos }: TodosClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // New todo form state
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    status: 'todo' as const,
    due_date: '',
    tags: '',
  })

  async function handleCreate() {
    if (!newTodo.title.trim()) {
      toast.error('Title is required')
      return
    }
    setCreating(true)
    const result = await createTodo({
      title: newTodo.title.trim(),
      description: newTodo.description || undefined,
      priority: newTodo.priority,
      status: newTodo.status,
      due_date: newTodo.due_date || null,
      tags: newTodo.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
    setCreating(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Todo created')
      setIsCreateOpen(false)
      setNewTodo({ title: '', description: '', priority: 'medium', status: 'todo', due_date: '', tags: '' })
    }
  }

  async function handleToggle(todo: Tables<'todos'>) {
    startTransition(async () => {
      const result = await toggleTodoStatus(todo.id, todo.status)
      if (result?.error) toast.error(result.error)
    })
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTodo(id)
      if (result?.error) toast.error(result.error)
      else toast.success('Todo deleted')
    })
  }

  const activeFilter = searchParams.get('status') ?? 'all'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Todos</h1>
          <p className="text-sm text-muted-foreground">{todos.length} items</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Todo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
          <button
            key={status}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              if (status === 'all') params.delete('status')
              else params.set('status', status)
              router.push(`/todos?${params.toString()}`)
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === status
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
            }`}
          >
            {status === 'all' ? 'All' : statusConfig[status]}
          </button>
        ))}
      </div>

      {/* Todo list */}
      {todos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No todos here</p>
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => setIsCreateOpen(true)}
            >
              Create your first todo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {todos.map((todo) => (
            <Card
              key={todo.id}
              className={`transition-opacity ${todo.status === 'done' ? 'opacity-60' : ''}`}
            >
              <CardContent className="flex items-start gap-3 py-3">
                <button
                  onClick={() => handleToggle(todo)}
                  disabled={isPending}
                  className="mt-0.5 shrink-0"
                >
                  {todo.status === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      todo.status === 'done' ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {todo.title}
                  </p>
                  {todo.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {todo.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-xs ${
                        priorityConfig[todo.priority].className
                      }`}
                    >
                      {priorityConfig[todo.priority].label}
                    </span>
                    {todo.due_date && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(todo.due_date), 'MMM d')}
                      </span>
                    )}
                    {todo.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-0.5 rounded border border-border/50 px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(todo.id)}
                  disabled={isPending}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Todo Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Todo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-title">Title *</Label>
              <Input
                id="new-title"
                placeholder="What needs to be done?"
                value={newTodo.title}
                onChange={(e) => setNewTodo((p) => ({ ...p, title: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-desc">Description</Label>
              <Textarea
                id="new-desc"
                placeholder="Add more details..."
                rows={2}
                value={newTodo.description}
                onChange={(e) => setNewTodo((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={newTodo.priority}
                  onValueChange={(v) => setNewTodo((p) => ({ ...p, priority: v as typeof newTodo.priority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-due">Due Date</Label>
                <Input
                  id="new-due"
                  type="date"
                  value={newTodo.due_date}
                  onChange={(e) => setNewTodo((p) => ({ ...p, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-tags">Tags</Label>
              <Input
                id="new-tags"
                placeholder="work, personal, urgent (comma-separated)"
                value={newTodo.tags}
                onChange={(e) => setNewTodo((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Todo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
