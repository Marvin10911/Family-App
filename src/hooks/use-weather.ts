'use client';

import { useEffect, useState } from 'react';
import { WeatherData } from '@/types';

export function useWeather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setError('Standort nicht verfügbar');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          if (!res.ok) throw new Error('Wetter-Abfrage fehlgeschlagen');
          const json = await res.json();
          setData(json);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Standort verweigert');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  }, []);

  return { data, loading, error };
}
