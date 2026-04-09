'use client';

import { WasteEntry, WASTE_COLORS } from '@/types';
import { formatDateShort } from '@/lib/utils';

export function WasteWidgetContent({ entries }: { entries: WasteEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-sm italic opacity-90">
        Noch keine Termine — im Admin konfigurieren
      </div>
    );
  }

  return (
    <div className="space-y-1 text-[13px]">
      {entries.slice(0, 5).map((entry) => (
        <div key={entry.id} className="flex items-center gap-2">
          <span className="min-w-[58px] font-medium">
            {formatDateShort(new Date(entry.date))}
          </span>
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color || WASTE_COLORS[entry.type] }}
          />
          <span className="truncate opacity-95">{entry.type}</span>
        </div>
      ))}
    </div>
  );
}
