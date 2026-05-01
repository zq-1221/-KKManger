'use client';

import { useState, useEffect } from 'react';
import { AIAdvice } from '@/types/health';
import { getAdvices } from '@/lib/advice-storage';

export default function AdvicePage() {
  const [advices, setAdvices] = useState<AIAdvice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const all = getAdvices();
    setAdvices(all);
  }, []);

  const current = advices[selectedIndex] ?? null;

  if (advices.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">AI 健康建议</h2>
          <p className="text-sm text-gray-400 mt-1">基于 7 天数据分析</p>
        </div>
        <div className="text-center text-gray-400 py-20 text-sm">
          暂无 AI 建议，继续录入数据吧<br />
          <span className="text-xs text-gray-300 mt-2 block">
            每累计 7 天数据将自动生成建议
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">AI 健康建议</h2>
        <p className="text-sm text-gray-400 mt-1">
          基于 7 天数据分析 · 共 {advices.length} 期
        </p>
      </div>

      {advices.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {advices.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setSelectedIndex(i)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                i === selectedIndex
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {formatRange(a.startDate, a.endDate)}
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="space-y-4">
          <div className="bg-emerald-50 rounded-2xl p-5">
            <h3 className="font-semibold text-emerald-700 text-sm mb-3">📊 数据摘要</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {current.summary.avgWeight !== null && (
                <SummaryItem label="平均体重" value={`${current.summary.avgWeight} kg`} />
              )}
              <SummaryItem
                label="平均步数"
                value={`${current.summary.avgSteps.toLocaleString()} 步`}
              />
              <SummaryItem label="平均睡眠" value={`${current.summary.avgSleep} 小时`} />
              <SummaryItem label="平均饮水" value={`${current.summary.avgWater} ml`} />
              <SummaryItem
                label="体重趋势"
                value={
                  current.summary.weightTrend === 'up'
                    ? '📈 上升'
                    : current.summary.weightTrend === 'down'
                      ? '📉 下降'
                      : '➡️ 平稳'
                }
              />
            </div>
          </div>

          <SectionBlock icon="🍽️" title="饮食建议" color="amber" text={current.diet} />
          <SectionBlock icon="🏃" title="运动建议" color="blue" text={current.exercise} />
          <SectionBlock icon="😴" title="作息建议" color="gray" text={current.sleep} />

          <p className="text-center text-xs text-gray-400">
            数据周期：{formatFullDate(current.startDate)} — {formatFullDate(current.endDate)}
          </p>
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  icon,
  title,
  text,
  color,
}: {
  icon: string;
  title: string;
  text: string;
  color: 'amber' | 'blue' | 'gray';
}) {
  const colors = {
    amber: 'border-amber-200 bg-amber-50',
    blue: 'border-blue-200 bg-blue-50',
    gray: 'border-gray-200 bg-gray-50',
  };
  const titleColors = {
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    gray: 'text-gray-700',
  };

  return (
    <div className={`rounded-2xl p-5 border ${colors[color]}`}>
      <h3 className={`font-semibold text-sm mb-2 ${titleColors[color]}`}>
        {icon} {title}
      </h3>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-emerald-500">{label}</p>
      <p className="font-semibold text-gray-700">{value}</p>
    </div>
  );
}

function formatFullDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function formatRange(start: string, end: string): string {
  return `${formatFullDate(start)} — ${formatFullDate(end)}`;
}
