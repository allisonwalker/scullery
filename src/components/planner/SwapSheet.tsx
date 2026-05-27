'use client'

import { useEffect, useState } from 'react'
import type { Recipe, PlanSlot, AiRecipeSuggestion } from '@/types'
import { usePlannerStore } from '@/store/plannerStore'
import { createClient } from '@/lib/supabase/client'
import { MEAL_TYPE_LABELS, currentSeason, cn } from '@/lib/utils'
import SlideOver from '@/components/ui/SlideOver'
import { MealTypeBadge } from '@/components/ui/Badge'
import StarRating from '@/components/ui/StarRating'

export default function SwapSheet({ householdId }: { householdId: string }) {
  const {
    swapTargetSlot, swapSheetTab,
    closeSwapSheet, updateSlot, addSlot, slots,
  } = usePlannerStore()

  // ── Library tab state ──────────────────────────────────────────────────────
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [search, setSearch] = useState('')
  const [loadingLibrary, setLoadingLibrary] = useState(false)

  // ── Generate tab state ─────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [suggestion, setSuggestion] = useState<AiRecipeSuggestion | null>(null)
  const [generateError, setGenerateError] = useState('')
  const [accepting, setAccepting] = useState(false)

  // ── Active tab ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'library' | 'generate'>('library')

  const open = swapTargetSlot !== null

  // Sync tab + reset state when the sheet opens
  useEffect(() => {
    if (!open) return
    setTab(swapSheetTab)
    setSearch('')
    setPrompt('')
    setSuggestion(null)
    setGenerateError('')
  }, [open, swapSheetTab])

  // Load library recipes whenever the sheet opens or slot changes
  useEffect(() => {
    if (!open || !swapTargetSlot) return
    setLoadingLibrary(true)
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
        setLoadingLibrary(false)
      })
  }, [open, swapTargetSlot?.id])

  // ── Library: pick a recipe ─────────────────────────────────────────────────
  async function pickRecipe(recipe: Recipe) {
    if (!swapTargetSlot) return
    const supabase = createClient()

    if (swapTargetSlot.recipe_id === null && swapTargetSlot.id.startsWith('new-')) {
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
      await supabase.from('plan_slots').update({ recipe_id: recipe.id }).eq('id', swapTargetSlot.id)
      updateSlot(swapTargetSlot.id, { recipe_id: recipe.id, recipe })
    }
    closeSwapSheet()
  }

  // ── Generate: call AI ──────────────────────────────────────────────────────
  async function generateRecipe() {
    if (!swapTargetSlot) return
    setGenerating(true)
    setSuggestion(null)
    setGenerateError('')

    const res = await fetch('/api/ai/suggest-recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meal_type: swapTargetSlot.meal_type,
        count: 1,
        recent_recipe_titles: [],
        household_preferences: [],
        season: currentSeason(),
        user_prompt: prompt.trim() || undefined,
      }),
    })

    const data = await res.json()
    const s: AiRecipeSuggestion | undefined = data.suggestions?.[0]
    if (s) {
      setSuggestion(s)
    } else {
      setGenerateError('No suggestion returned — try a different prompt.')
    }
    setGenerating(false)
  }

  // ── Generate: accept the suggestion ───────────────────────────────────────
  async function acceptSuggestion() {
    if (!swapTargetSlot || !suggestion) return
    setAccepting(true)
    const supabase = createClient()

    const { data: recipeData } = await supabase
      .from('recipes')
      .insert({
        household_id: householdId,
        title: suggestion.title,
        description: suggestion.description ?? null,
        meal_type: suggestion.meal_type,
        cook_time_minutes: suggestion.cook_time_minutes ?? null,
        ingredients: suggestion.ingredients,
        source_url: suggestion.source_url ?? null,
        is_from_library: false,
      })
      .select()
      .single()

    if (!recipeData) { setAccepting(false); return }

    if (swapTargetSlot.id.startsWith('new-')) {
      const { data: slotData } = await supabase
        .from('plan_slots')
        .insert({
          plan_id: swapTargetSlot.plan_id,
          day_of_week: swapTargetSlot.day_of_week,
          meal_type: swapTargetSlot.meal_type,
          recipe_id: recipeData.id,
          sort_order: slots.filter((s) => s.day_of_week === swapTargetSlot.day_of_week).length,
        })
        .select()
        .single()
      if (slotData) addSlot({ ...slotData, recipe: recipeData })
    } else {
      await supabase.from('plan_slots').update({ recipe_id: recipeData.id }).eq('id', swapTargetSlot.id)
      updateSlot(swapTargetSlot.id, { recipe_id: recipeData.id, recipe: recipeData })
    }

    setAccepting(false)
    closeSwapSheet()
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = recipes.filter(
    (r) => !search || r.title.toLowerCase().includes(search.toLowerCase()),
  )

  const title = swapTargetSlot
    ? `${swapTargetSlot.recipe_id ? 'Swap' : 'Add'} ${MEAL_TYPE_LABELS[swapTargetSlot.meal_type]}`
    : ''

  return (
    <SlideOver open={open} onClose={closeSwapSheet} title={title}>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-gray-100 -mx-5 px-5">
        {(['library', 'generate'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            {t === 'library' ? 'From library' : '✦ Generate'}
          </button>
        ))}
      </div>

      {/* ── Library tab ─────────────────────────────────────────────────── */}
      {tab === 'library' && (
        <div className="space-y-3">
          <input
            type="search"
            placeholder="Search recipes…"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loadingLibrary && (
            <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
          )}

          {!loadingLibrary && filtered.length === 0 && (
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
      )}

      {/* ── Generate tab ────────────────────────────────────────────────── */}
      {tab === 'generate' && (
        <div className="space-y-4">
          <div>
            <label className="label">What are you in the mood for?</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="e.g. something quick and Italian, a hearty winter soup, a light salad…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generateRecipe()
              }}
            />
            <p className="text-xs text-gray-400 mt-1">Optional — leave blank for a surprise.</p>
          </div>

          <button
            onClick={generateRecipe}
            disabled={generating}
            className="btn-primary w-full justify-center"
          >
            {generating ? 'Generating…' : '✦ Generate recipe'}
          </button>

          {generateError && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{generateError}</p>
          )}

          {/* Suggestion result */}
          {suggestion && !generating && (
            <div className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{suggestion.title}</h3>
                <span className="text-xs bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full shrink-0">
                  AI
                </span>
              </div>

              {suggestion.cook_time_minutes && (
                <p className="text-xs text-gray-500">⏱ {suggestion.cook_time_minutes} min</p>
              )}

              {suggestion.description && (
                <p className="text-sm text-gray-600">{suggestion.description}</p>
              )}

              {suggestion.ingredients.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Ingredients
                  </p>
                  <ul className="space-y-1">
                    {suggestion.ingredients.map((ing, i) => (
                      <li key={i} className="text-xs text-gray-600 flex gap-2">
                        <span className="text-gray-400 min-w-[72px] text-right shrink-0">
                          {ing.quantity} {ing.unit}
                        </span>
                        <span>{ing.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {suggestion.source_url && (
                <a
                  href={suggestion.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-600 hover:underline block truncate"
                >
                  Original source ↗
                </a>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={acceptSuggestion}
                  disabled={accepting}
                  className="btn-primary flex-1 justify-center"
                >
                  {accepting ? 'Adding…' : '✓ Add to plan'}
                </button>
                <button
                  onClick={generateRecipe}
                  className="btn-secondary"
                  title="Try again"
                >
                  ↺
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </SlideOver>
  )
}
