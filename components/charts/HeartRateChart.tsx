'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { HealthRecord } from '@/types/health';

interface HeartRateChartProps {
  records: HealthRecord[];
}

export default function HeartRateChart({ records }: HeartRateChartProps) {
  const chartData = records
    .filter((r) => r.heartRate != null)
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      heartRate: r.heartRate,
    }));

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" unit="bpm" width={50} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          formatter={(val) => [`${val} bpm`, '心率']}
        />
        <ReferenceArea y1={60} y2={100} fill="#8b5cf6" fillOpacity={0.05} label={{ value: '正常静息心率', fontSize: 10, fill: '#8b5cf6', position: 'insideRight' }} />
        <Line
          type="monotone"
          dataKey="heartRate"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 4, fill: '#8b5cf6' }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
