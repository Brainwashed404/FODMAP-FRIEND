import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { generateTodayMealPlan, generateRemainingWeekMealPlan, regenerateMeal } from '../services/gemini';
import { MealPlan, Meal } from '../types';
import { loadingMessages, generationHeaders } from '../constants';
import { MealCard, scaleIngredient } from './MealCard';
import { Loader2, ShoppingCart, Calendar, Heart, Users, Moon, Sun, Search, RefreshCw, Settings2, Trash2, Share2, Soup } from 'lucide-react';

export default function MealPlanner() {
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const getDayWithDate = (dayName: string) => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const todayIndex = today.getDay();
    const targetIndex = daysOfWeek.indexOf(dayName);
    
    if (targetIndex === -1) return dayName;
    
    let diff = targetIndex - todayIndex;
    if (diff < 0) diff += 7;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    
    const day = targetDate.getDate();
    const month = targetDate.getMonth() + 1;
    
    return `${dayName} ${day}/${month}`;
  };

  const [loading, setLoading] = useState(false);
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'groceries' | 'favourites'>('plan');
  const [selectedView, setSelectedView] = useState<string>(todayName);
  const preferencesRef = useRef<HTMLTextAreaElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [favSearchQuery, setFavSearchQuery] = useState('');
  const [favMealFilter, setFavMealFilter] = useState<string>('All');
  const [mealServings, setMealServings] = useState<Record<string, number>>({});
  const [generationMode, setGenerationMode] = useState<'day' | 'week' | null>(null);
  const [preferences, setPreferences] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);
  const [regeneratingMealId, setRegeneratingMealId] = useState<string | null>(null);
  const [groceryView, setGroceryView] = useState<'today' | 'week'>('week');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [favourites, setFavourites] = useState<Meal[]>(() => {
    const saved = localStorage.getItem('ibs-favourites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [currentLoadingMsg, setCurrentLoadingMsg] = useState(loadingMessages[0]);
  const [currentGenHeader, setCurrentGenHeader] = useState(generationHeaders[0]);

  useEffect(() => {
    const isActive = loading || isGeneratingWeek;
    if (isActive) {
      const shuffledMsgs = [...loadingMessages].sort(() => Math.random() - 0.5);
      const shuffledHeaders = [...generationHeaders].sort(() => Math.random() - 0.5);
      let msgIndex = 0;
      let headerIndex = 0;
      
      setCurrentLoadingMsg(shuffledMsgs[msgIndex]);
      setCurrentGenHeader(shuffledHeaders[headerIndex]);
      
      const interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % shuffledMsgs.length;
        headerIndex = (headerIndex + 1) % shuffledHeaders.length;
        setCurrentLoadingMsg(shuffledMsgs[msgIndex]);
        setCurrentGenHeader(shuffledHeaders[headerIndex]);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [loading, isGeneratingWeek]);

  useEffect(() => {
    localStorage.setItem('ibs-favourites', JSON.stringify(favourites));
  }, [favourites]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleShowFavs = () => {
    setMealPlan({ days: [], groceryList: [] });
    setActiveTab('favourites');
  };

  const handleInitialGenerate = async (mode: 'day' | 'week') => {
    setLoading(true);
    setGenerationMode(mode);
    setToast(null);
    
    try {
      const todayPlan = await generateTodayMealPlan(todayName, preferences);
      setMealPlan(todayPlan);
      
      if (todayPlan.days.some(d => d.day === todayName)) {
        setSelectedView(todayName);
      } else if (todayPlan.days.length > 0) {
        setSelectedView(todayPlan.days[0].day);
      }
      
      setActiveTab('plan');
      setLoading(false);

      if (mode === 'week') {
        setIsGeneratingWeek(true);
        try {
          const restOfWeekPlan = await generateRemainingWeekMealPlan(todayPlan, preferences);
          
          setMealPlan(prev => {
            if (!prev) return restOfWeekPlan;
            const existingDays = new Set(prev.days.map(d => d.day));
            const newDays = restOfWeekPlan.days.filter(d => !existingDays.has(d.day));
            
            return {
              days: [...prev.days, ...newDays],
              groceryList: restOfWeekPlan.groceryList
            };
          });
        } catch (weekError) {
          console.error("Error generating rest of week:", weekError);
          setToast({ message: "Daily plan ready, but failed to generate the full week.", type: 'error' });
        } finally {
          setIsGeneratingWeek(false);
        }
      }
    } catch (error) {
      console.error("Error generating meal plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate meal plan. Please try again.";
      setToast({ message: errorMessage, type: 'error' });
      setLoading(false);
      setGenerationMode(null);
      setIsGeneratingWeek(false);
    }
  };

  const handleSubsequentGenerate = async () => {
    if (generationMode === 'day') {
      // They chose 'day' initially, so the button says 'MAKE MY WEEK'.
      // Now we generate the rest of the week.
      setGenerationMode('week');
      setIsGeneratingWeek(true);
      try {
        const restOfWeekPlan = await generateRemainingWeekMealPlan(mealPlan!, preferences);
        setMealPlan(prev => {
          if (!prev) return restOfWeekPlan;
          const existingDays = new Set(prev.days.map(d => d.day));
          const newDays = restOfWeekPlan.days.filter(d => !existingDays.has(d.day));
          
          return {
            days: [...prev.days, ...newDays],
            groceryList: restOfWeekPlan.groceryList
          };
        });
      } catch (error) {
        console.error("Error generating rest of week:", error);
        setToast({ message: "Failed to generate the rest of the week. Please try again.", type: 'error' });
        setGenerationMode('day');
      } finally {
        setIsGeneratingWeek(false);
      }
    } else {
      // They chose 'week' initially, so the button says 'MAKE MY DAY'.
      // Now we generate a brand new day and discard the week.
      setLoading(true);
      setGenerationMode('day');
      try {
        const todayPlan = await generateTodayMealPlan(todayName, preferences);
        setMealPlan(todayPlan);
        if (todayPlan.days.some(d => d.day === todayName)) {
          setSelectedView(todayName);
        } else if (todayPlan.days.length > 0) {
          setSelectedView(todayPlan.days[0].day);
        }
        setActiveTab('plan');
      } catch (error) {
        console.error("Error generating new day:", error);
        setToast({ message: "Failed to generate new day. Please try again.", type: 'error' });
        setGenerationMode('week');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateServings = (mealId: string, delta: number) => {
    setMealServings(prev => {
      const current = prev[mealId] || 1;
      return { ...prev, [mealId]: Math.max(1, current + delta) };
    });
  };

  const handleRegenerateMeal = async (meal: Meal) => {
    if (!mealPlan) return;
    setRegeneratingMealId(meal.id);
    try {
      const dayName = mealPlan.days.find(d => d.meals.some(m => m.id === meal.id))?.day || todayName;
      const newMeal = await regenerateMeal(meal, dayName, preferences);
      
      setMealPlan(prev => {
        if (!prev) return null;
        return {
          ...prev,
          days: prev.days.map(d => ({
            ...d,
            meals: d.meals.map(m => m.id === meal.id ? newMeal : m)
          }))
        };
      });
    } catch (error) {
      console.error("Error regenerating meal:", error);
      setToast({ message: "Failed to regenerate meal. Please try again.", type: 'error' });
    } finally {
      setRegeneratingMealId(null);
    }
  };

  const handleResetPlan = () => {
    setMealPlan(null);
    setGenerationMode(null);
    setMealServings(prev => {
      // Keep servings for favourites if they exist, or just clear all
      return {};
    });
    setPreferences('');
    setActiveTab('plan');
    setShowPreferences(false);
  };

  const handleSharePlan = () => {
    if (!mealPlan) return;
    
    let text = `My IBS Meal Plan (${generationMode === 'week' ? 'Weekly' : 'Daily'})\n\n`;
    
    mealPlan.days.forEach(day => {
      text += `--- ${day.day} ---\n`;
      day.meals.forEach(meal => {
        text += `${meal.type}: ${meal.name}\n`;
      });
      text += '\n';
    });
    
    text += "Generated by FODMAP FRIEND";
    
    navigator.clipboard.writeText(text).then(() => {
      setToast({ message: "Meal plan copied to clipboard!", type: 'success' });
    }).catch(err => {
      console.error("Failed to copy:", err);
    });
  };

  const toggleFavourite = (meal: Meal) => {
    setFavourites(prev => {
      const exists = prev.find(m => m.id === meal.id);
      if (exists) {
        return prev.filter(m => m.id !== meal.id);
      }
      return [...prev, meal];
    });
  };

  const isFavourite = (id: string) => favourites.some(m => m.id === id);

  const days = mealPlan?.days.map(d => d.day) || [];
  const isDayView = days.includes(selectedView) || selectedView === todayName;

  let displayMeals: { meal: Meal, subtitle?: string }[] = [];
  if (mealPlan) {
    if (['Breakfast', 'Lunch', 'Dinner'].includes(selectedView)) {
      // It's a meal type view (Breakfast, Lunch, Dinner)
      mealPlan.days.forEach(day => {
        const meal = day.meals.find(m => m.type.toLowerCase() === selectedView.toLowerCase());
        if (meal) {
          displayMeals.push({ meal, subtitle: getDayWithDate(day.day) });
        }
      });
    } else {
      // TODAY view
      const dayPlan = mealPlan.days.find(d => d.day === todayName) || mealPlan.days[0];
      if (dayPlan) {
        displayMeals = dayPlan.meals.map(m => ({ meal: m, subtitle: getDayWithDate(dayPlan.day) }));
      }
    }
  }

  const getDynamicGroceryList = () => {
    if (!mealPlan) return [];

    const categories: Record<string, Record<string, Record<string, { quantity: number, originalName: string }>>> = {
      'Fruit & Veg': {},
      'Meat & Seafood': {},
      'Dairy & Eggs': {},
      'Grains & Bakery': {},
      'Pantry & Spices': {}
    };

    const categorise = (ingredient: string) => {
      const lower = ingredient.toLowerCase();
      if (lower.match(/chicken|beef|pork|fish|salmon|tuna|turkey|meat|bacon|sausage|shrimp|lamb|bream|cod|haddock|prawn|steak|fillet|mince|tofu|tempeh|ham|salami|chorizo|scallop|mussel|venison|duck/)) return 'Meat & Seafood';
      if (lower.match(/milk|cheese|butter|yogurt|cream|egg|margarine|ghee|kefir|feta|parmesan|cheddar|mozzarella|ricotta/) && !lower.match(/coconut|almond|soy|oat|cashew|rice/)) return 'Dairy & Eggs';
      if (lower.match(/apple|banana|carrot|onion|garlic|tomato|potato|lettuce|spinach|pepper|broccoli|lemon|lime|fruit|veg|mushroom|zucchini|squash|berry|berries|cucumber|ginger|kale|cabbage|herb|parsley|coriander|basil|mint|grape|orange|melon|strawberry|blueberry|raspberry|avocado|asparagus|bean|lentil|chickpea|pea|corn|celery|eggplant|aubergine|radish|leek|chive|thyme|rosemary|dill|cilantro|arugula|rocket/)) return 'Fruit & Veg';
      if (lower.match(/bread|rice|pasta|oat|flour|quinoa|tortilla|noodle|wrap|cereal|granola|cracker|biscuit|bagel|muffin|couscous|bulgur|polenta/)) return 'Grains & Bakery';
      return 'Pantry & Spices';
    };

    const units = ['g', 'ml', 'kg', 'l', 'tsp', 'tbsp', 'cm', 'mm', 'oz', 'lb', 'cup', 'cups', 'slice', 'slices', 'clove', 'cloves', 'pinch', 'pinches', 'handful', 'handfuls', 'bunch', 'bunches'];

    const daysToProcess = groceryView === 'today' 
      ? mealPlan.days.filter(d => d.day === todayName)
      : mealPlan.days;

    daysToProcess.forEach(day => {
      day.meals.forEach(meal => {
        const servings = mealServings[meal.id] || 1;
        meal.ingredients.forEach(ingredient => {
          const scaled = scaleIngredient(ingredient, servings);
          const category = categorise(ingredient);
          
          // Regex to match: [number] [optional x] [potential unit] [rest]
          const match = scaled.match(/^(\d+(?:\.\d+)?)\s*(x\s+)?([a-zA-Z]*)\s*(.*)$/);
          
          if (match) {
            const qty = parseFloat(match[1]);
            const potentialUnit = match[3].toLowerCase();
            const rest = match[4].trim();
            
            let unit = '';
            let name = '';
            
            if (units.includes(potentialUnit)) {
              unit = potentialUnit;
              name = rest.toLowerCase();
            } else {
              unit = '';
              name = (potentialUnit + ' ' + rest).toLowerCase().trim();
            }
            
            const originalName = unit ? rest : (potentialUnit + ' ' + rest).trim();
            
            if (!categories[category][name]) {
              categories[category][name] = {};
            }
            if (!categories[category][name][unit]) {
              categories[category][name][unit] = { quantity: 0, originalName };
            }
            categories[category][name][unit].quantity += qty;
          } else {
            const name = scaled.toLowerCase().trim();
            if (!categories[category][name]) {
              categories[category][name] = {};
            }
            if (!categories[category][name]['_raw']) {
              categories[category][name]['_raw'] = { quantity: 1, originalName: scaled };
            } else {
              categories[category][name]['_raw'].quantity += 1;
            }
          }
        });
      });
    });

    return Object.entries(categories)
      .filter(([_, items]) => Object.keys(items).length > 0)
      .map(([category, items]) => {
        const formattedItems = Object.entries(items).flatMap(([name, unitsData]) => {
          return Object.entries(unitsData).map(([unit, data]) => {
            if (unit === '_raw') {
              return data.originalName;
            }
            const qty = data.quantity.toLocaleString('en-GB', { maximumFractionDigits: 2 });
            if (unit === '') {
              return `${qty} x ${data.originalName}`;
            }
            return `${qty}${unit} ${data.originalName}`;
          });
        });
        return { category, items: formattedItems };
      });
  };

  const dynamicGroceryList = getDynamicGroceryList();

  if (!mealPlan && !loading) {
    return (
      <div className="min-h-screen bg-vintage-bg dark:bg-vintage-bg-dark flex flex-col justify-between items-center p-6 transition-colors duration-200">
        <div className="max-w-md w-full text-center mt-12 sm:mt-24">
          <h1 className="text-5xl font-display text-vintage-red dark:text-vintage-red-dark tracking-wider mb-2">
            FODMAP FRIEND
          </h1>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full text-vintage-teal/40 dark:text-vintage-teal-dark/40 hover:text-vintage-red dark:hover:text-vintage-red-dark transition-all mx-auto"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="max-w-md w-full space-y-6 mb-12 sm:mb-16">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleShowFavs}
            className="w-full bg-vintage-teal hover:bg-vintage-teal/90 text-vintage-bg dark:text-vintage-bg-dark font-display py-5 px-6 rounded-2xl text-2xl uppercase tracking-widest shadow-lg hover:shadow-xl transition-all cursor-pointer"
          >
            Make My Favs
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleInitialGenerate('week')}
            className="w-full bg-vintage-red hover:bg-vintage-red/90 text-vintage-bg dark:text-white font-display py-5 px-6 rounded-2xl text-2xl uppercase tracking-widest shadow-lg hover:shadow-xl transition-all cursor-pointer"
          >
            Make My Week
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleInitialGenerate('day')}
            className="w-full bg-vintage-card dark:bg-vintage-card-dark border-2 border-vintage-teal/20 dark:border-vintage-teal-dark/20 text-vintage-teal dark:text-vintage-teal-dark font-display py-5 px-6 rounded-2xl text-2xl uppercase tracking-widest shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            Make My Day
          </motion.button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-vintage-bg dark:bg-vintage-bg-dark flex items-center justify-center p-4 transition-colors duration-200">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-vintage-teal dark:text-vintage-teal-dark font-display tracking-widest uppercase animate-pulse text-lg text-center">
            {currentLoadingMsg}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vintage-bg dark:bg-vintage-bg-dark transition-colors duration-200 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl font-display text-sm tracking-wider shadow-2xl transition-all animate-bounce ${
            toast.type === 'success' ? 'bg-vintage-teal text-vintage-bg' : 'bg-vintage-red text-white'
          }`}>
            {toast.message}
          </div>
        )}

        {/* Top Controls */}
        <div className="hidden sm:flex mb-8">
          <button
            onClick={handleSubsequentGenerate}
            disabled={loading || isGeneratingWeek}
            className="flex-1 bg-vintage-red hover:bg-vintage-red/90 disabled:bg-vintage-red/50 text-vintage-bg dark:text-white font-display py-5 px-6 rounded-2xl transition-colors flex items-center justify-center gap-3 text-xl sm:text-2xl uppercase tracking-wider shadow-lg"
          >
            {loading ? 'GENERATING...' : isGeneratingWeek ? 'COMPLETING WEEK...' : generationMode === 'day' ? 'MAKE MY WEEK' : 'MAKE MY DAY'}
          </button>
        </div>

        {showPreferences && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 bg-vintage-card dark:bg-vintage-card-dark p-6 rounded-2xl border border-vintage-teal/20 dark:border-vintage-teal-dark/20 shadow-sm"
          >
            <label className="block text-sm font-display text-vintage-red dark:text-vintage-red-dark mb-2 uppercase tracking-wider">
              Update Preferences
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <textarea
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g., No seafood, dairy-free, budget-friendly..."
                className="flex-1 bg-vintage-bg dark:bg-vintage-bg-dark border border-vintage-teal/20 dark:border-vintage-teal-dark/20 rounded-xl p-3 text-vintage-teal dark:text-vintage-teal-dark focus:ring-2 focus:ring-vintage-red outline-none transition-all h-24 sm:h-auto resize-none"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="bg-vintage-teal dark:bg-vintage-teal-dark text-vintage-bg dark:text-vintage-bg-dark px-6 py-3 rounded-xl font-display uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Save
                </button>
                <button
                  onClick={handleResetPlan}
                  className="bg-vintage-red dark:bg-vintage-red-dark text-vintage-bg dark:text-white px-6 py-3 rounded-xl font-display uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
            <p className="text-xs text-vintage-teal/50 dark:text-vintage-teal-dark/50 mt-2 italic">
              Note: Changes will apply to future generations or regenerated meals.
            </p>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex flex-nowrap items-center gap-x-4 sm:gap-x-6 border-b border-vintage-teal/20 dark:border-vintage-teal-dark/20 mb-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('plan')}
            className={`pb-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'plan' ? 'text-vintage-red dark:text-vintage-red-dark' : 'text-vintage-teal/70 dark:text-vintage-teal-dark/70 hover:text-vintage-red dark:hover:text-vintage-red-dark'
            }`}
          >
            <div className="flex items-center gap-2">
              <Soup className="w-4 h-4" />
              Plan
            </div>
            {activeTab === 'plan' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-vintage-red dark:bg-vintage-red-dark" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('favourites')}
            className={`pb-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'favourites' ? 'text-vintage-red dark:text-vintage-red-dark' : 'text-vintage-teal/70 dark:text-vintage-teal-dark/70 hover:text-vintage-red dark:hover:text-vintage-red-dark'
            }`}
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Favs ({favourites.length})
            </div>
            {activeTab === 'favourites' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-vintage-red dark:bg-vintage-red-dark" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('groceries')}
            className={`pb-4 text-sm font-bold transition-colors relative whitespace-nowrap ${
              activeTab === 'groceries' ? 'text-vintage-red dark:text-vintage-red-dark' : 'text-vintage-teal/70 dark:text-vintage-teal-dark/70 hover:text-vintage-red dark:hover:text-vintage-red-dark'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              List
            </div>
            {activeTab === 'groceries' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-vintage-red dark:bg-vintage-red-dark" />
            )}
          </button>
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className={`ml-auto pb-4 text-vintage-teal/70 dark:text-vintage-teal-dark/70 hover:text-vintage-red dark:hover:text-vintage-red-dark transition-colors flex items-center justify-center`}
            title="Edit Preferences"
          >
            <Settings2 className={`w-5 h-5 ${showPreferences ? 'text-vintage-red' : ''}`} />
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="pb-4 text-vintage-teal/70 dark:text-vintage-teal-dark/70 hover:text-vintage-red dark:hover:text-vintage-red-dark transition-colors flex items-center justify-center"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'favourites' ? (
          <div className="space-y-6">
            {favourites.length === 0 ? (
              <div className="text-center py-20 bg-vintage-card dark:bg-vintage-card-dark rounded-2xl border border-vintage-teal/20 dark:border-vintage-teal-dark/20 border-dashed">
                <Heart className="w-12 h-12 text-vintage-teal/30 dark:text-vintage-teal-dark/30 mx-auto mb-4" />
                <h3 className="text-xl font-display text-vintage-red dark:text-vintage-red-dark tracking-wide">No favourites yet</h3>
                <p className="text-vintage-teal dark:text-vintage-teal-dark mt-2">Click the heart icon on any meal to save it here.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-vintage-teal/50 dark:text-vintage-teal-dark/50" />
                    <input
                      type="text"
                      placeholder="Search favourites..."
                      value={favSearchQuery}
                      onChange={(e) => setFavSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-vintage-teal/30 dark:border-vintage-teal-dark/30 bg-vintage-card dark:bg-vintage-card-dark text-vintage-red dark:text-vintage-red-dark font-display focus:ring-2 focus:ring-vintage-red outline-none shadow-sm"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {['Breakfast', 'Lunch', 'Dinner', 'All'].map(type => (
                      <button
                        key={type}
                        onClick={() => setFavMealFilter(type)}
                        className={`px-5 py-3 rounded-xl font-display text-sm tracking-wider transition-colors shadow-sm flex-1 sm:flex-none ${
                          favMealFilter === type
                            ? 'bg-vintage-red dark:bg-vintage-red-dark text-vintage-bg dark:text-white border border-vintage-red dark:border-vintage-red-dark'
                            : 'bg-vintage-card dark:bg-vintage-card-dark border border-vintage-teal/20 dark:border-vintage-teal-dark/20 text-vintage-teal dark:text-vintage-teal-dark hover:bg-vintage-bg/50 dark:hover:bg-vintage-bg-dark/50'
                        }`}
                      >
                        {type === 'All' ? 'ALL' : type === 'Breakfast' ? 'BREKKIE' : type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  {favourites
                    .filter(meal => {
                      const matchesSearch = meal.name.toLowerCase().includes(favSearchQuery.toLowerCase()) || 
                                            meal.description.toLowerCase().includes(favSearchQuery.toLowerCase());
                      const matchesFilter = favMealFilter === 'All' || meal.type.toLowerCase() === favMealFilter.toLowerCase();
                      return matchesSearch && matchesFilter;
                    })
                    .map((meal, index) => (
                      <MealCard 
                        key={meal.id} 
                        meal={meal} 
                        index={index} 
                        servings={mealServings[meal.id] || 1}
                        onUpdateServings={(delta) => handleUpdateServings(meal.id, delta)}
                        isFavourite={isFavourite(meal.id)}
                        toggleFavourite={toggleFavourite}
                        onRegenerate={handleRegenerateMeal}
                        isRegenerating={regeneratingMealId === meal.id}
                      />
                    ))}
                  {favourites.filter(meal => {
                    const matchesSearch = meal.name.toLowerCase().includes(favSearchQuery.toLowerCase()) || 
                                          meal.description.toLowerCase().includes(favSearchQuery.toLowerCase());
                    const matchesFilter = favMealFilter === 'All' || meal.type.toLowerCase() === favMealFilter.toLowerCase();
                    return matchesSearch && matchesFilter;
                  }).length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-vintage-teal dark:text-vintage-teal-dark">No favourites match your search.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : activeTab === 'plan' ? (
          <div className="flex flex-col gap-6">
            
            {/* View Selectors */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedView(todayName);
                  }}
                  className={`px-6 py-3 rounded-xl font-display text-sm tracking-wider transition-colors shadow-sm flex-1 sm:flex-none ${
                    !['Breakfast', 'Lunch', 'Dinner'].includes(selectedView)
                      ? 'bg-vintage-red dark:bg-vintage-red-dark text-vintage-bg dark:text-white border border-vintage-red dark:border-vintage-red-dark'
                      : 'bg-vintage-card dark:bg-vintage-card-dark border border-vintage-teal/20 dark:border-vintage-teal-dark/20 text-vintage-teal dark:text-vintage-teal-dark hover:bg-vintage-bg/50 dark:hover:bg-vintage-bg-dark/50'
                  }`}
                >
                  TODAY
                </button>

                {[
                  { label: 'BREKKIE', value: 'Breakfast' },
                  { label: 'LUNCH', value: 'Lunch' },
                  { label: 'DINNER', value: 'Dinner' }
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => {
                      setSelectedView(selectedView === type.value ? todayName : type.value);
                    }}
                    className={`px-5 py-3 rounded-xl font-display text-sm tracking-wider transition-colors shadow-sm flex-1 sm:flex-none ${
                      selectedView === type.value
                        ? 'bg-vintage-red dark:bg-vintage-red-dark text-vintage-bg dark:text-white border border-vintage-red dark:border-vintage-red-dark'
                        : 'bg-vintage-card dark:bg-vintage-card-dark border border-vintage-teal/20 dark:border-vintage-teal-dark/20 text-vintage-teal dark:text-vintage-teal-dark hover:bg-vintage-bg/50 dark:hover:bg-vintage-bg-dark/50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Meals for selected view */}
            <div className="space-y-6">
              {displayMeals.length > 0 ? (
                displayMeals.map((item, index) => (
                  <MealCard 
                    key={item.meal.id} 
                    meal={item.meal} 
                    subtitle={item.subtitle} 
                    index={index}
                    servings={mealServings[item.meal.id] || 1}
                    onUpdateServings={(delta) => handleUpdateServings(item.meal.id, delta)}
                    isFavourite={isFavourite(item.meal.id)}
                    toggleFavourite={toggleFavourite}
                    onRegenerate={handleRegenerateMeal}
                    isRegenerating={regeneratingMealId === item.meal.id}
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-vintage-card dark:bg-vintage-card-dark rounded-2xl border border-vintage-teal/20 dark:border-vintage-teal-dark/20 border-dashed">
                  <p className="text-vintage-teal dark:text-vintage-teal-dark">No meals found for this view.</p>
                </div>
              )}
              
              {isGeneratingWeek && (
                <div className="mt-8 p-6 bg-vintage-card dark:bg-vintage-card-dark rounded-2xl border border-vintage-teal/20 dark:border-vintage-teal-dark/20 flex flex-col items-center justify-center text-center animate-pulse shadow-sm">
                  <h4 className="font-display text-lg text-vintage-red dark:text-vintage-red-dark tracking-wide">{currentGenHeader}</h4>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'groceries' ? (
          <div className="bg-vintage-card dark:bg-vintage-card-dark rounded-2xl border border-vintage-teal/20 dark:border-vintage-teal-dark/20 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-vintage-teal/20 dark:border-vintage-teal-dark/20 bg-vintage-bg/50 dark:bg-vintage-bg-dark/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-display text-vintage-red dark:text-vintage-red-dark tracking-wide">
                  Shopping List
                </h2>
                <p className="text-xs text-vintage-teal/50 dark:text-vintage-teal-dark/50 font-display uppercase tracking-widest">
                  {groceryView === 'today' ? "Today's Ingredients" : "Full Week Rundown"}
                </p>
              </div>
              
              <div className="flex w-full sm:w-auto bg-vintage-bg dark:bg-vintage-bg-dark p-1 rounded-xl border border-vintage-teal/10 dark:border-vintage-teal-dark/10">
                <button
                  onClick={() => setGroceryView('today')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-display text-xs tracking-widest transition-all ${
                    groceryView === 'today'
                      ? 'bg-vintage-red dark:bg-vintage-red-dark text-white shadow-sm'
                      : 'text-vintage-teal/60 dark:text-vintage-teal-dark/60 hover:text-vintage-red dark:hover:text-vintage-red-dark'
                  }`}
                >
                  TODAY
                </button>
                <button
                  onClick={() => setGroceryView('week')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg font-display text-xs tracking-widest transition-all ${
                    groceryView === 'week'
                      ? 'bg-vintage-red dark:bg-vintage-red-dark text-white shadow-sm'
                      : 'text-vintage-teal/60 dark:text-vintage-teal-dark/60 hover:text-vintage-red dark:hover:text-vintage-red-dark'
                  }`}
                >
                  WEEK
                </button>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {dynamicGroceryList.length > 0 ? (
                dynamicGroceryList.map((category, index) => (
                  <div key={index}>
                    <h3 className="text-lg font-display text-vintage-red dark:text-vintage-red-dark mb-4 border-b border-vintage-teal/10 dark:border-vintage-teal-dark/10 pb-2 tracking-wide">
                      {category.category}
                    </h3>
                    <ul className="space-y-3">
                      {category.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            className="mt-1 w-4 h-4 text-vintage-red dark:text-vintage-red-dark rounded border-vintage-teal/30 dark:border-vintage-teal-dark/30 bg-vintage-card dark:bg-vintage-card-dark focus:ring-vintage-red"
                          />
                          <span className="text-vintage-teal dark:text-vintage-teal-dark text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center">
                  <p className="text-vintage-teal/60 dark:text-vintage-teal-dark/60 font-display uppercase tracking-widest">
                    No items found for {groceryView === 'today' ? 'today' : 'this week'}.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Mobile Bottom Control */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-vintage-bg/90 dark:bg-vintage-bg-dark/90 backdrop-blur-md border-t border-vintage-teal/10 dark:border-vintage-teal-dark/10 z-50">
        <button
          onClick={handleSubsequentGenerate}
          disabled={loading || isGeneratingWeek}
          className="w-full bg-vintage-red hover:bg-vintage-red/90 disabled:bg-vintage-red/50 text-vintage-bg dark:text-white font-display py-4 px-6 rounded-2xl transition-colors flex items-center justify-center gap-3 text-lg uppercase tracking-wider shadow-lg"
        >
          {loading ? 'GENERATING...' : isGeneratingWeek ? 'COMPLETING WEEK...' : generationMode === 'day' ? 'MAKE MY WEEK' : 'MAKE MY DAY'}
        </button>
      </div>
    </div>
  );
}
