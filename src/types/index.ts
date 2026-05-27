export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Household {
  id: string
  name: string
  pantry_staples: string[]
  dietary_preferences: string[]
  created_at: string
}

export interface Profile {
  id: string
  household_id: string
  display_name: string | null
  created_at: string
}

export interface Ingredient {
  name: string
  quantity: number | string
  unit: string
}

export interface Recipe {
  id: string
  household_id: string
  title: string
  description: string | null
  meal_type: MealType
  ingredients: Ingredient[]
  instructions: string | null
  source_url: string | null
  photo_url: string | null
  cook_time_minutes: number | null
  times_planned: number
  rating: number | null
  notes: string | null
  tags: string[]
  is_from_library: boolean
  created_at: string
  updated_at: string
}

export interface PlanConfig {
  breakfast: number
  lunch: number
  dinner: number
  snack: number
  library_ratio: number
  ingredients_to_use?: string[]
  hidden_meal_types?: MealType[]
}

export interface WeeklyPlan {
  id: string
  household_id: string
  week_start: string
  config: PlanConfig
  created_at: string
  updated_at: string
}

export interface PlanSlot {
  id: string
  plan_id: string
  day_of_week: number
  meal_type: MealType
  recipe_id: string | null
  is_locked: boolean
  sort_order: number
  recipe?: Recipe | null
}

export interface GroceryItem {
  name: string
  quantity: number | string
  unit: string
  category: string
  checked: boolean
  recipe_ids: string[]
}

export interface ExtraGroceryItem {
  name: string
  checked: boolean
}

export interface GroceryList {
  id: string
  household_id: string
  plan_id: string | null
  items: GroceryItem[]
  extra_items: ExtraGroceryItem[]
  created_at: string
  updated_at: string
}

// AI suggestion shape returned from /api/ai/suggest-recipes
export interface AiRecipeSuggestion {
  title: string
  description: string
  meal_type: MealType
  cook_time_minutes: number
  ingredients: Ingredient[]
  source_url?: string
}

// Slot in "preview" state during regeneration
export interface PreviewSlot extends PlanSlot {
  suggested_recipe?: AiRecipeSuggestion
  preview_status: 'accepted' | 'rejected' | 'pending'
}
