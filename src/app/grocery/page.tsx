'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import NavBar from '@/components/nav/NavBar'
import { createClient } from '@/lib/supabase/client'
import type { GroceryList, GroceryItem } from '@/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/lib/grocery/categories'
import { getMondayOfWeek, formatWeekStart, weekLabel, cn } from '@/lib/utils'
import { ChefHat, X } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface WeekOption {
  weekStart: string   // YYYY-MM-DD
  label: string
  planId: string | null
}

interface MergedItem {
  name: string
  quantity: string
  unit: string
  category: string
  recipe_ids: string[]
  itemKey: string      // `${name.lower()}|${unit.lower()}` – stable identity
}

// ── Merge utility ────────────────────────────────────────────────────────────

function mergeListsToGrouped(groceryLists: GroceryList[]): Record<string, MergedItem[]> {
  const merged = new Map<string, MergedItem>()

  for (const gl of groceryLists) {
    for (const item of gl.items) {
      const key = `${item.name.toLowerCase().trim()}|${item.unit.toLowerCase().trim()}`
      const existing = merged.get(key)
      if (existing) {
        // Sum numeric quantities
        const q1 = parseFloat(String(existing.quantity).replace(/[^\d.]/g, '')) || 0
        const q2 = parseFloat(String(item.quantity).replace(/[^\d.]/g, '')) || 0
        if (q1 && q2) existing.quantity = String(Math.round((q1 + q2) * 10) / 10)
        for (const id of item.recipe_ids ?? []) {
          if (!existing.recipe_ids.includes(id)) existing.recipe_ids.push(id)
        }
      } else {
        merged.set(key, {
          name: item.name,
          quantity: String(item.quantity),
          unit: item.unit,
          category: item.category,
          recipe_ids: [...(item.recipe_ids ?? [])],
          itemKey: key,
        })
      }
    }
  }

  const grouped: Record<string, MergedItem[]> = {}
  for (const item of merged.values()) {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  }
  return grouped
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GroceryPage() {
  const [householdId, setHouseholdId]       = useState<string | null>(null)
  const [availableWeeks, setAvailableWeeks] = useState<WeekOption[]>([])
  const [selectedWeeks, setSelectedWeeks]   = useState<string[]>([])
  // planId → GroceryList (loaded on demand)
  const [lists, setLists]                   = useState<Record<string, GroceryList>>({})
  const [loading, setLoading]               = useState(true)
  const [generating, setGenerating]         = useState(false)
  const [newItem, setNewItem]               = useState('')
  const [recipeMap, setRecipeMap]           = useState<Record<string, string>>({})
  const [editingIdx, setEditingIdx]         = useState<number | null>(null)
  const [editForm, setEditForm]             = useState({ name: '', quantity: '', unit: '' })
  // Multi-week: checked state lives in sessionStorage
  const [multiChecked, setMultiChecked]     = useState<Record<string, boolean>>({})

  const currentWeekStart = formatWeekStart(getMondayOfWeek(new Date()))
  const isMultiWeek = selectedWeeks.length > 1

  // Plan IDs for the currently selected weeks (in order)
  const selectedPlanIds = useMemo(() =>
    selectedWeeks
      .map(w => availableWeeks.find(o => o.weekStart === w)?.planId)
      .filter((id): id is string => !!id),
  [selectedWeeks, availableWeeks])

  // Single-week: the one loaded list (or null)
  const singleList: GroceryList | null = !isMultiWeek
    ? (lists[selectedPlanIds[0]] ?? null)
    : null

  // Multi-week: merged items grouped by category
  const mergedByCategory = useMemo(() => {
    if (!isMultiWeek) return null
    const active = selectedPlanIds.map(id => lists[id]).filter(Boolean) as GroceryList[]
    return active.length ? mergeListsToGrouped(active) : null
  }, [isMultiWeek, selectedPlanIds, lists])

  // ── Helpers ────────────────────────────────────────────────────────────────

  const loadRecipeMap = useCallback(async (groceryLists: GroceryList[]) => {
    const allIds = [...new Set(groceryLists.flatMap(gl => gl.items.flatMap(i => i.recipe_ids ?? [])))]
    if (!allIds.length) return
    const supabase = createClient()
    const { data: recipes } = await supabase.from('recipes').select('id, title').in('id', allIds)
    const map: Record<string, string> = {}
    for (const r of recipes ?? []) map[r.id] = r.title
    setRecipeMap(prev => ({ ...prev, ...map }))
  }, [])

  const multiSessionKey = useMemo(() =>
    `grocery_multi_${[...selectedWeeks].sort().join('_')}`,
  [selectedWeeks])

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles').select('household_id').eq('id', user.id).single()
      if (!profile?.household_id) { setLoading(false); return }
      setHouseholdId(profile.household_id)

      // All plans for this household, newest first
      const { data: plans } = await supabase
        .from('weekly_plans')
        .select('id, week_start')
        .eq('household_id', profile.household_id)
        .order('week_start', { ascending: false })
        .limit(24)

      // Build week options from plans
      const planWeekStarts = new Set((plans ?? []).map(p => p.week_start))
      const weeks: WeekOption[] = (plans ?? []).map(p => ({
        weekStart: p.week_start,
        label: weekLabel(new Date(p.week_start + 'T12:00:00')),
        planId: p.id,
      }))

      // Always show current week even if no plan exists
      if (!planWeekStarts.has(currentWeekStart)) {
        weeks.unshift({
          weekStart: currentWeekStart,
          label: weekLabel(getMondayOfWeek(new Date())),
          planId: null,
        })
      }

      setAvailableWeeks(weeks)
      setSelectedWeeks([currentWeekStart])

      // Eagerly load this week's grocery list
      const currentPlan = (plans ?? []).find(p => p.week_start === currentWeekStart)
      if (currentPlan) {
        const { data: grocery } = await supabase
          .from('grocery_lists').select('*').eq('plan_id', currentPlan.id).single()
        if (grocery) {
          setLists({ [currentPlan.id]: grocery as GroceryList })
          await loadRecipeMap([grocery as GroceryList])
        }
      }

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load lists when selected plan IDs change (lazy-load each week on first select)
  const planIdKey = selectedPlanIds.join(',')
  useEffect(() => {
    if (!planIdKey) return
    const supabase = createClient()
    async function loadMissing() {
      const missing = selectedPlanIds.filter(id => !lists[id])
      if (!missing.length) return
      const { data: rows } = await supabase
        .from('grocery_lists').select('*').in('plan_id', missing)
      const next: Record<string, GroceryList> = { ...lists }
      for (const row of rows ?? []) next[row.plan_id] = row as GroceryList
      setLists(next)
      await loadRecipeMap(Object.values(next).filter(Boolean) as GroceryList[])
    }
    loadMissing()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planIdKey])

  // Restore multi-week checked state from sessionStorage
  useEffect(() => {
    if (!isMultiWeek) return
    try {
      const saved = sessionStorage.getItem(multiSessionKey)
      setMultiChecked(saved ? JSON.parse(saved) : {})
    } catch { setMultiChecked({}) }
  }, [isMultiWeek, multiSessionKey])

  // ── Interactions ──────────────────────────────────────────────────────────

  function toggleWeek(weekStart: string) {
    setSelectedWeeks(prev => {
      if (prev.includes(weekStart)) {
        return prev.length === 1 ? prev : prev.filter(w => w !== weekStart)
      }
      return [...prev, weekStart].sort()
    })
    setEditingIdx(null)
  }

  async function generate() {
    if (!householdId || !selectedWeeks.length) return
    setGenerating(true)
    const res = await fetch('/api/grocery/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ household_id: householdId, week_starts: selectedWeeks }),
    })
    if (res.ok) {
      const data = await res.json()
      const next = { ...lists }
      for (const [weekStart, list] of Object.entries(data.lists ?? {})) {
        const planId = availableWeeks.find(w => w.weekStart === weekStart)?.planId
        if (planId) next[planId] = list as GroceryList
      }
      setLists(next)
      await loadRecipeMap(Object.values(next).filter(Boolean) as GroceryList[])
      if (isMultiWeek) {
        setMultiChecked({})
        sessionStorage.removeItem(multiSessionKey)
      }
    }
    setGenerating(false)
  }

  // ── Single-week item operations ───────────────────────────────────────────

  async function toggleItem(realIdx: number) {
    if (!singleList || !selectedPlanIds[0]) return
    const planId = selectedPlanIds[0]
    const supabase = createClient()
    const updated = singleList.items.map((item, i) =>
      i === realIdx ? { ...item, checked: !item.checked } : item)
    setLists(prev => ({ ...prev, [planId]: { ...singleList, items: updated } }))
    await supabase.from('grocery_lists').update({ items: updated }).eq('id', singleList.id)
  }

  async function removeItem(realIdx: number) {
    if (!singleList || !selectedPlanIds[0]) return
    const planId = selectedPlanIds[0]
    const supabase = createClient()
    const updated = singleList.items.filter((_, i) => i !== realIdx)
    setLists(prev => ({ ...prev, [planId]: { ...singleList, items: updated } }))
    await supabase.from('grocery_lists').update({ items: updated }).eq('id', singleList.id)
  }

  async function saveEdit(realIdx: number) {
    if (!singleList || !selectedPlanIds[0]) return
    const planId = selectedPlanIds[0]
    const supabase = createClient()
    const updated = singleList.items.map((item, i) =>
      i === realIdx
        ? { ...item,
            name: editForm.name.trim() || item.name,
            quantity: editForm.quantity.trim(),
            unit: editForm.unit.trim() }
        : item)
    setLists(prev => ({ ...prev, [planId]: { ...singleList, items: updated } }))
    setEditingIdx(null)
    await supabase.from('grocery_lists').update({ items: updated }).eq('id', singleList.id)
  }

  async function toggleExtra(idx: number) {
    if (!singleList || !selectedPlanIds[0]) return
    const planId = selectedPlanIds[0]
    const supabase = createClient()
    const updated = singleList.extra_items.map((item, i) =>
      i === idx ? { ...item, checked: !item.checked } : item)
    setLists(prev => ({ ...prev, [planId]: { ...singleList, extra_items: updated } }))
    await supabase.from('grocery_lists').update({ extra_items: updated }).eq('id', singleList.id)
  }

  async function removeExtra(idx: number) {
    if (!singleList || !selectedPlanIds[0]) return
    const planId = selectedPlanIds[0]
    const supabase = createClient()
    const updated = singleList.extra_items.filter((_, i) => i !== idx)
    setLists(prev => ({ ...prev, [planId]: { ...singleList, extra_items: updated } }))
    await supabase.from('grocery_lists').update({ extra_items: updated }).eq('id', singleList.id)
  }

  async function addExtraItem() {
    if (!singleList || !newItem.trim() || !selectedPlanIds[0]) return
    const planId = selectedPlanIds[0]
    const supabase = createClient()
    const updated = [...singleList.extra_items, { name: newItem.trim(), checked: false }]
    setLists(prev => ({ ...prev, [planId]: { ...singleList, extra_items: updated } }))
    setNewItem('')
    await supabase.from('grocery_lists').update({ extra_items: updated }).eq('id', singleList.id)
  }

  // ── Multi-week toggle (sessionStorage) ───────────────────────────────────

  function toggleMultiItem(itemKey: string) {
    setMultiChecked(prev => {
      const next = { ...prev, [itemKey]: !prev[itemKey] }
      sessionStorage.setItem(multiSessionKey, JSON.stringify(next))
      return next
    })
  }

  // ── Clipboard ─────────────────────────────────────────────────────────────

  function copyToClipboard() {
    const lines: string[] = []
    if (isMultiWeek && mergedByCategory) {
      for (const cat of CATEGORY_ORDER) {
        const items = mergedByCategory[cat] ?? []
        if (!items.length) continue
        lines.push(`\n${CATEGORY_LABELS[cat].toUpperCase()}`)
        for (const item of items) {
          const checked = multiChecked[item.itemKey]
          lines.push(`${checked ? '✓' : '□'} ${item.quantity} ${item.unit} ${item.name}`.trim())
        }
      }
    } else if (singleList) {
      for (const cat of CATEGORY_ORDER) {
        const items = singleList.items.filter(i => i.category === cat)
        if (!items.length) continue
        lines.push(`\n${CATEGORY_LABELS[cat].toUpperCase()}`)
        for (const item of items)
          lines.push(`${item.checked ? '✓' : '□'} ${item.quantity} ${item.unit} ${item.name}`.trim())
      }
      if (singleList.extra_items.length) {
        lines.push('\nEXTRA')
        for (const item of singleList.extra_items)
          lines.push(`${item.checked ? '✓' : '□'} ${item.name}`)
      }
    }
    navigator.clipboard.writeText(lines.join('\n'))
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const anyListExists  = selectedPlanIds.some(id => !!lists[id])
  const allListsExist  = selectedPlanIds.length > 0 && selectedPlanIds.every(id => !!lists[id])
  const hasSelectablePlan = availableWeeks.some(w => w.planId && selectedWeeks.includes(w.weekStart))

  const groupedSingle = CATEGORY_ORDER.reduce<Record<string, GroceryItem[]>>((acc, cat) => {
    acc[cat] = (singleList?.items ?? []).filter(i => i.category === cat)
    return acc
  }, {})

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-4 pt-5 max-w-2xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-800">Grocery List</h1>
          <div className="flex gap-2">
            {anyListExists && (
              <button onClick={copyToClipboard} className="btn-secondary text-sm">
                Share list
              </button>
            )}
            <button
              onClick={generate}
              disabled={generating || !hasSelectablePlan}
              className="btn-primary text-sm"
            >
              {generating
                ? 'Generating…'
                : allListsExist
                  ? '↺ Regenerate'
                  : isMultiWeek
                    ? `Generate (${selectedWeeks.length} weeks)`
                    : 'Generate list'}
            </button>
          </div>
        </div>

        {/* Week picker — only shown when there are multiple weeks to choose from */}
        {availableWeeks.filter(w => w.planId).length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide">
            {availableWeeks.map(opt => {
              const isSelected = selectedWeeks.includes(opt.weekStart)
              const hasList    = opt.planId ? !!lists[opt.planId] : false
              const disabled   = !opt.planId

              return (
                <button
                  key={opt.weekStart}
                  onClick={() => !disabled && toggleWeek(opt.weekStart)}
                  disabled={disabled}
                  title={disabled ? 'No meal plan for this week' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-medium',
                    'whitespace-nowrap shrink-0 transition-colors',
                    disabled
                      ? 'opacity-30 cursor-not-allowed bg-white border-gray-100 text-gray-400'
                      : isSelected
                        ? 'bg-brand-500 border-brand-500 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600',
                  )}
                >
                  {opt.label}
                  {!disabled && (
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      hasList
                        ? isSelected ? 'bg-white/70' : 'bg-brand-400'
                        : 'bg-transparent',
                    )} />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Multi-week info banner */}
        {isMultiWeek && (
          <p className="text-xs text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 mb-4">
            Combined list for {selectedWeeks.length} weeks — ingredients are merged by type.
            Checkmarks are saved for this session.
          </p>
        )}

        {loading && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}

        {/* Empty state */}
        {!loading && !anyListExists && (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">
              {!hasSelectablePlan
                ? 'No meal plan for the selected week.'
                : 'No grocery list yet.'}
            </p>
            {hasSelectablePlan && (
              <button onClick={generate} disabled={generating} className="btn-primary">
                {generating
                  ? 'Generating…'
                  : isMultiWeek
                    ? `Generate for ${selectedWeeks.length} weeks`
                    : "Generate from this week's plan"}
              </button>
            )}
          </div>
        )}

        {/* ── Single-week list ─────────────────────────────────────────────── */}
        {!isMultiWeek && singleList && (
          <div className="space-y-4">
            {CATEGORY_ORDER.map(cat => {
              const items = groupedSingle[cat]
              if (!items.length) return null
              return (
                <div key={cat}>
                  <h2 className="text-xs font-semibold text-gray-500 mb-1.5 px-3">
                    {CATEGORY_LABELS[cat]}
                  </h2>
                  <div className="space-y-0.5">
                    {items.map((item, idx) => {
                      const realIdx   = singleList.items.indexOf(item)
                      const isEditing = editingIdx === realIdx
                      const recipeNames = (item.recipe_ids ?? []).map(id => recipeMap[id]).filter(Boolean)
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg group hover:bg-white hover:shadow-sm transition-all',
                            item.checked && !isEditing && 'opacity-50',
                          )}
                        >
                          {/* Checkbox — standalone, never blocked */}
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => { if (isEditing) setEditingIdx(null); toggleItem(realIdx) }}
                            className="accent-brand-500 w-4 h-4 rounded cursor-pointer shrink-0"
                          />

                          {isEditing ? (
                            <>
                              <input
                                type="text" value={editForm.name} autoFocus
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(realIdx); if (e.key === 'Escape') setEditingIdx(null) }}
                                className="input text-sm flex-1 min-w-0"
                              />
                              <input
                                type="text" value={editForm.quantity} placeholder="qty"
                                onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(realIdx); if (e.key === 'Escape') setEditingIdx(null) }}
                                className="input text-sm w-14 text-center"
                              />
                              <input
                                type="text" value={editForm.unit} placeholder="unit"
                                onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(realIdx); if (e.key === 'Escape') setEditingIdx(null) }}
                                className="input text-sm w-16"
                              />
                              <button onClick={() => saveEdit(realIdx)} className="text-brand-600 hover:text-brand-800 text-sm font-medium shrink-0">✓</button>
                              <button onClick={() => setEditingIdx(null)} className="text-gray-400 hover:text-gray-600 text-sm shrink-0">✕</button>
                            </>
                          ) : (
                            <>
                              {/* Item name — click to edit */}
                              <span
                                className={cn('flex-1 min-w-0 text-sm leading-snug cursor-text select-none', item.checked && 'line-through')}
                                onClick={() => !item.checked && (setEditingIdx(realIdx), setEditForm({ name: item.name, quantity: String(item.quantity), unit: item.unit }))}
                                title="Tap to edit"
                              >
                                {item.name}
                              </span>

                              {/* Quantity */}
                              <span className="text-xs text-gray-400 shrink-0 tabular-nums">{item.quantity} {item.unit}</span>

                              {/* Recipe info — right side, hover tooltip */}
                              {recipeNames.length > 0 && (
                                <div className="relative group/recipe shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button
                                    className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-brand-500 rounded transition-colors"
                                    title={recipeNames.join(', ')}
                                    aria-label={`Used in: ${recipeNames.join(', ')}`}
                                  >
                                    <ChefHat size={12} />
                                  </button>
                                  {/* Desktop tooltip */}
                                  <div className="hidden sm:block absolute right-0 bottom-full mb-2 z-20 pointer-events-none
                                                  opacity-0 group-hover/recipe:opacity-100 transition-opacity duration-150">
                                    <div className="bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                      <p className="text-gray-400 text-[10px] mb-1 font-medium uppercase tracking-wide">Used in</p>
                                      {recipeNames.map((name, i) => <p key={i}>{name}</p>)}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => removeItem(realIdx)}
                                className="shrink-0 text-gray-300 hover:text-red-400 transition-colors
                                           opacity-100 sm:opacity-0 sm:group-hover:opacity-100
                                           w-6 h-6 flex items-center justify-center rounded"
                                title="Remove"
                              >
                                <X size={13} />
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
              <h2 className="text-xs font-semibold text-gray-500 mb-1.5 px-3">Extra</h2>
              <div className="space-y-0.5">
                {singleList.extra_items.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn('flex items-center gap-2 px-3 py-2 rounded-lg group hover:bg-white hover:shadow-sm transition-all', item.checked && 'opacity-50')}
                  >
                    <input
                      type="checkbox" checked={item.checked}
                      onChange={() => toggleExtra(idx)}
                      className="accent-brand-500 w-4 h-4 rounded cursor-pointer"
                    />
                    <span className={cn('text-sm flex-1 leading-snug select-none', item.checked && 'line-through')}>{item.name}</span>
                    <button
                      onClick={() => removeExtra(idx)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all
                                 w-6 h-6 flex items-center justify-center rounded"
                      title="Remove"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="text" className="input flex-1" placeholder="Add item…"
                  value={newItem} onChange={e => setNewItem(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addExtraItem()}
                />
                <button onClick={addExtraItem} className="btn-secondary">Add</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Multi-week combined list ──────────────────────────────────────── */}
        {isMultiWeek && mergedByCategory && anyListExists && (
          <div className="space-y-4">
            {CATEGORY_ORDER.map(cat => {
              const items = mergedByCategory[cat] ?? []
              if (!items.length) return null
              return (
                <div key={cat}>
                  <h2 className="text-xs font-semibold text-gray-500 mb-1.5 px-3">
                    {CATEGORY_LABELS[cat]}
                  </h2>
                  <div className="space-y-0.5">
                    {items.map(item => {
                      const checked      = !!multiChecked[item.itemKey]
                      const recipeNames  = item.recipe_ids.map(id => recipeMap[id]).filter(Boolean)
                      return (
                        <div
                          key={item.itemKey}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg group hover:bg-white hover:shadow-sm transition-all',
                            checked && 'opacity-50',
                          )}
                        >
                          <input
                            type="checkbox" checked={checked}
                            onChange={() => toggleMultiItem(item.itemKey)}
                            className="accent-brand-500 w-4 h-4 rounded cursor-pointer shrink-0"
                          />
                          <span className={cn('flex-1 min-w-0 text-sm leading-snug select-none', checked && 'line-through')}>
                            {item.name}
                          </span>
                          <span className="text-xs text-gray-400 shrink-0 tabular-nums">{item.quantity} {item.unit}</span>

                          {/* Recipe info — right side tooltip */}
                          {recipeNames.length > 0 && (
                            <div className="relative group/recipe shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-brand-500 rounded transition-colors"
                                title={recipeNames.join(', ')}
                                aria-label={`Used in: ${recipeNames.join(', ')}`}
                              >
                                <ChefHat size={12} />
                              </button>
                              <div className="hidden sm:block absolute right-0 bottom-full mb-2 z-20 pointer-events-none
                                              opacity-0 group-hover/recipe:opacity-100 transition-opacity duration-150">
                                <div className="bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                  <p className="text-gray-400 text-[10px] mb-1 font-medium uppercase tracking-wide">Used in</p>
                                  {recipeNames.map((name, i) => <p key={i}>{name}</p>)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-gray-400 text-center pt-2">
              Showing combined ingredients from {selectedWeeks.length} weeks.
              Switch to a single week to edit or add items.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
