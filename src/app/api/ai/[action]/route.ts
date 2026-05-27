import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import type { MealType } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function extractJson(text: string): string {
  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  return text.trim()
}

const SUGGEST_SYSTEM = `You are a helpful meal planning assistant.
Your job is to suggest real, named recipes with accurate ingredient lists.
Return ONLY valid JSON — no markdown, no explanation, no code fences.
The JSON must be an array matching the schema:
[{ "title": string, "description": string, "meal_type": string, "cook_time_minutes": number, "ingredients": [{"name": string, "quantity": number|string, "unit": string}], "source_url": string|null }]`

const PARSE_SYSTEM = `You are a recipe extraction assistant.
When given a URL or recipe page content, extract the recipe into structured JSON.
Return ONLY valid JSON — no markdown, no explanation, no code fences.
Schema: {
  "title": string,
  "description": string,
  "meal_type": "breakfast"|"lunch"|"dinner"|"snack",
  "cook_time_minutes": number|null,
  "ingredients": [{"name": string, "quantity": number|string, "unit": string}],
  "instructions": string,
  "source_url": string
}`

// Scrape image candidates directly from the page HTML — more reliable than asking Claude
async function scrapeImages(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const html = await res.text()

    const images = new Set<string>()

    // og:image (handles both attribute orderings)
    for (const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) images.add(m[1])
    for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi)) images.add(m[1])

    // twitter:image
    for (const m of html.matchAll(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi)) images.add(m[1])
    for (const m of html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi)) images.add(m[1])

    // JSON-LD Recipe schema (most recipe sites include this)
    for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const data = JSON.parse(m[1])
        const entries = Array.isArray(data) ? data : [data, ...(data['@graph'] ?? [])]
        for (const entry of entries) {
          const img = entry.image
          if (!img) continue
          const urls = Array.isArray(img) ? img : [img]
          for (const u of urls) {
            const src = typeof u === 'string' ? u : u?.url
            if (typeof src === 'string' && src.startsWith('http')) images.add(src)
          }
        }
      } catch { /* malformed JSON-LD, skip */ }
    }

    return Array.from(images).filter((u) => u.startsWith('http')).slice(0, 6)
  } catch {
    return []
  }
}

interface SuggestBody {
  meal_type: MealType
  count: number
  recent_recipe_titles: string[]
  household_preferences: string[]
  season: string
  user_prompt?: string
  ingredients_to_use?: string[]
}

interface ParseBody {
  url: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params

  if (action === 'suggest-recipes') {
    return suggestRecipes(request)
  }
  if (action === 'parse-recipe-url') {
    return parseRecipeUrl(request)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 })
}

async function suggestRecipes(request: Request) {
  const body: SuggestBody = await request.json()
  const { meal_type, count, recent_recipe_titles, household_preferences, season, user_prompt, ingredients_to_use } = body

  const avoidList = recent_recipe_titles.length
    ? `Avoid these recently planned meals: ${recent_recipe_titles.join(', ')}.`
    : ''
  const prefList = household_preferences.length
    ? `Household preferences: ${household_preferences.join(', ')}.`
    : ''
  const customPrompt = user_prompt ? `Special request: ${user_prompt}.` : ''
  const useUpList = ingredients_to_use?.length
    ? `Prioritise recipes that help use up these ingredients I already have: ${ingredients_to_use.join(', ')}.`
    : ''

  const userPrompt = `Suggest ${count} real ${meal_type} recipe${count !== 1 ? 's' : ''} suitable for ${season}.
${avoidList}
${prefList}
${customPrompt}
${useUpList}
Each recipe should have complete, accurate ingredient lists with quantities and units.
Use web search if needed to find current, popular recipes.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SUGGEST_SYSTEM,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        } as Parameters<typeof anthropic.messages.create>[0]['tools'] extends (infer T)[] ? T : never,
      ],
      messages: [{ role: 'user', content: userPrompt }],
    })

    // Extract the final text block (after any tool use)
    const textBlock = response.content
      .filter((b) => b.type === 'text')
      .pop()

    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ suggestions: [] })
    }

    const suggestions = JSON.parse(extractJson(textBlock.text))
    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('suggest-recipes error:', err)
    return NextResponse.json({ suggestions: [], error: String(err) }, { status: 500 })
  }
}

async function parseRecipeUrl(request: Request) {
  const body: ParseBody = await request.json()
  const { url } = body

  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Run image scraping and Claude parsing in parallel
  const [imageCandidates, claudeResponse] = await Promise.all([
    scrapeImages(url),
    anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: PARSE_SYSTEM,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 2,
        } as Parameters<typeof anthropic.messages.create>[0]['tools'] extends (infer T)[] ? T : never,
      ],
      messages: [
        {
          role: 'user',
          content: `Fetch and parse the recipe at this URL: ${url}
Extract all recipe information including title, description, meal type, cook time, ingredients (with quantities and units), and instructions.
Set source_url to: ${url}`,
        },
      ],
    }).catch((err) => { console.error('Claude error:', err); return null }),
  ])

  try {
    const textBlock = claudeResponse?.content.filter((b) => b.type === 'text').pop()
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Could not parse recipe' }, { status: 422 })
    }

    const recipe = JSON.parse(extractJson(textBlock.text))
    return NextResponse.json({ ...recipe, image_candidates: imageCandidates })
  } catch (err) {
    console.error('parse-recipe-url error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
