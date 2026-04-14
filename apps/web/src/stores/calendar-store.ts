import { create } from 'zustand'

type CalendarView = 'month' | 'week' | 'day' | 'agenda'

interface CalendarState {
  view: CalendarView
  currentDate: Date
  selectedEventId: string | null
  setView: (view: CalendarView) => void
  setCurrentDate: (date: Date) => void
  setSelectedEventId: (id: string | null) => void
  goToToday: () => void
  goToPrev: () => void
  goToNext: () => void
}

export const useCalendarStore = create<CalendarState>()((set, get) => ({
  view: 'month',
  currentDate: new Date(),
  selectedEventId: null,
  setView: (view) => set({ view }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  goToToday: () => set({ currentDate: new Date() }),
  goToPrev: () => {
    // Navigation logic handled by react-big-calendar's built-in toolbar
    set((state) => ({ currentDate: new Date(state.currentDate) }))
  },
  goToNext: () => {
    set((state) => ({ currentDate: new Date(state.currentDate) }))
  },
}))
