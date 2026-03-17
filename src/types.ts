export interface Meal {
  id: string;
  type: string;
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

export interface GroceryCategory {
  category: string;
  items: string[];
}

export interface MealPlan {
  days: DayPlan[];
  groceryList: GroceryCategory[];
}
