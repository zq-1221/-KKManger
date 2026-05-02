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
  dataKey: 'steps' | 'sleep' | 'bloodPressure';
}

const config: Record<TrendChartProps['dataKey'], { label: string; color: string; unit: string; color2?: string; getValue: (r: HealthRecord) => number | null | undefined }> = {
  steps:         { label: '步数', color: '#6366f1', unit: '步',   getValue: (r) => r.steps },
  sleep:         { label: '睡眠', color: '#f59e0b', unit: 'h',    getValue: (r) => r.sleepHours },
  bloodPressure: { label: '血压', color: '#ef4444', unit: 'mmHg', getValue: (r) => r.systolic ?? r.diastolic, color2: '#3b82f6' },
};

export default function TrendChart({ data, dataKey }: TrendChartProps) {
  const cfg = config[dataKey];
  const isDual = dataKey === 'bloodPressure';

  const recent = [...data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7);

  const chartData = recent.map((r) => {
    const base = {
      date: new Date(r.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
    };
    if (isDual) {
      return {
        ...base,
        systolic: r.systolic ?? null,
        diastolic: r.diastolic ?? null,
      };
    }
    return { ...base, value: cfg.getValue(r) ?? null };
  });

  if (chartData.length === 0 || (isDual && chartData.every((d: Record<string, unknown>) => d.systolic == null && d.diastolic == null))) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 text-center text-gray-400 text-sm">
        暂无数据，请先录入健康数据
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">{cfg.label}趋势（近7天）</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" unit={cfg.unit} width={60} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            formatter={(val, name) => [
              `${val} ${cfg.unit}`,
              name === 'systolic' ? '收缩压' : name === 'diastolic' ? '舒张压' : cfg.label,
            ]}
          />
          {isDual ? (
            <>
              <Line
                type="monotone"
                dataKey="systolic"
                name="收缩压"
                stroke={cfg.color}
                strokeWidth={2}
                dot={{ r: 4, fill: cfg.color }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                name="舒张压"
                stroke={cfg.color2}
                strokeWidth={2}
                dot={{ r: 4, fill: cfg.color2 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </>
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={cfg.color}
              strokeWidth={2}
              dot={{ r: 4, fill: cfg.color }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
