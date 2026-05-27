export type GroceryCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'seafood'
  | 'pantry'
  | 'bakery'
  | 'frozen'
  | 'beverages'
  | 'other'

const CATEGORY_MAP: Record<string, GroceryCategory> = {
  // produce
  garlic: 'produce', onion: 'produce', onions: 'produce', shallot: 'produce', shallots: 'produce',
  tomato: 'produce', tomatoes: 'produce', 'cherry tomatoes': 'produce',
  lettuce: 'produce', spinach: 'produce', kale: 'produce', arugula: 'produce',
  basil: 'produce', cilantro: 'produce', parsley: 'produce', mint: 'produce',
  thyme: 'produce', rosemary: 'produce', sage: 'produce', dill: 'produce',
  lemon: 'produce', lemons: 'produce', lime: 'produce', limes: 'produce',
  orange: 'produce', oranges: 'produce', apple: 'produce', apples: 'produce',
  banana: 'produce', bananas: 'produce', avocado: 'produce', avocados: 'produce',
  carrot: 'produce', carrots: 'produce', celery: 'produce', cucumber: 'produce',
  zucchini: 'produce', broccoli: 'produce', cauliflower: 'produce',
  pepper: 'produce', peppers: 'produce', 'bell pepper': 'produce', 'bell peppers': 'produce',
  mushroom: 'produce', mushrooms: 'produce', potato: 'produce', potatoes: 'produce',
  'sweet potato': 'produce', 'sweet potatoes': 'produce', corn: 'produce',
  pea: 'produce', peas: 'produce', asparagus: 'produce', 'green bean': 'produce',
  'green beans': 'produce', eggplant: 'produce', fennel: 'produce', leek: 'produce',
  'brussels sprouts': 'produce', cabbage: 'produce', 'bok choy': 'produce',
  ginger: 'produce', scallion: 'produce', scallions: 'produce',
  'green onion': 'produce', 'green onions': 'produce',

  // dairy
  milk: 'dairy', butter: 'dairy', cream: 'dairy', 'heavy cream': 'dairy',
  'sour cream': 'dairy', yogurt: 'dairy', 'greek yogurt': 'dairy',
  cheese: 'dairy', 'parmesan cheese': 'dairy', 'mozzarella cheese': 'dairy',
  'cheddar cheese': 'dairy', 'feta cheese': 'dairy', 'cream cheese': 'dairy',
  'ricotta cheese': 'dairy', parmesan: 'dairy', mozzarella: 'dairy',
  cheddar: 'dairy', feta: 'dairy', 'goat cheese': 'dairy', brie: 'dairy',
  eggs: 'dairy', egg: 'dairy', 'half and half': 'dairy',
  'creme fraiche': 'dairy', buttermilk: 'dairy',

  // meat
  chicken: 'meat', 'chicken breast': 'meat', 'chicken thighs': 'meat',
  'chicken thigh': 'meat', 'whole chicken': 'meat', 'ground chicken': 'meat',
  beef: 'meat', 'ground beef': 'meat', steak: 'meat', 'beef broth': 'meat',
  pork: 'meat', bacon: 'meat', 'pork chops': 'meat', sausage: 'meat',
  prosciutto: 'meat', pancetta: 'meat', salami: 'meat', pepperoni: 'meat',
  turkey: 'meat', 'ground turkey': 'meat', lamb: 'meat', veal: 'meat',
  'italian sausage': 'meat', chorizo: 'meat', ham: 'meat',

  // seafood
  salmon: 'seafood', tuna: 'seafood', shrimp: 'seafood', cod: 'seafood',
  halibut: 'seafood', tilapia: 'seafood', scallops: 'seafood', clams: 'seafood',
  mussels: 'seafood', crab: 'seafood', lobster: 'seafood', anchovy: 'seafood',
  anchovies: 'seafood', sardines: 'seafood',

  // pantry
  salt: 'pantry', 'ground pepper': 'pantry', 'black pepper': 'pantry',
  'olive oil': 'pantry', 'vegetable oil': 'pantry', 'canola oil': 'pantry',
  'sesame oil': 'pantry', 'coconut oil': 'pantry',
  flour: 'pantry', 'all-purpose flour': 'pantry', 'bread flour': 'pantry',
  sugar: 'pantry', 'brown sugar': 'pantry', 'powdered sugar': 'pantry',
  rice: 'pantry', 'white rice': 'pantry', 'brown rice': 'pantry',
  pasta: 'pantry', spaghetti: 'pantry', penne: 'pantry', rigatoni: 'pantry',
  noodles: 'pantry', 'rice noodles': 'pantry', couscous: 'pantry',
  lentils: 'pantry', chickpeas: 'pantry', 'black beans': 'pantry',
  'kidney beans': 'pantry', 'cannellini beans': 'pantry', 'white beans': 'pantry',
  'canned tomatoes': 'pantry', 'tomato paste': 'pantry', 'tomato sauce': 'pantry',
  'chicken broth': 'pantry', 'vegetable broth': 'pantry',
  'soy sauce': 'pantry', 'fish sauce': 'pantry', 'oyster sauce': 'pantry',
  'hot sauce': 'pantry', vinegar: 'pantry', 'red wine vinegar': 'pantry',
  'balsamic vinegar': 'pantry', 'apple cider vinegar': 'pantry',
  'dijon mustard': 'pantry', mustard: 'pantry', honey: 'pantry',
  'maple syrup': 'pantry', 'peanut butter': 'pantry', 'tahini': 'pantry',
  cumin: 'pantry', paprika: 'pantry', 'smoked paprika': 'pantry',
  turmeric: 'pantry', coriander: 'pantry', cinnamon: 'pantry',
  oregano: 'pantry', 'dried oregano': 'pantry', 'dried basil': 'pantry',
  'dried thyme': 'pantry', 'red pepper flakes': 'pantry', 'chili flakes': 'pantry',
  'baking soda': 'pantry', 'baking powder': 'pantry', yeast: 'pantry',
  cornstarch: 'pantry', breadcrumbs: 'pantry', 'panko breadcrumbs': 'pantry',
  'coconut milk': 'pantry', 'canned coconut milk': 'pantry',
  nuts: 'pantry', almonds: 'pantry', walnuts: 'pantry', cashews: 'pantry',
  'pine nuts': 'pantry', 'sesame seeds': 'pantry',
  oats: 'pantry', 'rolled oats': 'pantry',

  // bakery
  bread: 'bakery', 'sourdough bread': 'bakery', baguette: 'bakery',
  rolls: 'bakery', 'tortillas': 'bakery', 'pita bread': 'bakery',
  'naan bread': 'bakery',

  // beverages
  wine: 'beverages', 'red wine': 'beverages', 'white wine': 'beverages',
  beer: 'beverages', 'chicken stock': 'beverages',
}

export function categorize(ingredientName: string): GroceryCategory {
  const normalized = ingredientName.toLowerCase().trim()
  if (CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized]

  // Partial match against map keys
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return cat
  }

  return 'other'
}

export const CATEGORY_ORDER: GroceryCategory[] = [
  'produce', 'dairy', 'meat', 'seafood', 'bakery', 'pantry', 'frozen', 'beverages', 'other',
]

export const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce:   'Produce',
  dairy:     'Dairy & Eggs',
  meat:      'Meat & Poultry',
  seafood:   'Seafood',
  pantry:    'Pantry',
  bakery:    'Bakery',
  frozen:    'Frozen',
  beverages: 'Beverages',
  other:     'Other',
}
