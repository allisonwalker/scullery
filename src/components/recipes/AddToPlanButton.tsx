'use client'

import { useState, useRef, useEffect } from 'react'
import type { Recipe, MealType } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { getMondayOfWeek, formatWeekStart, DAYS, MEAL_TYPE_LABELS, cn } from '@/lib/utils'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const DEFAULT_PLAN_CONFIG = {
  breakfast: 2, lunch: 4, dinner: 5, snack: 0, library_ratio: 0.6,
}

/** Returns the current day's index in the Mon–Sun week (0 = Mon, 6 = Sun). */
function todayDayIndex() {
  const jsDay = new Date().getDay() // 0 = Sun, 1 = Mon, …
  return jsDay === 0 ? 6 : jsDay - 1
}

interface Props {
  recipe: Recipe
  /** 'sm' for card hover overlay; 'default' for full-size action buttons */
  size?: 'sm' | 'default'
}

export default function AddToPlanButton({ recipe, size = 'default' }: Props) {
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState(todayDayIndex)
  const [mealType, setMealType] = useState<MealType>(recipe.meal_type)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    setOpen((v) => !v)
  }

  async function add(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not signed in'); setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles').select('household_id').eq('id', user.id).single()
    if (!profile?.household_id) { setError('No household found'); setLoading(false); return }

    // Get or create this week's plan
    const weekStart = formatWeekStart(getMondayOfWeek(new Date()))
    let { data: plan } = await supabase
      .from('weekly_plans').select('id')
      .eq('household_id', profile.household_id)
      .eq('week_start', weekStart)
      .single()

    if (!plan) {
      const { data: created } = await supabase
        .from('weekly_plans')
        .insert({ household_id: profile.household_id, week_start: weekStart, config: DEFAULT_PLAN_CONFIG })
        .select().single()
      plan = created
    }

    if (!plan) { setError('Could not create plan'); setLoading(false); return }

    const { error: insertErr } = await supabase.from('plan_slots').insert({
      plan_id: plan.id,
      day_of_week: day,
      meal_type: mealType,
      recipe_id: recipe.id,
      is_locked: false,
      sort_order: 0,
    })

    if (insertErr) { setError('Failed to add to plan'); setLoading(false); return }

    setLoading(false)
    setDone(true)
    setTimeout(() => { setOpen(false); setDone(false) }, 1400)
  }

  // Popover opens upward for card overlays, downward for detail page
  const popoverPos = size === 'sm'
    ? 'bottom-full right-0 mb-2'
    : 'top-full right-0 mt-2'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className={cn(
          size === 'sm'
            ? 'text-xs px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:border-brand-400 hover:text-brand-700 transition-colors'
            : 'btn-secondary',
          done && 'border-brand-400 text-brand-700',
        )}
      >
        {done ? '✓ Added!' : '+ Add to plan'}
      </button>

      {open && !done && (
        <div
          className={cn(
            'absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-64',
            popoverPos,
          )}
        >
          <p className="text-xs font-semibold text-gray-700 mb-2">Day</p>
          <div className="flex gap-1 flex-wrap mb-4">
            {DAYS.map((d, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setDay(i) }}
                className={cn(
                  'text-xs px-2 py-1 rounded-full border transition-colors',
                  day === i
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'border-gray-200 text-gray-600 hover:border-brand-400',
                )}
              >
                {d}
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-gray-700 mb-2">Meal</p>
          <div className="flex gap-1 flex-wrap mb-4">
            {MEAL_TYPES.map((mt) => (
              <button
                key={mt}
                onClick={(e) => { e.stopPropagation(); setMealType(mt) }}
                className={cn(
                  'text-xs px-2 py-1 rounded-full border transition-colors',
                  mealType === mt
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'border-gray-200 text-gray-600 hover:border-brand-400',
                )}
              >
                {MEAL_TYPE_LABELS[mt]}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={add}
              disabled={loading}
              className="btn-primary flex-1 text-sm justify-center"
            >
              {loading ? 'Adding…' : 'Add to this week'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false) }}
              className="btn-ghost text-sm px-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
