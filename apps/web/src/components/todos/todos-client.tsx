'use client'

import { useState, useTransition, useOptimistic, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, isToday, isPast, parseISO, startOfDay } from 'date-fns'
import { toast } from 'sonner'
import {
  Plus,
  CheckCircle2,
  Circle,
  CircleDashed,
  Tag,
  Calendar,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  XCircle,
  PlayCircle,
  RotateCcw,
  AlertTriangle,
  Inbox,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@planningo/ui'
import {
  createTodo,
  updateTodo,
  deleteTodo,
  restoreTodo,
  toggleTodoStatus,
  setTodoStatus,
} from '@/lib/actions/todos'
import type { Tables } from '@planningo/database'
import { FeedbackCta } from '@/components/feedback/feedback-cta'

type Todo = Tables<'todos'>
type Priority = 'low' | 'medium' | 'high' | 'urgent'
type Status = 'todo' | 'in_progress' | 'done' | 'cancelled'

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  medium: { label: 'Medium', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  high: { label: 'High', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  urgent: { label: 'Urgent', className: 'bg-red-500/15 text-red-300 border-red-500/30' },
}

const statusLabels: Record<Status, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

const VIEWS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'todo', label: 'Todo' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
  { id: 'cancelled', label: 'Cancelled' },
] as const

type View = (typeof VIEWS)[number]['id']

interface TodosClientProps {
  todos: Todo[]
  view: string
}

interface FormState {
  title: string
  description: string
  priority: Priority
  status: Status
  due_date: string
  tags: string
}

const emptyForm: FormState = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  due_date: '',
  tags: '',
}

function todoMatchesView(t: Todo, view: View): boolean {
  if (view === 'all') return true
  if (view === 'today') {
    return !!t.due_date && isToday(parseISO(t.due_date))
  }
  if (view === 'overdue') {
    if (!t.due_date) return false
    if (t.status === 'done' || t.status === 'cancelled') return false
    const due = parseISO(t.due_date)
    return isPast(due) && !isToday(due)
  }
  return t.status === view
}

