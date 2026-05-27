# Scullery

A private meal planning and grocery list app for two-person households. Built with Next.js 15, Supabase, Tailwind CSS, and the Anthropic Claude API.

## Features

- **Weekly meal planner** — 7-day grid with draggable meal slots, lock/unlock, and swap
- **Recipe library** — curate recipes with ratings, tags, cook times, and ingredient lists
- **AI recipe discovery** — Claude suggests new meals based on your preferences and season
- **Recipe URL import** — paste any recipe URL; Claude parses it into your library
- **Automatic grocery list** — generated from your week's plan, grouped by store section

---

## Setup

### 1. Clone and install

```bash
cd scullery
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In **Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Run the database migration

In the Supabase dashboard, go to **SQL Editor** and paste the contents of:

```
supabase/migrations/20260519000001_initial_schema.sql
```

Run it. This creates all tables, RLS policies, and the auto-household trigger.

### 4. Get an Anthropic API key

Go to [console.anthropic.com](https://console.anthropic.com) and create an API key.

> The `web_search` tool requires your organization to have it enabled. Check **Organization Settings** if suggestions return empty.

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local`.

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up. A household is created automatically on first sign-up.

---

## Seed data

To populate the app with 20 sample recipes and a weekly plan:

```bash
npm run seed
```

This creates two test accounts (credentials are logged to console and also read from `.env.local` if you set `SEED_USER*` variables).

---

## Adding the second household member

Scullery supports exactly two users per household sharing all data.

**Option A — After both users sign up:**

1. User 1 signs up → a household is created automatically.
2. Copy User 1's **Household ID** from `/settings`.
3. User 2 signs up → a separate household is created for them.
4. In the Supabase dashboard → **Table Editor → profiles**, find User 2's row and change their `household_id` to match User 1's.

**Option B — Before User 2 signs up (seed script):**

Set `SEED_USER2_EMAIL` / `SEED_USER2_PASSWORD` in `.env.local` and run `npm run seed`. The seed script links both users to the same household automatically.

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Redirects to /planner
│   ├── login/                # Auth pages
│   ├── signup/
│   ├── planner/[week]/       # Weekly planner (main screen)
│   ├── recipes/              # Recipe library
│   │   ├── new/              # Add recipe (manual or URL import)
│   │   └── [id]/             # Recipe detail + edit
│   ├── grocery/              # Grocery list
│   ├── settings/             # Household settings
│   └── api/
│       ├── ai/[action]/      # Claude API routes
│       └── grocery/generate/ # Grocery list generation
├── components/
│   ├── nav/NavBar.tsx
│   ├── planner/              # PlannerGrid, MealCard, ConfigBar, SwapSheet, …
│   ├── recipes/              # RecipeCard, RecipeForm
│   ├── grocery/              # GroceryList (used inline in page)
│   └── ui/                   # Badge, StarRating, SlideOver
├── lib/
│   ├── supabase/             # client.ts (browser), server.ts (RSC)
│   ├── grocery/              # categories.ts, generator.ts
│   └── utils.ts              # Date helpers, colour maps, cn()
├── store/
│   └── plannerStore.ts       # Zustand store for planner state
└── types/index.ts            # Shared TypeScript types
```

---

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `SEED_USER1_EMAIL` | Test user 1 email (seed script) |
| `SEED_USER1_PASSWORD` | Test user 1 password |
| `SEED_USER2_EMAIL` | Test user 2 email |
| `SEED_USER2_PASSWORD` | Test user 2 password |
