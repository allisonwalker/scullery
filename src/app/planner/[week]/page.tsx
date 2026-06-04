import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { parseWeekStart } from '@/lib/utils'
import NavBar from '@/components/nav/NavBar'
import PlannerGrid from '@/components/planner/PlannerGrid'
import type { WeeklyPlan, PlanSlot } from '@/types'

interface Props {
  params: Promise<{ week: string }>
}

export default async function PlannerWeekPage({ params }: Props) {
  const { week } = await params

  // Validate week param format: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) notFound()

  const weekStart = parseWeekStart(week)
  if (isNaN(weekStart.getTime())) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get profile + household
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    // Profile missing — show a friendly prompt instead of redirecting to /login
    // (redirecting there creates a loop because middleware bounces logged-in users back)
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <p className="text-lg font-semibold text-gray-800 mb-2">Your account isn't set up yet</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            It looks like your household hasn't been created. Try signing out and back in, or
            contact whoever invited you to make sure the invitation is still active.
          </p>
          <a href="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    )
  }
  const householdId = profile.household_id

  // Get household preferences
  const { data: household } = await supabase
    .from('households')
    .select('dietary_preferences, pantry_staples')
    .eq('id', householdId)
    .single()

  // Get or create the weekly plan for this week
  let plan: WeeklyPlan | null = null
  const { data: existingPlan } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('household_id', householdId)
    .eq('week_start', week)
    .single()

  if (existingPlan) {
    plan = existingPlan
  } else {
    const { data: newPlan } = await supabase
      .from('weekly_plans')
      .insert({
        household_id: householdId,
        week_start: week,
        config: { breakfast: 2, lunch: 4, dinner: 5, snack: 0, library_ratio: 0.6 },
      })
      .select()
      .single()
    plan = newPlan
  }

  if (!plan) notFound()

  // Load all slots with recipes
  const { data: slots } = await supabase
    .from('plan_slots')
    .select('*, recipe:recipes(*)')
    .eq('plan_id', plan.id)
    .order('sort_order')

  // Grab recent recipe titles for AI context
  const { data: recentSlots } = await supabase
    .from('plan_slots')
    .select('recipe:recipes(title)')
    .eq('plan_id', plan.id)
    .not('recipe_id', 'is', null)
    .limit(20)

  const recentTitles = (recentSlots ?? [])
    .flatMap((s) => {
      const r = s.recipe as { title: string }[] | { title: string } | null
      if (!r) return []
      if (Array.isArray(r)) return r.map((x) => x.title)
      return [r.title]
    })
    .filter((t): t is string => typeof t === 'string')

  return (
    <div className="h-screen flex flex-col">
      <NavBar />
      <PlannerGrid
        plan={plan}
        slots={(slots ?? []) as PlanSlot[]}
        householdId={householdId}
        weekStart={weekStart}
        recentTitles={recentTitles}
        preferences={household?.dietary_preferences ?? []}
      />
    </div>
  )
}
