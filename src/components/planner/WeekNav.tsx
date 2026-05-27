'use client'

import { useRouter } from 'next/navigation'
import { addWeeks, formatWeekStart, weekLabel } from '@/lib/utils'

interface WeekNavProps {
  weekStart: Date
}

export default function WeekNav({ weekStart }: WeekNavProps) {
  const router = useRouter()

  function navigate(delta: number) {
    const next = addWeeks(weekStart, delta)
    router.push(`/planner/${formatWeekStart(next)}`)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(-1)}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors"
      >
        ‹
      </button>
      <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
        {weekLabel(weekStart)}
      </span>
      <button
        onClick={() => navigate(1)}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 transition-colors"
      >
        ›
      </button>
    </div>
  )
}
