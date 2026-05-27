'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sunrise, Sun, Moon, Leaf,
  Shuffle, Package, ChevronDown, X,
  RefreshCw, Sparkles, ChevronLeft, ChevronRight,
  Eye, EyeOff,
} from 'lucide-react'
import type { PlanConfig, MealType } from '@/types'
import { cn, addWeeks, formatWeekStart, weekLabel } from '@/lib/utils'
import { usePlannerStore } from '@/store/plannerStore'
import { createClient } from '@/lib/supabase/client'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

const MEAL_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Sunrise size={13} />,
  lunch:     <Sun size={13} />,
  dinner:    <Moon size={13} />,
  snack:     <Leaf size={13} />,
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snack:     'Snack',
}

interface ConfigBarProps {
  planId: string
  weekStart: Date
  promptText: string
  onPromptChange: (text: string) => void
  onRegenerate: () => void
  isRegenerating: boolean
}

export default function ConfigBar({
  planId,
  weekStart,
  promptText,
  onPromptChange,
  onRegenerate,
  isRegenerating,
}: ConfigBarProps) {
  const { config, setConfig } = usePlannerStore()
  const [showRatioSlider, setShowRatioSlider] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const [ingredientInput, setIngredientInput] = useState('')
  const ingredientInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (showIngredients) ingredientInputRef.current?.focus()
  }, [showIngredients])

  function navigate(delta: number) {
    const next = addWeeks(weekStart, delta)
    router.push(`/planner/${formatWeekStart(next)}`)
  }

  async function saveConfig(next: PlanConfig) {
    setConfig(next)
    const supabase = createClient()
    await supabase.from('weekly_plans').update({ config: next }).eq('id', planId)
  }

  function adjustCount(type: MealType, delta: number) {
    const next = Math.max(0, Math.min(7, config[type] + delta))
    saveConfig({ ...config, [type]: next })
  }

  function toggleColumnVisibility(type: MealType) {
    const hidden = config.hidden_meal_types ?? []
    const isHidden = hidden.includes(type)
    const next = isHidden
      ? hidden.filter((t) => t !== type)
      : [...hidden, type]
    saveConfig({ ...config, hidden_meal_types: next })
  }

  function adjustRatio(value: number) {
    saveConfig({ ...config, library_ratio: value / 100 })
  }

  function addIngredient() {
    const val = ingredientInput.trim().toLowerCase()
    if (!val) return
    const current = config.ingredients_to_use ?? []
    if (!current.includes(val)) saveConfig({ ...config, ingredients_to_use: [...current, val] })
    setIngredientInput('')
    ingredientInputRef.current?.focus()
  }

  function removeIngredient(ing: string) {
    const current = config.ingredients_to_use ?? []
    saveConfig({ ...config, ingredients_to_use: current.filter((i) => i !== ing) })
  }

  const libraryPct = Math.round(config.library_ratio * 100)
  const newPct = 100 - libraryPct
  const useUpCount = (config.ingredients_to_use ?? []).length
  const hiddenTypes = config.hidden_meal_types ?? []

  return (
    <div className="bg-brand-800 border-b border-brand-900 px-4 py-2 flex items-center gap-1 flex-wrap justify-between">

      {/* Left group */}
      <div className="flex items-center gap-1 flex-wrap">

        {/* Week picker */}
        <div className="flex items-center gap-0.5 bg-brand-900/50 rounded-lg px-1.5 py-1 mr-1">
          <button
            onClick={() => navigate(-1)}
            className="w-6 h-6 flex items-center justify-center text-brand-300 hover:text-white rounded transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-white min-w-[136px] text-center px-1 tabular-nums">
            {weekLabel(weekStart)}
          </span>
          <button
            onClick={() => navigate(1)}
            className="w-6 h-6 flex items-center justify-center text-brand-300 hover:text-white rounded transition-colors"
            aria-label="Next week"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="w-px h-5 bg-brand-600 mx-1.5" />

        {/* Meal type counters */}
        {MEAL_TYPES.map((type) => {
          const isHidden = hiddenTypes.includes(type)

          if (isHidden) {
            return (
              <div
                key={type}
                className="flex items-center gap-1.5 bg-brand-900/30 rounded-lg px-2.5 py-1.5"
              >
                <span className="text-brand-600"><EyeOff size={12} /></span>
                <span className="text-xs text-brand-600 line-through">{MEAL_LABELS[type]}</span>
                <button
                  onClick={() => toggleColumnVisibility(type)}
                  title="Show column"
                  className="ml-0.5 text-brand-500 hover:text-brand-200 transition-colors"
                >
                  <Eye size={11} />
                </button>
              </div>
            )
          }

          return (
            <div
              key={type}
              className="group flex items-center gap-1.5 bg-brand-700/60 hover:bg-brand-700 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <span className="text-brand-200">{MEAL_ICONS[type]}</span>
              <span className="text-xs text-brand-100">{MEAL_LABELS[type]}</span>
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  onClick={() => adjustCount(type, -1)}
                  className="w-4 h-4 flex items-center justify-center text-brand-300 hover:text-white rounded transition-colors text-xs leading-none"
                >
                  −
                </button>
                <span className="w-4 text-center text-xs font-bold text-white">{config[type]}</span>
                <button
                  onClick={() => adjustCount(type, 1)}
                  className="w-4 h-4 flex items-center justify-center text-brand-300 hover:text-white rounded transition-colors text-xs leading-none"
                >
                  +
                </button>
              </div>
              {/* Hide column — appears on hover */}
              <button
                onClick={() => toggleColumnVisibility(type)}
                title="Hide column"
                className="opacity-0 group-hover:opacity-100 ml-0.5 text-brand-400 hover:text-white transition-all"
              >
                <EyeOff size={10} />
              </button>
            </div>
          )
        })}

        <div className="w-px h-5 bg-brand-600 mx-1.5" />

        {/* Source mix */}
        <div className="relative">
          <button
            onClick={() => { setShowRatioSlider((v) => !v); setShowIngredients(false) }}
            className="flex items-center gap-1.5 bg-brand-700/60 hover:bg-brand-700 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Shuffle size={13} className="text-brand-200" />
            <span className="text-xs text-brand-100">
              <span className="text-white font-semibold">{libraryPct}%</span>
              <span className="text-brand-300 mx-1">·</span>
              <span className="text-purple-300 font-semibold">{newPct}%</span>
            </span>
            <ChevronDown size={11} className={cn('text-brand-400 transition-transform', showRatioSlider && 'rotate-180')} />
          </button>

          {showRatioSlider && (
            <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-60">
              <p className="text-xs font-semibold text-gray-700 mb-1">Source mix</p>
              <p className="text-xs text-gray-400 mb-3">
                <span className="text-brand-600 font-medium">{libraryPct}% from your library</span>
                {' · '}
                <span className="text-purple-600 font-medium">{newPct}% AI suggestions</span>
              </p>
              <input
                type="range" min={0} max={100} step={10}
                value={libraryPct}
                onChange={(e) => adjustRatio(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>All AI</span>
                <span>All library</span>
              </div>
            </div>
          )}
        </div>

        {/* Use-up ingredients */}
        <div className="relative">
          <button
            onClick={() => { setShowIngredients((v) => !v); setShowRatioSlider(false) }}
            className="flex items-center gap-1.5 bg-brand-700/60 hover:bg-brand-700 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <Package size={13} className="text-brand-200" />
            <span className="text-xs text-brand-100">Use up</span>
            {useUpCount > 0 && (
              <span className="text-[10px] bg-amber-400 text-amber-900 font-bold px-1.5 py-0 rounded-full leading-4">
                {useUpCount}
              </span>
            )}
            <ChevronDown size={11} className={cn('text-brand-400 transition-transform', showIngredients && 'rotate-180')} />
          </button>

          {showIngredients && (
            <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
              <p className="text-xs font-semibold text-gray-700 mb-1">Ingredients to use up</p>
              <p className="text-xs text-gray-400 mb-3">
                Claude will prioritise these when suggesting new recipes.
              </p>
              {useUpCount > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(config.ingredients_to_use ?? []).map((ing) => (
                    <span
                      key={ing}
                      className="flex items-center gap-1 text-xs bg-brand-50 text-brand-800 border border-brand-200 px-2 py-0.5 rounded-full"
                    >
                      {ing}
                      <button onClick={() => removeIngredient(ing)} className="text-brand-400 hover:text-brand-700">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={ingredientInputRef}
                  type="text"
                  value={ingredientInput}
                  onChange={(e) => setIngredientInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                  placeholder="e.g. heavy cream"
                  className="input text-sm flex-1"
                />
                <button onClick={addIngredient} className="btn-secondary text-sm">Add</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right group: AI prompt + Regenerate */}
      <div className="flex items-center gap-2">
        <div className="w-px h-5 bg-brand-600" />
        <Sparkles size={12} className="text-brand-300 shrink-0" />
        <span className="text-xs text-brand-300 whitespace-nowrap">New recipes:</span>
        <input
          type="text"
          value={promptText}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onRegenerate()}
          placeholder="e.g. quick Asian meals"
          title="Guides AI suggestions only — does not affect library recipes"
          className="bg-brand-700/60 border border-brand-600 rounded-lg px-2.5 py-1.5 text-xs text-white
                     placeholder:text-brand-400 focus:outline-none focus:border-brand-400 w-40"
        />
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-400 disabled:opacity-50
                     text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
          {isRegenerating ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

    </div>
  )
}
