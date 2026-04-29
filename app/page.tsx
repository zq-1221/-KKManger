'use client';

import { useState, useEffect } from 'react';
import { HealthRecord } from '@/types/health';
import { getRecords } from '@/lib/storage';
import { getBMICategory } from '@/lib/bmi';
import DataCard from '@/components/DataCard';
import TrendChart from '@/components/TrendChart';

export default function DashboardPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [chartKey, setChartKey] = useState<'weight' | 'steps'>('weight');

  useEffect(() => {
    setRecords(getRecords());
  }, []);

  const latest = records.length > 0 ? records[records.length - 1] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">数据概览</h2>
        <p className="text-sm text-gray-400 mt-1">最近一次记录</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DataCard
          title="体重"
          value={latest?.weight ?? '--'}
          unit="kg"
          icon="⚖️"
          color="green"
        />
        <DataCard
          title="BMI"
          value={latest?.bmi ?? '--'}
          unit={latest?.bmi ? getBMICategory(latest.bmi) : undefined}
          icon="📏"
          color="blue"
        />
        <DataCard
          title="步数"
          value={latest?.steps?.toLocaleString() ?? '--'}
          icon="🚶"
          color="purple"
        />
        <DataCard
          title="睡眠"
          value={latest?.sleepHours ?? '--'}
          unit="h"
          icon="😴"
          color="orange"
        />
      </div>

      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold text-gray-800">趋势图</h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setChartKey('weight')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              chartKey === 'weight' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            体重
          </button>
          <button
            onClick={() => setChartKey('steps')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              chartKey === 'steps' ? 'bg-white text-indigo-500 shadow-sm' : 'text-gray-500'
            }`}
          >
            步数
          </button>
        </div>
      </div>

      <TrendChart data={records} dataKey={chartKey} />
    </div>
  );
}
