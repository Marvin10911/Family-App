'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useShoppingItems } from '@/hooks/use-family-data';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { ShoppingItem, ShoppingCategory } from '@/types';
import { Plus, Sparkles, ShoppingCart, Check, X, ListFilter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const CATEGORY_ICONS: Record<string, string> = {
  'Obst & Gemüse': '🥦',
  'Milchprodukte': '🥛',
  'Fleisch & Fisch': '🥩',
  'Backwaren': '🍞',
  'Tiefkühl': '❄️',
  'Getränke': '🥤',
  'Süßwaren': '🍬',
  'Haushalt': '🧹',
  'Drogerie': '🧴',
  'Sonstiges': '🛒',
};

const CATEGORY_COLORS: Record<ShoppingCategory, string> = {
  'Obst & Gemüse': 'from-green-500 to-lime-500',
  'Milchprodukte': 'from-blue-400 to-cyan-400',
  'Fleisch & Fisch': 'from-red-500 to-rose-500',
  'Backwaren': 'from-amber-500 to-orange-500',
  'Tiefkühl': 'from-cyan-500 to-sky-500',
  'Getränke': 'from-indigo-500 to-violet-500',
  'Süßwaren': 'from-pink-500 to-fuchsia-500',
  'Haushalt': 'from-slate-500 to-gray-600',
  'Drogerie': 'from-teal-500 to-emerald-500',
  'Sonstiges': 'from-zinc-500 to-stone-500',
};

const UNITS = ['Stk', 'g', 'kg', 'ml', 'L', 'Packung', 'Bund', 'Dose', 'Flasche', 'EL', 'TL'];

export default function ShoppingPage() {
  const { profile } = useAuth();
  const { data: items, loading } = useShoppingItems();
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showChecked, setShowChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quantity dialog state
  const [showQtyDialog, setShowQtyDialog] = useState(false);
  const [manualQty, setManualQty] = useState(1);
  const [manualUnit, setManualUnit] = useState('Stk');

  const grouped = useMemo(() => {
    const filtered = items.filter((i) => showChecked || !i.checked);
    const groups: Record<string, ShoppingItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [items, showChecked]);

  async function handleAddAI() {
    if (!input.trim() || !profile?.familyId) return;
    setError(null);
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'AI-Fehler');
      }
      const { items: aiItems } = await res.json();

      const batch = writeBatch(db);
      for (const ai of aiItems) {
        const ref = doc(collection(db, 'shoppingItems'));
        batch.set(ref, {
          familyId: profile.familyId,
          name: ai.name,
          quantity: ai.quantity || 1,
          unit: ai.unit || 'Stk',
          category: ai.category || 'Sonstiges',
          emoji: ai.emoji || '',
          checked: false,
          addedBy: profile.id,
          aiSuggested: true,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setInput('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  function openQtyDialog() {
    if (!input.trim()) return;
    setManualQty(1);
    setManualUnit('Stk');
    setShowQtyDialog(true);
  }

  async function confirmManualAdd() {
    if (!input.trim() || !profile?.familyId) return;
    await addDoc(collection(db, 'shoppingItems'), {
      familyId: profile.familyId,
      name: input.trim(),
      quantity: manualQty,
      unit: manualUnit,
      category: 'Sonstiges',
      emoji: '',
      checked: false,
      addedBy: profile.id,
      aiSuggested: false,
      createdAt: serverTimestamp(),
    });
    setInput('');
    setShowQtyDialog(false);
  }

  async function toggleItem(item: ShoppingItem) {
    const newChecked = !item.checked;
    await updateDoc(doc(db, 'shoppingItems', item.id), { checked: newChecked });
    if (newChecked) {
      const remaining = items.filter((i) => !i.checked && i.id !== item.id).length;
      if (remaining === 0 && items.length > 0) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
  }

  async function deleteItem(id: string) {
    await deleteDoc(doc(db, 'shoppingItems', id));
  }

  async function clearChecked() {
    const checkedItems = items.filter((i) => i.checked);
    const batch = writeBatch(db);
    for (const item of checkedItems) batch.delete(doc(db, 'shoppingItems', item.id));
    await batch.commit();
  }

  const openCount = items.filter((i) => !i.checked).length;
  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Einkaufsliste</h1>
            <p className="text-sm text-ink-500">
              {openCount} offen · {checkedCount} erledigt
            </p>
          </div>
        </div>
      </header>

      {/* Input */}
      <div className="glass rounded-2xl p-3 shadow-widget">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAI()}
            placeholder="z.B. Milch, Brot und Zutaten für Pizza…"
            className="flex-1 bg-transparent px-2 py-2 outline-none"
          />
          <button
            onClick={openQtyDialog}
            disabled={!input.trim()}
            className="p-2.5 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-30 transition"
            title="Manuell hinzufügen"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={handleAddAI}
            disabled={!input.trim() || aiLoading}
            className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white disabled:opacity-30 hover:scale-105 transition"
            title="Mit AI hinzufügen"
          >
            {aiLoading ? (
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Quantity dialog */}
        <AnimatePresence>
          {showQtyDialog && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-ink-100 dark:border-ink-700">
                <div className="text-sm font-medium mb-2">
                  Wie viel von <span className="text-violet-500">"{input}"</span>?
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={manualQty}
                    onChange={(e) => setManualQty(parseFloat(e.target.value) || 1)}
                    className="w-20 bg-ink-100 dark:bg-ink-700 rounded-xl px-3 py-2 text-center font-bold outline-none"
                  />
                  <select
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value)}
                    className="flex-1 bg-ink-100 dark:bg-ink-700 rounded-xl px-3 py-2 outline-none text-sm"
                  >
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <button
                    onClick={() => setShowQtyDialog(false)}
                    className="p-2 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-700 text-ink-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={confirmManualAdd}
                    className="p-2 rounded-xl bg-ink-900 dark:bg-white text-white dark:text-ink-900"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <div className="text-red-500 text-xs mt-2 px-2">{error}</div>}
        <div className="text-[11px] text-ink-500 mt-2 px-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AI versteht natürliche Sprache und Rezepte
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between text-sm">
        <button
          onClick={() => setShowChecked((s) => !s)}
          className="flex items-center gap-2 text-ink-500 hover:text-ink-900 dark:hover:text-white transition"
        >
          <ListFilter className="w-4 h-4" />
          {showChecked ? 'Erledigte ausblenden' : 'Erledigte zeigen'}
        </button>
        {checkedCount > 0 && (
          <button onClick={clearChecked} className="text-red-500 hover:text-red-600 font-medium">
            {checkedCount} erledigte löschen
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-ink-500">Lade…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <ShoppingCart className="w-12 h-12 text-ink-200 dark:text-ink-700 mx-auto mb-3" />
          <div className="text-ink-500">Deine Liste ist leer</div>
          <div className="text-xs text-ink-500 mt-1">Füge oben etwas hinzu</div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div
                  className={`w-2 h-2 rounded-full bg-gradient-to-br ${
                    CATEGORY_COLORS[category as ShoppingCategory]
                  }`}
                />
                <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                  {category}
                </h3>
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {catItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      className="card flex items-center gap-3 !p-3"
                    >
                      <button
                        onClick={() => toggleItem(item)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${
                          item.checked
                            ? 'bg-green-500 border-green-500'
                            : 'border-ink-200 dark:border-ink-700'
                        }`}
                      >
                        {item.checked && <Check className="w-4 h-4 text-white" />}
                      </button>
                      <div className="text-xl flex-shrink-0 w-7 text-center">
                        {item.emoji || CATEGORY_ICONS[item.category] || '🛒'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${item.checked ? 'line-through text-ink-500' : ''}`}>
                          {item.name}
                        </div>
                        <div className="text-xs text-ink-500">
                          {item.quantity} {item.unit}
                          {item.aiSuggested && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-violet-500">
                              <Sparkles className="w-2.5 h-2.5" /> AI
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 text-ink-500 hover:text-red-500 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
