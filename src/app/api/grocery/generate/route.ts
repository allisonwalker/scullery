import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateGroceryItems } from '@/lib/grocery/generator'
import type { PlanSlot, Recipe } from '@/types'
import { getMondayOfWeek, formatWeekStart } from '@/lib/utils'

export async function POST(request: Request) {
  const { household_id } = await request.json()

  if (!household_id) {
    return NextResponse.json({ error: 'household_id required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get household (for pantry staples)
  const { data: household } = await supabase
    .from('households')
    .select('pantry_staples')
    .eq('id', household_id)
    .single()

  const pantryStaples: string[] = household?.pantry_staples ?? []

  // Get current week's plan
  const weekStart = formatWeekStart(getMondayOfWeek(new Date()))
  const { data: plan } = await supabase
    .from('weekly_plans')
    .select('id')
    .eq('household_id', household_id)
    .eq('week_start', weekStart)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'No plan found for this week' }, { status: 404 })
  }

  // Load all slots with recipes
  const { data: rawSlots } = await supabase
    .from('plan_slots')
    .select('*, recipe:recipes(*)')
    .eq('plan_id', plan.id)
    .not('recipe_id', 'is', null)

  const slots = (rawSlots ?? []) as (PlanSlot & { recipe: Recipe })[]

  const items = generateGroceryItems(slots, pantryStaples)

  // Upsert grocery list
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
      .insert({
        household_id,
        plan_id: plan.id,
        items,
        extra_items: [],
      })
      .select()
      .single()
    list = data
  }

  return NextResponse.json({ list })
}
