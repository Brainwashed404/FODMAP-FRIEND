import { GoogleGenAI, Type } from "@google/genai";
import { MealPlan, Meal } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    // Try process.env (injected by Vite define) or import.meta.env (Vite standard)
    const apiKey = (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) || 
                   (import.meta as any).env?.VITE_GEMINI_API_KEY;
    
    const isPlaceholder = !apiKey || 
                         apiKey === 'MY_GEMINI_API_KEY' || 
                         apiKey === 'undefined' || 
                         apiKey === '';

    if (isPlaceholder) {
      throw new Error("Gemini API Key is missing. If you are on Vercel, please add GEMINI_API_KEY to your Project Settings > Environment Variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const schema = {
  type: Type.OBJECT,
  properties: {
    days: {
      type: Type.ARRAY,
      description: "Meal plan days.",
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, description: "Day of the week (e.g., Monday)" },
          meals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Unique identifier for the meal (e.g., 'mon-bfast-oats')" },
                type: { type: Type.STRING, description: "Breakfast, Lunch, Dinner, or Snack" },
                name: { type: Type.STRING, description: "Name of the meal" },
                description: { type: Type.STRING, description: "Short description of the meal" },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of ingredients"
                },
                instructions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Step-by-step recipe instructions"
                },
                prepTime: { type: Type.STRING, description: "Estimated preparation time" }
              },
              required: ["id", "type", "name", "description", "ingredients", "instructions", "prepTime"]
            }
          }
        },
        required: ["day", "meals"]
      }
    },
    groceryList: {
      type: Type.ARRAY,
      description: "Categorised grocery list.",
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: "Category (Fruit & Veg, Meat & Seafood, Dairy & Eggs, Grains & Bakery, or Pantry & Spices)" },
          items: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of grocery items in this category"
          }
        },
        required: ["category", "items"]
      }
    }
  },
  required: ["days", "groceryList"]
};

