import type { MealType } from '@/types'

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatWeekStart(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseWeekStart(str: string): Date {
  return new Date(str + 'T00:00:00')
}

export function weekLabel(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const startDay = weekStart.getDate()
  const endDay = end.getDate()
  const year = end.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`
}

export function addWeeks(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n * 7)
  return d
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function dayDate(weekStart: Date, dayIndex: number): Date {
  const d = new Date(weekStart)
  d.setDate(d.getDate() + dayIndex)
  return d
}

export function isTodayColumn(weekStart: Date, dayIndex: number): boolean {
  const col = dayDate(weekStart, dayIndex)
  const today = new Date()
  return (
    col.getFullYear() === today.getFullYear() &&
    col.getMonth() === today.getMonth() &&
    col.getDate() === today.getDate()
  )
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: 'bg-teal-100 text-teal-800',
  lunch: 'bg-amber-100 text-amber-800',
  dinner: 'bg-purple-100 text-purple-800',
  snack: 'bg-gray-100 text-gray-600',
}

export const MEAL_TYPE_BORDER: Record<MealType, string> = {
  breakfast: 'border-teal-400',
  lunch: 'border-amber-400',
  dinner: 'border-purple-400',
  snack: 'border-gray-300',
}

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: '☀',
  lunch: '☁',
  dinner: '🌙',
  snack: '·',
}

export function currentSeason(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
