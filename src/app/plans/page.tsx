import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/nav/NavBar'
import { weekLabel, parseWeekStart, getMondayOfWeek, formatWeekStart } from '@/lib/utils'

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) redirect('/')

  const { data: plans } = await supabase
    .from('weekly_plans')
    .select('id, week_start, config')
    .eq('household_id', profile.household_id)
    .order('week_start', { ascending: false })

  const currentWeekStart = formatWeekStart(getMondayOfWeek(new Date()))

  // For each plan, fetch the slot count
  const plansWithCounts = await Promise.all(
    (plans ?? []).map(async (plan) => {
      const { count } = await supabase
        .from('plan_slots')
        .select('id', { count: 'exact', head: true })
        .eq('plan_id', plan.id)
        .not('recipe_id', 'is', null)
      return { ...plan, mealCount: count ?? 0 }
    }),
  )

  const past = plansWithCounts.filter((p) => p.week_start < currentWeekStart)
  const current = plansWithCounts.filter((p) => p.week_start === currentWeekStart)
  const upcoming = plansWithCounts.filter((p) => p.week_start > currentWeekStart)

  function PlanRow({ plan }: { plan: typeof plansWithCounts[0] }) {
    const label = weekLabel(parseWeekStart(plan.week_start))
    const isCurrentWeek = plan.week_start === currentWeekStart
    return (
      <Link
        href={`/planner/${plan.week_start}`}
        className="card px-4 py-3 flex items-center justify-between hover:border-brand-400 hover:bg-brand-50 transition-all"
      >
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{plan.mealCount} meals planned</p>
        </div>
        <div className="flex items-center gap-2">
          {isCurrentWeek && (
            <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
              This week
            </span>
          )}
          <span className="text-gray-300 text-lg">›</span>
        </div>
      </Link>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-6 max-w-xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Meal Plans</h1>
          <Link href={`/planner/${currentWeekStart}`} className="btn-primary text-sm">
            This week →
          </Link>
        </div>

        {plansWithCounts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">No plans yet.</p>
            <Link href={`/planner/${currentWeekStart}`} className="btn-primary">
              Plan this week
            </Link>
          </div>
        )}

        {current.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Current week</h2>
            <div className="space-y-2">
              {current.map((p) => <PlanRow key={p.id} plan={p} />)}
            </div>
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Upcoming</h2>
            <div className="space-y-2">
              {upcoming.map((p) => <PlanRow key={p.id} plan={p} />)}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Past weeks</h2>
            <div className="space-y-2">
              {past.map((p) => <PlanRow key={p.id} plan={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