export async function generateTodayMealPlan(dayName: string, preferences: string): Promise<MealPlan> {
  const ai = getAI();
  const prompt = `Generate a 1-day meal plan for ${dayName} for someone suffering from Irritable Bowel Syndrome (IBS). 
The meals MUST strictly follow the Low FODMAP foundations based on the latest clinical guidelines:
- STRICTLY AVOID: 
    * Vegetables: Garlic, onion (all types), shallots, leeks, asparagus, beetroot, broccoli (large amounts), brussels sprouts, cabbage (large amounts), cauliflower, fennel, mushrooms, okra, green peas, artichoke.
    * Fruit: Apple, mango, nashi, pear, watermelon, apricot, blackberry, cherry, lychee, nectarine, peach, plum, prune, custard apple, persimmon, figs, dates, dried fruit, fruit juice.
    * Grains: Wheat, rye, barley, couscous, spelt (except 100% spelt bread), wheat pasta, bulgur, semolina.
    * Dairy: Milk (cow, goat, sheep), custard, ice cream, yogurt (regular), soft cheeses (cottage, cream, mascarpone, ricotta, cream cheese), condensed milk, sour cream.
    * Legumes: Beans, baked beans, kidney beans, soybeans, black beans, edamame, hummus, split peas, lentils/chickpeas (unless small canned portions).
    * Sweeteners: Fructose, high fructose corn syrup, corn syrup, honey, agave syrup, sorbitol (420), mannitol (421), isomalt (953), maltitol (965), xylitol (967), inulin.
    * Nuts: Cashews, pistachios, hazelnuts.
    * Misc: Chicory, dandelion, camomile, chai, fennel tea, rum, dessert wine.
- STRICTLY LIMIT (small quantities only): 
    * Avocado (max 0.25), sweet potato (small portion), sweet corn, celery, green beans, broccoli florets, cauliflower (very small portion), canned chickpeas/lentils (rinsed, max 40g), almonds (max 10), oats (max 50g).
- ALLOWED/SUITABLE: 
    * Vegetables: Alfalfa, bamboo shoots, bean shoots, bok choy, carrot, choko, choy sum, endive, ginger, lettuces, olives, parsnip, potato, pumpkin, red bell pepper, silver beet, spinach, summer squash, swede, taro, tomato, turnip, yam, zucchini, kale, cucumber, rocket, spring onion (green part only), eggplant.
    * Fruit: Banana, blueberry, boysenberry, cantaloupe, cranberry, durian, grape, grapefruit, honeydew melon, kiwi, lemon, lime, mandarin, orange, passionfruit, pawpaw, raspberry, rhubarb, rockmelon, star anise, strawberry, tangelo, pineapple.
    * Grains: Rice (white, basmati, brown), quinoa, rice noodles, gluten-free bread/pasta, polenta, arrowroot, millet, psyllium, sorghum, tapioca, buckwheat, cornflakes, corn tortillas.
    * Dairy/Alternatives: Lactose-free milk/yogurt/cheese, oat milk (limit), rice milk, soy milk (protein based), almond milk, hard cheeses (Cheddar, Feta, Mozzarella, Brie, Camembert, Swiss), butter, coconut yogurt.
    * Proteins: Chicken, turkey, eggs, firm tofu, fresh fish, canned tuna, beef, pork, lamb, tempeh, duck.
    * Sweeteners: Sucrose, glucose, stevia, brown sugar, rice malt syrup, splenda, monk fruit, aspartame, golden syrup, maple syrup, molasses, treacle.
    * Nuts & Seeds: Peanuts, macadamias, walnuts, chia seeds, pumpkin seeds, sunflower seeds, flaxseeds, pecans, pine nuts.
    * Misc: Garlic-infused oil (strained), asafoetida (hing), salt, pepper, vinegar, most herbs and spices (no onion/garlic powder).

Take into account the following user preferences or restrictions: ${preferences || 'None'}.
Provide Breakfast, Lunch, Dinner, and one Snack.
CRITICAL REQUIREMENTS:
1. Use UK measurements (grams, ml, Celsius) and UK English spelling.
2. Provide step-by-step recipe instructions for ALL meals.
3. ALL meals and the grocery list MUST be portioned to serve exactly 1 person.
4. Use decimals instead of fractions for all measurements (e.g., 0.5 instead of 1/2).
5. Always specify 'fan assisted oven' for any oven temperatures (e.g., 180°C fan).
6. Be adventurous but highly economical!
7. Lunches MUST be extremely quick to prepare (under 10 minutes) or require no cooking at all.
8. For the grocery list, strictly use "Fruit & Veg" as the category name instead of "Produce".
9. DO NOT include the words "Low FODMAP" in any recipe titles or descriptions.
10. DO NOT use an "Other" category in the grocery list. Map all ingredients to the most appropriate main category: Fruit & Veg, Meat & Seafood, Dairy & Eggs, Grains & Bakery, or Pantry & Spices.
11. For ingredients and grocery items, if the quantity is a whole number or decimal without a unit (e.g., 1, 0.5), format it as '[quantity] x [item]' (e.g., '1 x firm banana'). If it has a measurement unit (e.g., '50g', '100ml'), format it as '[quantity][unit] [item]' (e.g., '50g cucumber'). ALWAYS ensure there is a space between the quantity/unit and the item name.
Generate the 1-day plan and a grocery list for just this day.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate today's meal plan.");
  
  return JSON.parse(text) as MealPlan;
}

export async function generateRemainingWeekMealPlan(todayPlan: MealPlan, preferences: string): Promise<MealPlan> {
  const ai = getAI();
  const firstDay = todayPlan.days[0];
  const prompt = `Generate a 6-day meal plan for the rest of the week for someone suffering from IBS.
The meals MUST strictly follow the Low FODMAP foundations based on the latest clinical guidelines:
- STRICTLY AVOID: 
    * Vegetables: Garlic, onion (all types), shallots, leeks, asparagus, beetroot, broccoli (large amounts), brussels sprouts, cabbage (large amounts), cauliflower, fennel, mushrooms, okra, green peas, artichoke.
    * Fruit: Apple, mango, nashi, pear, watermelon, apricot, blackberry, cherry, lychee, nectarine, peach, plum, prune, custard apple, persimmon, figs, dates, dried fruit, fruit juice.
    * Grains: Wheat, rye, barley, couscous, spelt (except 100% spelt bread), wheat pasta, bulgur, semolina.
    * Dairy: Milk (cow, goat, sheep), custard, ice cream, yogurt (regular), soft cheeses (cottage, cream, mascarpone, ricotta, cream cheese), condensed milk, sour cream.
    * Legumes: Beans, baked beans, kidney beans, soybeans, black beans, edamame, hummus, split peas, lentils/chickpeas (unless small canned portions).
    * Sweeteners: Fructose, high fructose corn syrup, corn syrup, honey, agave syrup, sorbitol (420), mannitol (421), isomalt (953), maltitol (965), xylitol (967), inulin.
    * Nuts: Cashews, pistachios, hazelnuts.
    * Misc: Chicory, dandelion, camomile, chai, fennel tea, rum, dessert wine.
- STRICTLY LIMIT (small quantities only): 
    * Avocado (max 0.25), sweet potato (small portion), sweet corn, celery, green beans, broccoli florets, cauliflower (very small portion), canned chickpeas/lentils (rinsed, max 40g), almonds (max 10), oats (max 50g).
- ALLOWED/SUITABLE: 
    * Vegetables: Alfalfa, bamboo shoots, bean shoots, bok choy, carrot, choko, choy sum, endive, ginger, lettuces, olives, parsnip, potato, pumpkin, red bell pepper, silver beet, spinach, summer squash, swede, taro, tomato, turnip, yam, zucchini, kale, cucumber, rocket, spring onion (green part only), eggplant.
    * Fruit: Banana, blueberry, boysenberry, cantaloupe, cranberry, durian, grape, grapefruit, honeydew melon, kiwi, lemon, lime, mandarin, orange, passionfruit, pawpaw, raspberry, rhubarb, rockmelon, star anise, strawberry, tangelo, pineapple.
    * Grains: Rice (white, basmati, brown), quinoa, rice noodles, gluten-free bread/pasta, polenta, arrowroot, millet, psyllium, sorghum, tapioca, buckwheat, cornflakes, corn tortillas.
    * Dairy/Alternatives: Lactose-free milk/yogurt/cheese, oat milk (limit), rice milk, soy milk (protein based), almond milk, hard cheeses (Cheddar, Feta, Mozzarella, Brie, Camembert, Swiss), butter, coconut yogurt.
    * Proteins: Chicken, turkey, eggs, firm tofu, fresh fish, canned tuna, beef, pork, lamb, tempeh, duck.
    * Sweeteners: Sucrose, glucose, stevia, brown sugar, rice malt syrup, splenda, monk fruit, aspartame, golden syrup, maple syrup, molasses, treacle.
    * Nuts & Seeds: Peanuts, macadamias, walnuts, chia seeds, pumpkin seeds, sunflower seeds, flaxseeds, pecans, pine nuts.
    * Misc: Garlic-infused oil (strained), asafoetida (hing), salt, pepper, vinegar, most herbs and spices (no onion/garlic powder).

The first day (${firstDay.day}) is already planned with these meals:
${JSON.stringify(firstDay.meals.map(m => ({type: m.type, name: m.name, ingredients: m.ingredients})))}

Generate the remaining 6 days of the week to complete a 7-day plan.
Take into account the following user preferences or restrictions: ${preferences || 'None'}.
CRITICAL REQUIREMENTS:
1. Use UK measurements (grams, ml, Celsius) and UK English spelling.
2. Provide step-by-step recipe instructions for ALL meals.
3. ALL meals MUST be portioned to serve exactly 1 person.
4. Use decimals instead of fractions.
5. Always specify 'fan assisted oven'.
6. Find the 'sweet spot' between variety and practicality. Provide a diverse and interesting week by including a mix of 3-4 different proteins (e.g., chicken, fish, eggs, and tofu) and a varied selection of 5-7 different vegetables. Avoid the boredom of eating the same thing every day, but also avoid a shopping list that requires buying every single item in the supermarket. Aim for 'smart variety'—select versatile ingredients that can be used in 2-3 different ways across the week to keep the shopping list manageable and budget-friendly, while ensuring every day feels different and exciting. Avoid requiring a huge variety of expensive, single-use ingredients.
7. Lunches MUST be extremely quick to prepare (under 10 minutes) or require no cooking at all.
8. For the grocery list, strictly use "Fruit & Veg" as the category name instead of "Produce".
9. DO NOT include the words "Low FODMAP" in any recipe titles or descriptions.
10. DO NOT use an "Other" category in the grocery list. Map all ingredients to the most appropriate main category: Fruit & Veg, Meat & Seafood, Dairy & Eggs, Grains & Bakery, or Pantry & Spices.
11. For ingredients and grocery items, if the quantity is a whole number or decimal without a unit (e.g., 1, 0.5), format it as '[quantity] x [item]' (e.g., '1 x firm banana'). If it has a measurement unit (e.g., '50g', '100ml'), format it as '[quantity][unit] [item]' (e.g., '50g cucumber'). ALWAYS ensure there is a space between the quantity/unit and the item name.

Return the 6 days of meals, AND a categorised grocery list for the ENTIRE 7-day week (including the ingredients from the first day).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate the rest of the week's meal plan.");
  
  return JSON.parse(text) as MealPlan;
}

