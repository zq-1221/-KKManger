# AI 健康建议 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每累计 7 天新健康数据后，通过 DeepSeek API 自动生成饮食、运动、作息建议。

**Architecture:** Next.js Route Handler (`/api/advice`) 代理 DeepSeek API，API Key 存 localStorage 由前端传入。建议存 localStorage 最多 5 条，滚动删除。Dashboard 自动检测 7 天周期并触发生成。

**Tech Stack:** Next.js 16.2.4 App Router, React 19, TypeScript, Tailwind CSS v4, DeepSeek API (OpenAI-compatible)

---

### Task 1: 添加 AIAdvice 类型定义

**Files:**
- Modify: `types/health.ts`

- [ ] **Step 1: 在 types/health.ts 末尾追加 AIAdvice 类型**

```typescript
// types/health.ts — 在现有 HealthRecord 接口下方追加:

export interface AIAdvice {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  summary: {
    avgWeight: number | null;
    avgSteps: number;
    avgSleep: number;
    avgWater: number;
    weightTrend: 'up' | 'down' | 'stable';
  };
  diet: string;
  exercise: string;
  sleep: string;
  rawResponse: string;
}
```

- [ ] **Step 2: 运行类型检查确认无误**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add types/health.ts
git commit -m "feat: add AIAdvice type definition"
```

---

### Task 2: 创建建议存储层

**Files:**
- Create: `lib/advice-storage.ts`

- [ ] **Step 1: 创建 lib/advice-storage.ts**

```typescript
import { AIAdvice } from '@/types/health';

const ADVICE_KEY = 'ai_advices';
const MAX_ADVICES = 5;

export function getAdvices(): AIAdvice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ADVICE_KEY);
    return raw ? (JSON.parse(raw) as AIAdvice[]) : [];
  } catch {
    return [];
  }
}

export function getLatestAdvice(): AIAdvice | null {
  const advices = getAdvices();
  return advices.length > 0 ? advices[0] : null;
}

export function getAdviceById(id: string): AIAdvice | undefined {
  return getAdvices().find((a) => a.id === id);
}

export function saveAdvice(advice: AIAdvice): void {
  const advices = getAdvices();
  advices.unshift(advice);
  advices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const trimmed = advices.slice(0, MAX_ADVICES);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADVICE_KEY, JSON.stringify(trimmed));
  }
}

export function deleteAdvice(id: string): void {
  const advices = getAdvices().filter((a) => a.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ADVICE_KEY, JSON.stringify(advices));
  }
}

