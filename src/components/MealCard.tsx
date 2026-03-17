import React from 'react';
import { motion } from 'motion/react';
import { Meal } from '../types';
import { RefreshCw, Heart, Users } from 'lucide-react';

export const scaleIngredient = (ingredient: string, servings: number) => {
  const numRegex = /(\d+(?:\.\d+)?(?:[ \-]\d+\/\d+|\/\d+)?)/;
  const match = ingredient.match(numRegex);
  
  if (!match) return ingredient;
  
  const numStr = match[0];
  const offset = match.index!;
  const before = ingredient.slice(0, offset);
  const after = ingredient.slice(offset + numStr.length);
  const afterTrimmed = after.trim();
  
  if (after.toLowerCase().match(/^\s*(°|c\b|f\b|min|hour|sec|%)/)) {
    if (servings === 1) return ingredient;
    let num = parseFloat(numStr.trim());
    if (isNaN(num)) return ingredient;
    const scaledNum = (num * servings).toLocaleString('en-GB', { maximumFractionDigits: 2 });
    return `${before}${scaledNum}${after}`;
  }

  let num = 0;
  const cleanNumStr = numStr.trim();
  if (cleanNumStr.includes('/')) {
    if (cleanNumStr.includes(' ') || cleanNumStr.includes('-')) {
      const parts = cleanNumStr.split(/[ \-]/);
      const whole = parseFloat(parts[0]);
      const [n, d] = parts[1].split('/');
      num = whole + (parseFloat(n) / parseFloat(d));
    } else {
      const [n, d] = cleanNumStr.split('/');
      num = parseFloat(n) / parseFloat(d);
    }
  } else {
    num = parseFloat(cleanNumStr);
  }
  
  if (isNaN(num)) return ingredient;
  
  const scaledNum = (num * servings).toLocaleString('en-GB', { maximumFractionDigits: 2 });
  
  const units = ['g', 'ml', 'kg', 'l', 'tsp', 'tbsp', 'cm', 'mm', 'oz', 'lb', 'cup', 'cups', 'slice', 'slices', 'clove', 'cloves', 'pinch', 'pinches', 'handful', 'handfuls', 'bunch', 'bunches'];
  const unitMatch = afterTrimmed.toLowerCase().match(/^([a-z]+)/);
  const foundUnit = unitMatch ? unitMatch[1] : '';
  
  if (units.includes(foundUnit)) {
    if (after.startsWith(' ')) {
      return `${before}${scaledNum} ${afterTrimmed}`;
    } else {
      return `${before}${scaledNum}${afterTrimmed}`;
    }
  }
  
  if (afterTrimmed.startsWith('x ')) {
    return `${before}${scaledNum} ${afterTrimmed}`;
  } else if (afterTrimmed.length > 0) {
    return `${before}${scaledNum} x ${afterTrimmed}`;
  }
  
  return `${before}${scaledNum}${after}`;
};

export const MealCard = ({ 
  meal, 
  subtitle, 
  index = 0,
  servings,
  onUpdateServings,
  isFavourite,
  toggleFavourite,
  onRegenerate,
  isRegenerating
}: { 
  meal: Meal, 
  subtitle?: string, 
  index?: number, 
  servings: number,
  onUpdateServings: (delta: number) => void,
  isFavourite: boolean,
  toggleFavourite: (meal: Meal) => void,
  onRegenerate?: (meal: Meal) => void,
  isRegenerating?: boolean,
  key?: React.Key
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-vintage-card dark:bg-vintage-card-dark rounded-2xl border border-vintage-teal/20 dark:border-vintage-teal-dark/20 p-6 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
        <div>
          <span className="inline-block px-3 py-1 bg-vintage-bg dark:bg-vintage-bg-dark text-vintage-teal dark:text-vintage-teal-dark text-xs font-bold rounded-full mb-2 uppercase tracking-wider">
            {subtitle ? `${subtitle} • ${meal.type}` : meal.type}
          </span>
          <h3 className="text-2xl font-display text-vintage-red dark:text-vintage-red-dark tracking-wide">{meal.name}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-vintage-bg/50 dark:bg-vintage-bg-dark/50 p-1 rounded-lg border border-vintage-teal/20 dark:border-vintage-teal-dark/20">
            <button 
              onClick={() => onUpdateServings(-1)}
              className="w-7 h-7 flex items-center justify-center rounded bg-vintage-card dark:bg-vintage-card-dark border border-vintage-teal/20 dark:border-vintage-teal-dark/30 hover:bg-vintage-bg dark:hover:bg-vintage-bg-dark text-vintage-teal dark:text-vintage-teal-dark transition-colors text-sm"
            >-</button>
            <div className="flex items-center gap-1 px-1">
              <Users className="w-3.5 h-3.5 text-vintage-teal/70 dark:text-vintage-teal-dark/70" />
              <span className="font-bold text-vintage-red dark:text-vintage-red-dark w-4 text-center text-sm">{servings}</span>
            </div>
            <button 
              onClick={() => onUpdateServings(1)}
              className="w-7 h-7 flex items-center justify-center rounded bg-vintage-card dark:bg-vintage-card-dark border border-vintage-teal/20 dark:border-vintage-teal-dark/30 hover:bg-vintage-bg dark:hover:bg-vintage-bg-dark text-vintage-teal dark:text-vintage-teal-dark transition-colors text-sm"
            >+</button>
          </div>
          <span className="text-sm text-vintage-teal/70 dark:text-vintage-teal-dark/70 font-bold bg-vintage-bg/50 dark:bg-vintage-bg-dark/50 px-3 py-1 rounded-lg">
            {meal.prepTime}
          </span>
          <button 
            onClick={() => toggleFavourite(meal)}
            className="text-vintage-red dark:text-vintage-red-dark hover:bg-vintage-red/10 dark:hover:bg-vintage-red-dark/10 p-2 rounded-full transition-colors"
            title={isFavourite ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart className="w-5 h-5" fill={isFavourite ? "currentColor" : "none"} />
          </button>
          {onRegenerate && (
            <button 
              onClick={() => onRegenerate(meal)}
              disabled={isRegenerating}
              className="text-vintage-teal dark:text-vintage-teal-dark hover:bg-vintage-teal/10 dark:hover:bg-vintage-teal-dark/10 p-2 rounded-full transition-colors disabled:opacity-50"
              title="Regenerate this meal"
            >
              <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
      
      <p className="text-vintage-teal dark:text-vintage-teal-dark mb-6 leading-relaxed">{meal.description}</p>
      
      <div>
        <h4 className="text-sm font-display text-vintage-red dark:text-vintage-red-dark mb-3 uppercase tracking-wider">Ingredients</h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {meal.ingredients.map((ingredient, i) => (
            <li key={i} className="flex items-center gap-2 text-vintage-teal dark:text-vintage-teal-dark text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-vintage-red dark:bg-vintage-red-dark flex-shrink-0" />
              {scaleIngredient(ingredient, servings)}
            </li>
          ))}
        </ul>
      </div>

      {meal.instructions && meal.instructions.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-display text-vintage-red dark:text-vintage-red-dark mb-3 uppercase tracking-wider">Instructions</h4>
          <ol className="list-decimal list-outside ml-4 space-y-2 text-vintage-teal dark:text-vintage-teal-dark text-sm leading-relaxed">
            {meal.instructions.map((step, i) => (
              <li key={i} className="pl-1">{step}</li>
            ))}
          </ol>
        </div>
      )}
    </motion.div>
  );
};
