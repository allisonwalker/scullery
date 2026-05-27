'use client'

import { useState } from 'react'
import type { PlanSlot, Recipe } from '@/types'
import { MEAL_TYPE_COLORS, MEAL_TYPE_LABELS, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { usePlannerStore } from '@/store/plannerStore'
import { createClient } from '@/lib/supabase/client'

interface MealCardProps {
  slot: PlanSlot
}

export default function MealCard({ slot }: MealCardProps) {
  const [hovered, setHovered] = useState(false)
  const { updateSlot, openSlideOver, openSwapSheet } = usePlannerStore()

  const recipe = slot.recipe as Recipe | null | undefined

  async function toggleLock() {
    const supabase = createClient()
    const newLocked = !slot.is_locked
    await supabase
      .from('plan_slots')
      .update({ is_locked: newLocked })
      .eq('id', slot.id)
    updateSlot(slot.id, { is_locked: newLocked })
  }

  async function removeSlot() {
    const supabase = createClient()
    await supabase.from('plan_slots').delete().eq('id', slot.id)
    usePlannerStore.getState().removeSlot(slot.id)
  }

  if (!recipe) {
    return (
      <button
        onClick={() => openSwapSheet(slot)}
        className="w-full text-left border border-dashed border-gray-300 rounded-lg px-3 py-2.5
                   text-sm text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors"
      >
        Empty slot — choose recipe
      </button>
    )
  }

  return (
    <div
      className={cn(
        'card px-3 py-2.5 relative group cursor-pointer transition-all',
        slot.is_locked && 'border-amber-300 bg-amber-50/40',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openSlideOver(recipe)}
    >
      {/* Hover action buttons */}
      <div
        className={cn(
          'absolute top-2 right-2 flex items-center gap-1 transition-opacity',
          hovered || slot.is_locked ? 'opacity-100' : 'opacity-0',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title={slot.is_locked ? 'Unlock' : 'Lock'}
          onClick={toggleLock}
          className={cn(
            'w-6 h-6 rounded flex items-center justify-center text-xs transition-colors',
            slot.is_locked
              ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
              : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50',
          )}
        >
          {slot.is_locked ? '🔒' : '🔓'}
        </button>
        {!slot.is_locked && (
          <button
            title="Swap recipe"
            onClick={() => openSwapSheet(slot)}
            className="w-6 h-6 rounded flex items-center justify-center text-xs text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            ↺
          </button>
        )}
      </div>

      {/* Meal type tag */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded',
            MEAL_TYPE_COLORS[slot.meal_type],
          )}
        >
          {MEAL_TYPE_LABELS[slot.meal_type]}
        </span>
        {recipe.is_from_library ? (
          <Badge variant="library" className="text-[10px]">library</Badge>
        ) : (
          <Badge variant="new" className="text-[10px]">new</Badge>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-gray-900 leading-snug pr-10 line-clamp-2">
        {recipe.title}
      </p>

      {/* Cook time */}
      {recipe.cook_time_minutes && (
        <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
          <span>⏱</span>
          {recipe.cook_time_minutes} min
        </p>
      )}
    </div>
  )
}
