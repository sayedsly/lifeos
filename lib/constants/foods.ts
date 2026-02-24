export interface FoodItem {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const FOOD_DB: FoodItem[] = [
  { name: "egg", serving: "1 large", calories: 70, protein: 6, carbs: 0, fat: 5, fiber: 0 },
  { name: "bacon strip", serving: "1 strip", calories: 42, protein: 3, carbs: 0, fat: 3, fiber: 0 },
  { name: "white rice", serving: "100g cooked", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 },
  { name: "brown rice", serving: "100g cooked", calories: 112, protein: 2.6, carbs: 24, fat: 0.9, fiber: 1.8 },
  { name: "oats", serving: "100g dry", calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11 },
  { name: "chicken breast", serving: "100g cooked", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  { name: "ground beef", serving: "100g cooked", calories: 250, protein: 26, carbs: 0, fat: 17, fiber: 0 },
  { name: "salmon", serving: "100g", calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  { name: "tuna", serving: "100g", calories: 132, protein: 28, carbs: 0, fat: 1, fiber: 0 },
  { name: "banana", serving: "1 medium", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 },
  { name: "apple", serving: "1 medium", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 },
  { name: "bread slice", serving: "1 slice", calories: 79, protein: 2.7, carbs: 15, fat: 1, fiber: 0.6 },
  { name: "toast", serving: "1 slice", calories: 79, protein: 2.7, carbs: 15, fat: 1, fiber: 0.6 },
  { name: "peanut butter", serving: "1 tbsp", calories: 94, protein: 4, carbs: 3, fat: 8, fiber: 1 },
  { name: "whole milk", serving: "240ml", calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0 },
  { name: "greek yogurt", serving: "170g", calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0 },
  { name: "protein shake", serving: "1 scoop", calories: 120, protein: 25, carbs: 3, fat: 1, fiber: 0 },
  { name: "almonds", serving: "28g", calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5 },
  { name: "avocado", serving: "100g", calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7 },
  { name: "sweet potato", serving: "100g", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3 },
  { name: "broccoli", serving: "100g", calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6 },
  { name: "pasta", serving: "100g cooked", calories: 158, protein: 5.8, carbs: 31, fat: 0.9, fiber: 1.8 },
  { name: "pizza slice", serving: "1 slice", calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2 },
  { name: "burger", serving: "1 burger", calories: 540, protein: 34, carbs: 40, fat: 25, fiber: 2 },
  { name: "coffee", serving: "240ml black", calories: 2, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  { name: "orange juice", serving: "240ml", calories: 112, protein: 1.7, carbs: 26, fat: 0.5, fiber: 0.5 },
  { name: "whey protein", serving: "1 scoop", calories: 120, protein: 25, carbs: 3, fat: 1, fiber: 0 },
  { name: "cottage cheese", serving: "100g", calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0 },
  { name: "cheddar cheese", serving: "28g", calories: 113, protein: 7, carbs: 0.4, fat: 9, fiber: 0 },
  { name: "tortilla", serving: "1 medium", calories: 146, protein: 3.8, carbs: 26, fat: 3.5, fiber: 2 },
];
