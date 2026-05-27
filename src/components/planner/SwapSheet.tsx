'use client'

import { useEffect, useState } from 'react'
import type { Recipe, PlanSlot } from '@/types'
import { usePlannerStore } from '@/store/plannerStore'
import { createClient } from '@/lib/supabase/client'
import { MEAL_TYPE_LABELS, cn } from '@/lib/utils'
import SlideOver from '@/components/ui/SlideOver'
import { MealTypeBadge } from '@/components/ui/Badge'
import StarRating from '@/components/ui/StarRating'

export default function SwapSheet({ householdId }: { householdId: string }) {
  const { swapTargetSlot, closeSwapSheet, updateSlot, addSlot, slots } = usePlannerStore()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const open = swapTargetSlot !== null

  useEffect(() => {
    if (!open || !swapTargetSlot) return
    setSearch('')
    setLoading(true)
    const supabase = createClient()

    supabase
      .from('recipes')
      .select('*')
      .eq('household_id', householdId)
      .eq('meal_type', swapTargetSlot.meal_type)
      .eq('is_from_library', true)
      .order('rating', { ascending: false })
      .then(({ data }) => {
        setRecipes(data ?? [])
        setLoading(false)
      })
  }, [open, swapTargetSlot?.id])

  async function pickRecipe(recipe: Recipe) {
    if (!swapTargetSlot) return
    const supabase = createClient()

    if (swapTargetSlot.recipe_id === null && swapTargetSlot.id.startsWith('new-')) {
      // This is a new slot (from "+ Add meal")
      const { data } = await supabase
        .from('plan_slots')
        .insert({
          plan_id: swapTargetSlot.plan_id,
          day_of_week: swapTargetSlot.day_of_week,
          meal_type: swapTargetSlot.meal_type,
          recipe_id: recipe.id,
          sort_order: slots.filter((s) => s.day_of_week === swapTargetSlot.day_of_week).length,
        })
        .select()
        .single()
      if (data) addSlot({ ...data, recipe })
    } else {
      // Updating existing slot
      await supabase
        .from('plan_slots')
        .update({ recipe_id: recipe.id })
        .eq('id', swapTargetSlot.id)
      updateSlot(swapTargetSlot.id, { recipe_id: recipe.id, recipe })
    }

    closeSwapSheet()
  }

  const filtered = recipes.filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()),
  )

  const title = swapTargetSlot
    ? `${swapTargetSlot.recipe_id ? 'Swap' : 'Add'} ${MEAL_TYPE_LABELS[swapTargetSlot.meal_type]}`
    : ''

  return (
    <SlideOver open={open} onClose={closeSwapSheet} title={title}>
      <div className="space-y-3">
        <input
          type="search"
          placeholder="Search recipes…"
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading && (
          <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No recipes found. Add some in the Recipe library.
          </p>
        )}

        <div className="space-y-2">
          {filtered.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => pickRecipe(recipe)}
              className={cn(
                'w-full text-left card px-3 py-2.5 hover:border-brand-400 hover:bg-brand-50 transition-all',
                swapTargetSlot?.recipe_id === recipe.id && 'border-brand-400 bg-brand-50',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{recipe.title}</p>
                  {recipe.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{recipe.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <MealTypeBadge type={recipe.meal_type} />
                    {recipe.cook_time_minutes && (
                      <span className="text-xs text-gray-400">⏱ {recipe.cook_time_minutes} min</span>
                    )}
                  </div>
                </div>
                {recipe.rating && <StarRating value={recipe.rating} readonly />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </SlideOver>
  )
}
