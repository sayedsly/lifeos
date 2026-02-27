import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ foods: [] });

  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=8&api_key=DEMO_KEY`
    );
    const data = await res.json();

    const foods = (data.foods || []).map((f: any) => {
      const nutrients = f.foodNutrients || [];
      const get = (name: string) => {
        const n = nutrients.find((n: any) =>
          n.nutrientName?.toLowerCase().includes(name.toLowerCase())
        );
        return Math.round((n?.value || 0) * 10) / 10;
      };
      return {
        name: f.description,
        brand: f.brandOwner || f.brandName || "",
        serving: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || "g"}` : "100g",
        calories: get("energy"),
        protein: get("protein"),
        carbs: get("carbohydrate"),
        fat: get("total lipid"),
        fiber: get("fiber"),
      };
    });

    return NextResponse.json({ foods });
  } catch (e) {
    return NextResponse.json({ foods: [] });
  }
}
