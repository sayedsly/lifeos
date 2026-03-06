import { NextRequest, NextResponse } from "next/server";

interface FoodResult {
  name: string; brand: string; serving: string; servingGrams: number;
  calories: number; protein: number; carbs: number; fat: number; fiber: number;
  source: string;
}

const COMMON_FOODS: FoodResult[] = [
  { name: "Egg (large)", brand: "", serving: "1 egg (50g)", servingGrams: 50, calories: 70, protein: 6, carbs: 0, fat: 5, fiber: 0, source: "Common" },
  { name: "Chicken Breast (cooked)", brand: "", serving: "100g", servingGrams: 100, calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, source: "Common" },
  { name: "White Rice (cooked)", brand: "", serving: "100g", servingGrams: 100, calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, source: "Common" },
  { name: "Brown Rice (cooked)", brand: "", serving: "100g", servingGrams: 100, calories: 112, protein: 2.6, carbs: 24, fat: 0.9, fiber: 1.8, source: "Common" },
  { name: "Banana", brand: "", serving: "1 medium (118g)", servingGrams: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, source: "Common" },
  { name: "Apple", brand: "", serving: "1 medium (182g)", servingGrams: 182, calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, source: "Common" },
  { name: "Oats (dry)", brand: "", serving: "40g (1/2 cup)", servingGrams: 40, calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4, source: "Common" },
  { name: "Whole Milk", brand: "", serving: "240ml (1 cup)", servingGrams: 240, calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0, source: "Common" },
  { name: "Greek Yogurt (plain)", brand: "", serving: "170g", servingGrams: 170, calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, source: "Common" },
  { name: "Almonds", brand: "", serving: "28g (1oz)", servingGrams: 28, calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, source: "Common" },
  { name: "Peanut Butter", brand: "", serving: "2 tbsp (32g)", servingGrams: 32, calories: 190, protein: 8, carbs: 6, fat: 16, fiber: 2, source: "Common" },
  { name: "Salmon (cooked)", brand: "", serving: "100g", servingGrams: 100, calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, source: "Common" },
  { name: "Tuna (canned)", brand: "", serving: "85g", servingGrams: 85, calories: 100, protein: 22, carbs: 0, fat: 0.5, fiber: 0, source: "Common" },
  { name: "Broccoli", brand: "", serving: "100g", servingGrams: 100, calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, source: "Common" },
  { name: "Sweet Potato", brand: "", serving: "1 medium (130g)", servingGrams: 130, calories: 112, protein: 2, carbs: 26, fat: 0.1, fiber: 3.9, source: "Common" },
  { name: "Avocado", brand: "", serving: "1/2 avocado (75g)", servingGrams: 75, calories: 120, protein: 1.5, carbs: 6, fat: 11, fiber: 5, source: "Common" },
  { name: "White Bread", brand: "", serving: "1 slice (30g)", servingGrams: 30, calories: 80, protein: 2.7, carbs: 15, fat: 1, fiber: 0.6, source: "Common" },
  { name: "Whey Protein Powder", brand: "", serving: "1 scoop (30g)", servingGrams: 30, calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, source: "Common" },
  { name: "Orange Juice", brand: "", serving: "240ml (1 cup)", servingGrams: 240, calories: 112, protein: 1.7, carbs: 26, fat: 0.5, fiber: 0.5, source: "Common" },
  { name: "Cheddar Cheese", brand: "", serving: "28g (1oz)", servingGrams: 28, calories: 113, protein: 7, carbs: 0.4, fat: 9, fiber: 0, source: "Common" },
  { name: "Ground Beef (lean)", brand: "", serving: "100g", servingGrams: 100, calories: 215, protein: 26, carbs: 0, fat: 12, fiber: 0, source: "Common" },
  { name: "Pasta (cooked)", brand: "", serving: "100g", servingGrams: 100, calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, source: "Common" },
  { name: "Cottage Cheese", brand: "", serving: "100g", servingGrams: 100, calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0, source: "Common" },
  { name: "Blueberries", brand: "", serving: "100g", servingGrams: 100, calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4, source: "Common" },
  { name: "Strawberries", brand: "", serving: "100g", servingGrams: 100, calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, source: "Common" },
];

async function searchUSDA(query: string): Promise<FoodResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      "https://api.nal.usda.gov/fdc/v1/foods/search?query=" + encodeURIComponent(query) + "&pageSize=8&dataType=Survey%20(FNDDS),SR%20Legacy,Branded&api_key=" + (process.env.USDA_API_KEY || "DEMO_KEY"),
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await res.json();
    return (data.foods || []).map((f: any) => {
      const nutrients = f.foodNutrients || [];
      const get = (name: string) => {
        const n = nutrients.find((n: any) => n.nutrientName?.toLowerCase().includes(name.toLowerCase()));
        return Math.round((n?.value || 0) * 10) / 10;
      };
      return {
        name: f.description,
        brand: f.brandOwner || f.brandName || "",
        serving: f.servingSize ? f.servingSize + (f.servingSizeUnit || "g") : "100g",
        servingGrams: f.servingSize || 100,
        calories: get("energy"),
        protein: get("protein"),
        carbs: get("carbohydrate"),
        fat: get("total lipid"),
        fiber: get("fiber"),
        source: "USDA",
      };
    });
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) return NextResponse.json({ foods: [] });

  const q = query.toLowerCase().trim();

  // Always search common foods instantly
  const common = COMMON_FOODS.filter(f =>
    f.name.toLowerCase().includes(q) ||
    q.split(" ").some(word => word.length > 2 && f.name.toLowerCase().includes(word))
  );

  // Run USDA in parallel
  const usda = await searchUSDA(query);

  const seen = new Set<string>();
  const merged: FoodResult[] = [];
  for (const food of [...common, ...usda]) {
    const key = food.name.toLowerCase().slice(0, 20);
    if (!seen.has(key)) { seen.add(key); merged.push(food); }
  }

  return NextResponse.json({ foods: merged.slice(0, 12) });
}
