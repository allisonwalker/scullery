'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NavBar from '@/components/nav/NavBar'
import RecipeForm from '@/components/recipes/RecipeForm'
import { cn } from '@/lib/utils'

interface ImportedRecipe {
  title?: string
  description?: string
  meal_type?: string
  cook_time_minutes?: number
  ingredients?: unknown[]
  instructions?: string
  source_url?: string
  image_candidates?: string[]
  photo_url?: string
}

export default function NewRecipePage() {
  const router = useRouter()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [tab, setTab] = useState<'manual' | 'import'>('import')

  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [imported, setImported] = useState<ImportedRecipe | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('household_id').eq('id', user.id).single().then(({ data }) => {
        if (data?.household_id) setHouseholdId(data.household_id)
      })
    })
  }, [])

  async function handleImport() {
    if (!importUrl) return
    setImporting(true)
    setImportError('')
    setImported(null)
    setSelectedImage(null)
    setFailedImages(new Set())

    const res = await fetch('/api/ai/parse-recipe-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: importUrl }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setImportError(err.error ?? 'Failed to parse recipe. Try the URL of a dedicated recipe page.')
      setImporting(false)
      return
    }

    const data: ImportedRecipe = await res.json()
    setImported(data)
    // Pre-select the first image if there's only one
    if (data.image_candidates?.length === 1) {
      setSelectedImage(data.image_candidates[0])
    }
    setImporting(false)
    setTab('manual')
  }

  function markFailed(url: string) {
    setFailedImages((prev) => new Set([...prev, url]))
    if (selectedImage === url) setSelectedImage(null)
  }

  const candidates = (imported?.image_candidates ?? []).filter((u) => !failedImages.has(u))

  // Merge selected image into the form initial values.
  // Use '' (not undefined) for "no photo" so the RecipeForm useEffect can
  // react to the change and clear any previously selected URL.
  const formInitial: ImportedRecipe | undefined = imported
    ? { ...imported, photo_url: selectedImage ?? '' }
    : undefined

  if (!householdId) {
    return (
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Add Recipe</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['manual', 'import'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t === 'manual' ? 'Manual entry' : 'Import from URL'}
            </button>
          ))}
        </div>

        {tab === 'import' && (
          <div className="space-y-4 mb-8">
            <p className="text-sm text-gray-600">
              Paste a recipe URL and Claude will extract the ingredients, instructions, and photos.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                className="input flex-1"
                placeholder="https://..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              />
              <button onClick={handleImport} className="btn-primary" disabled={importing || !importUrl}>
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
            {importError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{importError}</p>
            )}
          </div>
        )}

        {/* Image picker — shown on the manual tab after a successful import */}
        {tab === 'manual' && candidates.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Choose a photo <span className="text-gray-400 font-normal">(optional)</span>
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {candidates.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setSelectedImage(selectedImage === url ? null : url)}
                  className={cn(
                    'shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                    selectedImage === url
                      ? 'border-brand-500 ring-2 ring-brand-200'
                      : 'border-transparent hover:border-gray-300',
                  )}
                >
                  <img
                    src={url}
                    alt=""
                    className="w-36 h-24 object-cover"
                    onError={() => markFailed(url)}
                  />
                </button>
              ))}
              {/* None option */}
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className={cn(
                  'shrink-0 w-36 h-24 rounded-lg border-2 flex items-center justify-center text-xs text-gray-400 transition-all',
                  selectedImage === null
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-dashed border-gray-200 hover:border-gray-300',
                )}
              >
                No photo
              </button>
            </div>
            {selectedImage && (
              <p className="text-xs text-brand-600 mt-1">✓ Photo selected</p>
            )}
          </div>
        )}

        {tab === 'manual' && (
          <RecipeForm
            householdId={householdId}
            initial={formInitial as never}
          />
        )}
      </div>
    </div>
  )
}
