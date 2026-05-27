'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WeeklyPlan, PlanSlot, Recipe, MealType, AiRecipeSuggestion } from '@/types'
import { usePlannerStore } from '@/store/plannerStore'
import { createClient } from '@/lib/supabase/client'
import { DAYS, MEAL_TYPE_LABELS, dayDate, isTodayColumn, cn, currentSeason } from '@/lib/utils'
import { Lock, ShoppingCart, Sparkles, Sunrise, Sun, Moon, Leaf } from 'lucide-react'
import MealCard from './MealCard'
import SwapSheet from './SwapSheet'
import RecipeSlideOver from './RecipeSlideOver'
import SlideOver from '@/components/ui/SlideOver'
import ConfigBar from './ConfigBar'
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

const MEAL_HEADER_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Sunrise size={12} />,
  lunch:     <Sun size={12} />,
  dinner:    <Moon size={12} />,
  snack:     <Leaf size={12} />,
}

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
  } = usePlannerStore()
  const router = useRouter()
  const [promptText, setPromptText] = useState('')
  const [previewSuggestion, setPreviewSuggestion] = useState<AiRecipeSuggestion | null>(null)

  useEffect(() => {
    setSlots(initialSlots)
    setConfig(plan.config)
  }, [plan.id])

  // Group slots by day × meal type
  const byDayType: Record<number, Record<MealType, PlanSlot[]>> = {}
  for (let d = 0; d < 7; d++) {
    byDayType[d] = { breakfast: [], lunch: [], dinner: [], snack: [] }
  }
  for (const slot of slots) {
    byDayType[slot.day_of_week][slot.meal_type as MealType].push(slot)
  }

  // Visible columns (respect hidden_meal_types from config)
  const hiddenTypes = config.hidden_meal_types ?? []
  const visibleMealOrder = MEAL_ORDER.filter((t) => !hiddenTypes.includes(t))
  const gridCols = `88px repeat(${visibleMealOrder.length}, 1fr)`
  // Cap each meal column at ~400 px so single-column views don't stretch absurdly wide.
  // maxWidth = day-label(88) + gap-per-col(12) + col-cap(400) per visible column.
  const gridMaxWidth = `${88 + visibleMealOrder.length * 412}px`

  const totalMeals = slots.filter((s) => s.recipe_id).length
  const lockedCount = slots.filter((s) => s.is_locked).length
  const newCount = slots.filter((s) => (s.recipe as Recipe | null)?.is_from_library === false).length

  function handleAddMeal(dayIdx: number, mealType: MealType) {
    openSwapSheet({
      id: `new-${Date.now()}`,
      plan_id: plan.id,
      day_of_week: dayIdx,
      meal_type: mealType,
      recipe_id: null,
      is_locked: false,
      sort_order: 99,
      recipe: null,
    }, 'library')
  }

  async function regenerate() {
    if (isRegenerating) return
    setRegenerating(true)
    const supabase = createClient()

    const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
    const lockedSlots = slots.filter((s) => s.is_locked)

    const lockedPerType: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
    for (const s of lockedSlots) lockedPerType[s.meal_type]++

    const newSlots: Omit<PlanSlot, 'id' | 'recipe'>[] = []
    for (const type of MEAL_TYPES) {
      const total = config[type]
      const needed = Math.max(0, total - lockedPerType[type])
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

    const libraryCount = Math.round(newSlots.length * config.library_ratio)
    const librarySlots = newSlots.slice(0, libraryCount)
    const aiSlots = newSlots.slice(libraryCount)

    const filledSlots: PlanSlot[] = [...lockedSlots]

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

    const unlocked = slots.filter((s) => !s.is_locked)
    if (unlocked.length > 0) {
      await supabase.from('plan_slots').delete().in('id', unlocked.map((s) => s.id))
    }

    const accepted = previewSlots.filter((s) => (s as never as { preview_status: string }).preview_status !== 'rejected')

    const finalSlots: PlanSlot[] = []
    for (const preview of accepted) {
      const p = preview as never as { preview_status: string; suggested_recipe?: AiRecipeSuggestion }
      if (preview.recipe_id) {
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

  // ── Preview mode ────────────────────────────────────────────────────────────
  if (previewSlots) {
    const hiddenTypes = config.hidden_meal_types ?? []
    const visibleMealOrder = MEAL_ORDER.filter((t) => !hiddenTypes.includes(t))
    const gridCols = `88px repeat(${visibleMealOrder.length}, 1fr)`
  // Cap each meal column at ~400 px so single-column views don't stretch absurdly wide.
  // maxWidth = day-label(88) + gap-per-col(12) + col-cap(400) per visible column.
  const gridMaxWidth = `${88 + visibleMealOrder.length * 412}px`

    const previewByDayType: Record<number, Record<MealType, typeof previewSlots>> = {}
    for (let d = 0; d < 7; d++) {
      previewByDayType[d] = { breakfast: [], lunch: [], dinner: [], snack: [] }
    }
    for (const slot of previewSlots) {
      previewByDayType[slot.day_of_week][slot.meal_type as MealType].push(slot)
    }

    return (
      <div className="flex-1 overflow-auto">
        {/* Preview banner */}
        <div className="bg-purple-50 border-b border-purple-200 px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-900">Review new plan suggestions</p>
            <p className="text-xs text-purple-600 mt-0.5">Accept or reject each suggestion, then commit.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={clearPreview} className="btn-secondary text-sm">Discard</button>
            <button onClick={commitPreview} className="btn-primary text-sm">Commit plan</button>
          </div>
        </div>

        <div className="p-5">
          {/* Column headers */}
          <div className="grid gap-3 mb-2 px-2" style={{ gridTemplateColumns: gridCols }}>
            <div />
            {visibleMealOrder.map((type) => (
              <div key={type} className="flex items-center justify-center gap-1.5 py-1">
                <span className="text-brand-400/70">{MEAL_HEADER_ICONS[type]}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600/70">
                  {MEAL_TYPE_LABELS[type]}
                </span>
              </div>
            ))}
          </div>

          {/* Day rows */}
          <div className="space-y-2">
            {DAYS.map((day, dayIdx) => {
              const isToday = isTodayColumn(weekStart, dayIdx)
              const date = dayDate(weekStart, dayIdx)
              return (
                <div
                  key={dayIdx}
                  className={cn(
                    'grid gap-3 p-2 rounded-xl',
                    isToday ? 'bg-brand-50/80 ring-1 ring-brand-200/50' : 'hover:bg-black/[0.02]',
                  )}
                  style={{ gridTemplateColumns: gridCols }}
                >
                  <div className="flex flex-col justify-center py-1">
                    <p className={cn('text-sm font-semibold', isToday ? 'text-brand-600' : 'text-gray-700')}>{day}</p>
                    <p className="text-xs text-gray-400">{date.getDate()}</p>
                  </div>

                  {visibleMealOrder.map((mealType) => {
                    const cellSlots = previewByDayType[dayIdx][mealType]
                    if (cellSlots.length === 0) return <div key={mealType} />

                    return (
                      <div key={mealType} className="space-y-1.5">
                        {cellSlots.map((slot) => {
                          const p = slot as never as { preview_status: string; suggested_recipe?: AiRecipeSuggestion }
                          const recipe = slot.recipe as Recipe | null
                          const name = recipe?.title ?? p.suggested_recipe?.title ?? '—'
                          const isRejected = p.preview_status === 'rejected'
                          const isLocked = slot.is_locked

                          return (
                            <div key={slot.id} className={cn('card px-3 py-2.5', isRejected && 'opacity-40')}>
                              <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug">{name}</p>
                              {!isLocked && (
                                <div className="flex gap-2 mt-1.5">
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
                              {isLocked && (
                                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                                  <Lock size={9} /> locked
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
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

  // ── Normal mode ─────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      <ConfigBar
        planId={plan.id}
        weekStart={weekStart}
        promptText={promptText}
        onPromptChange={setPromptText}
        onRegenerate={regenerate}
        isRegenerating={isRegenerating}
      />

      {/* Grid */}
      <div className="flex-1 overflow-auto p-5">

        {visibleMealOrder.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-gray-400">All columns hidden</p>
            <p className="text-xs text-gray-400 mt-1">Use the controls above to show meal type columns.</p>
          </div>
        ) : (
          <div style={{ maxWidth: gridMaxWidth }}>
            {/* Column headers */}
            <div className="grid gap-3 mb-1 px-2" style={{ gridTemplateColumns: gridCols }}>
              <div /> {/* corner */}
              {visibleMealOrder.map((type) => (
                <div key={type} className="flex items-center justify-center gap-1.5 py-1.5">
                  <span className="text-brand-400/80">{MEAL_HEADER_ICONS[type]}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-600/80">
                    {MEAL_TYPE_LABELS[type]}
                  </span>
                </div>
              ))}
            </div>

            {/* Day rows */}
            <div className="space-y-2">
              {DAYS.map((day, dayIdx) => {
                const isToday = isTodayColumn(weekStart, dayIdx)
                const date = dayDate(weekStart, dayIdx)

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'grid gap-3 p-2 rounded-xl transition-colors',
                      isToday
                        ? 'bg-brand-50/80 ring-1 ring-brand-200/50'
                        : 'hover:bg-black/[0.015]',
                    )}
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    {/* Day label */}
                    <div className="flex flex-col justify-center py-1">
                      <p className={cn(
                        'text-sm font-bold leading-tight',
                        isToday ? 'text-brand-600' : 'text-gray-700',
                      )}>
                        {day}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    {/* Meal type cells (only visible columns) */}
                    {visibleMealOrder.map((mealType) => {
                      const cellSlots = byDayType[dayIdx][mealType]

                      return (
                        <div key={mealType} className="group space-y-1.5">
                          {cellSlots.map((slot) => (
                            <MealCard key={slot.id} slot={slot} />
                          ))}

                          {/* Add button */}
                          {cellSlots.length === 0 ? (
                            <button
                              onClick={() => handleAddMeal(dayIdx, mealType)}
                              className="w-full border border-dashed border-gray-200 rounded-lg py-3 text-xs
                                         text-gray-300 hover:border-brand-300 hover:text-brand-500 transition-colors"
                            >
                              +
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAddMeal(dayIdx, mealType)}
                              className="w-full text-xs text-gray-300 opacity-0 group-hover:opacity-100
                                         hover:text-brand-400 py-0.5 transition-all text-center"
                            >
                              + add
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="bg-brand-900 border-t border-brand-800 px-5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-300">{totalMeals} meals planned</span>
          {lockedCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Lock size={10} /> {lockedCount} locked
            </span>
          )}
          {newCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-purple-300">
              <Sparkles size={10} /> {newCount} new
            </span>
          )}
        </div>
        <Link href="/grocery" className="flex items-center gap-1.5 text-xs font-medium text-brand-200 hover:text-white transition-colors">
          <ShoppingCart size={13} />
          Grocery list
        </Link>
      </div>

      <SwapSheet householdId={householdId} />
      <RecipeSlideOver />
    </div>
  )
}
