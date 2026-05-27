import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/nav/NavBar'
import { getMondayOfWeek, formatWeekStart, weekLabel } from '@/lib/utils'
import {
  CalendarDays, ShoppingCart, BookOpen,
  Calendar, Settings, ChevronRight,
} from 'lucide-react'

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
      Icon: CalendarDays,
      iconBg: 'bg-brand-100',
      iconColor: 'text-brand-600',
      title: "This week's meal plan",
      description: currentWeekLabel,
      badge: hasPlan ? null : 'No plan yet',
    },
    {
      href: '/grocery',
      Icon: ShoppingCart,
      iconBg: 'bg-brand-100',
      iconColor: 'text-brand-500',
      title: 'Grocery list',
      description: hasGroceryList ? 'Ready to go' : 'Generate from your meal plan',
      badge: hasGroceryList ? null : 'Not generated',
    },
    {
      href: '/recipes',
      Icon: BookOpen,
      iconBg: 'bg-brand-100',
      iconColor: 'text-brand-600',
      title: 'Recipe library',
      description: recipeCount > 0
        ? `${recipeCount} recipe${recipeCount !== 1 ? 's' : ''} saved`
        : 'No recipes yet',
      badge: null,
    },
    {
      href: '/plans',
      Icon: Calendar,
      iconBg: 'bg-brand-100',
      iconColor: 'text-brand-500',
      title: 'Previous meal plans',
      description: 'Browse past weeks',
      badge: null,
    },
    {
      href: '/settings',
      Icon: Settings,
      iconBg: 'bg-brand-100',
      iconColor: 'text-brand-400',
      title: 'Settings',
      description: 'Household, pantry staples, preferences',
      badge: null,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />

      <div className="flex-1 p-6 max-w-xl mx-auto w-full">

        {/* Greeting */}
        <div className="mb-8 mt-4">
          <h1 className="font-serif italic text-3xl text-gray-800 leading-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">Here&apos;s your week at a glance.</p>
        </div>

        {/* Tiles */}
        <div className="flex flex-col gap-2.5">
          {tiles.map((tile) => {
            const { Icon } = tile
            return (
              <Link
                key={tile.href}
                href={tile.href}
                className="card px-5 py-4 flex items-center gap-4 transition-all
                           hover:border-brand-300 hover:bg-brand-50/60 hover:shadow-sm group"
              >
                {/* Icon tile */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tile.iconBg}`}>
                  <Icon size={18} className={tile.iconColor} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{tile.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tile.description}</p>
                </div>

                {/* Badge */}
                {tile.badge && (
                  <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                    {tile.badge}
                  </span>
                )}

                {/* Arrow */}
                <ChevronRight
                  size={16}
                  className="text-gray-300 group-hover:text-brand-400 transition-colors shrink-0"
                />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
