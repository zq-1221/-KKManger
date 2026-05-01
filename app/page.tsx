'use client';

import { useState, useEffect, useCallback } from 'react';
import { HealthRecord, AIAdvice } from '@/types/health';
import { getRecords } from '@/lib/storage';
import { getBMICategory } from '@/lib/bmi';
import { getLatestAdvice, saveAdvice } from '@/lib/advice-storage';
import { shouldGenerateAdvice, getRecent7DaysRecords, generateId } from '@/lib/ai';
import DataCard from '@/components/DataCard';
import TrendChart from '@/components/TrendChart';
import AdviceCard from '@/components/AdviceCard';

export default function DashboardPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [chartKey, setChartKey] = useState<'weight' | 'steps'>('weight');
  const [advice, setAdvice] = useState<AIAdvice | null>(null);
  const [adviceStatus, setAdviceStatus] = useState<
    'no-key' | 'insufficient' | 'loading' | 'ready' | 'error'
  >('insufficient');
  const [adviceGap, setAdviceGap] = useState(0);
  const [adviceError, setAdviceError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const recs = getRecords();
    setRecords(recs);
    checkAdviceStatus(recs);
  }, []);

  const checkAdviceStatus = useCallback((recs?: HealthRecord[]) => {
    const apiKey =
      typeof window !== 'undefined' ? localStorage.getItem('deepseek_api_key') : null;
    if (!apiKey) {
      setAdviceStatus('no-key');
      return;
    }

    const existing = getLatestAdvice();
    if (existing) {
      setAdvice(existing);
      setAdviceStatus('ready');
    }

    const { ready, gap } = shouldGenerateAdvice();
    if (!ready) {
      if (!existing) {
        setAdviceStatus('insufficient');
        setAdviceGap(gap);
      }
      return;
    }

    if (!existing) {
      setAdviceStatus('loading');
      generateAdvice(apiKey);
    }
  }, []);

  async function generateAdvice(apiKey: string) {
    if (generating) return;
    setGenerating(true);
    setAdviceStatus('loading');
    setAdviceError('');

    try {
      const recentRecords = getRecent7DaysRecords();
      const res = await fetch('/api/advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ records: recentRecords }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'API request failed');
      }

      const data = await res.json();
      const sorted = [...recentRecords].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const newAdvice: AIAdvice = {
        id: generateId(),
        startDate: sorted[0]?.date || '',
        endDate: sorted[sorted.length - 1]?.date || '',
        createdAt: new Date().toISOString(),
        summary: data.advice.summary,
        diet: data.advice.diet,
        exercise: data.advice.exercise,
        sleep: data.advice.sleep,
        rawResponse: JSON.stringify(data.advice),
      };
      saveAdvice(newAdvice);
      setAdvice(newAdvice);
      setAdviceStatus('ready');
    } catch (e) {
      setAdviceStatus('error');
      setAdviceError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setGenerating(false);
    }
  }

  function handleRetry() {
    const apiKey =
      typeof window !== 'undefined' ? localStorage.getItem('deepseek_api_key') : null;
    if (apiKey) generateAdvice(apiKey);
  }

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

      <AdviceCard
        status={adviceStatus}
        advice={advice}
        gap={adviceGap}
        errorMessage={adviceError}
        onRetry={handleRetry}
      />

      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold text-gray-800">趋势图</h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setChartKey('weight')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              chartKey === 'weight'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            体重
          </button>
          <button
            onClick={() => setChartKey('steps')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              chartKey === 'steps'
                ? 'bg-white text-indigo-500 shadow-sm'
                : 'text-gray-500'
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
