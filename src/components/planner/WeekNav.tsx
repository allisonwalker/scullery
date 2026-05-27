'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
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
    <div className="flex items-center gap-1">
      <button
        onClick={() => navigate(-1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-semibold text-gray-800 min-w-[152px] text-center">
        {weekLabel(weekStart)}
      </span>
      <button
        onClick={() => navigate(1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
