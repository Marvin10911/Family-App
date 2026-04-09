'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  useShoppingItems,
  useTasks,
  useCalendarEvents,
  useWasteEntries,
} from '@/hooks/use-family-data';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistantFab() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hallo! 👋 Ich bin eure Familie AI. Frag mich alles über euren Haushalt, Termine oder Rezepte!',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { profile, family } = useAuth();
  const { data: shopping } = useShoppingItems();
  const { data: tasks } = useTasks();
  const { data: events } = useCalendarEvents();
  const { data: waste } = useWasteEntries();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const context = `
Familie: ${family?.name}
Offene Einkäufe: ${shopping.filter((i) => !i.checked).map((i) => i.name).join(', ') || 'keine'}
Offene Aufgaben: ${tasks.filter((t) => !t.completed).map((t) => t.title).join(', ') || 'keine'}
Nächste Termine: ${events.slice(0, 3).map((e) => e.title).join(', ') || 'keine'}
Nächste Müllabholung: ${waste.slice(0, 2).map((w) => `${w.type} am ${w.date}`).join(', ') || 'keine'}
`;

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context,
        }),
      });
      const { message } = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: message }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Ups, da ging etwas schief. Versuch es nochmal.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-glow text-white"
        style={{ boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-ink-900 rounded-t-3xl shadow-2xl max-h-[85dvh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-ink-100 dark:border-ink-700">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Familie AI</div>
                    <div className="text-[10px] text-ink-500">Immer für euch da</div>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === 'user'
                          ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white'
                          : 'bg-ink-100 dark:bg-ink-700'
                      }`}
                    >
                      {m.content}
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-ink-100 dark:bg-ink-700 rounded-2xl px-4 py-3 flex gap-1">
                      <div className="w-2 h-2 bg-ink-500 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-ink-500 rounded-full animate-bounce"
                        style={{ animationDelay: '0.15s' }}
                      />
                      <div
                        className="w-2 h-2 bg-ink-500 rounded-full animate-bounce"
                        style={{ animationDelay: '0.3s' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div
                className="p-4 border-t border-ink-100 dark:border-ink-700"
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
              >
                <div className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send()}
                    placeholder="Frag mich was…"
                    className="input flex-1"
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || loading}
                    className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white disabled:opacity-30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
