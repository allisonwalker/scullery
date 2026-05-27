'use client'

import { useState, useRef, useEffect } from 'react'
import type { PlanConfig, MealType } from '@/types'
import { MEAL_TYPE_ICONS, MEAL_TYPE_LABELS, cn } from '@/lib/utils'
import { usePlannerStore } from '@/store/plannerStore'
import { createClient } from '@/lib/supabase/client'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

interface ConfigBarProps {
  planId: string
}

export default function ConfigBar({ planId }: ConfigBarProps) {
  const { config, setConfig } = usePlannerStore()
  const [showRatioSlider, setShowRatioSlider] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const [ingredientInput, setIngredientInput] = useState('')
  const ingredientInputRef = useRef<HTMLInputElement>(null)

  // Focus the input when the panel opens
  useEffect(() => {
    if (showIngredients) ingredientInputRef.current?.focus()
  }, [showIngredients])

  async function saveConfig(next: PlanConfig) {
    setConfig(next)
    const supabase = createClient()
    await supabase.from('weekly_plans').update({ config: next }).eq('id', planId)
  }

  function adjustCount(type: MealType, delta: number) {
    const current = config[type]
    const next = Math.max(0, Math.min(7, current + delta))
    saveConfig({ ...config, [type]: next })
  }

  function adjustRatio(value: number) {
    saveConfig({ ...config, library_ratio: value / 100 })
  }

  function addIngredient() {
    const val = ingredientInput.trim().toLowerCase()
    if (!val) return
    const current = config.ingredients_to_use ?? []
    if (!current.includes(val)) {
      saveConfig({ ...config, ingredients_to_use: [...current, val] })
    }
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

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-4 flex-wrap">
      {/* Meal type chips */}
      {MEAL_TYPES.map((type) => {
        const count = config[type]
        return (
          <div key={type} className="flex items-center gap-1">
            <span className="text-sm text-gray-500">
              {MEAL_TYPE_ICONS[type]} {MEAL_TYPE_LABELS[type]}
            </span>
            <div className={cn(
              'flex items-center gap-0.5 bg-gray-100 rounded-full px-1.5 py-0.5',
            )}>
              <button
                onClick={() => adjustCount(type, -1)}
                className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-900 text-xs"
              >
                −
              </button>
              <span className="w-4 text-center text-xs font-semibold text-gray-700">{count}</span>
              <button
                onClick={() => adjustCount(type, 1)}
                className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-900 text-xs"
              >
                +
              </button>
            </div>
          </div>
        )
      })}

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Source mix */}
      <div className="relative">
        <button
          onClick={() => { setShowRatioSlider((v) => !v); setShowIngredients(false) }}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="text-brand-600 font-medium">{libraryPct}% library</span>
          {' · '}
          <span className="text-purple-600 font-medium">{newPct}% new</span>
        </button>

        {showRatioSlider && (
          <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-gray-200 rounded-lg shadow-sm p-4 w-56">
            <p className="text-xs text-gray-500 mb-2">Source mix</p>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={libraryPct}
              onChange={(e) => adjustRatio(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>All new</span>
              <span>All library</span>
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Use-up ingredients */}
      <div className="relative">
        <button
          onClick={() => { setShowIngredients((v) => !v); setShowRatioSlider(false) }}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1.5"
        >
          <span>Use up</span>
          {useUpCount > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
              {useUpCount}
            </span>
          )}
        </button>

        {showIngredients && (
          <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-gray-200 rounded-lg shadow-md p-4 w-72">
            <p className="text-xs font-medium text-gray-700 mb-1">Ingredients to use up</p>
            <p className="text-xs text-gray-400 mb-3">
              Claude will prioritise these when suggesting new recipes.
            </p>

            {/* Existing chips */}
            {useUpCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(config.ingredients_to_use ?? []).map((ing) => (
                  <span
                    key={ing}
                    className="flex items-center gap-1 text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full"
                  >
                    {ing}
                    <button
                      onClick={() => removeIngredient(ing)}
                      className="text-amber-400 hover:text-amber-700 leading-none ml-0.5"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add input */}
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
              <button onClick={addIngredient} className="btn-secondary text-sm">
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
