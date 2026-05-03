'use client';

import { useState } from 'react';
import { HealthRecord } from '@/types/health';
import { filterByDays, computeStats } from '@/lib/trend-utils';

const TREND_ICON: Record<string, string> = { up: '↑', down: '↓', stable: '→' };

interface ChartCardProps {
  title: string;
  color: string;
  unit: string;
  records: HealthRecord[];
  getValue: (r: HealthRecord) => number | null | undefined;
  children: (filtered: HealthRecord[]) => React.ReactNode;
}

export default function ChartCard({ title, color, unit, records, getValue, children }: ChartCardProps) {
  const [days, setDays] = useState(7);
  const filtered = filterByDays(records, days);
  const stats = computeStats(filtered, getValue);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-gray-500">
          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: color }} />
          {title}
        </h3>
        <div className="flex gap-1">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-0.5 text-xs font-medium rounded-md transition-colors ${
                days === d
                  ? 'bg-gray-200 text-gray-700'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {d}天
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="flex gap-4 text-xs text-gray-400 mb-3">
          <span>平均 {stats.avg}{unit}</span>
          <span>最低 {stats.min}{unit}</span>
          <span>最高 {stats.max}{unit}</span>
          <span>趋势 {TREND_ICON[stats.trend]}</span>
        </div>
      )}

      {!stats ? (
        <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">
          暂无数据
        </div>
      ) : (
        children(filtered)
      )}
    </div>
  );
}
