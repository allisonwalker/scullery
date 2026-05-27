'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WeeklyPlan, PlanSlot, Recipe, MealType, AiRecipeSuggestion } from '@/types'
import { usePlannerStore } from '@/store/plannerStore'
import { createClient } from '@/lib/supabase/client'
import { DAYS, dayDate, isTodayColumn, MEAL_TYPE_LABELS, cn, currentSeason } from '@/lib/utils'
import MealCard from './MealCard'
import SwapSheet from './SwapSheet'
import RecipeSlideOver from './RecipeSlideOver'
import SlideOver from '@/components/ui/SlideOver'
import ConfigBar from './ConfigBar'
import WeekNav from './WeekNav'
import Link from 'next/link'

interface PlannerGridProps {
  plan: WeeklyPlan
  slots: PlanSlot[]
  householdId: string
  weekStart: Date
  recentTitles: string[]
  preferences: string[]
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default function PlannerGrid({
  plan,
  slots: initialSlots,
  householdId,
  weekStart,
  recentTitles,
  preferences,
}: PlannerGridProps) {
  const {
    slots, setSlots, config, setConfig,
    openSwapSheet, isRegenerating, setRegenerating,
    previewSlots, startPreview, acceptPreviewSlot, rejectPreviewSlot, clearPreview,
    updateSlot, addSlot,
  } = usePlannerStore()
  const router = useRouter()
  const [promptText, setPromptText] = useState('')
  const [previewSuggestion, setPreviewSuggestion] = useState<AiRecipeSuggestion | null>(null)

  useEffect(() => {
    setSlots(initialSlots)
    setConfig(plan.config)
  }, [plan.id])

  // Group slots by day
  const byDay: Record<number, PlanSlot[]> = {}
  for (let d = 0; d < 7; d++) byDay[d] = []
  for (const slot of slots) {
    byDay[slot.day_of_week] = [...(byDay[slot.day_of_week] ?? []), slot]
  }

  const totalMeals = slots.filter((s) => s.recipe_id).length
  const lockedCount = slots.filter((s) => s.is_locked).length
  const newCount = slots.filter((s) => (s.recipe as Recipe | null)?.is_from_library === false).length

  async function regenerate() {
    if (isRegenerating) return
    setRegenerating(true)
    const supabase = createClient()

    // Determine how many slots of each type to create
    const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
    const lockedSlots = slots.filter((s) => s.is_locked)

    // Count locked slots per type
    const lockedPerType: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
    for (const s of lockedSlots) lockedPerType[s.meal_type]++

    // Build new unlocked slots distributed across days
    const newSlots: Omit<PlanSlot, 'id' | 'recipe'>[] = []
    for (const type of MEAL_TYPES) {
      const total = config[type]
      const needed = Math.max(0, total - lockedPerType[type])
      // Distribute evenly: pick days not already locked for this type
      const lockedDays = new Set(lockedSlots.filter((s) => s.meal_type === type).map((s) => s.day_of_week))
      const freeDays = [0,1,2,3,4,5,6].filter((d) => !lockedDays.has(d))
      for (let i = 0; i < Math.min(needed, freeDays.length); i++) {
        newSlots.push({
          plan_id: plan.id,
          day_of_week: freeDays[i],
          meal_type: type,
          recipe_id: null,
          is_locked: false,
          sort_order: i,
        })
      }
    }

    // Split by library vs AI
    const libraryCount = Math.round(newSlots.length * config.library_ratio)
    const aiCount = newSlots.length - libraryCount

    // Fetch library recipes
    const librarySlots = newSlots.slice(0, libraryCount)
    const aiSlots = newSlots.slice(libraryCount)

    const filledSlots: PlanSlot[] = [...lockedSlots]

    // Fill library slots
    for (const slot of librarySlots) {
      const { data: candidates } = await supabase
        .from('recipes')
        .select('*')
        .eq('household_id', householdId)
        .eq('meal_type', slot.meal_type)
        .eq('is_from_library', true)
        .order('rating', { ascending: false })
        .limit(10)

      if (candidates && candidates.length > 0) {
        const recipe = candidates[Math.floor(Math.random() * candidates.length)] as Recipe
        filledSlots.push({ ...slot, id: `tmp-${Math.random()}`, recipe_id: recipe.id, recipe } as PlanSlot)
      }
    }

    // Fill AI slots
    if (aiSlots.length > 0) {
      const grouped: Partial<Record<MealType, number>> = {}
      for (const s of aiSlots) grouped[s.meal_type] = (grouped[s.meal_type] ?? 0) + 1

      const suggestions: AiRecipeSuggestion[] = []
      for (const [type, count] of Object.entries(grouped)) {
        const res = await fetch('/api/ai/suggest-recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meal_type: type,
            count,
            recent_recipe_titles: recentTitles,
            household_preferences: preferences,
            season: currentSeason(),
            user_prompt: promptText.trim() || undefined,
            ingredients_to_use: config.ingredients_to_use?.length
              ? config.ingredients_to_use
              : undefined,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          suggestions.push(...(data.suggestions ?? []))
        }
      }

      let suggestionIdx = 0
      for (const slot of aiSlots) {
        const suggestion = suggestions[suggestionIdx++]
        if (suggestion) {
          filledSlots.push({
            ...slot,
            id: `tmp-ai-${Math.random()}`,
            suggested_recipe: suggestion,
            preview_status: 'pending',
          } as unknown as PlanSlot)
        } else {
          // AI suggestion unavailable — fall back to a library recipe
          const { data: candidates } = await supabase
            .from('recipes')
            .select('*')
            .eq('household_id', householdId)
            .eq('meal_type', slot.meal_type)
            .order('rating', { ascending: false })
            .limit(10)
          if (candidates && candidates.length > 0) {
            const recipe = candidates[Math.floor(Math.random() * candidates.length)] as Recipe
            filledSlots.push({ ...slot, id: `tmp-${Math.random()}`, recipe_id: recipe.id, recipe } as PlanSlot)
          }
        }
      }
    }

    startPreview(filledSlots as never)
    setRegenerating(false)
  }

  async function commitPreview() {
    if (!previewSlots) return
    const supabase = createClient()

    // Delete all existing unlocked slots
    const unlocked = slots.filter((s) => !s.is_locked)
    if (unlocked.length > 0) {
      await supabase.from('plan_slots').delete().in('id', unlocked.map((s) => s.id))
    }

    const accepted = previewSlots.filter((s) => (s as never as { preview_status: string }).preview_status !== 'rejected')

    // For AI suggested slots, create recipe first
    const finalSlots: PlanSlot[] = []
    for (const preview of accepted) {
      const p = preview as never as { preview_status: string; suggested_recipe?: AiRecipeSuggestion }
      if (preview.recipe_id) {
        // Library recipe — insert slot
        const { data } = await supabase.from('plan_slots').insert({
          plan_id: plan.id,
          day_of_week: preview.day_of_week,
          meal_type: preview.meal_type,
          recipe_id: preview.recipe_id,
          is_locked: preview.is_locked,
          sort_order: preview.sort_order,
        }).select().single()
        if (data) finalSlots.push({ ...data, recipe: preview.recipe })
      } else if (p.suggested_recipe) {
        // AI recipe — persist recipe then slot
        const { data: recipeData } = await supabase.from('recipes').insert({
          household_id: householdId,
          title: p.suggested_recipe.title,
          description: p.suggested_recipe.description,
          meal_type: p.suggested_recipe.meal_type,
          cook_time_minutes: p.suggested_recipe.cook_time_minutes,
          ingredients: p.suggested_recipe.ingredients,
          source_url: p.suggested_recipe.source_url ?? null,
          is_from_library: false,
        }).select().single()

        if (recipeData) {
          const { data: slotData } = await supabase.from('plan_slots').insert({
            plan_id: plan.id,
            day_of_week: preview.day_of_week,
            meal_type: preview.meal_type,
            recipe_id: recipeData.id,
            sort_order: preview.sort_order,
          }).select().single()
          if (slotData) finalSlots.push({ ...slotData, recipe: recipeData })
        }
      } else if (preview.is_locked) {
        finalSlots.push(preview)
      }
    }

    setSlots([...slots.filter((s) => s.is_locked), ...finalSlots])
    clearPreview()
    router.refresh()
  }

  function addEmptySlot(day: number, type: MealType) {
    const placeholder: PlanSlot = {
      id: `new-${Date.now()}`,
      plan_id: plan.id,
      day_of_week: day,
      meal_type: type,
      recipe_id: null,
      is_locked: false,
      sort_order: 99,
      recipe: null,
    }
    openSwapSheet(placeholder)
  }

  // Preview mode overlay
  if (previewSlots) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="bg-purple-50 border-b border-purple-200 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-900">Review new plan suggestions</p>
            <p className="text-xs text-purple-600 mt-0.5">Accept or reject each suggestion, then commit.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={clearPreview} className="btn-secondary text-sm">Discard</button>
            <button onClick={commitPreview} className="btn-primary text-sm">Commit plan</button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-7 gap-3">
          {DAYS.map((day, dayIdx) => {
            const daySlots = previewSlots.filter((s) => s.day_of_week === dayIdx)
            const isToday = isTodayColumn(weekStart, dayIdx)
            return (
              <div key={dayIdx} className={cn('space-y-2', isToday && 'bg-brand-50/50 rounded-xl p-2 -m-2')}>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-500">{day}</p>
                  <p className="text-sm font-semibold text-gray-900">{dayDate(weekStart, dayIdx).getDate()}</p>
                </div>
                {daySlots.map((slot) => {
                  const p = slot as never as { preview_status: string; suggested_recipe?: AiRecipeSuggestion }
                  const recipe = slot.recipe as Recipe | null
                  const name = recipe?.title ?? p.suggested_recipe?.title ?? '—'
                  const isRejected = p.preview_status === 'rejected'
                  const isLocked = slot.is_locked

                  return (
                    <div key={slot.id} className={cn('card px-3 py-2.5', isRejected && 'opacity-40')}>
                      <p className="text-xs text-gray-500 mb-1">{MEAL_TYPE_LABELS[slot.meal_type]}</p>
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">{name}</p>
                      {!isLocked && (
                        <div className="flex gap-2 mt-2">
                          {p.suggested_recipe && (
                            <button
                              onClick={() => setPreviewSuggestion(p.suggested_recipe!)}
                              className="text-xs text-gray-400 hover:text-gray-700 underline"
                            >
                              View
                            </button>
                          )}
                          {!isRejected ? (
                            <button
                              onClick={() => rejectPreviewSlot(slot.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Reject
                            </button>
                          ) : (
                            <button
                              onClick={() => acceptPreviewSlot(slot.id)}
                              className="text-xs text-brand-600 hover:text-brand-800"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      )}
                      {isLocked && <p className="text-xs text-amber-600 mt-1">🔒 locked</p>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* AI suggestion detail slide-over */}
        <SlideOver
          open={previewSuggestion !== null}
          onClose={() => setPreviewSuggestion(null)}
          title={previewSuggestion?.title ?? ''}
          width="w-[420px]"
        >
          {previewSuggestion && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  AI suggested
                </span>
                {previewSuggestion.cook_time_minutes && (
                  <span className="text-sm text-gray-500">⏱ {previewSuggestion.cook_time_minutes} min</span>
                )}
              </div>

              {previewSuggestion.description && (
                <p className="text-sm text-gray-600">{previewSuggestion.description}</p>
              )}

              {previewSuggestion.ingredients.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Ingredients</h3>
                  <ul className="space-y-1.5">
                    {previewSuggestion.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-gray-400 min-w-[80px] text-right shrink-0">
                          {ing.quantity} {ing.unit}
                        </span>
                        <span>{ing.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {previewSuggestion.source_url && (
                <a
                  href={previewSuggestion.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline block truncate"
                >
                  Original source ↗
                </a>
              )}
            </div>
          )}
        </SlideOver>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <WeekNav weekStart={weekStart} />
        <div className="flex items-center gap-2">
          <Link href="/settings" className="btn-ghost">⚙</Link>
          <span className="text-xs text-gray-400 whitespace-nowrap">New recipes:</span>
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && regenerate()}
            placeholder="e.g. quick Asian meals"
            className="input text-sm w-44"
            title="Guides AI suggestions only — does not affect library recipes"
          />
          <button
            onClick={regenerate}
            disabled={isRegenerating}
            className="btn-primary"
          >
            {isRegenerating ? 'Generating…' : '↺ Regenerate plan'}
          </button>
        </div>
      </div>

      <ConfigBar planId={plan.id} />

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 gap-3 min-w-[700px]">
          {DAYS.map((day, dayIdx) => {
            const isToday = isTodayColumn(weekStart, dayIdx)
            const daySlots = (byDay[dayIdx] ?? []).sort((a, b) => {
              const ao = MEAL_ORDER.indexOf(a.meal_type)
              const bo = MEAL_ORDER.indexOf(b.meal_type)
              return ao - bo
            })

            return (
              <div
                key={dayIdx}
                className={cn(
                  'space-y-2',
                  isToday && 'bg-brand-50/50 rounded-xl p-2 -m-2',
                )}
              >
                {/* Day header */}
                <div className="text-center pb-1">
                  <p className="text-xs font-medium text-gray-500">{day}</p>
                  <p className={cn('text-sm font-semibold', isToday ? 'text-brand-600' : 'text-gray-900')}>
                    {dayDate(weekStart, dayIdx).getDate()}
                  </p>
                </div>

                {daySlots.map((slot) => (
                  <MealCard key={slot.id} slot={slot} />
                ))}

                {/* Add meal button */}
                <button
                  onClick={() => addEmptySlot(dayIdx, 'dinner')}
                  className="w-full border border-dashed border-gray-200 rounded-lg py-2 text-xs text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors"
                >
                  + Add meal
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{totalMeals} meals planned</span>
          {lockedCount > 0 && (
            <span className="text-sm text-amber-600">· {lockedCount} locked</span>
          )}
          {newCount > 0 && (
            <span className="text-sm text-purple-600">· {newCount} new</span>
          )}
        </div>
        <Link href="/grocery" className="btn-secondary text-sm">
          View grocery list →
        </Link>
      </div>

      <SwapSheet householdId={householdId} />
      <RecipeSlideOver />
    </div>
  )
}
