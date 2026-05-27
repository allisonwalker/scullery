import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/nav/NavBar'
import RecipeForm from '@/components/recipes/RecipeForm'
import type { Recipe } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  const { data: recipe } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (!recipe || !profile) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <Link href={`/recipes/${id}`} className="text-sm text-gray-500 hover:text-gray-900 mb-6 block">
          ← Back to recipe
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Edit Recipe</h1>
        <RecipeForm
          householdId={profile.household_id!}
          initial={recipe as Recipe}
          recipeId={id}
        />
      </div>
    </div>
  )
}