export function TodosClient({ todos, view: viewProp }: TodosClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const activeView = (VIEWS.some((v) => v.id === viewProp) ? viewProp : 'all') as View

  type OptimisticAction =
    | { type: 'set-status'; id: string; status: Status }
    | { type: 'delete'; id: string }
    | { type: 'restore'; todo: Todo }
    | { type: 'update'; todo: Todo }

  const [optimisticTodos, dispatchOptimistic] = useOptimistic(
    todos,
    (state, action: OptimisticAction): Todo[] => {
      switch (action.type) {
        case 'set-status':
          return state.map((t) =>
            t.id === action.id
              ? {
                  ...t,
                  status: action.status,
                  completed_at: action.status === 'done' ? new Date().toISOString() : null,
                }
              : t,
          )
        case 'delete':
          return state.filter((t) => t.id !== action.id)
        case 'restore':
          return state.some((t) => t.id === action.todo.id) ? state : [action.todo, ...state]
        case 'update':
          return state.map((t) => (t.id === action.todo.id ? { ...t, ...action.todo } : t))
        default:
          return state
      }
    },
  )

  // Filter-aware view: apply client-side view filtering
  const visibleTodos = useMemo(
    () => optimisticTodos.filter((t) => todoMatchesView(t, activeView)),
    [optimisticTodos, activeView],
  )

  // Counts per view (computed off the full server-fetched list when 'all' view; otherwise just the visible count is shown)
  const totalCount = optimisticTodos.length
  const visibleCount = visibleTodos.length

  function changeView(next: View) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'all') params.delete('view')
    else params.set('view', next)
    router.push(`/todos${params.toString() ? `?${params}` : ''}`)
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(todo: Todo) {
    setEditingId(todo.id)
    setForm({
      title: todo.title,
      description: todo.description ?? '',
      priority: (todo.priority as Priority) ?? 'medium',
      status: (todo.status as Status) ?? 'todo',
      due_date: todo.due_date ? todo.due_date.slice(0, 10) : '',
      tags: (todo.tags ?? []).join(', '),
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    setSubmitting(true)
    const payload = {
      title: form.title.trim(),
      description: form.description || undefined,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
    const result = editingId
      ? await updateTodo(editingId, payload)
      : await createTodo(payload)
    setSubmitting(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(editingId ? 'Todo updated' : 'Todo created')
    setDialogOpen(false)
    setForm(emptyForm)
    setEditingId(null)
  }

  function handleToggleDone(todo: Todo) {
    const nextStatus: Status = todo.status === 'done' ? 'todo' : 'done'
    startTransition(async () => {
      dispatchOptimistic({ type: 'set-status', id: todo.id, status: nextStatus })
      const result = await toggleTodoStatus(todo.id, todo.status)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleStatusChange(todo: Todo, status: Status) {
    if (todo.status === status) return
    startTransition(async () => {
      dispatchOptimistic({ type: 'set-status', id: todo.id, status })
      const result = await setTodoStatus(todo.id, status)
      if (result?.error) toast.error(result.error)
      else toast.success(`Marked as ${statusLabels[status]}`)
    })
  }

  function handleDelete(todo: Todo) {
    startTransition(async () => {
      dispatchOptimistic({ type: 'delete', id: todo.id })
      const result = await deleteTodo(todo.id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Todo deleted', {
        action: {
          label: 'Undo',
          onClick: () => {
            startTransition(async () => {
              dispatchOptimistic({ type: 'restore', todo })
              const r = await restoreTodo(todo.id)
              if (r?.error) toast.error(r.error)
              else toast.success('Todo restored')
            })
          },
        },
      })
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Todos</h1>
          <p className="text-sm text-muted-foreground">
            {activeView === 'all'
              ? `${totalCount} ${totalCount === 1 ? 'item' : 'items'}`
              : `${visibleCount} of ${totalCount}`}
          </p>
        </div>
        <Button onClick={openCreate} className="w-full gap-2 sm:w-auto" aria-label="Create new todo">
          <Plus className="h-4 w-4" />
          New Todo
        </Button>
      </div>

      {/* Filter chips — horizontal scroll on mobile */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {VIEWS.map((v) => {
            const isActive = activeView === v.id
            return (
              <button
                key={v.id}
                onClick={() => changeView(v.id)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors min-h-[36px] ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                }`}
                aria-pressed={isActive}
                aria-label={`Filter by ${v.label}`}
              >
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Todo list */}
      {visibleTodos.length === 0 ? (
        <EmptyState view={activeView} onCreate={openCreate} />
      ) : (
        <div className="space-y-1.5">
          {visibleTodos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              isPending={isPending}
              onToggleDone={() => handleToggleDone(todo)}
              onStatusChange={(s) => handleStatusChange(todo, s)}
              onEdit={() => openEdit(todo)}
              onDelete={() => handleDelete(todo)}
            />
          ))}
        </div>
      )}

      <FeedbackCta
        heading="How can we improve Todos?"
        description="Log a bug, request a new workflow, or share ideas to make task tracking easier in this section."
      />

      {/* Create/Edit Todo Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Todo' : 'New Todo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="todo-title">Title *</Label>
              <Input
                id="todo-title"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="todo-desc">Description</Label>
              <Textarea
                id="todo-desc"
                placeholder="Add more details..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: v as Priority }))}
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
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v as Status }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="todo-due">Due Date</Label>
              <Input
                id="todo-due"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="todo-tags">Tags</Label>
              <Input
                id="todo-tags"
                placeholder="work, personal, urgent (comma-separated)"
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Save changes' : 'Create Todo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── */
/* Row                                                         */
/* ─────────────────────────────────────────────────────────── */

function TodoRow({
  todo,
  isPending,
  onToggleDone,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  todo: Todo
  isPending: boolean
  onToggleDone: () => void
  onStatusChange: (status: Status) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isDone = todo.status === 'done'
  const isCancelled = todo.status === 'cancelled'
  const isInProgress = todo.status === 'in_progress'

  const due = todo.due_date ? parseISO(todo.due_date) : null
  const isOverdue =
    !!due && !isDone && !isCancelled && isPast(startOfDay(due)) && !isToday(due)
  const isDueToday = !!due && isToday(due)

  const priority = (todo.priority as Priority) ?? 'medium'
  const showPriorityBadge = priority === 'high' || priority === 'urgent'

  return (
    <Card className={`transition-opacity ${isDone || isCancelled ? 'opacity-60' : ''}`}>
      <CardContent className="flex items-start gap-2 py-2.5 pr-1.5 pl-2.5 sm:gap-3 sm:py-3 sm:pl-3">
        <button
          onClick={onToggleDone}
          disabled={isPending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-accent active:bg-accent/80"
          aria-label={isDone ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`}
        >
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : isInProgress ? (
            <CircleDashed className="h-5 w-5 text-blue-400" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        <button
          onClick={onEdit}
          className="min-w-0 flex-1 cursor-pointer rounded-md px-1 py-0.5 text-left hover:bg-accent/40"
          aria-label={`Edit "${todo.title}"`}
        >
          <p
            className={`text-sm font-medium leading-snug ${
              isDone || isCancelled ? 'line-through text-muted-foreground' : ''
            }`}
          >
            {todo.title}
          </p>
          {todo.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {todo.description}
            </p>
          )}
          {(showPriorityBadge || due || (todo.tags && todo.tags.length > 0) || isCancelled || isInProgress) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {isInProgress && (
                <span className="rounded border border-blue-500/30 bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-300">
                  In Progress
                </span>
              )}
              {isCancelled && (
                <span className="rounded border border-slate-500/30 bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-300">
                  Cancelled
                </span>
              )}
              {showPriorityBadge && (
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${priorityConfig[priority].className}`}
                >
                  {priorityConfig[priority].label}
                </span>
              )}
              {due && (
                <span
                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
                    isOverdue
                      ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                      : isDueToday
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-muted-foreground'
                  }`}
                >
                  {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                  {format(due, 'MMM d')}
                </span>
              )}
              {todo.tags?.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-0.5 rounded border border-border/50 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
              {todo.tags && todo.tags.length > 3 && (
                <span className="text-[11px] text-muted-foreground">+{todo.tags.length - 3}</span>
              )}
            </div>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`More actions for "${todo.title}"`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {!isDone && (
              <DropdownMenuItem onClick={() => onStatusChange('done')}>
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                Mark as Done
              </DropdownMenuItem>
            )}
            {!isInProgress && !isDone && !isCancelled && (
              <DropdownMenuItem onClick={() => onStatusChange('in_progress')}>
                <PlayCircle className="mr-2 h-4 w-4 text-blue-400" />
                Mark In Progress
              </DropdownMenuItem>
            )}
            {(isDone || isCancelled) && (
              <DropdownMenuItem onClick={() => onStatusChange('todo')}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reopen
              </DropdownMenuItem>
            )}
            {!isCancelled && !isDone && (
              <DropdownMenuItem onClick={() => onStatusChange('cancelled')}>
                <XCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                Cancel Todo
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────────────────────────────────────── */
/* Empty states                                                */
/* ─────────────────────────────────────────────────────────── */

function EmptyState({ view, onCreate }: { view: View; onCreate: () => void }) {
  const config: Record<View, { icon: React.ElementType; title: string; subtitle: string; cta?: string }> = {
    all: {
      icon: Inbox,
      title: 'No todos yet',
      subtitle: 'Capture what you need to do — big or small.',
      cta: 'Create your first todo',
    },
    today: {
      icon: Calendar,
      title: 'Nothing due today',
      subtitle: 'Enjoy a clear plate, or add something for today.',
      cta: 'Add a todo for today',
    },
    overdue: {
      icon: CheckCircle2,
      title: "You're all caught up",
      subtitle: 'No overdue items. Great job staying on top of things.',
    },
    todo: {
      icon: Circle,
      title: 'No open todos',
      subtitle: 'Everything queued up has been started or finished.',
      cta: 'Add a new todo',
    },
    in_progress: {
      icon: CircleDashed,
      title: 'Nothing in progress',
      subtitle: 'Mark a todo as in progress to track active work here.',
    },
    done: {
      icon: CheckCircle2,
      title: 'No completed todos',
      subtitle: 'Finished items will show up here once you check them off.',
    },
    cancelled: {
      icon: XCircle,
      title: 'No cancelled todos',
      subtitle: 'Tasks you cancel will appear here.',
    },
  }
  const c = config[view]
  const Icon = c.icon
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="mb-3 h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm font-medium">{c.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{c.subtitle}</p>
        {c.cta && (
          <Button variant="ghost" className="mt-3" onClick={onCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            {c.cta}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

