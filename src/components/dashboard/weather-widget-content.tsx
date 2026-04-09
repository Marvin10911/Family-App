'use client';

import { WeatherData } from '@/types';
import { CloudRain, Cloud, Sun, CloudSnow, Wind } from 'lucide-react';

interface Props {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
}

function getWeatherIcon(main?: string) {
  switch (main?.toLowerCase()) {
    case 'rain':
    case 'drizzle':
      return <CloudRain className="w-10 h-10" />;
    case 'snow':
      return <CloudSnow className="w-10 h-10" />;
    case 'clouds':
      return <Cloud className="w-10 h-10" />;
    default:
      return <Sun className="w-10 h-10" />;
  }
}

export function WeatherWidgetContent({ data, loading, error }: Props) {
  if (loading) {
    return <div className="text-sm opacity-80">Lade Wetter…</div>;
  }

  if (error || !data) {
    return (
      <div className="text-xs opacity-80">
        {error || 'Wetter nicht verfügbar'}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between gap-2">
      <div className="flex items-center gap-2">
        {getWeatherIcon(data.main)}
        <div>
          <div className="text-3xl font-bold leading-none">
            {Math.round(data.temp)}°
          </div>
          <div className="text-[11px] opacity-90 capitalize leading-tight mt-1">
            {data.description}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-right opacity-90 space-y-0.5">
        {data.precipitation !== undefined && <div>{Math.round(data.precipitation)}%</div>}
        <div className="flex items-center gap-1 justify-end">
          <Wind className="w-3 h-3" /> {Math.round(data.windSpeed)} km/h
        </div>
        <div>
          {Math.round(data.tempMin)}° / {Math.round(data.tempMax)}°
        </div>
      </div>
    </div>
  );
}
