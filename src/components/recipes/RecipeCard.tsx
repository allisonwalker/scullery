import Link from 'next/link'
import type { Recipe } from '@/types'
import { MealTypeBadge } from '@/components/ui/Badge'
import StarRating from '@/components/ui/StarRating'
import AddToPlanButton from './AddToPlanButton'

interface RecipeCardProps {
  recipe: Recipe
}

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"%3E%3Crect fill="%23f3f4f6" width="400" height="200"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo photo%3C/text%3E%3C/svg%3E'

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <div className="card hover:border-brand-400 transition-colors group relative">
      {/* Entire card is navigable */}
      <Link href={`/recipes/${recipe.id}`} className="block">
        <img
          src={recipe.photo_url ?? PLACEHOLDER}
          alt={recipe.title}
          className="w-full h-36 object-cover rounded-t-lg"
        />
        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 line-clamp-2">
              {recipe.title}
            </h3>
            <MealTypeBadge type={recipe.meal_type} />
          </div>

          {recipe.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{recipe.description}</p>
          )}

          <div className="flex items-center justify-between">
            <StarRating value={recipe.rating} readonly />
            <span className="text-xs text-gray-400">
              {recipe.times_planned > 0 ? `Planned ${recipe.times_planned}×` : 'Not yet planned'}
            </span>
          </div>

          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Spacer so the button overlay never covers content */}
          <div className="h-7" />
        </div>
      </Link>

      {/* Add-to-plan button — appears on hover, sits outside the Link */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <AddToPlanButton recipe={recipe} size="sm" />
      </div>
    </div>
  )
}
