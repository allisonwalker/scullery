'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Recipe, MealType, Ingredient } from '@/types'
import { createClient } from '@/lib/supabase/client'
import StarRating from '@/components/ui/StarRating'

interface RecipeFormProps {
  householdId: string
  initial?: Partial<Recipe>
  recipeId?: string
}

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
]

const EMPTY_INGREDIENT: Ingredient = { name: '', quantity: '', unit: '' }

export default function RecipeForm({ householdId, initial = {}, recipeId }: RecipeFormProps) {
  const router = useRouter()

  const [title, setTitle] = useState(initial.title ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [mealType, setMealType] = useState<MealType>(initial.meal_type ?? 'dinner')
  const [cookTime, setCookTime] = useState(initial.cook_time_minutes?.toString() ?? '')
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial.ingredients?.length ? (initial.ingredients as Ingredient[]) : [EMPTY_INGREDIENT],
  )
  const [instructions, setInstructions] = useState(initial.instructions ?? '')
  const [sourceUrl, setSourceUrl] = useState(initial.source_url ?? '')
  const [photoUrl, setPhotoUrl] = useState(initial.photo_url ?? '')
  const [rating, setRating] = useState<number | null>(initial.rating ?? null)
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [tags, setTags] = useState(initial.tags?.join(', ') ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setIngredient(idx: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)))
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { ...EMPTY_INGREDIENT }])
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const supabase = createClient()

    const payload = {
      household_id: householdId,
      title: title.trim(),
      description: description.trim() || null,
      meal_type: mealType,
      cook_time_minutes: cookTime ? parseInt(cookTime) : null,
      ingredients: ingredients.filter((i) => i.name.trim()),
      instructions: instructions.trim() || null,
      source_url: sourceUrl.trim() || null,
      photo_url: photoUrl.trim() || null,
      rating,
      notes: notes.trim() || null,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      is_from_library: true,
    }

    if (recipeId) {
      const { error: err } = await supabase
        .from('recipes')
        .update(payload)
        .eq('id', recipeId)
      if (err) { setError(err.message); setSaving(false); return }
      router.push(`/recipes/${recipeId}`)
    } else {
      const { data, error: err } = await supabase
        .from('recipes')
        .insert(payload)
        .select()
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      router.push(`/recipes/${data.id}`)
    }

    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Title *</label>
          <input type="text" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="label">Meal type</label>
          <select className="input" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            {MEAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Cook time (minutes)</label>
          <input type="number" className="input" value={cookTime} onChange={(e) => setCookTime(e.target.value)} min={0} />
        </div>

        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <label className="label">Ingredients</label>
        <div className="space-y-2">
          {ingredients.map((ing, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                placeholder="Qty"
                className="input w-20"
                value={ing.quantity?.toString() ?? ''}
                onChange={(e) => setIngredient(idx, 'quantity', e.target.value)}
              />
              <input
                type="text"
                placeholder="Unit"
                className="input w-24"
                value={ing.unit}
                onChange={(e) => setIngredient(idx, 'unit', e.target.value)}
              />
              <input
                type="text"
                placeholder="Ingredient name"
                className="input flex-1"
                value={ing.name}
                onChange={(e) => setIngredient(idx, 'name', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeIngredient(idx)}
                className="text-gray-400 hover:text-red-500 px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addIngredient} className="mt-2 text-sm text-brand-600 hover:text-brand-700">
          + Add ingredient
        </button>
      </div>

      <div>
        <label className="label">Instructions</label>
        <textarea className="input" rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Source URL</label>
          <input type="url" className="input" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        </div>
        <div>
          <label className="label">Photo URL</label>
          <input type="url" className="input" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
        </div>
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input type="text" className="input" placeholder="vegetarian, quick, gluten-free" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div>
          <label className="label">Rating</label>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div className="col-span-2">
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : recipeId ? 'Update recipe' : 'Save recipe'}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  )
}
