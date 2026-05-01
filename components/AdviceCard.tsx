'use client';

import Link from 'next/link';
import { AIAdvice } from '@/types/health';

type Status = 'no-key' | 'insufficient' | 'loading' | 'ready' | 'error';

interface AdviceCardProps {
  status: Status;
  advice: AIAdvice | null;
  gap: number;
  errorMessage?: string;
  onRetry: () => void;
}

export default function AdviceCard({ status, advice, gap, errorMessage, onRetry }: AdviceCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🤖</span>
        <h3 className="text-sm font-semibold text-gray-700">AI 健康建议</h3>
        {advice && (
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {formatDateRange(advice.startDate, advice.endDate)}
          </span>
        )}
      </div>

      {status === 'no-key' && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-2">配置 API Key 以获取 AI 建议</p>
          <Link
            href="/settings"
            className="text-sm text-emerald-600 font-medium hover:underline"
          >
            去设置 →
          </Link>
        </div>
      )}

      {status === 'insufficient' && (
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-sm text-gray-600">
            还需{' '}
            <span className="font-bold text-emerald-600">{gap}</span>{' '}
            天数据才能生成建议
          </p>
          <div className="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, ((7 - gap) / 7) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="space-y-3 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      )}

      {status === 'ready' && advice && (
        <div className="space-y-2">
          <AdviceLine icon="🍽️" label="饮食" text={firstSentence(advice.diet)} />
          <AdviceLine icon="🏃" label="运动" text={firstSentence(advice.exercise)} />
          <AdviceLine icon="😴" label="作息" text={firstSentence(advice.sleep)} />
          <div className="text-right pt-2">
            <Link
              href="/advice"
              className="text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
            >
              查看完整建议 →
            </Link>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-3">
          <p className="text-sm text-red-500 mb-2">{errorMessage || '生成建议失败'}</p>
          <button
            onClick={onRetry}
            className="text-sm text-emerald-600 font-medium bg-emerald-50 px-4 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
}

function AdviceLine({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <p className="text-sm text-gray-600 leading-relaxed">
      <span className="font-medium text-gray-700">
        {icon} {label}
      </span>
      ：{text}
    </p>
  );
}

function firstSentence(text: string): string {
  const idx = text.search(/[。.！!]/);
  return idx > 0 ? text.slice(0, idx + 1) : text.slice(0, 40);
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };
  return `${fmt(start)} — ${fmt(end)}`;
}
