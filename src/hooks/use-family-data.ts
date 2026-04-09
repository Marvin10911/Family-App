'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuth } from '@/lib/auth/auth-context';
import {
  ShoppingItem,
  Task,
  MealPlan,
  CalendarEvent,
  WasteEntry,
} from '@/types';

function useFamilyCollection<T>(
  collectionName: string,
  extraConstraints: QueryConstraint[] = []
) {
  const { profile } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.familyId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, collectionName),
      where('familyId', '==', profile.familyId),
      ...extraConstraints
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
        setData(items);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.familyId, collectionName]);

  return { data, loading };
}

export function useShoppingItems() {
  return useFamilyCollection<ShoppingItem>('shoppingItems');
}

export function useTasks() {
  return useFamilyCollection<Task>('tasks');
}

export function useMealPlans() {
  return useFamilyCollection<MealPlan>('mealPlans');
}

export function useCalendarEvents() {
  return useFamilyCollection<CalendarEvent>('calendarEvents');
}

export function useWasteEntries() {
  return useFamilyCollection<WasteEntry>('wasteEntries');
}
