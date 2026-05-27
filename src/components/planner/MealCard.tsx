'use client'

import { useState } from 'react'
import { Lock, LockOpen, RefreshCw, X, Clock } from 'lucide-react'
import type { PlanSlot, Recipe } from '@/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { RecipePlaceholder } from '@/components/ui/RecipePlaceholder'
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
    await supabase.from('plan_slots').update({ is_locked: newLocked }).eq('id', slot.id)
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
        className="w-full text-left border border-dashed border-gray-200 rounded-lg px-3 py-2.5
                   text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors"
      >
        + choose recipe
      </button>
    )
  }

  const showActions = hovered || slot.is_locked

  return (
    <div
      className={cn(
        'card overflow-hidden relative group cursor-pointer transition-all hover:shadow-sm',
        slot.is_locked && 'ring-1 ring-amber-300 bg-amber-50/30',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => openSlideOver(recipe)}
    >
      {/* Photo or placeholder */}
      {recipe.photo_url ? (
        <img
          src={recipe.photo_url}
          alt={recipe.title}
          className="w-full h-16 object-cover"
        />
      ) : (
        <RecipePlaceholder className="w-full h-16" />
      )}

      {/* Hover action buttons — float over the image/strip */}
      <div
        className={cn(
          'absolute top-1 right-1 flex items-center gap-0.5 transition-opacity',
          showActions ? 'opacity-100' : 'opacity-0',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          title={slot.is_locked ? 'Unlock' : 'Lock'}
          onClick={toggleLock}
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center transition-colors',
            recipe.photo_url ? 'bg-black/30 text-white hover:bg-black/50' : '',
            !recipe.photo_url && slot.is_locked  ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' : '',
            !recipe.photo_url && !slot.is_locked ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' : '',
          )}
        >
          {slot.is_locked
            ? <Lock size={11} />
            : <LockOpen size={11} />
          }
        </button>
        {!slot.is_locked && (
          <>
            <button
              title="Swap recipe"
              onClick={() => openSwapSheet(slot)}
              className={cn(
                'w-5 h-5 rounded flex items-center justify-center transition-colors',
                recipe.photo_url
                  ? 'bg-black/30 text-white hover:bg-black/50'
                  : 'text-gray-400 hover:text-brand-600 hover:bg-brand-50',
              )}
            >
              <RefreshCw size={11} />
            </button>
            <button
              title="Remove"
              onClick={removeSlot}
              className={cn(
                'w-5 h-5 rounded flex items-center justify-center transition-colors',
                recipe.photo_url
                  ? 'bg-black/30 text-white hover:bg-red-500/80'
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50',
              )}
            >
              <X size={11} />
            </button>
          </>
        )}
      </div>

      {/* Card content */}
      <div className="px-2.5 py-2">
        {/* Badges */}
        <div className="flex items-center gap-1 mb-1">
          {recipe.is_from_library ? (
            <Badge variant="library" className="text-[9px] px-1.5 py-0">library</Badge>
          ) : (
            <Badge variant="new" className="text-[9px] px-1.5 py-0">new</Badge>
          )}
          {slot.is_locked && (
            <Lock size={9} className="text-amber-500" />
          )}
        </div>

        {/* Title */}
        <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
          {recipe.title}
        </p>

        {/* Cook time */}
        {recipe.cook_time_minutes && (
          <p className="mt-1 text-[10px] text-gray-400 flex items-center gap-1">
            <Clock size={9} />
            {recipe.cook_time_minutes} min
          </p>
        )}
      </div>
    </div>
  )
}
