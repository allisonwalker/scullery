'use client'

import { useEffect, useState } from 'react'
import NavBar from '@/components/nav/NavBar'
import { createClient } from '@/lib/supabase/client'
import type { GroceryList, GroceryItem } from '@/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/lib/grocery/categories'
import { getMondayOfWeek, formatWeekStart, cn } from '@/lib/utils'

export default function GroceryPage() {
  const [list, setList] = useState<GroceryList | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [recipeMap, setRecipeMap] = useState<Record<string, string>>({})
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ name: '', quantity: '', unit: '' })

  async function loadRecipeMap(gl: GroceryList) {
    const allIds = [...new Set(gl.items.flatMap((i) => i.recipe_ids ?? []))]
    if (allIds.length === 0) return
    const supabase = createClient()
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, title')
      .in('id', allIds)
    const map: Record<string, string> = {}
    for (const r of recipes ?? []) map[r.id] = r.title
    setRecipeMap(map)
  }

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single()

      if (!profile?.household_id) return
      setHouseholdId(profile.household_id)

      const weekStart = formatWeekStart(getMondayOfWeek(new Date()))
      const { data: plan } = await supabase
        .from('weekly_plans')
        .select('id')
        .eq('household_id', profile.household_id)
        .eq('week_start', weekStart)
        .single()

      if (!plan) { setLoading(false); return }

      const { data: grocery } = await supabase
        .from('grocery_lists')
        .select('*')
        .eq('plan_id', plan.id)
        .single()

      const gl = grocery as GroceryList | null
      setList(gl)
      if (gl) await loadRecipeMap(gl)
      setLoading(false)
    }
    load()
  }, [])

  async function generate() {
    if (!householdId) return
    setGenerating(true)
    const res = await fetch('/api/grocery/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ household_id: householdId }),
    })
    if (res.ok) {
      const data = await res.json()
      setList(data.list)
      if (data.list) loadRecipeMap(data.list)
    }
    setGenerating(false)
  }

  async function toggleItem(realIdx: number) {
    if (!list) return
    const supabase = createClient()
    const updated = list.items.map((item, i) =>
      i === realIdx ? { ...item, checked: !item.checked } : item,
    )
    setList({ ...list, items: updated })
    await supabase.from('grocery_lists').update({ items: updated }).eq('id', list.id)
  }

  async function removeItem(realIdx: number) {
    if (!list) return
    const supabase = createClient()
    const updated = list.items.filter((_, i) => i !== realIdx)
    setList({ ...list, items: updated })
    await supabase.from('grocery_lists').update({ items: updated }).eq('id', list.id)
  }

  async function toggleExtra(idx: number) {
    if (!list) return
    const supabase = createClient()
    const updated = list.extra_items.map((item, i) =>
      i === idx ? { ...item, checked: !item.checked } : item,
    )
    setList({ ...list, extra_items: updated })
    await supabase.from('grocery_lists').update({ extra_items: updated }).eq('id', list.id)
  }

  async function removeExtra(idx: number) {
    if (!list) return
    const supabase = createClient()
    const updated = list.extra_items.filter((_, i) => i !== idx)
    setList({ ...list, extra_items: updated })
    await supabase.from('grocery_lists').update({ extra_items: updated }).eq('id', list.id)
  }

  async function addExtraItem() {
    if (!list || !newItem.trim()) return
    const supabase = createClient()
    const updated = [...list.extra_items, { name: newItem.trim(), checked: false }]
    setList({ ...list, extra_items: updated })
    setNewItem('')
    await supabase.from('grocery_lists').update({ extra_items: updated }).eq('id', list.id)
  }

  function startEdit(idx: number, item: GroceryItem) {
    setEditingIdx(idx)
    setEditForm({ name: item.name, quantity: String(item.quantity), unit: item.unit })
  }

  async function saveEdit(realIdx: number) {
    if (!list) return
    const supabase = createClient()
    const updated = list.items.map((item, i) =>
      i === realIdx
        ? { ...item, name: editForm.name.trim() || item.name, quantity: editForm.quantity.trim(), unit: editForm.unit.trim() }
        : item,
    )
    setList({ ...list, items: updated })
    setEditingIdx(null)
    await supabase.from('grocery_lists').update({ items: updated }).eq('id', list.id)
  }

  function copyToClipboard() {
    if (!list) return
    const lines: string[] = []
    for (const cat of CATEGORY_ORDER) {
      const items = list.items.filter((i) => i.category === cat)
      if (!items.length) continue
      lines.push(`\n${CATEGORY_LABELS[cat].toUpperCase()}`)
      for (const item of items) {
        lines.push(`${item.checked ? '✓' : '□'} ${item.quantity} ${item.unit} ${item.name}`.trim())
      }
    }
    if (list.extra_items.length > 0) {
      lines.push('\nEXTRA')
      for (const item of list.extra_items) {
        lines.push(`${item.checked ? '✓' : '□'} ${item.name}`)
      }
    }
    navigator.clipboard.writeText(lines.join('\n'))
  }

  const grouped = CATEGORY_ORDER.reduce<Record<string, GroceryItem[]>>((acc, cat) => {
    acc[cat] = (list?.items ?? []).filter((i) => i.category === cat)
    return acc
  }, {})

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-4 pt-5 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-800">Grocery List</h1>
          <div className="flex gap-2">
            {list && (
              <button onClick={copyToClipboard} className="btn-secondary text-sm">
                Share list
              </button>
            )}
            <button onClick={generate} disabled={generating} className="btn-primary text-sm">
              {generating ? 'Generating…' : list ? '↺ Regenerate' : 'Generate list'}
            </button>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {!loading && !list && (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">No grocery list yet for this week.</p>
            <button onClick={generate} disabled={generating} className="btn-primary">
              {generating ? 'Generating…' : "Generate from this week's plan"}
            </button>
          </div>
        )}

        {list && (
          <div className="space-y-4">
            {CATEGORY_ORDER.map((cat) => {
              const items = grouped[cat]
              if (!items.length) return null
              return (
                <div key={cat}>
                  <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-2.5">
                    {CATEGORY_LABELS[cat]}
                  </h2>
                  <div className="space-y-0.5">
                    {items.map((item, idx) => {
                      const realIdx = list.items.indexOf(item)
                      const isEditing = editingIdx === realIdx
                      const recipeNames = (item.recipe_ids ?? [])
                        .map((id) => recipeMap[id])
                        .filter(Boolean)
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-1 rounded-lg group hover:bg-gray-50',
                            item.checked && !isEditing && 'opacity-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => { if (isEditing) setEditingIdx(null); toggleItem(realIdx) }}
                            className="accent-brand-500 w-4 h-4 rounded cursor-pointer shrink-0"
                          />

                          {isEditing ? (
                            <>
                              <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(realIdx)
                                  if (e.key === 'Escape') setEditingIdx(null)
                                }}
                                className="input text-sm flex-1 min-w-0"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editForm.quantity}
                                onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(realIdx)
                                  if (e.key === 'Escape') setEditingIdx(null)
                                }}
                                className="input text-sm w-14 text-center"
                                placeholder="qty"
                              />
                              <input
                                type="text"
                                value={editForm.unit}
                                onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(realIdx)
                                  if (e.key === 'Escape') setEditingIdx(null)
                                }}
                                className="input text-sm w-16"
                                placeholder="unit"
                              />
                              <button
                                onClick={() => saveEdit(realIdx)}
                                className="text-brand-600 hover:text-brand-800 text-sm font-medium shrink-0"
                                title="Save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => setEditingIdx(null)}
                                className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
                                title="Cancel"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <span
                                  className={cn(
                                    'text-sm cursor-text leading-none',
                                    item.checked && 'line-through',
                                  )}
                                  onClick={() => !item.checked && startEdit(realIdx, item)}
                                  title="Click to edit"
                                >
                                  {item.name}
                                </span>
                                {recipeNames.length > 0 && (
                                  <div className="overflow-hidden max-h-0 group-hover:max-h-4 transition-all duration-150">
                                    <p className="text-[11px] text-gray-400 truncate pt-0.5">
                                      {recipeNames.join(' · ')}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                                {item.quantity} {item.unit}
                              </span>
                              <button
                                onClick={() => removeItem(realIdx)}
                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-base leading-none shrink-0"
                                title="Remove item"
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Extra items */}
            <div>
              <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-2.5">
                Extra
              </h2>
              <div className="space-y-0.5">
                {list.extra_items.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1 rounded-lg group hover:bg-gray-50',
                      item.checked && 'opacity-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleExtra(idx)}
                      className="accent-brand-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className={cn('text-sm flex-1 leading-none', item.checked && 'line-through')}>
                      {item.name}
                    </span>
                    <button
                      onClick={() => removeExtra(idx)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-base leading-none"
                      title="Remove item"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Add item…"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addExtraItem()}
                />
                <button onClick={addExtraItem} className="btn-secondary">Add</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
