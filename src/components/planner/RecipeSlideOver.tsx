'use client'

import Link from 'next/link'
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
              className="w-full h-40 object-cover rounded-lg"
            />
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <MealTypeBadge type={recipe.meal_type} />
            {recipe.cook_time_minutes && (
              <span className="text-sm text-gray-500">⏱ {recipe.cook_time_minutes} min</span>
            )}
            {recipe.rating && <StarRating value={recipe.rating} readonly />}
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-gray-600">{recipe.description}</p>
          )}

          {/* Tags */}
          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          {(recipe.ingredients as Ingredient[]).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Ingredients</h3>
              <ul className="space-y-1">
                {(recipe.ingredients as Ingredient[]).map((ing, i) => (
                  <li key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="text-gray-400 min-w-[80px]">
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
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Instructions</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{recipe.instructions}</p>
            </div>
          )}

          {/* Notes */}
          {recipe.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Notes</h3>
              <p className="text-sm text-gray-500 italic">{recipe.notes}</p>
            </div>
          )}

          {/* Source */}
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline block truncate"
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
