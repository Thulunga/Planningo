'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  AlertTriangle,
  LayoutList,
  CalendarClock,
  Link2,
  CheckSquare,
  CalendarIcon,
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@planningo/ui'
import {
  createPlannerEntry,
  updatePlannerEntry,
  deletePlannerEntry,
  restorePlannerEntry,
} from '@/lib/actions/planner'
import type { Tables } from '@planningo/database'
import { FeedbackCta } from '@/components/feedback/feedback-cta'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 64 // px per hour
const BLOCK_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4',
]

type ViewMode = 'timeline' | 'list'
type LinkOption = { id: string; title: string }
type Entry = Tables<'planner_entries'>

interface PlannerClientProps {
  initialEntries: Entry[]
  initialDate: string
  linkableTodos: LinkOption[]
  linkableEvents: LinkOption[]
}

interface FormState {
  title: string
  notes: string
  start_time: string
  end_time: string
  color: string
  link_kind: 'none' | 'todo' | 'event'
  link_id: string
}

const EMPTY_FORM: FormState = {
  title: '',
  notes: '',
  start_time: '09:00',
  end_time: '10:00',
  color: BLOCK_COLORS[0]!,
  link_kind: 'none',
  link_id: '',
}

// ───────────────────────── helpers ─────────────────────────

function toMinutes(t: string) {
  const [h = '0', m = '0'] = t.split(':')
  return Number(h) * 60 + Number(m)
}

