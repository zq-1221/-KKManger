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

interface BloodPressureChartProps {
  records: HealthRecord[];
}

export default function BloodPressureChart({ records }: BloodPressureChartProps) {
  const chartData = records
    .filter((r) => r.systolic != null || r.diastolic != null)
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
      systolic: r.systolic ?? null,
      diastolic: r.diastolic ?? null,
    }));

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" unit="mmHg" width={55} domain={[30, 'auto']} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          formatter={(val, name) => [
            `${val} mmHg`,
            name === 'systolic' ? '收缩压' : '舒张压',
          ]}
        />
        <ReferenceArea y1={60} y2={90} fill="#3b82f6" fillOpacity={0.06} label={{ value: '舒张压正常', fontSize: 10, fill: '#3b82f6', position: 'insideLeft' }} />
        <ReferenceArea y1={90} y2={140} fill="#22c55e" fillOpacity={0.06} label={{ value: '收缩压正常', fontSize: 10, fill: '#22c55e', position: 'insideRight' }} />
        <Line
          type="monotone"
          dataKey="systolic"
          name="收缩压"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 4, fill: '#ef4444' }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="diastolic"
          name="舒张压"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4, fill: '#3b82f6' }}
          activeDot={{ r: 6 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
