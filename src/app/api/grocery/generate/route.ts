import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateGroceryItems } from '@/lib/grocery/generator'
import type { PlanSlot, Recipe } from '@/types'

export async function POST(request: Request) {
  const body = await request.json()
  const { household_id, week_starts } = body

  if (!household_id) {
    return NextResponse.json({ error: 'household_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get household pantry staples
  const { data: household } = await supabase
    .from('households')
    .select('pantry_staples')
    .eq('id', household_id)
    .single()

  const pantryStaples: string[] = household?.pantry_staples ?? []

  // Resolve the list of week starts to generate for
  const weeks: string[] = Array.isArray(week_starts) && week_starts.length > 0
    ? week_starts
    : [body.week_start].filter(Boolean)

  if (weeks.length === 0) {
    return NextResponse.json({ error: 'week_starts required' }, { status: 400 })
  }

  // Generate a grocery list for each requested week
  const lists: Record<string, unknown> = {}

  for (const weekStart of weeks) {
    const { data: plan } = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('household_id', household_id)
      .eq('week_start', weekStart)
      .single()

    if (!plan) continue  // no plan for this week — skip silently

    const { data: rawSlots } = await supabase
      .from('plan_slots')
      .select('*, recipe:recipes(*)')
      .eq('plan_id', plan.id)
      .not('recipe_id', 'is', null)

    const slots = (rawSlots ?? []) as (PlanSlot & { recipe: Recipe })[]
    const items = generateGroceryItems(slots, pantryStaples)

    // Upsert: preserve extra_items when regenerating
    const { data: existing } = await supabase
      .from('grocery_lists')
      .select('id, extra_items')
      .eq('plan_id', plan.id)
      .single()

    let list
    if (existing) {
      const { data } = await supabase
        .from('grocery_lists')
        .update({ items, extra_items: existing.extra_items })
        .eq('id', existing.id)
        .select()
        .single()
      list = data
    } else {
      const { data } = await supabase
        .from('grocery_lists')
        .insert({ household_id, plan_id: plan.id, items, extra_items: [] })
        .select()
        .single()
      list = data
    }

    if (list) lists[weekStart] = list
  }

  return NextResponse.json({ lists })
}
