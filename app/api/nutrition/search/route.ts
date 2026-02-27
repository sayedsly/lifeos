import { NextRequest, NextResponse } from "next/server";

interface FoodResult {
  name: string;
  brand: string;
  serving: string;
  servingGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  source: string;
}

async function searchUSDA(query: string): Promise<FoodResult[]> {
  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=6&api_key=${process.env.USDA_API_KEY || "DEMO_KEY"}`
    );
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
        serving: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || "g"}` : "100g",
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

async function searchOpenFoodFacts(query: string): Promise<FoodResult[]> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,brands,serving_size,nutriments`,
      { headers: { "User-Agent": "LifeOS/1.0 (health tracking app)" } }
    );
    const data = await res.json();
    return (data.products || [])
      .filter((p: any) => p.product_name && (p.nutriments?.["energy-kcal_serving"] || p.nutriments?.["energy-kcal_100g"]))
      .map((p: any) => {
        const n = p.nutriments || {};
        const perServing = !!n["energy-kcal_serving"];
        return {
          name: p.product_name,
          brand: p.brands || "",
          serving: p.serving_size || "100g",
          servingGrams: 100,
          calories: Math.round(perServing ? n["energy-kcal_serving"] : n["energy-kcal_100g"] || 0),
          protein: Math.round((perServing ? n["proteins_serving"] : n["proteins_100g"] || 0) * 10) / 10,
          carbs: Math.round((perServing ? n["carbohydrates_serving"] : n["carbohydrates_100g"] || 0) * 10) / 10,
          fat: Math.round((perServing ? n["fat_serving"] : n["fat_100g"] || 0) * 10) / 10,
          fiber: Math.round((perServing ? n["fiber_serving"] : n["fiber_100g"] || 0) * 10) / 10,
          source: "Open Food Facts",
        };
      });
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) return NextResponse.json({ foods: [] });

  const [usda, off] = await Promise.all([
    searchUSDA(query),
    searchOpenFoodFacts(query),
  ]);

  // Interleave results — USDA first, then OFF, dedupe by name
  const seen = new Set<string>();
  const merged: FoodResult[] = [];
  for (const food of [...usda, ...off]) {
    const key = food.name.toLowerCase().slice(0, 25);
    if (!seen.has(key)) { seen.add(key); merged.push(food); }
  }

  return NextResponse.json({ foods: merged.slice(0, 12) });
}
