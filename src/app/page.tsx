import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/nav/NavBar'
import { getMondayOfWeek, formatWeekStart, weekLabel } from '@/lib/utils'
import {
  BookOpen, Settings, ChevronRight,
  ShoppingCart, Sparkles, CircleCheck, Circle,
} from 'lucide-react'
import { OnboardingTour } from '@/components/onboarding/OnboardingTour'

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id, display_name')
    .eq('id', user.id)
    .single()

  const householdId = profile?.household_id
  const monday = getMondayOfWeek(new Date())
  const weekStart = formatWeekStart(monday)
  const currentWeekLabel = weekLabel(monday)

  let recipeCount = 0
  let planId: string | null = null
  let hasGroceryList = false
  let householdName: string | null = null
  // meals per day-of-week (0=Mon … 6=Sun), -1 = no plan
  const mealsPerDay: number[] = Array(7).fill(-1)

  if (householdId) {
    const [recipesRes, planRes, householdRes] = await Promise.all([
      supabase
        .from('recipes')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('is_from_library', true),
      supabase
        .from('weekly_plans')
        .select('id')
        .eq('household_id', householdId)
        .eq('week_start', weekStart)
        .single(),
      supabase
        .from('households')
        .select('name')
        .eq('id', householdId)
        .single(),
    ])

    recipeCount = recipesRes.count ?? 0
    planId = planRes.data?.id ?? null
    householdName = householdRes.data?.name ?? null

    if (planId) {
      const [slotsRes, groceryRes] = await Promise.all([
        supabase
          .from('plan_slots')
          .select('day_of_week')
          .eq('plan_id', planId)
          .not('recipe_id', 'is', null),
        supabase
          .from('grocery_lists')
          .select('id')
          .eq('plan_id', planId)
          .single(),
      ])

      hasGroceryList = !!groceryRes.data

      // Count meals per day
      for (const d of Array(7).fill(0).map((_, i) => i)) mealsPerDay[d] = 0
      for (const slot of slotsRes.data ?? []) {
        mealsPerDay[slot.day_of_week] = (mealsPerDay[slot.day_of_week] ?? 0) + 1
      }
    }
  }

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const totalMeals = mealsPerDay.reduce((n, c) => (c > 0 ? n + c : n), 0)
  const daysWithMeals = mealsPerDay.filter((c) => c > 0).length

  // What day of week is today? (0=Mon … 6=Sun, matching our grid)
  const todayIdx = (() => {
    const d = new Date().getDay() // 0=Sun…6=Sat
    return d === 0 ? 6 : d - 1    // convert to Mon=0
  })()

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      <div className="flex-1 max-w-xl mx-auto w-full px-5 py-8">

        {/* ── Greeting ───────────────────────────────────────────────────── */}
        <div className="mb-8">
          {householdName && (
            <p className="text-sm font-medium text-brand-600 mb-1.5">{householdName}</p>
          )}
          <h1 className="font-serif italic text-[2rem] text-gray-900 leading-tight text-balance">
            {greeting}, {firstName}.
          </h1>
        </div>

        {/* ── This week's plan ───────────────────────────────────────────── */}
        <section className="mb-6" data-tour="tile-planner">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">{currentWeekLabel}</h2>
            <Link
              href={`/planner/${weekStart}`}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Open planner →
            </Link>
          </div>

          {/* 7-day strip */}
          <div className="grid grid-cols-7 gap-1">
            {DAYS_SHORT.map((day, i) => {
              const count = mealsPerDay[i]
              const isToday = i === todayIdx
              const hasMeals = count > 0
              const noPlan = count === -1

              return (
                <Link
                  key={i}
                  href={`/planner/${weekStart}`}
                  className="group flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all hover:bg-white hover:shadow-sm"
                >
                  <span className={`text-[10px] font-semibold ${isToday ? 'text-brand-600' : 'text-gray-400'}`}>
                    {day}
                  </span>
                  {noPlan ? (
                    <div className="w-7 h-7 rounded-full border border-dashed border-gray-200 flex items-center justify-center">
                      <Circle size={10} className="text-gray-200" />
                    </div>
                  ) : hasMeals ? (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      isToday
                        ? 'bg-brand-500 text-white'
                        : 'bg-brand-100 text-brand-700 group-hover:bg-brand-200'
                    }`}>
                      {count}
                    </div>
                  ) : (
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                      isToday ? 'border-brand-300' : 'border-gray-200 group-hover:border-gray-300'
                    }`}>
                      <Circle size={10} className={isToday ? 'text-brand-300' : 'text-gray-300'} />
                    </div>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Plan summary */}
          <div className="mt-3 flex items-center justify-between">
            {planId ? (
              <p className="text-xs text-gray-500">
                {totalMeals > 0
                  ? `${totalMeals} meal${totalMeals !== 1 ? 's' : ''} across ${daysWithMeals} day${daysWithMeals !== 1 ? 's' : ''}`
                  : 'Plan exists — no meals added yet'}
              </p>
            ) : (
              <p className="text-xs text-gray-400">No plan for this week yet</p>
            )}
          </div>
        </section>

        {/* ── Grocery list ───────────────────────────────────────────────── */}
        <section className="mb-6" data-tour="tile-grocery">
          <Link
            href="/grocery"
            className="flex items-center gap-4 bg-white border border-brand-100 rounded-xl px-4 py-3.5
                       hover:border-brand-300 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <ShoppingCart size={17} className="text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Grocery list</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hasGroceryList ? 'Ready for your next shop' : 'Generate from your meal plan'}
              </p>
            </div>
            {hasGroceryList ? (
              <CircleCheck size={16} className="text-green-500 shrink-0" />
            ) : planId ? (
              <span className="text-[11px] font-medium text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full shrink-0">
                Generate
              </span>
            ) : null}
            <ChevronRight size={15} className="text-gray-300 group-hover:text-brand-400 transition-colors shrink-0" />
          </Link>
        </section>

        {/* ── Secondary links ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/recipes"
            data-tour="tile-recipes"
            className="flex items-center gap-3 bg-white border border-brand-100 rounded-xl px-4 py-3.5
                       hover:border-brand-300 hover:shadow-md transition-all group"
          >
            <BookOpen size={16} className="text-brand-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">Recipes</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {recipeCount > 0
                  ? `${recipeCount} saved`
                  : 'Add your first'}
              </p>
            </div>
          </Link>

          <Link
            href="/settings"
            data-tour="tile-settings"
            className="flex items-center gap-3 bg-white border border-brand-100 rounded-xl px-4 py-3.5
                       hover:border-brand-300 hover:shadow-md transition-all group"
          >
            <Settings size={16} className="text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">Settings</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">Household &amp; pantry</p>
            </div>
          </Link>
        </div>

        {/* ── AI nudge — only if plan exists but grocery not generated ────── */}
        {planId && !hasGroceryList && totalMeals > 0 && (
          <div className="mt-4 flex items-start gap-3 bg-white border border-brand-200 rounded-xl px-4 py-3.5 shadow-sm">
            <Sparkles size={14} className="text-brand-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand-800">Your grocery list is ready to generate</p>
              <p className="text-xs text-brand-600 mt-0.5">
                {totalMeals} meal{totalMeals !== 1 ? 's' : ''} planned — one tap to build the shopping list.
              </p>
            </div>
            <Link
              href="/grocery"
              className="shrink-0 text-xs font-medium text-brand-700 hover:text-brand-900 transition-colors"
            >
              Go →
            </Link>
          </div>
        )}

      </div>

      <OnboardingTour />
    </div>
  )
}