export async function regenerateMeal(currentMeal: Meal, day: string, preferences: string): Promise<Meal> {
  const ai = getAI();
  const prompt = `The user wants to replace the following meal in their IBS meal plan for ${day}:
${JSON.stringify(currentMeal)}

User preferences/restrictions: ${preferences || 'None'}.

Generate a NEW, DIFFERENT meal of the same type (${currentMeal.type}) that is also strictly Low FODMAP and economical.
The meal MUST strictly follow the Low FODMAP foundations based on the latest clinical guidelines:
- STRICTLY AVOID: 
    * Vegetables: Garlic, onion (all types), shallots, leeks, asparagus, beetroot, broccoli (large amounts), brussels sprouts, cabbage (large amounts), cauliflower, fennel, mushrooms, okra, green peas, artichoke.
    * Fruit: Apple, mango, nashi, pear, watermelon, apricot, blackberry, cherry, lychee, nectarine, peach, plum, prune, custard apple, persimmon, figs, dates, dried fruit, fruit juice.
    * Grains: Wheat, rye, barley, couscous, spelt (except 100% spelt bread), wheat pasta, bulgur, semolina.
    * Dairy: Milk (cow, goat, sheep), custard, ice cream, yogurt (regular), soft cheeses (cottage, cream, mascarpone, ricotta, cream cheese), condensed milk, sour cream.
    * Legumes: Beans, baked beans, kidney beans, soybeans, black beans, edamame, hummus, split peas, lentils/chickpeas (unless small canned portions).
    * Sweeteners: Fructose, high fructose corn syrup, corn syrup, honey, agave syrup, sorbitol (420), mannitol (421), isomalt (953), maltitol (965), xylitol (967), inulin.
    * Nuts: Cashews, pistachios, hazelnuts.
    * Misc: Chicory, dandelion, camomile, chai, fennel tea, rum, dessert wine.
- STRICTLY LIMIT (small quantities only): 
    * Avocado (max 0.25), sweet potato (small portion), sweet corn, celery, green beans, broccoli florets, cauliflower (very small portion), canned chickpeas/lentils (rinsed, max 40g), almonds (max 10), oats (max 50g).
- ALLOWED/SUITABLE: 
    * Vegetables: Alfalfa, bamboo shoots, bean shoots, bok choy, carrot, choko, choy sum, endive, ginger, lettuces, olives, parsnip, potato, pumpkin, red bell pepper, silver beet, spinach, summer squash, swede, taro, tomato, turnip, yam, zucchini, kale, cucumber, rocket, spring onion (green part only), eggplant.
    * Fruit: Banana, blueberry, boysenberry, cantaloupe, cranberry, durian, grape, grapefruit, honeydew melon, kiwi, lemon, lime, mandarin, orange, passionfruit, pawpaw, raspberry, rhubarb, rockmelon, star anise, strawberry, tangelo, pineapple.
    * Grains: Rice (white, basmati, brown), quinoa, rice noodles, gluten-free bread/pasta, polenta, arrowroot, millet, psyllium, sorghum, tapioca, buckwheat, cornflakes, corn tortillas.
    * Dairy/Alternatives: Lactose-free milk/yogurt/cheese, oat milk (limit), rice milk, soy milk (protein based), almond milk, hard cheeses (Cheddar, Feta, Mozzarella, Brie, Camembert, Swiss), butter, coconut yogurt.
    * Proteins: Chicken, turkey, eggs, firm tofu, fresh fish, canned tuna, beef, pork, lamb, tempeh, duck.
    * Sweeteners: Sucrose, glucose, stevia, brown sugar, rice malt syrup, splenda, monk fruit, aspartame, golden syrup, maple syrup, molasses, treacle.
    * Nuts & Seeds: Peanuts, macadamias, walnuts, chia seeds, pumpkin seeds, sunflower seeds, flaxseeds, pecans, pine nuts.
    * Misc: Garlic-infused oil (strained), asafoetida (hing), salt, pepper, vinegar, most herbs and spices (no onion/garlic powder).

CRITICAL REQUIREMENTS:
1. Use UK measurements and UK English.
2. Provide step-by-step instructions.
3. Portion for 1 person.
4. Use decimals instead of fractions.
5. Specify 'fan assisted oven'.
6. DO NOT include "Low FODMAP" in the title.
7. For ingredients, if the quantity is a whole number or decimal without a unit (e.g., 1, 0.5), format it as '[quantity] x [item]' (e.g., '1 x firm banana'). If it has a measurement unit (e.g., '50g', '100ml'), format it as '[quantity][unit] [item]' (e.g., '50g cucumber'). ALWAYS ensure there is a space between the quantity/unit and the item name.

Return ONLY the meal object.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema.properties.days.items.properties.meals.items
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to regenerate meal.");
  
  return JSON.parse(text) as Meal;
}