function minutesToLabel(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function formatTime12(t: string) {
  const m = toMinutes(t)
  const h24 = Math.floor(m / 60)
  const mm = (m % 60).toString().padStart(2, '0')
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${mm} ${period}`
}

function entryHasOverlap(target: Entry, all: Entry[]) {
  const ts = toMinutes(target.start_time)
  const te = toMinutes(target.end_time)
  return all.some((e) => {
    if (e.id === target.id) return false
    const es = toMinutes(e.start_time)
    const ee = toMinutes(e.end_time)
    return ts < ee && te > es
  })
}

// ───────────────────────── component ─────────────────────────

export function PlannerClient({
  initialEntries,
  initialDate,
  linkableTodos,
  linkableEvents,
}: PlannerClientProps) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [date, setDate] = useState(initialDate)
  const [view, setView] = useState<ViewMode>('timeline')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()
  const timelineRef = useRef<HTMLDivElement>(null)

  // Keep entries in sync if the server-rendered list changes (e.g. after revalidate)
  useEffect(() => {
    setEntries(initialEntries)
  }, [initialEntries])

  // Auto-scroll the timeline to the current hour on first paint
  useEffect(() => {
    if (view !== 'timeline' || !timelineRef.current) return
    const now = new Date()
    const target = (now.getHours() - 1) * HOUR_HEIGHT
    timelineRef.current.scrollTop = Math.max(0, target)
  }, [view, date])

  const isToday = date === format(new Date(), 'yyyy-MM-dd')

  // Sorted + overlap-tagged
  const decorated = useMemo(() => {
    const sorted = [...entries].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    )
    return sorted.map((e) => ({
      entry: e,
      hasOverlap: entryHasOverlap(e, sorted),
      durationMin: toMinutes(e.end_time) - toMinutes(e.start_time),
    }))
  }, [entries])

  const totalScheduledMin = useMemo(
    () => decorated.reduce((acc, d) => acc + d.durationMin, 0),
    [decorated]
  )
  const overlapCount = decorated.filter((d) => d.hasOverlap).length

  // ───────────────────────── nav ─────────────────────────

  function navigateDate(direction: 'prev' | 'next') {
    const current = parseISO(date)
    const newDate = direction === 'prev' ? subDays(current, 1) : addDays(current, 1)
    const dateStr = format(newDate, 'yyyy-MM-dd')
    setDate(dateStr)
    router.push(`/planner?date=${dateStr}`)
  }

  function goToToday() {
    const today = format(new Date(), 'yyyy-MM-dd')
    setDate(today)
    router.push('/planner')
  }

  // ───────────────────────── form open/close ─────────────────────────

  function openCreate(prefill?: Partial<FormState>) {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, ...prefill })
    setFormError(null)
    setIsOpen(true)
  }

  function openEdit(entry: Entry) {
    setEditingId(entry.id)
    setForm({
      title: entry.title,
      notes: entry.notes ?? '',
      start_time: entry.start_time.slice(0, 5),
      end_time: entry.end_time.slice(0, 5),
      color: entry.color,
      link_kind: entry.todo_id ? 'todo' : entry.event_id ? 'event' : 'none',
      link_id: entry.todo_id ?? entry.event_id ?? '',
    })
    setFormError(null)
    setIsOpen(true)
  }

  // ───────────────────────── save ─────────────────────────

  async function handleSave() {
    const title = form.title.trim()
    if (!title) {
      setFormError('Title is required')
      return
    }
    if (form.start_time >= form.end_time) {
      setFormError('End time must be after start time')
      return
    }
    setFormError(null)
    setSaving(true)

    const payload = {
      plan_date: date,
      title,
      notes: form.notes.trim() || null,
      start_time: form.start_time,
      end_time: form.end_time,
      color: form.color,
      todo_id: form.link_kind === 'todo' && form.link_id ? form.link_id : null,
      event_id: form.link_kind === 'event' && form.link_id ? form.link_id : null,
    }

    const result = editingId
      ? await updatePlannerEntry(editingId, payload)
      : await createPlannerEntry(payload)
    setSaving(false)

    if (result.error) {
      setFormError(result.error)
      return
    }

    toast.success(editingId ? 'Block updated' : 'Time block added')
    setIsOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)

    // Optimistic local update
    if (result.entry) {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === result.entry!.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = result.entry!
          return next
        }
        return [...prev, result.entry!]
      })
    }
    startTransition(() => router.refresh())
  }

  // ───────────────────────── delete + undo ─────────────────────────

  function handleDelete(entry: Entry) {
    // Optimistic remove
    setEntries((prev) => prev.filter((e) => e.id !== entry.id))

    startTransition(async () => {
      const result = await deletePlannerEntry(entry.id)
      if (result.error) {
        // Revert
        setEntries((prev) => [...prev, entry])
        toast.error(result.error)
        return
      }

      toast.success('Block removed', {
        action: {
          label: 'Undo',
          onClick: async () => {
            const restored = await restorePlannerEntry({
              id: entry.id,
              plan_date: entry.plan_date,
              title: entry.title,
              notes: entry.notes,
              start_time: entry.start_time,
              end_time: entry.end_time,
              color: entry.color,
              todo_id: entry.todo_id,
              event_id: entry.event_id,
            })
            if (restored.error) {
              toast.error(restored.error)
              return
            }
            if (restored.entry) {
              setEntries((prev) => [...prev, restored.entry!])
            }
            toast.success('Block restored')
            router.refresh()
          },
        },
      })
    })
  }

  // ───────────────────────── timeline click-to-create ─────────────────────────

  function handleTimelineGutterClick(hour: number) {
    const start = `${hour.toString().padStart(2, '0')}:00`
    const end = `${(hour + 1).toString().padStart(2, '0')}:00`
    openCreate({ start_time: start, end_time: end })
  }

  // ───────────────────────── render ─────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Day Planner</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateDate('prev')}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={isToday ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateDate('next')}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <Button
              variant={view === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('timeline')}
              aria-label="Timeline view"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>

          <Button
            onClick={() => openCreate()}
            className="gap-2"
            aria-label="Add time block"
          >
            <Plus className="h-4 w-4" />
            Add Block
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      {decorated.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1">
            {decorated.length} block{decorated.length === 1 ? '' : 's'}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1">
            {minutesToLabel(totalScheduledMin)} scheduled
          </span>
          {overlapCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-500">
              <AlertTriangle className="h-3 w-3" />
              {overlapCount} overlap{overlapCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      {/* View body */}
      {view === 'timeline' ? (
        <Card>
          <CardContent className="p-0">
            <div
              ref={timelineRef}
              className="relative overflow-auto"
              style={{ maxHeight: 640 }}
            >
              <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
                {/* Hour rows */}
                {HOURS.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => handleTimelineGutterClick(hour)}
                    aria-label={`Add block at ${hour}:00`}
                    className="group absolute left-0 right-0 flex items-start border-t border-border/40 hover:bg-accent/30 focus:bg-accent/30 focus:outline-none"
                    style={{ top: `${hour * HOUR_HEIGHT}px`, height: HOUR_HEIGHT }}
                  >
                    <span className="w-14 shrink-0 py-1 pl-3 text-xs font-medium text-muted-foreground">
                      {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                    </span>
                    <span className="ml-auto pr-3 pt-1 text-[10px] uppercase tracking-wide text-muted-foreground/0 transition-opacity group-hover:text-muted-foreground/60 group-focus:text-muted-foreground/60">
                      + Add
                    </span>
                  </button>
                ))}

                {/* Current time line */}
                {isToday && (() => {
                  const now = new Date()
                  const top = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT
                  return (
                    <div
                      className="pointer-events-none absolute left-14 right-0 z-20 flex items-center"
                      style={{ top }}
                    >
                      <div className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-500/30" />
                      <div className="h-px flex-1 bg-red-500" />
                    </div>
                  )
                })()}

                {/* Blocks */}
                {decorated.map(({ entry, hasOverlap }) => {
                  const top = (toMinutes(entry.start_time) / 60) * HOUR_HEIGHT
                  const height = Math.max(
                    ((toMinutes(entry.end_time) - toMinutes(entry.start_time)) / 60) * HOUR_HEIGHT,
                    32
                  )
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'absolute left-16 right-3 z-10 overflow-hidden rounded-md text-white shadow-sm transition-shadow hover:shadow-md',
                        hasOverlap && 'ring-2 ring-amber-400 ring-offset-1 ring-offset-background'
                      )}
                      style={{ top, height, backgroundColor: entry.color }}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        className="block h-full w-full px-2 py-1 text-left"
                        aria-label={`Edit ${entry.title}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{entry.title}</p>
                            <p className="text-[10px] opacity-90">
                              {formatTime12(entry.start_time)} – {formatTime12(entry.end_time)}
                            </p>
                            {height > 60 && entry.notes && (
                              <p className="mt-0.5 line-clamp-2 text-[10px] opacity-80">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                      <BlockMenu
                        entry={entry}
                        onEdit={() => openEdit(entry)}
                        onDelete={() => handleDelete(entry)}
                        floating
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ListView
          decorated={decorated}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAdd={() => openCreate()}
        />
      )}

      {decorated.length === 0 && view === 'timeline' && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <CalendarClock className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">No blocks planned for this day</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click any hour or use Add Block to start planning.
          </p>
          <Button onClick={() => openCreate()} className="mt-4 gap-2" size="sm">
            <Plus className="h-4 w-4" />
            Add your first block
          </Button>
        </div>
      )}

      <FeedbackCta
        heading="Tell us about Day Planner."
        description="Report timeline bugs, suggest planning features, or share ideas for better daily flow."
      />

      {/* Create / Edit Dialog */}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) {
            setEditingId(null)
            setFormError(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Time Block' : 'Add Time Block'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="planner-title">Title *</Label>
              <Input
                id="planner-title"
                placeholder="What are you working on?"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="planner-start">Start</Label>
                <Input
                  id="planner-start"
                  type="time"
                  step={300}
                  value={form.start_time}
                  onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="planner-end">End</Label>
                <Input
                  id="planner-end"
                  type="time"
                  step={300}
                  value={form.end_time}
                  onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                />
              </div>
            </div>

            {form.start_time && form.end_time && form.start_time < form.end_time && (
              <p className="text-xs text-muted-foreground">
                Duration: {minutesToLabel(toMinutes(form.end_time) - toMinutes(form.start_time))}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="planner-notes">Notes</Label>
              <Textarea
                id="planner-notes"
                placeholder="Optional notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {BLOCK_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Color ${color}`}
                    className={cn(
                      'h-7 w-7 rounded-full transition-transform hover:scale-110',
                      form.color === color &&
                        'ring-2 ring-white ring-offset-1 ring-offset-background scale-110'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm((p) => ({ ...p, color }))}
                  />
                ))}
              </div>
            </div>

            {/* Link to todo / event */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Link to (optional)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Select
                  value={form.link_kind}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      link_kind: v as FormState['link_kind'],
                      link_id: '',
                    }))
                  }
                >
                  <SelectTrigger aria-label="Link type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
                <div className="col-span-2">
                  {form.link_kind === 'todo' && (
                    <Select
                      value={form.link_id}
                      onValueChange={(v) => setForm((p) => ({ ...p, link_id: v }))}
                    >
                      <SelectTrigger aria-label="Choose todo">
                        <SelectValue placeholder="Choose todo" />
                      </SelectTrigger>
                      <SelectContent>
                        {linkableTodos.length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No open todos
                          </div>
                        ) : (
                          linkableTodos.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  {form.link_kind === 'event' && (
                    <Select
                      value={form.link_id}
                      onValueChange={(v) => setForm((p) => ({ ...p, link_id: v }))}
                    >
                      <SelectTrigger aria-label="Choose event">
                        <SelectValue placeholder="Choose event" />
                      </SelectTrigger>
                      <SelectContent>
                        {linkableEvents.length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No events today
                          </div>
                        ) : (
                          linkableEvents.map((ev) => (
                            <SelectItem key={ev.id} value={ev.id}>
                              {ev.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Save Changes' : 'Add Block'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ───────────────────────── subcomponents ─────────────────────────

function BlockMenu({
  entry,
  onEdit,
  onDelete,
  floating,
}: {
  entry: Entry
  onEdit: () => void
  onDelete: () => void
  floating?: boolean
}) {
  return (
    <div
      className={cn(
        floating && 'absolute right-1 top-1 z-10'
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
              floating
                ? 'bg-black/20 text-white hover:bg-black/40'
                : 'text-muted-foreground hover:bg-accent'
            )}
            aria-label={`Actions for ${entry.title}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function ListView({
  decorated,
  onEdit,
  onDelete,
  onAdd,
}: {
  decorated: { entry: Entry; hasOverlap: boolean; durationMin: number }[]
  onEdit: (entry: Entry) => void
  onDelete: (entry: Entry) => void
  onAdd: () => void
}) {
  if (decorated.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <LayoutList className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
        <p className="text-sm font-medium">No blocks for this day</p>
        <Button onClick={onAdd} size="sm" className="mt-3 gap-2">
          <Plus className="h-4 w-4" />
          Add block
        </Button>
      </div>
    )
  }

  // Group by part of day
  const groups: Record<'Morning' | 'Afternoon' | 'Evening', typeof decorated> = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  }
  decorated.forEach((d) => {
    const h = toMinutes(d.entry.start_time) / 60
    if (h < 12) groups.Morning.push(d)
    else if (h < 17) groups.Afternoon.push(d)
    else groups.Evening.push(d)
  })

  return (
    <div className="space-y-5">
      {(Object.keys(groups) as Array<keyof typeof groups>).map((label) =>
        groups[label].length === 0 ? null : (
          <section key={label} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </h2>
            <ul className="space-y-2">
              {groups[label].map(({ entry, hasOverlap, durationMin }) => (
                <li
                  key={entry.id}
                  className={cn(
                    'flex items-stretch gap-3 rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm',
                    hasOverlap && 'border-amber-400/60'
                  )}
                >
                  <div
                    className="w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    className="flex-1 text-left"
                    aria-label={`Edit ${entry.title}`}
                  >
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTime12(entry.start_time)} – {formatTime12(entry.end_time)} ·{' '}
                      {minutesToLabel(durationMin)}
                    </p>
                    {entry.notes && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                        {entry.notes}
                      </p>
                    )}
                    {(entry.todo_id || entry.event_id) && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {entry.todo_id ? (
                          <CheckSquare className="h-3 w-3" />
                        ) : (
                          <CalendarIcon className="h-3 w-3" />
                        )}
                        Linked
                      </span>
                    )}
                    {hasOverlap && (
                      <span className="mt-1.5 ml-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-500">
                        <AlertTriangle className="h-3 w-3" />
                        Overlaps
                      </span>
                    )}
                  </button>
                  <BlockMenu
                    entry={entry}
                    onEdit={() => onEdit(entry)}
                    onDelete={() => onDelete(entry)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </div>
  )
}
