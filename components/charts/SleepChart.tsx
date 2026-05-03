'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { HealthRecord } from '@/types/health';

interface SleepChartProps {
  records: HealthRecord[];
}

export default function SleepChart({ records }: SleepChartProps) {
  const chartData = records
    .filter((r) => r.sleepHours != null)
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      hours: r.sleepHours,
    }));

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" unit="h" width={45} domain={[0, 'auto']} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          formatter={(val) => [`${val} h`, '睡眠']}
        />
        <ReferenceLine
          y={8}
          stroke="#22c55e"
          strokeDasharray="5 5"
          label={{ value: '推荐 8h', fontSize: 11, fill: '#22c55e', position: 'insideTopRight' }}
        />
        <Area
          type="monotone"
          dataKey="hours"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#sleepGradient)"
          dot={{ r: 4, fill: '#f59e0b' }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
