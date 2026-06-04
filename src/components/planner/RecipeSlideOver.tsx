'use client'

import Link from 'next/link'
import { Clock } from 'lucide-react'
import { usePlannerStore } from '@/store/plannerStore'
import SlideOver from '@/components/ui/SlideOver'
import { MealTypeBadge } from '@/components/ui/Badge'
import StarRating from '@/components/ui/StarRating'
import type { Ingredient } from '@/types'

export default function RecipeSlideOver() {
  const { slideOverRecipe, closeSlideOver } = usePlannerStore()
  const recipe = slideOverRecipe

  return (
    <SlideOver
      open={recipe !== null}
      onClose={closeSlideOver}
      title={recipe?.title ?? ''}
      width="w-[420px]"
    >
      {recipe && (
        <div className="space-y-5">
          {/* Photo */}
          {recipe.photo_url && (
            <img
              src={recipe.photo_url}
              alt={recipe.title}
              className="w-full h-44 object-cover rounded-xl"
            />
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <MealTypeBadge type={recipe.meal_type} />
            {recipe.cook_time_minutes && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Clock size={11} />
                {recipe.cook_time_minutes} min
              </span>
            )}
            {recipe.rating && <StarRating value={recipe.rating} readonly />}
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{recipe.description}</p>
          )}

          {/* Tags */}
          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <span key={tag} className="text-xs bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full border border-brand-100">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          {(recipe.ingredients as Ingredient[]).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Ingredients</h3>
              <ul className="space-y-1.5">
                {(recipe.ingredients as Ingredient[]).map((ing, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-3">
                    <span className="text-gray-400 tabular-nums shrink-0 min-w-[72px]">
                      {ing.quantity} {ing.unit}
                    </span>
                    <span>{ing.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Instructions</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{recipe.instructions}</p>
            </div>
          )}

          {/* Notes */}
          {recipe.notes && (
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3">
              <h3 className="text-xs font-semibold text-amber-700 mb-1">Notes</h3>
              <p className="text-sm text-amber-800/80 italic">{recipe.notes}</p>
            </div>
          )}

          {/* Source */}
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:text-brand-700 hover:underline block truncate"
            >
              Original source ↗
            </a>
          )}

          <Link
            href={`/recipes/${recipe.id}`}
            className="btn-secondary w-full justify-center"
            onClick={closeSlideOver}
          >
            Open full recipe
          </Link>
        </div>
      )}
    </SlideOver>
  )
}
