import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/nav/NavBar'
import { MealTypeBadge } from '@/components/ui/Badge'
import StarRating from '@/components/ui/StarRating'
import DeleteRecipeButton from '@/components/recipes/DeleteRecipeButton'
import AddToPlanButton from '@/components/recipes/AddToPlanButton'
import type { Recipe, Ingredient } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recipe } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (!recipe) notFound()

  const r = recipe as Recipe
  const ingredients = r.ingredients as Ingredient[]

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {/* Back */}
        <Link href="/recipes" className="text-sm text-gray-500 hover:text-gray-900 mb-6 block">
          ← Recipe library
        </Link>

        {/* Photo */}
        {r.photo_url && (
          <img
            src={r.photo_url}
            alt={r.title}
            className="w-full h-56 object-cover rounded-xl mb-6"
          />
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="font-serif italic text-2xl font-semibold text-gray-900">{r.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <MealTypeBadge type={r.meal_type} />
              {r.cook_time_minutes && (
                <span className="text-sm text-gray-500">⏱ {r.cook_time_minutes} min</span>
              )}
              <StarRating value={r.rating} readonly />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <DeleteRecipeButton recipeId={r.id} />
            <Link href={`/recipes/${r.id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <AddToPlanButton recipe={r} />
          </div>
        </div>

        {/* Description */}
        {r.description && (
          <p className="text-gray-600 mb-5">{r.description}</p>
        )}

        {/* Tags */}
        {r.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {r.tags.map((tag) => (
              <span key={tag} className="text-xs bg-brand-50 text-brand-700 border border-brand-100 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">Ingredients</h2>
              <ul className="space-y-2">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="text-gray-400 min-w-[64px] text-right">
                      {ing.quantity} {ing.unit}
                    </span>
                    <span className="text-gray-700">{ing.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {r.instructions && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">Instructions</h2>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{r.instructions}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {r.notes && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-800 mb-1">Notes</h3>
            <p className="text-sm text-amber-700">{r.notes}</p>
          </div>
        )}

        {/* Source */}
        {r.source_url && (
          <a
            href={r.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block text-sm text-brand-600 hover:underline"
          >
            View original recipe ↗
          </a>
        )}
      </div>
    </div>
  )
}
