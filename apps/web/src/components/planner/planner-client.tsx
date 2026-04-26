'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react'
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
import { createPlannerEntry, deletePlannerEntry } from '@/lib/actions/planner'
import type { Tables } from '@planningo/database'
import { FeedbackCta } from '@/components/feedback/feedback-cta'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const BLOCK_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4',
]

interface PlannerClientProps {
  initialEntries: Tables<'planner_entries'>[]
  initialDate: string
}

export function PlannerClient({ initialEntries, initialDate }: PlannerClientProps) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [date, setDate] = useState(initialDate)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  const [newEntry, setNewEntry] = useState({
    title: '',
    notes: '',
    start_time: '09:00',
    end_time: '10:00',
    color: BLOCK_COLORS[0]!,
  })

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

  async function handleCreate() {
    if (!newEntry.title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    const result = await createPlannerEntry({
      plan_date: date,
      title: newEntry.title.trim(),
      notes: newEntry.notes || null,
      start_time: newEntry.start_time,
      end_time: newEntry.end_time,
      color: newEntry.color,
    })
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Time block added')
      setIsCreateOpen(false)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePlannerEntry(id)
      if (result.error) toast.error(result.error)
      else {
        setEntries((prev) => prev.filter((e) => e.id !== id))
        toast.success('Block removed')
      }
    })
  }

  // Calculate position/height for time grid
  function getBlockStyle(entry: Tables<'planner_entries'>) {
    const [sh = 0, sm = 0] = entry.start_time.split(':').map(Number)
    const [eh = 0, em = 0] = entry.end_time.split(':').map(Number)
    const startMinutes = (sh ?? 0) * 60 + (sm ?? 0)
    const endMinutes = (eh ?? 0) * 60 + (em ?? 0)
    const top = (startMinutes / 60) * 64 // 64px per hour
    const height = Math.max(((endMinutes - startMinutes) / 60) * 64, 32)
    return { top, height }
  }

  const isToday = date === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Day Planner</h1>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isToday ? 'default' : 'outline'}
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreateOpen(true)} className="w-full gap-2 sm:ml-2 sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Block
          </Button>
        </div>
      </div>

      {/* Time grid */}
      <Card>
        <CardContent className="p-0">
          <div className="relative overflow-auto" style={{ maxHeight: 600 }}>
            <div className="relative" style={{ height: `${24 * 64}px` }}>
              {/* Hour lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-start border-t border-border/50"
                  style={{ top: `${hour * 64}px`, height: 64 }}
                >
                  <span className="w-14 shrink-0 py-1 pl-3 text-xs text-muted-foreground">
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </span>
                </div>
              ))}

              {/* Current time indicator */}
              {isToday && (() => {
                const now = new Date()
                const minutesFromMidnight = now.getHours() * 60 + now.getMinutes()
                const top = (minutesFromMidnight / 60) * 64
                return (
                  <div
                    className="absolute left-14 right-0 z-20 flex items-center"
                    style={{ top }}
                  >
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="h-px flex-1 bg-primary" />
                  </div>
                )
              })()}

              {/* Entry blocks */}
              {entries.map((entry) => {
                const { top, height } = getBlockStyle(entry)
                return (
                  <div
                    key={entry.id}
                    className="absolute left-16 right-3 z-10 overflow-hidden rounded-md px-2 py-1 text-white"
                    style={{
                      top,
                      height,
                      backgroundColor: entry.color,
                    }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{entry.title}</p>
                        <p className="text-xs opacity-75">
                          {entry.start_time}-{entry.end_time}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={isPending}
                        className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-black/20 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {entries.length === 0 && (
        <div className="mt-2 text-center text-sm text-muted-foreground">
          No blocks planned for this day.{' '}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="text-primary hover:underline"
          >
            Add one
          </button>
        </div>
      )}

      <FeedbackCta
        heading="Tell us about Day Planner."
        description="Report timeline bugs, suggest planning features, or share ideas for better daily flow."
      />

      {/* Create Block Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Time Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                placeholder="What are you working on?"
                value={newEntry.title}
                onChange={(e) => setNewEntry((p) => ({ ...p, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newEntry.start_time}
                  onChange={(e) => setNewEntry((p) => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEntry.end_time}
                  onChange={(e) => setNewEntry((p) => ({ ...p, end_time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes"
                rows={2}
                value={newEntry.notes}
                onChange={(e) => setNewEntry((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2">
                {BLOCK_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                      newEntry.color === color ? 'ring-2 ring-white ring-offset-1 ring-offset-background scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewEntry((p) => ({ ...p, color }))}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Block
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
