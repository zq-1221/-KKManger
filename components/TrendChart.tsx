'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { HealthRecord } from '@/types/health';

interface TrendChartProps {
  data: HealthRecord[];
  dataKey: 'weight' | 'steps';
}

const config: Record<TrendChartProps['dataKey'], { label: string; color: string; unit: string }> = {
  weight: { label: '体重', color: '#10b981', unit: 'kg' },
  steps:  { label: '步数', color: '#6366f1', unit: '步' },
};

export default function TrendChart({ data, dataKey }: TrendChartProps) {
  const { label, color, unit } = config[dataKey];

  const recent = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7);

  const chartData = recent.map((r) => ({
    date: new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    value: r[dataKey] ?? null,
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 text-center text-gray-400 text-sm">
        暂无数据，请先录入健康数据
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">{label}趋势（近7天）</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" unit={unit} width={60} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            formatter={(val) => [`${val} ${unit}`, label]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
