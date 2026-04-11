'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useTasks } from '@/hooks/use-family-data';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Task, TaskPriority } from '@/types';
import {
  Plus,
  Sparkles,
  CheckSquare,
  Flame,
  Clock,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { notifyFamily } from '@/lib/notifications/fcm';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  urgent: 'Dringend',
};

export default function TasksPage() {
  const { profile } = useAuth();
  const { data: tasks, loading } = useTasks();
  const [newTitle, setNewTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [aiLoading, setAiLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const openTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const displayTasks = showCompleted ? completedTasks : openTasks;

  const sortedTasks = [...displayTasks].sort((a, b) => {
    const prio = { urgent: 0, high: 1, medium: 2, low: 3 };
    return prio[a.priority] - prio[b.priority];
  });

  async function addTask() {
    if (!newTitle.trim() || !profile?.familyId) return;
    const title = newTitle.trim();
    await addDoc(collection(db, 'tasks'), {
      familyId: profile.familyId,
      title,
      assignedTo: [profile.id],
      priority,
      completed: false,
      category: 'Allgemein',
      pointsReward: priority === 'urgent' ? 20 : priority === 'high' ? 15 : 10,
      aiGenerated: false,
      createdBy: profile.id,
      createdAt: serverTimestamp(),
    });
    setNewTitle('');
    notifyFamily(
      profile.familyId,
      '✅ Neue Aufgabe',
      `${profile.displayName} hat "${title}" hinzugefügt`,
      '/tasks',
      profile.id,
    );
  }

  async function generateAITasks() {
    if (!profile?.familyId) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const { tasks: aiTasks } = await res.json();

      for (const task of aiTasks || []) {
        await addDoc(collection(db, 'tasks'), {
          familyId: profile.familyId,
          title: task.title,
          description: task.description,
          assignedTo: [],
          priority: task.priority || 'medium',
          completed: false,
          category: task.category || 'Allgemein',
          pointsReward: task.pointsReward || 10,
          aiGenerated: true,
          createdBy: profile.id,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  }

  async function toggleTask(task: Task) {
    const newCompleted = !task.completed;
    await updateDoc(doc(db, 'tasks', task.id), {
      completed: newCompleted,
      completedBy: newCompleted ? profile?.id : null,
      completedAt: newCompleted ? serverTimestamp() : null,
    });

    if (newCompleted && profile) {
      await updateDoc(doc(db, 'users', profile.id), {
        points: increment(task.pointsReward || 10),
      });

      const remaining = openTasks.filter((t) => t.id !== task.id).length;
      if (remaining === 0) {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#ec4899', '#f97316', '#eab308'],
        });
      }
    }
  }

  return (
    <div className="space-y-5">
      <header className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <CheckSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Aufgaben</h1>
            <p className="text-sm text-ink-500">
              {openTasks.length} offen · {profile?.points ?? 0} Punkte
            </p>
          </div>
        </div>
      </header>

      {/* Input */}
      <div className="glass rounded-2xl p-3 shadow-widget space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Neue Aufgabe…"
            className="flex-1 bg-transparent px-2 py-2 outline-none"
          />
          <button
            onClick={addTask}
            disabled={!newTitle.trim()}
            className="p-2.5 rounded-xl bg-ink-900 text-white dark:bg-white dark:text-ink-900 disabled:opacity-30"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                priority === p
                  ? PRIORITY_COLORS[p] + ' ring-2 ring-current'
                  : 'text-ink-500 bg-ink-100 dark:bg-ink-700'
              }`}
            >
              {PRIORITY_LABEL[p]}
            </button>
          ))}
          <button
            onClick={generateAITasks}
            disabled={aiLoading}
            className="ml-auto text-xs px-2.5 py-1 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 text-white font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {aiLoading ? (
              <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            AI Vorschläge
          </button>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => setShowCompleted(false)}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            !showCompleted ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'text-ink-500'
          }`}
        >
          Offen ({openTasks.length})
        </button>
        <button
          onClick={() => setShowCompleted(true)}
          className={`px-3 py-1.5 rounded-lg font-medium transition ${
            showCompleted ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'text-ink-500'
          }`}
        >
          Erledigt ({completedTasks.length})
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-ink-500">Lade…</div>
      ) : sortedTasks.length === 0 ? (
        <div className="text-center py-16">
          <CheckSquare className="w-12 h-12 text-ink-200 dark:text-ink-700 mx-auto mb-3" />
          <div className="text-ink-500">
            {showCompleted ? 'Noch nichts erledigt' : 'Alles erledigt! 🎉'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sortedTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className="card flex items-start gap-3"
              >
                <button
                  onClick={() => toggleTask(task)}
                  className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                    task.completed
                      ? 'bg-violet-500 border-violet-500'
                      : 'border-ink-200 dark:border-ink-700'
                  }`}
                >
                  {task.completed && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium ${
                      task.completed ? 'line-through text-ink-500' : ''
                    }`}
                  >
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-xs text-ink-500 mt-0.5">{task.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    <span className="text-[10px] text-ink-500">{task.category}</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> {task.pointsReward}
                    </span>
                    {task.aiGenerated && (
                      <span className="text-[10px] text-violet-500 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteDoc(doc(db, 'tasks', task.id))}
                  className="p-1 text-ink-500 hover:text-red-500 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
