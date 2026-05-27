import type { Ingredient, GroceryItem, PlanSlot, Recipe } from '@/types'
import { categorize } from './categories'

type SlotWithRecipe = PlanSlot & { recipe: Recipe }

/**
 * Strip preparation notes from an ingredient name so that
 * "asparagus, trimmed" and "asparagus, trimmed and cut into 1-inch pieces"
 * both consolidate into "asparagus".
 *
 * Rules applied in order:
 *  1. Drop everything after the first comma  ("chicken breast, boneless" → "chicken breast")
 *  2. Drop trailing parentheticals           ("butter (softened)" → "butter")
 *  3. Trim surrounding whitespace
 */
function normalizeIngredientName(name: string): string {
  return name
    .split(',')[0]                        // strip prep notes after first comma
    .replace(/\s*\(.*?\)\s*$/, '')        // strip trailing parentheticals
    .trim()
}

export function generateGroceryItems(
  slots: SlotWithRecipe[],
  pantryStaples: string[],
): GroceryItem[] {
  const stapleSet = new Set(pantryStaples.map((s) => s.toLowerCase().trim()))

  // Collect all ingredients with source recipe ids
  const map = new Map<string, GroceryItem>()

  for (const slot of slots) {
    if (!slot.recipe) continue
    const recipeId = slot.recipe.id

    for (const ing of slot.recipe.ingredients as Ingredient[]) {
      if (!ing.name) continue
      const normalized = normalizeIngredientName(ing.name)
      const key = normalized.toLowerCase()

      // Skip pantry staples
      if (stapleSet.has(key)) continue
      if (Array.from(stapleSet).some((s) => key.includes(s) || s.includes(key))) continue

      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          name: normalized,
          quantity: ing.quantity ?? '',
          unit: ing.unit ?? '',
          category: categorize(key),
          checked: false,
          recipe_ids: [recipeId],
        })
        continue
      }

      // Same unit — sum quantities
      if (
        existing.unit === (ing.unit ?? '') &&
        typeof existing.quantity === 'number' &&
        typeof ing.quantity === 'number'
      ) {
        existing.quantity = existing.quantity + ing.quantity
      } else {
        // Mixed units — just note "see recipes"
        existing.quantity = existing.quantity === '' ? '' : existing.quantity
        existing.unit = existing.unit !== (ing.unit ?? '')
          ? 'see recipes'
          : existing.unit
      }

      if (!existing.recipe_ids.includes(recipeId)) {
        existing.recipe_ids.push(recipeId)
      }
    }
  }

  return Array.from(map.values())
}