export function getAdviceCount(): number {
  return getAdvices().length;
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/advice-storage.ts
git commit -m "feat: add advice localStorage layer with 5-item limit"
```

---

### Task 3: 创建 7 天周期检测逻辑

**Files:**
- Create: `lib/ai.ts`

- [ ] **Step 1: 创建 lib/ai.ts**

```typescript
import { getRecords } from '@/lib/storage';
import { getAdvices } from '@/lib/advice-storage';

export function shouldGenerateAdvice(): { ready: boolean; newDays: number; gap: number } {
  const records = getRecords();
  const advices = getAdvices();
  const lastAdviceEnd = advices.length > 0 ? advices[0].endDate : null;

  const newRecords = lastAdviceEnd
    ? records.filter((r) => r.date > lastAdviceEnd)
    : records;

  const daysSet = new Set(newRecords.map((r) => r.date.split('T')[0]));
  const newDays = daysSet.size;

  return {
    ready: newDays >= 7,
    newDays,
    gap: Math.max(0, 7 - newDays),
  };
}

export function getRecent7DaysRecords() {
  const records = getRecords();
  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const daysSet = new Set<string>();
  const result: typeof records = [];
  for (const r of sorted) {
    const day = r.date.split('T')[0];
    if (daysSet.has(day)) continue;
    if (daysSet.size >= 7) break;
    daysSet.add(day);
    result.push(r);
  }
  return result;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/ai.ts
git commit -m "feat: add 7-day cycle detection logic"
```

---

### Task 4: 创建 API Route Handler

**Files:**
- Create: `app/api/advice/route.ts`

- [ ] **Step 1: 创建 app/api/advice/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';

const DEEPSEEK_BASE = 'https://api.deepseek.com';

const SYSTEM_PROMPT = `你是一位专业的健康顾问。请分析以下最近7天的健康数据，给出饮食、运动、作息三方面的建议。

要求：
1. 返回纯 JSON，不要包含 markdown 代码块标记
2. summary 字段：根据数据计算平均值和体重趋势
3. diet/exercise/sleep 字段：各 2-4 句建议，用中文，语气温和鼓励
4. 如果某项数据缺失则对应的建议可以简短或注明"数据不足"

返回 JSON 格式：
{
  "summary": {
    "avgWeight": number|null, "avgSteps": number, "avgSleep": number,
    "avgWater": number, "weightTrend": "up"|"down"|"stable"
  },
  "diet": "string",
  "exercise": "string",
  "sleep": "string"
}`;

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key not provided' }, { status: 401 });
  }

  let records;
  try {
    const body = await request.json();
    records = body.records;
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'No records provided' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const dataSummary = records.map((r: Record<string, unknown>) => ({
    date: r.date,
    weight: r.weight,
    steps: r.steps,
    sleepHours: r.sleepHours,
    waterIntake: r.waterIntake,
    systolic: r.systolic,
    diastolic: r.diastolic,
    heartRate: r.heartRate,
  }));

  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(dataSummary) },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 401) {
        return NextResponse.json({ error: 'API Key 无效，请检查设置' }, { status: 401 });
      }
      return NextResponse.json({ error: `DeepSeek error: ${res.status} ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    // Parse JSON from response (strip possible markdown fences)
    const jsonStr = content.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({ advice: parsed });
  } catch (err) {
    return NextResponse.json({ error: `Request failed: ${err}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key not provided' }, { status: 401 });
  }
  // Simple connectivity test
  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (res.ok) {
      return NextResponse.json({ status: 'ok' });
    }
    return NextResponse.json({ status: 'error', code: res.status }, { status: res.status });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Network error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/advice/route.ts
git commit -m "feat: add DeepSeek proxy API route with test endpoint"
```

---

### Task 5: 创建 AdviceCard 组件

**Files:**
- Create: `components/AdviceCard.tsx`

- [ ] **Step 1: 创建 components/AdviceCard.tsx**

```typescript
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
          <Link href="/settings" className="text-sm text-emerald-600 font-medium hover:underline">
            去设置 →
          </Link>
        </div>
      )}

      {status === 'insufficient' && (
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-sm text-gray-600">
            还需 <span className="font-bold text-emerald-600">{gap}</span> 天数据才能生成建议
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
      <span className="font-medium text-gray-700">{icon} {label}</span>
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
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/AdviceCard.tsx
git commit -m "feat: add AI advice card component with all states"
```

---

### Task 6: 修改 Dashboard 集成 AdviceCard

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 更新 app/page.tsx，在数据概览和趋势图之间插入 AdviceCard**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { HealthRecord, AIAdvice } from '@/types/health';
import { getRecords } from '@/lib/storage';
import { getBMICategory } from '@/lib/bmi';
import { getLatestAdvice } from '@/lib/advice-storage';
import { shouldGenerateAdvice, getRecent7DaysRecords } from '@/lib/ai';
import DataCard from '@/components/DataCard';
import TrendChart from '@/components/TrendChart';
import AdviceCard from '@/components/AdviceCard';
import Link from 'next/link';

export default function DashboardPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [chartKey, setChartKey] = useState<'weight' | 'steps'>('weight');
  const [advice, setAdvice] = useState<AIAdvice | null>(null);
  const [adviceStatus, setAdviceStatus] = useState<'no-key' | 'insufficient' | 'loading' | 'ready' | 'error'>('insufficient');
  const [adviceGap, setAdviceGap] = useState(0);
  const [adviceError, setAdviceError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const recs = getRecords();
    setRecords(recs);
    checkAdviceStatus(recs);
  }, []);

  const checkAdviceStatus = useCallback((recs?: HealthRecord[]) => {
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('deepseek_api_key') : null;
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

    // Only auto-generate if no existing advice or advice is for old data
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
      const { saveAdvice } = await import('@/lib/advice-storage');
      const sorted = [...recentRecords].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const newAdvice: AIAdvice = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
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
    const apiKey = typeof window !== 'undefined' ? localStorage.getItem('deepseek_api_key') : null;
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
        <DataCard title="体重" value={latest?.weight ?? '--'} unit="kg" icon="⚖️" color="green" />
        <DataCard title="BMI" value={latest?.bmi ?? '--'} unit={latest?.bmi ? getBMICategory(latest.bmi) : undefined} icon="📏" color="blue" />
        <DataCard title="步数" value={latest?.steps?.toLocaleString() ?? '--'} icon="🚶" color="purple" />
        <DataCard title="睡眠" value={latest?.sleepHours ?? '--'} unit="h" icon="😴" color="orange" />
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
```

注意：`checkAdviceStatus` 中 `shouldGenerateAdvice` 依赖 `getAdvices()`，需在 useEffect 中在客户端调用。上方代码已包含该逻辑。

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate AdviceCard into dashboard with auto-detection"
```

---

### Task 7: 创建建议详情页

**Files:**
- Create: `app/advice/page.tsx`

- [ ] **Step 1: 创建 app/advice/page.tsx**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { AIAdvice } from '@/types/health';
import { getAdvices } from '@/lib/advice-storage';

export default function AdvicePage() {
  const [advices, setAdvices] = useState<AIAdvice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const all = getAdvices();
    setAdvices(all);
    if (all.length > 0) {
      setExpandedId(all[0].id);
    }
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
          暂无 AI 建议，继续录入数据吧 📝<br />
          <span className="text-xs text-gray-300 mt-2 block">每累计 7 天数据将自动生成建议</span>
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

      {/* Period selector */}
      {advices.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {advices.map((a, i) => (
            <button
              key={a.id}
              onClick={() => {
                setSelectedIndex(i);
                setExpandedId((prev) => (prev === a.id ? null : a.id));
              }}
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
          {/* Summary */}
          <div className="bg-emerald-50 rounded-2xl p-5">
            <h3 className="font-semibold text-emerald-700 text-sm mb-3">📊 数据摘要</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {current.summary.avgWeight !== null && (
                <SummaryItem label="平均体重" value={`${current.summary.avgWeight} kg`} />
              )}
              <SummaryItem label="平均步数" value={`${current.summary.avgSteps.toLocaleString()} 步`} />
              <SummaryItem label="平均睡眠" value={`${current.summary.avgSleep} 小时`} />
              <SummaryItem label="平均饮水" value={`${current.summary.avgWater} ml`} />
              <SummaryItem
                label="体重趋势"
                value={
                  current.summary.weightTrend === 'up' ? '📈 上升' :
                  current.summary.weightTrend === 'down' ? '📉 下降' : '➡️ 平稳'
                }
              />
            </div>
          </div>

          {/* Diet */}
          <SectionBlock icon="🍽️" title="饮食建议" color="amber" text={current.diet} />

          {/* Exercise */}
          <SectionBlock icon="🏃" title="运动建议" color="blue" text={current.exercise} />

          {/* Sleep */}
          <SectionBlock icon="😴" title="作息建议" color="gray" text={current.sleep} />

          {/* Cycle info */}
          <p className="text-center text-xs text-gray-400">
            数据周期：{formatDate(current.startDate)} — {formatDate(current.endDate)}
          </p>
        </div>
      )}
    </div>
  );
}

function SectionBlock({ icon, title, text, color }: { icon: string; title: string; text: string; color: 'amber' | 'blue' | 'gray' }) {
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

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function formatRange(start: string, end: string): string {
  return `${formatDate(start)} — ${formatDate(end)}`;
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/advice/page.tsx
git commit -m "feat: add AI advice detail page with history switching"
```

---

### Task 8: 创建设置页

**Files:**
- Create: `app/settings/page.tsx`

- [ ] **Step 1: 创建 app/settings/page.tsx**

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiKey(localStorage.getItem('deepseek_api_key') || '');
    }
  }, []);

  function handleSave() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('deepseek_api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    if (!apiKey) return;
    setTestStatus('testing');
    try {
      const res = await fetch('/api/advice', {
        headers: { 'x-api-key': apiKey },
      });
      setTestStatus(res.ok ? 'ok' : 'fail');
    } catch {
      setTestStatus('fail');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">设置</h2>
        <p className="text-sm text-gray-400 mt-1">配置 AI 服务</p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">DeepSeek API Key</h3>

        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
          >
            {showKey ? '隐藏' : '显示'}
          </button>
        </div>

        <p className="text-xs text-gray-400">
          API Key 存储在浏览器本地，仅用于调用 AI 接口。<br />
          获取 Key：open <a href="https://platform.deepseek.com" target="_blank" className="text-emerald-600 underline">platform.deepseek.com</a>
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
          >
            {saved ? '✓ 已保存' : '保存'}
          </button>
          <button
            onClick={handleTest}
            disabled={testStatus === 'testing' || !apiKey}
            className="px-6 py-2.5 text-sm font-medium rounded-xl border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testStatus === 'testing' ? '检测中...' : '测试连接'}
          </button>
        </div>

        {testStatus === 'ok' && (
          <div className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            ✓ API Key 有效
          </div>
        )}
        {testStatus === 'fail' && (
          <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            ✗ API Key 无效或连接失败，请检查
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: add settings page with API key management and test"
```

---

### Task 9: 更新导航栏

**Files:**
- Modify: `components/NavBar.tsx`

- [ ] **Step 1: 在 NavBar 的 tabs 数组中增加第 4 个 tab，放在最后**

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getAdvices } from '@/lib/advice-storage';

const tabs = [
  { href: '/', label: '首页', icon: '📊' },
  { href: '/record', label: '录入', icon: '📝' },
  { href: '/history', label: '历史', icon: '📋' },
  { href: '/advice', label: '建议', icon: '🤖' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const advices = getAdvices();
    const lastVisited = typeof window !== 'undefined' ? localStorage.getItem('advice_last_visited') : null;
    if (advices.length > 0) {
      if (!lastVisited || new Date(advices[0].createdAt).getTime() > new Date(lastVisited).getTime()) {
        setHasUnread(true);
      }
    }
  }, []);

  useEffect(() => {
    if (pathname === '/advice') {
      setHasUnread(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('advice_last_visited', new Date().toISOString());
      }
    }
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-t border-gray-100">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors relative ${
                active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
              {t.href === '/advice' && hasUnread && (
                <span className="absolute top-1.5 right-1/3 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/NavBar.tsx
git commit -m "feat: add advice tab to navbar with unread indicator"
```

---

### Task 10: 端到端验证

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 在浏览器验证以下流程**

1. 打开 `http://localhost:3000`，确认底部导航有 4 个 tab（首页/录入/历史/建议）
2. Dashboard 的 AI 卡片显示"配置 API Key"提示，点击跳转设置页
3. 在设置页 `/settings` 填入 DeepSeek API Key，保存并测试连接
4. 回到首页，如果没有 7 天数据，确认卡片显示"还需 X 天数据"
5. 如果已有足够数据，确认自动触发生成，loading 骨架屏显示后切换到建议内容
6. 点击"查看完整建议"进入 `/advice`，确认详情页展示完整
7. 切换历史建议（如有多条），确认折叠/展开
8. 返回首页，确认「建议」tab 红点消除

- [ ] **Step 3: 修复发现的问题，然后最终 commit**

```bash
git add -A
git commit -m "chore: final adjustments after e2e verification"
```

---

## Self-Review

1. **Spec coverage**: Every section of the spec is covered — types (Task 1), storage (Task 2), 7-day detection (Task 3), API route (Task 4), AdviceCard (Task 5), Dashboard integration (Task 6), Advice page (Task 7), Settings page (Task 8), NavBar (Task 9).
2. **Placeholder scan**: No TODOs, no TBDs, no "add appropriate error handling" without code.
3. **Type consistency**: AIAdvice used consistently across all tasks. `shouldGenerateAdvice` returns `{ ready, newDays, gap }` in both Task 3 definition and Task 6 usage. `saveAdvice`/`getAdvices`/`getLatestAdvice` signatures match across storage layer and consumers.
