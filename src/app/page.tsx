import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/nav/NavBar'
import { getMondayOfWeek, formatWeekStart, weekLabel } from '@/lib/utils'

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

  // Fetch context for the cards
  const monday = getMondayOfWeek(new Date())
  const weekStart = formatWeekStart(monday)
  const currentWeekLabel = weekLabel(monday)

  let recipeCount = 0
  let hasPlan = false
  let hasGroceryList = false

  if (householdId) {
    const [recipesRes, planRes] = await Promise.all([
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
    ])

    recipeCount = recipesRes.count ?? 0
    hasPlan = !!planRes.data

    if (planRes.data) {
      const groceryRes = await supabase
        .from('grocery_lists')
        .select('id')
        .eq('plan_id', planRes.data.id)
        .single()
      hasGroceryList = !!groceryRes.data
    }
  }

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const tiles = [
    {
      href: `/planner/${weekStart}`,
      icon: '📅',
      title: "This week's meal plan",
      description: currentWeekLabel,
      badge: hasPlan ? null : 'No plan yet',
      color: 'hover:border-brand-400 hover:bg-brand-50',
      iconBg: 'bg-brand-100',
    },
    {
      href: '/grocery',
      icon: '🛒',
      title: "This week's grocery list",
      description: hasGroceryList ? 'Ready to go' : 'Generate from your meal plan',
      badge: hasGroceryList ? null : 'Not generated',
      color: 'hover:border-teal-400 hover:bg-teal-50',
      iconBg: 'bg-teal-100',
    },
    {
      href: '/recipes',
      icon: '📖',
      title: 'Recipe library',
      description: recipeCount > 0 ? `${recipeCount} recipe${recipeCount !== 1 ? 's' : ''}` : 'No recipes yet',
      badge: null,
      color: 'hover:border-amber-400 hover:bg-amber-50',
      iconBg: 'bg-amber-100',
    },
    {
      href: '/plans',
      icon: '🗓',
      title: 'Previous meal plans',
      description: 'Browse past weeks',
      badge: null,
      color: 'hover:border-purple-400 hover:bg-purple-50',
      iconBg: 'bg-purple-100',
    },
    {
      href: '/settings',
      icon: '⚙️',
      title: 'Settings',
      description: 'Household, pantry staples, preferences',
      badge: null,
      color: 'hover:border-gray-400 hover:bg-gray-50',
      iconBg: 'bg-gray-100',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar />
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        {/* Greeting */}
        <div className="mb-8 mt-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">What would you like to do?</p>
        </div>

        {/* Tiles */}
        <div className="flex flex-col gap-3">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className={`card px-5 py-4 flex items-center gap-4 transition-all ${tile.color}`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${tile.iconBg}`}>
                {tile.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{tile.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{tile.description}</p>
              </div>
              {tile.badge && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                  {tile.badge}
                </span>
              )}
              <span className="text-gray-300 text-lg shrink-0">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
