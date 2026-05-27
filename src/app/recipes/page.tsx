import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/nav/NavBar'
import RecipeCard from '@/components/recipes/RecipeCard'
import type { Recipe, MealType } from '@/types'

interface Props {
  searchParams: Promise<{ type?: string; q?: string }>
}

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

export default async function RecipesPage({ searchParams }: Props) {
  const { type, q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()
  if (!profile?.household_id) redirect('/login')

  let query = supabase
    .from('recipes')
    .select('*')
    .eq('household_id', profile.household_id)
    .eq('is_from_library', true)
    .order('title')

  if (type) query = query.eq('meal_type', type as MealType)

  const { data: recipes } = await query

  const filtered = q
    ? (recipes ?? []).filter(
        (r) =>
          r.title.toLowerCase().includes(q.toLowerCase()) ||
          (r.ingredients as { name: string }[]).some((i) =>
            i.name.toLowerCase().includes(q.toLowerCase()),
          ),
      )
    : (recipes ?? [])

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Recipe Library</h1>
          <Link href="/recipes/new" className="btn-primary">+ Add recipe</Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value ? `/recipes?type=${f.value}${q ? `&q=${q}` : ''}` : `/recipes${q ? `?q=${q}` : ''}`}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  (type ?? '') === f.value
                    ? 'bg-brand-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-400'
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <form className="flex-1 max-w-xs">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search title or ingredient…"
              className="input"
            />
          </form>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">No recipes yet.</p>
            <Link href="/recipes/new" className="btn-primary">Add your first recipe</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe as Recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
