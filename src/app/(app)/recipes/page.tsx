'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useRecipes } from '@/hooks/use-family-data';
import { useShoppingItems } from '@/hooks/use-family-data';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Recipe, RecipeCategory, RecipeIngredient } from '@/types';
import { getItemEmoji } from '@/lib/utils';
import {
  BookOpen, Sparkles, Plus, X, Heart, Clock, Users, ChevronRight,
  ShoppingCart, Search, Trash2, ArrowLeft, Check, CalendarDays,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES: RecipeCategory[] = ['Frühstück', 'Mittagessen', 'Abendessen', 'Dessert', 'Snack', 'Sonstiges'];

const CATEGORY_COLORS: Record<RecipeCategory, string> = {
  'Frühstück':   'from-amber-400 to-orange-400',
  'Mittagessen': 'from-green-500 to-emerald-400',
  'Abendessen':  'from-indigo-500 to-violet-500',
  'Dessert':     'from-pink-500 to-rose-400',
  'Snack':       'from-yellow-400 to-amber-400',
  'Sonstiges':   'from-slate-500 to-gray-500',
};

type View = 'list' | 'detail' | 'add';

export default function RecipesPage() {
  const { profile } = useAuth();
  const { data: recipes, loading } = useRecipes();
  const { data: shoppingItems } = useShoppingItems();

  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<RecipeCategory | 'Alle'>('Alle');

  // Add form state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [form, setForm] = useState({
    name: '', emoji: '🍽️', category: 'Abendessen' as RecipeCategory,
    duration: 30, servings: 4, notes: '',
    ingredients: [{ name: '', amount: '', emoji: '' }] as RecipeIngredient[],
    steps: [''] as string[],
  });
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [mealPickerDate, setMealPickerDate] = useState('');
  const [mealPickerSlot, setMealPickerSlot] = useState<'lunch' | 'dinner'>('dinner');
  const [mealSaved, setMealSaved] = useState(false);

  const filtered = useMemo(() => {
    let list = [...recipes];
    if (activeCategory !== 'Alle') list = list.filter((r) => r.category === activeCategory);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(s) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(s)));
    }
    return list.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
  }, [recipes, activeCategory, search]);

  function openDetail(recipe: Recipe) {
    setSelected(recipe);
    setView('detail');
  }

  function openAdd() {
    setForm({ name: '', emoji: '🍽️', category: 'Abendessen', duration: 30, servings: 4, notes: '', ingredients: [{ name: '', amount: '', emoji: '' }], steps: [''] });
    setAiPrompt('');
    setManualMode(false);
    setError(null);
    setView('add');
  }

  async function generateAI() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, servings: form.servings }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setForm({
        name: data.name || '',
        emoji: data.emoji || '🍽️',
        category: data.category || 'Abendessen',
        duration: data.duration || 30,
        servings: data.servings || 4,
        notes: data.notes || '',
        ingredients: (data.ingredients || []).map((i: any) => ({
          name: i.name, amount: i.amount, emoji: i.emoji || getItemEmoji(i.name),
        })),
        steps: data.steps || [],
      });
      setManualMode(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function saveRecipe() {
    if (!form.name.trim() || !profile?.familyId) return;
    await addDoc(collection(db, 'recipes'), {
      familyId: profile.familyId,
      name: form.name.trim(),
      emoji: form.emoji,
      category: form.category,
      duration: form.duration,
      servings: form.servings,
      ingredients: form.ingredients.filter((i) => i.name.trim()),
      steps: form.steps.filter((s) => s.trim()),
      notes: form.notes,
      favorite: false,
      aiGenerated: !!aiPrompt,
      createdBy: profile.id,
      createdAt: serverTimestamp(),
    });
    setView('list');
  }

  async function toggleFavorite(recipe: Recipe) {
    await updateDoc(doc(db, 'recipes', recipe.id), { favorite: !recipe.favorite });
    if (selected?.id === recipe.id) setSelected({ ...recipe, favorite: !recipe.favorite });
  }

  async function deleteRecipe(id: string) {
    await deleteDoc(doc(db, 'recipes', id));
    setView('list');
    setSelected(null);
  }

  async function addIngredientsToCart(recipe: Recipe) {
    if (!profile?.familyId) return;
    const batch = writeBatch(db);
    for (const ing of recipe.ingredients) {
      const ref = doc(collection(db, 'shoppingItems'));
      batch.set(ref, {
        familyId: profile.familyId,
        name: ing.name,
        quantity: 1,
        unit: ing.amount,
        category: 'Sonstiges',
        emoji: ing.emoji || getItemEmoji(ing.name),
        checked: false,
        addedBy: profile.id,
        aiSuggested: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  }

  function getWeekDates() {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }

  const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  function openMealPicker() {
    setMealPickerDate(new Date().toISOString().slice(0, 10));
    setMealPickerSlot('dinner');
    setMealSaved(false);
    setShowMealPicker(true);
  }

  async function addToMealPlan() {
    if (!profile?.familyId || !selected || !mealPickerDate) return;
    await setDoc(
      doc(db, 'mealPlans', `${profile.familyId}_${mealPickerDate}`),
      { familyId: profile.familyId, date: mealPickerDate, [mealPickerSlot]: selected.name },
      { merge: true },
    );
    setMealSaved(true);
    setTimeout(() => { setMealSaved(false); setShowMealPicker(false); }, 2000);
  }

  // ── List view ──────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-5">
      <header className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rezeptbuch</h1>
            <p className="text-sm text-ink-500">{recipes.length} Rezepte</p>
          </div>
        </div>
        <button onClick={openAdd}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white flex items-center justify-center shadow-lg hover:scale-105 transition">
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rezept oder Zutat suchen…"
          className="input pl-10 text-sm" />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
        {(['Alle', ...CATEGORIES] as const).map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat as any)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition ${
              activeCategory === cat
                ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                : 'bg-white dark:bg-ink-900 text-ink-500 border border-ink-100 dark:border-ink-700'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-ink-500">Lade…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-6xl">👨‍🍳</div>
          <div className="text-ink-500 font-medium">Noch keine Rezepte</div>
          <button onClick={openAdd}
            className="btn-primary mx-auto">
            <Sparkles className="w-4 h-4" /> Erstes Rezept hinzufügen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence>
            {filtered.map((recipe, i) => (
              <motion.button key={recipe.id} onClick={() => openDetail(recipe)}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card text-left p-4 hover:scale-[1.02] transition relative">
                {recipe.favorite && (
                  <div className="absolute top-2.5 right-2.5 text-rose-500">
                    <Heart className="w-3.5 h-3.5 fill-current" />
                  </div>
                )}
                <div className="text-4xl mb-2">{recipe.emoji}</div>
                <div className="font-semibold text-sm leading-tight">{recipe.name}</div>
                <div className={`text-[10px] font-medium mt-1 inline-block px-1.5 py-0.5 rounded-md bg-gradient-to-r ${CATEGORY_COLORS[recipe.category]} text-white`}>
                  {recipe.category}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-ink-500">
                  <Clock className="w-3 h-3" /> {recipe.duration} min
                  <Users className="w-3 h-3 ml-1" /> {recipe.servings}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  // ── Detail view ────────────────────────────────────────────────────────────
  if (view === 'detail' && selected) return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      {/* Header */}
      <div className="pt-2 flex items-center gap-3">
        <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1" />
        <button onClick={() => toggleFavorite(selected)}
          className={`p-2 rounded-xl transition ${selected.favorite ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/30' : 'hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500'}`}>
          <Heart className={`w-5 h-5 ${selected.favorite ? 'fill-current' : ''}`} />
        </button>
        <button onClick={() => deleteRecipe(selected.id)}
          className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-ink-500 hover:text-red-500 transition">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Hero */}
      <div className="card p-6 text-center">
        <div className="text-7xl mb-3">{selected.emoji}</div>
        <h1 className="text-2xl font-bold">{selected.name}</h1>
        <div className={`text-xs font-medium mt-2 inline-block px-2 py-1 rounded-lg bg-gradient-to-r ${CATEGORY_COLORS[selected.category]} text-white`}>
          {selected.category}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-ink-500">
          <div className="flex items-center gap-1"><Clock className="w-4 h-4" /> {selected.duration} min</div>
          <div className="flex items-center gap-1"><Users className="w-4 h-4" /> {selected.servings} Personen</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={() => addIngredientsToCart(selected)}
          className={`flex-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition shadow-widget ${
            addedToCart
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-rose-500 to-orange-400 text-white hover:scale-[1.01]'
          }`}>
          {addedToCart ? <><Check className="w-4 h-4" /> Hinzugefügt!</> : <><ShoppingCart className="w-4 h-4" /> Einkaufsliste</>}
        </button>
        <button onClick={openMealPicker}
          className="flex-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 transition shadow-widget bg-gradient-to-r from-violet-500 to-indigo-500 text-white hover:scale-[1.01]">
          <CalendarDays className="w-4 h-4" /> Essensplan
        </button>
      </div>

      {/* Meal plan picker */}
      <AnimatePresence>
        {showMealPicker && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="card space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-violet-500" /> Tag auswählen
              </div>
              <button onClick={() => setShowMealPicker(false)} className="text-ink-400 hover:text-ink-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Day selector */}
            <div className="grid grid-cols-7 gap-1">
              {getWeekDates().map((date, i) => {
                const d = new Date(date + 'T12:00:00');
                const isSelected = date === mealPickerDate;
                const isToday = date === new Date().toISOString().slice(0, 10);
                return (
                  <button key={date} onClick={() => setMealPickerDate(date)}
                    className={`flex flex-col items-center py-2 rounded-xl transition text-xs font-medium ${
                      isSelected
                        ? 'bg-violet-500 text-white'
                        : isToday
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300'
                        : 'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300'
                    }`}>
                    <span className="text-[10px] opacity-80">{DAY_LABELS[i]}</span>
                    <span className="font-bold">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {/* Slot toggle */}
            <div className="flex rounded-xl overflow-hidden border border-ink-200 dark:border-ink-700">
              <button onClick={() => setMealPickerSlot('lunch')}
                className={`flex-1 py-2.5 text-sm font-medium transition ${
                  mealPickerSlot === 'lunch'
                    ? 'bg-violet-500 text-white'
                    : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'
                }`}>
                ☀️ Mittag
              </button>
              <button onClick={() => setMealPickerSlot('dinner')}
                className={`flex-1 py-2.5 text-sm font-medium transition ${
                  mealPickerSlot === 'dinner'
                    ? 'bg-violet-500 text-white'
                    : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'
                }`}>
                🌙 Abend
              </button>
            </div>

            {/* Confirm */}
            <button onClick={addToMealPlan}
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                mealSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-violet-500 text-white hover:bg-violet-600'
              }`}>
              {mealSaved
                ? <><Check className="w-4 h-4" /> Eingeplant!</>
                : <><CalendarDays className="w-4 h-4" /> Einplanen</>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ingredients */}
      <div className="card space-y-3">
        <h2 className="font-bold text-lg">Zutaten</h2>
        {selected.ingredients.map((ing, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 border-b border-ink-50 dark:border-ink-800 last:border-0">
            <span className="text-xl w-7 text-center">{ing.emoji || getItemEmoji(ing.name) || '🥘'}</span>
            <span className="flex-1 font-medium text-sm">{ing.name}</span>
            <span className="text-sm text-ink-500">{ing.amount}</span>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="card space-y-4">
        <h2 className="font-bold text-lg">Zubereitung</h2>
        {selected.steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm leading-relaxed flex-1">{step}</p>
          </div>
        ))}
      </div>

      {/* Notes */}
      {selected.notes && (
        <div className="card bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <div className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">💡 Tipp</div>
          <p className="text-sm">{selected.notes}</p>
        </div>
      )}
    </motion.div>
  );

  // ── Add view ───────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="pt-2 flex items-center gap-3">
        <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Rezept hinzufügen</h1>
      </div>

      {/* AI Generator */}
      <div className="glass rounded-2xl p-4 shadow-widget space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="w-4 h-4 text-violet-500" /> AI-Rezept generieren
        </div>
        <div className="flex gap-2">
          <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateAI()}
            placeholder="z.B. Hähnchen mit Pasta und Tomaten…"
            className="flex-1 bg-ink-100 dark:bg-ink-800 rounded-xl px-3 py-2.5 text-sm outline-none" />
          <button onClick={generateAI} disabled={!aiPrompt.trim() || aiLoading}
            className="px-4 py-2 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white font-medium text-sm disabled:opacity-40 hover:scale-105 transition">
            {aiLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Erstellen'}
          </button>
        </div>
        {!manualMode && (
          <button onClick={() => setManualMode(true)} className="text-xs text-ink-500 hover:text-ink-700">
            Oder manuell eingeben →
          </button>
        )}
      </div>

      {error && <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl">{error}</div>}

      {/* Manual form */}
      <AnimatePresence>
        {manualMode && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Basic info */}
            <div className="card space-y-3">
              <div className="flex gap-2">
                <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  className="w-16 text-center text-2xl bg-ink-100 dark:bg-ink-800 rounded-xl py-2 outline-none" />
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Rezeptname" className="input flex-1" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RecipeCategory })}
                  className="input text-sm col-span-1">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                  <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: +e.target.value })}
                    className="input pl-7 text-sm" placeholder="Min" />
                </div>
                <div className="relative">
                  <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
                  <input type="number" value={form.servings} onChange={(e) => setForm({ ...form, servings: +e.target.value })}
                    className="input pl-7 text-sm" placeholder="Pers." />
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="card space-y-2">
              <div className="font-semibold">Zutaten</div>
              {form.ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-lg w-6 text-center">{ing.emoji || getItemEmoji(ing.name) || '🥘'}</span>
                  <input value={ing.name}
                    onChange={(e) => {
                      const updated = [...form.ingredients];
                      updated[i] = { ...updated[i], name: e.target.value, emoji: getItemEmoji(e.target.value) };
                      setForm({ ...form, ingredients: updated });
                    }}
                    placeholder="Zutat" className="input flex-1 text-sm" />
                  <input value={ing.amount}
                    onChange={(e) => {
                      const updated = [...form.ingredients];
                      updated[i] = { ...updated[i], amount: e.target.value };
                      setForm({ ...form, ingredients: updated });
                    }}
                    placeholder="Menge" className="input w-24 text-sm" />
                  {form.ingredients.length > 1 && (
                    <button onClick={() => setForm({ ...form, ingredients: form.ingredients.filter((_, j) => j !== i) })}
                      className="text-ink-400 hover:text-red-500 transition">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setForm({ ...form, ingredients: [...form.ingredients, { name: '', amount: '', emoji: '' }] })}
                className="flex items-center gap-1 text-sm text-violet-500 font-medium hover:text-violet-600">
                <Plus className="w-4 h-4" /> Zutat hinzufügen
              </button>
            </div>

            {/* Steps */}
            <div className="card space-y-2">
              <div className="font-semibold">Zubereitung</div>
              {form.steps.map((step, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-2.5">
                    {i + 1}
                  </div>
                  <textarea value={step}
                    onChange={(e) => {
                      const updated = [...form.steps];
                      updated[i] = e.target.value;
                      setForm({ ...form, steps: updated });
                    }}
                    rows={2} placeholder={`Schritt ${i + 1}…`}
                    className="input flex-1 text-sm resize-none" />
                  {form.steps.length > 1 && (
                    <button onClick={() => setForm({ ...form, steps: form.steps.filter((_, j) => j !== i) })}
                      className="text-ink-400 hover:text-red-500 transition mt-2.5">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setForm({ ...form, steps: [...form.steps, ''] })}
                className="flex items-center gap-1 text-sm text-violet-500 font-medium hover:text-violet-600">
                <Plus className="w-4 h-4" /> Schritt hinzufügen
              </button>
            </div>

            {/* Notes */}
            <div className="card">
              <div className="font-semibold mb-2">Tipp / Notiz (optional)</div>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2} placeholder="z.B. Kein Sahne — das ist nicht original!" className="input w-full text-sm resize-none" />
            </div>

            <button onClick={saveRecipe} disabled={!form.name.trim()}
              className="btn-primary w-full py-3.5 disabled:opacity-40">
              <BookOpen className="w-5 h-5" /> Rezept speichern
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
