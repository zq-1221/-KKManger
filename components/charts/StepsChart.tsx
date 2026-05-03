'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { HealthRecord } from '@/types/health';

interface StepsChartProps {
  records: HealthRecord[];
}

export default function StepsChart({ records }: StepsChartProps) {
  const chartData = records
    .filter((r) => r.steps != null)
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      steps: r.steps,
    }));

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" unit="步" width={55} domain={[0, 'auto']} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          formatter={(val) => [`${Number(val).toLocaleString()} 步`, '步数']}
        />
        <ReferenceLine
          y={8000}
          stroke="#ef4444"
          strokeDasharray="5 5"
          label={{ value: '目标 8000步', fontSize: 11, fill: '#ef4444', position: 'insideTopRight' }}
        />
        <Bar dataKey="steps" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
