import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const RECIPES = [
  {
    title: 'Pasta e Fagioli',
    description: 'Hearty Italian pasta and bean soup',
    meal_type: 'dinner',
    cook_time_minutes: 40,
    tags: ['italian', 'vegetarian', 'soup'],
    rating: 5,
    ingredients: [
      { name: 'cannellini beans', quantity: 2, unit: 'cans' },
      { name: 'ditalini pasta', quantity: 200, unit: 'g' },
      { name: 'pancetta', quantity: 100, unit: 'g' },
      { name: 'garlic', quantity: 3, unit: 'cloves' },
      { name: 'rosemary', quantity: 2, unit: 'sprigs' },
      { name: 'tomato paste', quantity: 2, unit: 'tbsp' },
      { name: 'chicken broth', quantity: 1.5, unit: 'litres' },
      { name: 'parmesan', quantity: 50, unit: 'g' },
      { name: 'olive oil', quantity: 3, unit: 'tbsp' },
    ],
    instructions: `1. Sauté pancetta in olive oil until crispy. Add garlic and rosemary.
2. Stir in tomato paste and cook 1 minute.
3. Add beans (one can mashed) and broth. Simmer 15 minutes.
4. Add pasta and cook until al dente.
5. Finish with parmesan and a drizzle of olive oil.`,
  },
  {
    title: 'Thai Basil Fried Rice',
    description: 'Quick weeknight stir-fried rice with Thai basil and a fried egg',
    meal_type: 'dinner',
    cook_time_minutes: 20,
    tags: ['thai', 'quick', 'gluten-free'],
    rating: 4,
    ingredients: [
      { name: 'cooked jasmine rice', quantity: 3, unit: 'cups' },
      { name: 'ground pork', quantity: 300, unit: 'g' },
      { name: 'fresh thai basil', quantity: 1, unit: 'cup' },
      { name: 'garlic', quantity: 4, unit: 'cloves' },
      { name: 'thai chilies', quantity: 3, unit: '' },
      { name: 'oyster sauce', quantity: 2, unit: 'tbsp' },
      { name: 'fish sauce', quantity: 1, unit: 'tbsp' },
      { name: 'soy sauce', quantity: 1, unit: 'tbsp' },
      { name: 'eggs', quantity: 2, unit: '' },
      { name: 'vegetable oil', quantity: 3, unit: 'tbsp' },
    ],
    instructions: `1. Heat oil in a wok over very high heat.
2. Fry garlic and chilies 30 seconds.
3. Add pork and cook until browned, breaking up.
4. Add rice, sauces, and toss vigorously.
5. Add basil, toss, remove from heat.
6. Fry eggs separately and serve on top.`,
  },
  {
    title: 'Shakshuka',
    description: 'Eggs poached in spiced tomato and pepper sauce',
    meal_type: 'breakfast',
    cook_time_minutes: 30,
    tags: ['vegetarian', 'mediterranean', 'one-pan'],
    rating: 5,
    ingredients: [
      { name: 'eggs', quantity: 4, unit: '' },
      { name: 'canned tomatoes', quantity: 1, unit: 'can' },
      { name: 'red bell pepper', quantity: 1, unit: '' },
      { name: 'onion', quantity: 1, unit: '' },
      { name: 'garlic', quantity: 3, unit: 'cloves' },
      { name: 'cumin', quantity: 1, unit: 'tsp' },
      { name: 'smoked paprika', quantity: 1, unit: 'tsp' },
      { name: 'red pepper flakes', quantity: 0.5, unit: 'tsp' },
      { name: 'feta cheese', quantity: 60, unit: 'g' },
      { name: 'fresh parsley', quantity: 2, unit: 'tbsp' },
    ],
    instructions: `1. Sauté onion and pepper until softened. Add garlic and spices.
2. Add tomatoes, simmer 10 minutes.
3. Make wells, crack in eggs. Cover and cook until whites set.
4. Top with feta and parsley. Serve with crusty bread.`,
  },
  {
    title: 'Avocado Toast with Poached Eggs',
    description: 'Classic smashed avocado on sourdough with perfectly poached eggs',
    meal_type: 'breakfast',
    cook_time_minutes: 15,
    tags: ['vegetarian', 'quick'],
    rating: 4,
    ingredients: [
      { name: 'sourdough bread', quantity: 2, unit: 'slices' },
      { name: 'avocados', quantity: 2, unit: '' },
      { name: 'eggs', quantity: 2, unit: '' },
      { name: 'lemon', quantity: 0.5, unit: '' },
      { name: 'red pepper flakes', quantity: 0.25, unit: 'tsp' },
      { name: 'salt', quantity: 1, unit: 'pinch' },
      { name: 'white vinegar', quantity: 1, unit: 'tsp' },
    ],
    instructions: `1. Toast bread until golden.
2. Mash avocado with lemon, salt, and red pepper flakes.
3. Bring water to a gentle simmer, add vinegar.
4. Poach eggs 3 minutes. Remove with a slotted spoon.
5. Spread avocado on toast, top with eggs.`,
  },
  {
    title: 'Roast Chicken Thighs with Lemon and Herbs',
    description: 'Crispy-skinned chicken thighs with a bright lemon herb pan sauce',
    meal_type: 'dinner',
    cook_time_minutes: 45,
    tags: ['gluten-free', 'weeknight'],
    rating: 5,
    ingredients: [
      { name: 'chicken thighs', quantity: 4, unit: '' },
      { name: 'lemon', quantity: 1, unit: '' },
      { name: 'garlic', quantity: 4, unit: 'cloves' },
      { name: 'fresh thyme', quantity: 4, unit: 'sprigs' },
      { name: 'fresh rosemary', quantity: 2, unit: 'sprigs' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'chicken broth', quantity: 0.5, unit: 'cup' },
      { name: 'butter', quantity: 2, unit: 'tbsp' },
    ],
    instructions: `1. Pat chicken dry, season generously.
2. Sear skin-side down in oven-safe pan until golden, 8 min.
3. Flip, add garlic, herbs, lemon slices.
4. Roast at 425°F (220°C) until cooked through, ~25 min.
5. Remove chicken, deglaze pan with broth, whisk in butter.`,
  },
  {
    title: 'Nicoise Salad',
    description: 'Classic French composed salad with tuna, olives, and green beans',
    meal_type: 'lunch',
    cook_time_minutes: 25,
    tags: ['french', 'gluten-free'],
    rating: 4,
    ingredients: [
      { name: 'tuna', quantity: 2, unit: 'cans' },
      { name: 'green beans', quantity: 200, unit: 'g' },
      { name: 'cherry tomatoes', quantity: 200, unit: 'g' },
      { name: 'eggs', quantity: 4, unit: '' },
      { name: 'kalamata olives', quantity: 80, unit: 'g' },
      { name: 'potatoes', quantity: 300, unit: 'g' },
      { name: 'anchovies', quantity: 4, unit: 'fillets' },
      { name: 'dijon mustard', quantity: 1, unit: 'tsp' },
      { name: 'red wine vinegar', quantity: 2, unit: 'tbsp' },
      { name: 'olive oil', quantity: 4, unit: 'tbsp' },
    ],
    instructions: `1. Boil potatoes and eggs separately. Blanch green beans.
2. Make vinaigrette: whisk mustard, vinegar, olive oil, salt.
3. Arrange all components on a platter.
4. Drizzle with vinaigrette and serve.`,
  },
  {
    title: 'Butternut Squash Soup',
    description: 'Silky-smooth roasted squash soup with ginger and coconut',
    meal_type: 'lunch',
    cook_time_minutes: 50,
    tags: ['vegan', 'gluten-free', 'fall'],
    rating: 5,
    ingredients: [
      { name: 'butternut squash', quantity: 1, unit: 'large' },
      { name: 'onion', quantity: 1, unit: '' },
      { name: 'ginger', quantity: 2, unit: 'inches' },
      { name: 'garlic', quantity: 3, unit: 'cloves' },
      { name: 'coconut milk', quantity: 400, unit: 'ml' },
      { name: 'vegetable broth', quantity: 500, unit: 'ml' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'cumin', quantity: 1, unit: 'tsp' },
    ],
    instructions: `1. Roast squash at 400°F (200°C) until tender, 35 min.
2. Sauté onion, garlic, ginger until soft.
3. Add squash flesh, broth, coconut milk, cumin.
4. Blend until completely smooth.
5. Season and serve with a swirl of coconut milk.`,
  },
  {
    title: 'Salmon with Miso Glaze',
    description: 'Umami-rich salmon fillets with a caramelised miso and sake glaze',
    meal_type: 'dinner',
    cook_time_minutes: 20,
    tags: ['japanese', 'gluten-free', 'quick'],
    rating: 5,
    ingredients: [
      { name: 'salmon fillets', quantity: 2, unit: '' },
      { name: 'white miso paste', quantity: 3, unit: 'tbsp' },
      { name: 'sake', quantity: 2, unit: 'tbsp' },
      { name: 'mirin', quantity: 2, unit: 'tbsp' },
      { name: 'soy sauce', quantity: 1, unit: 'tbsp' },
      { name: 'sesame seeds', quantity: 1, unit: 'tsp' },
      { name: 'scallions', quantity: 2, unit: '' },
    ],
    instructions: `1. Whisk miso, sake, mirin, soy sauce.
2. Marinate salmon 30 minutes (or overnight).
3. Broil on high, 5-6 min per side, watching glaze.
4. Garnish with sesame seeds and scallions.`,
  },
  {
    title: 'Mushroom Risotto',
    description: 'Creamy arborio rice with mixed wild mushrooms and parmesan',
    meal_type: 'dinner',
    cook_time_minutes: 40,
    tags: ['italian', 'vegetarian'],
    rating: 4,
    ingredients: [
      { name: 'arborio rice', quantity: 300, unit: 'g' },
      { name: 'mixed mushrooms', quantity: 400, unit: 'g' },
      { name: 'onion', quantity: 1, unit: '' },
      { name: 'garlic', quantity: 2, unit: 'cloves' },
      { name: 'dry white wine', quantity: 150, unit: 'ml' },
      { name: 'vegetable broth', quantity: 1.2, unit: 'litres' },
      { name: 'parmesan', quantity: 80, unit: 'g' },
      { name: 'butter', quantity: 3, unit: 'tbsp' },
      { name: 'fresh thyme', quantity: 2, unit: 'sprigs' },
    ],
    instructions: `1. Keep broth warm in a separate pot.
2. Sauté mushrooms in butter until golden. Set aside.
3. Sweat onion and garlic. Add rice, toast 1 min.
4. Add wine, stir until absorbed.
5. Add broth one ladle at a time, stirring constantly, ~20 min.
6. Stir in mushrooms, parmesan, remaining butter. Rest 2 min.`,
  },
  {
    title: 'Caprese Salad with Burrata',
    description: 'Buffalo burrata, heirloom tomatoes, and basil with aged balsamic',
    meal_type: 'lunch',
    cook_time_minutes: 10,
    tags: ['italian', 'vegetarian', 'gluten-free', 'summer'],
    rating: 5,
    ingredients: [
      { name: 'burrata cheese', quantity: 2, unit: 'balls' },
      { name: 'heirloom tomatoes', quantity: 4, unit: '' },
      { name: 'fresh basil', quantity: 1, unit: 'bunch' },
      { name: 'olive oil', quantity: 3, unit: 'tbsp' },
      { name: 'balsamic glaze', quantity: 2, unit: 'tbsp' },
      { name: 'flaky sea salt', quantity: 1, unit: 'pinch' },
    ],
    instructions: `1. Slice tomatoes, arrange on a platter.
2. Place burrata in the centre, tear open.
3. Scatter basil leaves.
4. Drizzle with olive oil and balsamic glaze.
5. Finish with flaky salt.`,
  },
  {
    title: 'Overnight Oats',
    description: 'No-cook oats soaked in almond milk with berries and honey',
    meal_type: 'breakfast',
    cook_time_minutes: 5,
    tags: ['vegan', 'make-ahead', 'quick'],
    rating: 4,
    ingredients: [
      { name: 'rolled oats', quantity: 0.5, unit: 'cup' },
      { name: 'almond milk', quantity: 0.5, unit: 'cup' },
      { name: 'greek yogurt', quantity: 3, unit: 'tbsp' },
      { name: 'chia seeds', quantity: 1, unit: 'tbsp' },
      { name: 'honey', quantity: 1, unit: 'tbsp' },
      { name: 'mixed berries', quantity: 0.5, unit: 'cup' },
    ],
    instructions: `1. Mix oats, milk, yogurt, chia seeds, and honey in a jar.
2. Stir well, seal, refrigerate overnight.
3. Top with fresh berries in the morning.`,
  },
  {
    title: 'Black Bean Tacos',
    description: 'Crispy black bean tacos with avocado crema and pickled jalapeños',
    meal_type: 'dinner',
    cook_time_minutes: 25,
    tags: ['mexican', 'vegetarian', 'quick'],
    rating: 4,
    ingredients: [
      { name: 'black beans', quantity: 2, unit: 'cans' },
      { name: 'corn tortillas', quantity: 8, unit: '' },
      { name: 'avocados', quantity: 2, unit: '' },
      { name: 'sour cream', quantity: 3, unit: 'tbsp' },
      { name: 'jalapeños', quantity: 2, unit: '' },
      { name: 'red onion', quantity: 0.5, unit: '' },
      { name: 'lime', quantity: 1, unit: '' },
      { name: 'cumin', quantity: 1, unit: 'tsp' },
      { name: 'smoked paprika', quantity: 1, unit: 'tsp' },
      { name: 'cilantro', quantity: 0.5, unit: 'bunch' },
    ],
    instructions: `1. Season beans with cumin, paprika, salt. Warm in a pan.
2. Blend avocado with sour cream, lime juice, salt.
3. Char tortillas directly over flame.
4. Fill with beans, avocado crema, jalapeños, onion, cilantro.`,
  },
  {
    title: 'Greek Salad Pita',
    description: 'Stuffed pita with Greek salad, hummus, and grilled chicken',
    meal_type: 'lunch',
    cook_time_minutes: 20,
    tags: ['mediterranean', 'quick'],
    rating: 4,
    ingredients: [
      { name: 'pita bread', quantity: 4, unit: '' },
      { name: 'chicken breast', quantity: 300, unit: 'g' },
      { name: 'cucumber', quantity: 1, unit: '' },
      { name: 'cherry tomatoes', quantity: 150, unit: 'g' },
      { name: 'feta cheese', quantity: 80, unit: 'g' },
      { name: 'kalamata olives', quantity: 60, unit: 'g' },
      { name: 'hummus', quantity: 4, unit: 'tbsp' },
      { name: 'oregano', quantity: 1, unit: 'tsp' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
    ],
    instructions: `1. Season chicken with oregano, olive oil, salt. Grill or pan-fry.
2. Slice chicken, cucumber, and tomatoes.
3. Warm pitas briefly.
4. Spread hummus, fill with salad, chicken, feta, olives.`,
  },
  {
    title: 'Lentil Dal',
    description: 'Comforting Indian red lentil dal with coconut milk and spices',
    meal_type: 'dinner',
    cook_time_minutes: 35,
    tags: ['indian', 'vegan', 'gluten-free'],
    rating: 5,
    ingredients: [
      { name: 'red lentils', quantity: 250, unit: 'g' },
      { name: 'coconut milk', quantity: 400, unit: 'ml' },
      { name: 'canned tomatoes', quantity: 1, unit: 'can' },
      { name: 'onion', quantity: 1, unit: '' },
      { name: 'garlic', quantity: 3, unit: 'cloves' },
      { name: 'ginger', quantity: 1, unit: 'inch' },
      { name: 'cumin', quantity: 1, unit: 'tsp' },
      { name: 'turmeric', quantity: 0.5, unit: 'tsp' },
      { name: 'garam masala', quantity: 1, unit: 'tsp' },
      { name: 'vegetable broth', quantity: 500, unit: 'ml' },
      { name: 'fresh cilantro', quantity: 3, unit: 'tbsp' },
    ],
    instructions: `1. Sauté onion, garlic, ginger until soft. Add spices.
2. Add lentils, tomatoes, broth. Simmer 20 min until lentils dissolve.
3. Stir in coconut milk. Simmer 5 more minutes.
4. Serve with rice or naan, topped with cilantro.`,
  },
  {
    title: 'Smoked Salmon Bagel',
    description: 'New York-style bagel with cream cheese, smoked salmon, and all the fixings',
    meal_type: 'breakfast',
    cook_time_minutes: 10,
    tags: ['quick', 'no-cook'],
    rating: 5,
    ingredients: [
      { name: 'bagels', quantity: 2, unit: '' },
      { name: 'cream cheese', quantity: 4, unit: 'tbsp' },
      { name: 'smoked salmon', quantity: 100, unit: 'g' },
      { name: 'capers', quantity: 2, unit: 'tsp' },
      { name: 'red onion', quantity: 0.25, unit: '' },
      { name: 'cucumber', quantity: 0.5, unit: '' },
      { name: 'fresh dill', quantity: 1, unit: 'tbsp' },
      { name: 'lemon', quantity: 0.5, unit: '' },
    ],
    instructions: `1. Toast or leave bagels untoasted.
2. Spread generously with cream cheese.
3. Layer salmon, capers, thinly sliced onion and cucumber.
4. Finish with dill and a squeeze of lemon.`,
  },
  {
    title: 'Spaghetti Aglio e Olio',
    description: 'Classic Italian pasta with garlic, olive oil, and chili',
    meal_type: 'dinner',
    cook_time_minutes: 20,
    tags: ['italian', 'vegan', 'quick'],
    rating: 4,
    ingredients: [
      { name: 'spaghetti', quantity: 400, unit: 'g' },
      { name: 'garlic', quantity: 6, unit: 'cloves' },
      { name: 'red pepper flakes', quantity: 1, unit: 'tsp' },
      { name: 'olive oil', quantity: 6, unit: 'tbsp' },
      { name: 'fresh parsley', quantity: 4, unit: 'tbsp' },
      { name: 'parmesan', quantity: 50, unit: 'g' },
    ],
    instructions: `1. Cook spaghetti in well-salted water until al dente. Reserve 1 cup pasta water.
2. Gently toast sliced garlic and chili in olive oil until golden.
3. Toss drained pasta with garlic oil and pasta water.
4. Remove from heat, add parsley and parmesan.`,
  },
  {
    title: 'Chicken Caesar Salad',
    description: 'Crisp romaine, grilled chicken, house-made croutons, and classic Caesar dressing',
    meal_type: 'lunch',
    cook_time_minutes: 25,
    tags: ['classic', 'weeknight'],
    rating: 4,
    ingredients: [
      { name: 'romaine lettuce', quantity: 2, unit: 'heads' },
      { name: 'chicken breast', quantity: 400, unit: 'g' },
      { name: 'sourdough bread', quantity: 3, unit: 'slices' },
      { name: 'parmesan', quantity: 60, unit: 'g' },
      { name: 'anchovies', quantity: 4, unit: 'fillets' },
      { name: 'garlic', quantity: 1, unit: 'clove' },
      { name: 'dijon mustard', quantity: 1, unit: 'tsp' },
      { name: 'lemon', quantity: 1, unit: '' },
      { name: 'olive oil', quantity: 4, unit: 'tbsp' },
      { name: 'eggs', quantity: 1, unit: '' },
    ],
    instructions: `1. Make croutons: cube bread, toss with oil and salt, bake 400°F until golden.
2. Season and grill chicken until cooked through. Slice.
3. Blend anchovies, garlic, mustard, lemon, egg yolk, oil into dressing.
4. Toss romaine with dressing, top with chicken, croutons, parmesan.`,
  },
  {
    title: 'Granola Parfait',
    description: 'Layered Greek yogurt, homemade granola, and fresh fruit',
    meal_type: 'breakfast',
    cook_time_minutes: 5,
    tags: ['vegetarian', 'quick', 'make-ahead'],
    rating: 4,
    ingredients: [
      { name: 'greek yogurt', quantity: 1, unit: 'cup' },
      { name: 'granola', quantity: 0.5, unit: 'cup' },
      { name: 'mixed berries', quantity: 0.5, unit: 'cup' },
      { name: 'honey', quantity: 1, unit: 'tbsp' },
    ],
    instructions: `1. Layer yogurt, granola, and berries in a glass.
2. Drizzle with honey and serve immediately.`,
  },
  {
    title: 'Shrimp Stir-fry with Bok Choy',
    description: 'Quick high-heat stir-fry with succulent shrimp and crispy vegetables',
    meal_type: 'dinner',
    cook_time_minutes: 15,
    tags: ['asian', 'gluten-free', 'quick'],
    rating: 4,
    ingredients: [
      { name: 'shrimp', quantity: 400, unit: 'g' },
      { name: 'bok choy', quantity: 2, unit: 'heads' },
      { name: 'garlic', quantity: 3, unit: 'cloves' },
      { name: 'ginger', quantity: 1, unit: 'inch' },
      { name: 'soy sauce', quantity: 2, unit: 'tbsp' },
      { name: 'sesame oil', quantity: 1, unit: 'tbsp' },
      { name: 'cornstarch', quantity: 1, unit: 'tsp' },
      { name: 'scallions', quantity: 3, unit: '' },
      { name: 'sesame seeds', quantity: 1, unit: 'tsp' },
    ],
    instructions: `1. Mix soy sauce, sesame oil, cornstarch. Toss shrimp.
2. Heat wok until smoking. Sear shrimp 1 min per side. Remove.
3. Add garlic, ginger, bok choy. Stir-fry 2 min.
4. Return shrimp, toss everything with sauce.
5. Garnish with scallions and sesame seeds.`,
  },
  {
    title: 'Tomato Soup with Grilled Cheese',
    description: 'Roasted tomato soup with a golden grilled cheese for dipping',
    meal_type: 'lunch',
    cook_time_minutes: 45,
    tags: ['vegetarian', 'comfort food', 'classic'],
    rating: 5,
    ingredients: [
      { name: 'tomatoes', quantity: 1, unit: 'kg' },
      { name: 'onion', quantity: 1, unit: '' },
      { name: 'garlic', quantity: 4, unit: 'cloves' },
      { name: 'vegetable broth', quantity: 500, unit: 'ml' },
      { name: 'heavy cream', quantity: 4, unit: 'tbsp' },
      { name: 'sourdough bread', quantity: 4, unit: 'slices' },
      { name: 'cheddar cheese', quantity: 80, unit: 'g' },
      { name: 'butter', quantity: 2, unit: 'tbsp' },
      { name: 'olive oil', quantity: 2, unit: 'tbsp' },
      { name: 'fresh basil', quantity: 4, unit: 'leaves' },
    ],
    instructions: `1. Roast tomatoes, onion, garlic with olive oil at 400°F, 30 min.
2. Blend with broth until smooth. Stir in cream.
3. Butter bread, add cheese, grill in pan until golden on both sides.
4. Serve soup topped with basil, grilled cheese alongside.`,
  },
]

async function seed() {
  const u1email = process.env.SEED_USER1_EMAIL ?? 'user1@scullery.test'
  const u1pass = process.env.SEED_USER1_PASSWORD ?? 'TestPassword1!'
  const u2email = process.env.SEED_USER2_EMAIL ?? 'user2@scullery.test'
  const u2pass = process.env.SEED_USER2_PASSWORD ?? 'TestPassword2!'

  console.log('Creating user 1…')
  const { data: u1, error: e1 } = await supabase.auth.admin.createUser({
    email: u1email,
    password: u1pass,
    email_confirm: true,
    user_metadata: { display_name: 'Alex' },
  })
  if (e1 && !e1.message.includes('already registered')) {
    console.error('User 1 error:', e1.message)
    return
  }
  const user1 = u1?.user

  // Get household for user 1
  await new Promise((r) => setTimeout(r, 500)) // give trigger time to run

  const { data: profile1 } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user1!.id)
    .single()

  let householdId = profile1?.household_id

  if (!householdId) {
    // create manually if trigger didn't fire
    const { data: hh } = await supabase
      .from('households')
      .insert({ name: 'Our Household' })
      .select()
      .single()
    householdId = hh!.id
    await supabase.from('profiles').upsert({ id: user1!.id, household_id: householdId, display_name: 'Alex' })
  }

  console.log('Household ID:', householdId)

  console.log('Creating user 2…')
  const { data: u2 } = await supabase.auth.admin.createUser({
    email: u2email,
    password: u2pass,
    email_confirm: true,
    user_metadata: { display_name: 'Jordan' },
  })
  if (u2?.user) {
    await supabase.from('profiles').upsert({
      id: u2.user.id,
      household_id: householdId,
      display_name: 'Jordan',
    })
    // Remove the auto-created household for user 2
    console.log('Linked user 2 to household')
  }

  console.log('Seeding 20 recipes…')
  const { data: insertedRecipes, error: recipeErr } = await supabase
    .from('recipes')
    .insert(RECIPES.map((r) => ({ ...r, household_id: householdId })))
    .select()

  if (recipeErr) {
    console.error('Recipe error:', recipeErr.message)
    return
  }

  console.log(`Inserted ${insertedRecipes?.length} recipes`)

  // Create a weekly plan for the current week
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(monday.getDate() + diff)
  const weekStart = monday.toISOString().split('T')[0]

  const { data: plan } = await supabase
    .from('weekly_plans')
    .insert({
      household_id: householdId,
      week_start: weekStart,
      config: { breakfast: 2, lunch: 4, dinner: 5, snack: 0, library_ratio: 0.6 },
    })
    .select()
    .single()

  if (!plan || !insertedRecipes) {
    console.log('Could not create plan')
    return
  }

  // Assign recipes to slots across the week
  const breakfastRecipes = insertedRecipes.filter((r) => r.meal_type === 'breakfast')
  const lunchRecipes = insertedRecipes.filter((r) => r.meal_type === 'lunch')
  const dinnerRecipes = insertedRecipes.filter((r) => r.meal_type === 'dinner')

  const slots = [
    // Breakfasts: Mon, Thu
    { day_of_week: 0, meal_type: 'breakfast', recipe_id: breakfastRecipes[0].id, sort_order: 0 },
    { day_of_week: 3, meal_type: 'breakfast', recipe_id: breakfastRecipes[1].id, sort_order: 0 },
    // Lunches: Mon, Tue, Wed, Fri
    { day_of_week: 0, meal_type: 'lunch', recipe_id: lunchRecipes[0].id, sort_order: 1 },
    { day_of_week: 1, meal_type: 'lunch', recipe_id: lunchRecipes[1].id, sort_order: 0 },
    { day_of_week: 2, meal_type: 'lunch', recipe_id: lunchRecipes[2].id, sort_order: 0 },
    { day_of_week: 4, meal_type: 'lunch', recipe_id: lunchRecipes[3].id, sort_order: 0, is_locked: true },
    // Dinners: Mon-Fri
    { day_of_week: 0, meal_type: 'dinner', recipe_id: dinnerRecipes[0].id, sort_order: 2, is_locked: true },
    { day_of_week: 1, meal_type: 'dinner', recipe_id: dinnerRecipes[1].id, sort_order: 1 },
    { day_of_week: 2, meal_type: 'dinner', recipe_id: dinnerRecipes[2].id, sort_order: 1 },
    { day_of_week: 3, meal_type: 'dinner', recipe_id: dinnerRecipes[3].id, sort_order: 1 },
    { day_of_week: 4, meal_type: 'dinner', recipe_id: dinnerRecipes[4].id, sort_order: 1 },
  ]

  await supabase.from('plan_slots').insert(
    slots.map((s) => ({ ...s, plan_id: plan.id, is_locked: s.is_locked ?? false })),
  )

  console.log('✓ Seed complete!')
  console.log(`  User 1: ${u1email} / ${u1pass}`)
  console.log(`  User 2: ${u2email} / ${u2pass}`)
  console.log(`  Household: ${householdId}`)
}

seed().catch(console.error)
