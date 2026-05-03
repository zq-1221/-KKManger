# AI Health Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a conversational AI health advisor chatbot that replaces the current `/advice` page, integrating the existing weekly report feature.

**Architecture:** Free-form chat with health data injection. Each request sends recent chat history + health context summary to `/api/chat`, which proxies to DeepSeek. Chat sessions persist to `localStorage`. Weekly reports are generated on-demand via a quick-action button.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, recharts (existing), DeepSeek API, localStorage.

---

### Task 1: Add ChatMessage and ChatSession types

**Files:**
- Modify: `types/health.ts`

- [ ] **Step 1: Append new types to types/health.ts**

```ts
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  isWeeklyReport?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Verify type check passes**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add types/health.ts
git commit -m "feat: add ChatMessage and ChatSession types"
```

---

### Task 2: Create chat storage module

**Files:**
- Create: `lib/chat-storage.ts`

- [ ] **Step 1: Write chat-storage.ts**

```ts
import { ChatSession } from '@/types/health';

const STORAGE_KEY = 'chat_sessions';
const MAX_SESSIONS = 10;
const MAX_MESSAGES = 50;

export function getSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

export function getCurrentSession(): ChatSession | null {
  const sessions = getSessions();
  return sessions.length > 0 ? sessions[0] : null;
}

export function saveSession(session: ChatSession): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  const trimmed = sessions.slice(0, MAX_SESSIONS);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export function addMessage(sessionId: string, message: ChatMessage): ChatSession | null {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;
  sessions[idx].messages.push(message);
  if (sessions[idx].messages.length > MAX_MESSAGES) {
    sessions[idx].messages = sessions[idx].messages.slice(-MAX_MESSAGES);
  }
  sessions[idx].updatedAt = new Date().toISOString();
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
  return sessions[idx];
}

export function createSession(title: string): ChatSession {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();
  return { id, title, messages: [], createdAt: now, updatedAt: now };
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
}
```

- [ ] **Step 2: Verify type check passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/chat-storage.ts
git commit -m "feat: add chat storage module"
```

---

### Task 3: Create `/api/chat` route

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Write the API route**

```ts
import { NextRequest, NextResponse } from 'next/server';

const DEEPSEEK_BASE = 'https://api.deepseek.com';

const SYSTEM_PROMPT = `你是一位专业、温和的健康顾问，名字叫"康康"。你的职责是：

1. 结合用户提供的健康数据（如有），给出个性化分析和建议
2. 根据用户描述的症状，推断可能相关的健康问题，列出多种可能，但绝不做确定性诊断
3. 建议分层次给出：生活习惯调整 → 饮食营养建议 → 何时应就医
4. 检测到紧急症状（胸痛、呼吸困难、严重出血、突然剧烈头痛、意识模糊等）时，首先明确建议立即就医或拨打120
5. 如果用户请求生成周报，返回一份完整的健康周报

约束：
- 中文回复，语气温暖、专业、不制造焦虑
- 始终提醒用户"本建议仅供参考，不能替代专业医疗诊断"
- 如果用户健康数据不足，坦诚告知并给出通用建议
- 回复简洁有条理，避免过长段落

如果你判断用户在请求生成周报，请按以下 JSON 格式返回（不要包含markdown标记）：
{
  "weeklyReport": true,
  "summary": {
    "avgWeight": number|null, "avgSteps": number, "avgSleep": number,
    "avgWater": number, "weightTrend": "up"|"down"|"stable"
  },
  "diet": "饮食建议 2-4 句",
  "exercise": "运动建议 2-4 句",
  "sleep": "作息建议 2-4 句"
}`;

function getApiKey(request: NextRequest): string | null {
  return process.env.DEEPSEEK_API_KEY || request.headers.get('x-api-key') || null;
}

function buildHealthContextText(ctx: Record<string, unknown>): string {
  const hasData = ctx.hasData;
  if (!hasData) {
    return '用户暂无健康数据记录，请给出通用建议，并建议用户定期录入健康指标以获得更精准的分析。';
  }
  const parts: string[] = ['以下是用户最近的健康数据摘要：'];
  if (ctx.latestWeight != null) parts.push(`- 最近体重：${ctx.latestWeight} kg`);
  if (ctx.latestBMI != null) parts.push(`- 最近 BMI：${ctx.latestBMI}`);
  if (ctx.recentBP) {
    const bp = ctx.recentBP as { systolic: number; diastolic: number }[];
    if (bp.length > 0) {
      const latest = bp[bp.length - 1];
      parts.push(`- 最近血压：收缩压 ${latest.systolic} / 舒张压 ${latest.diastolic} mmHg`);
    }
  }
  if (ctx.avgSleep != null) parts.push(`- 近期平均睡眠：${ctx.avgSleep} 小时`);
  if (ctx.avgSteps != null) parts.push(`- 近期日均步数：${ctx.avgSteps} 步`);
  if (ctx.avgWater != null) parts.push(`- 近期平均饮水：${ctx.avgWater} ml`);
  parts.push('\n请在回答中引用相关数据，使建议更个性化。');
  return parts.join('\n');
}

export async function POST(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key not configured' }, { status: 401 });
  }

  let messages: { role: string; content: string }[];
  let healthContext: Record<string, unknown>;
  try {
    const body = await request.json();
    messages = body.messages as { role: string; content: string }[];
    healthContext = (body.healthContext as Record<string, unknown>) || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const healthText = buildHealthContextText(healthContext);
  const apiMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: healthText },
    ...messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        return NextResponse.json({ error: 'API Key 无效，请检查设置' }, { status: 401 });
      }
      return NextResponse.json({ error: `DeepSeek error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    // Check if AI returned a weekly report JSON
    let weeklyReport = null;
    const jsonMatch = content.match(/\{[\s\S]*"weeklyReport"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        weeklyReport = JSON.parse(jsonMatch[0]);
      } catch { /* not JSON, treat as regular reply */ }
    }

    return NextResponse.json({
      reply: {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        role: 'assistant',
        content,
        createdAt: new Date().toISOString(),
      },
      weeklyReport: weeklyReport?.weeklyReport ? weeklyReport : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Request failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key not configured' }, { status: 401 });
  }
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

- [ ] **Step 2: Verify the route compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add /api/chat route with health context injection"
```

---

### Task 4: Delete old `/api/advice` route

**Files:**
- Delete: `app/api/advice/route.ts`

- [ ] **Step 1: Remove the file**

Run: `rm app/api/advice/route.ts`

- [ ] **Step 2: Verify nothing breaks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/advice/route.ts
git commit -m "refactor: remove /api/advice, merged into /api/chat"
```

---

### Task 5: Clean up `lib/ai.ts`

**Files:**
- Modify: `lib/ai.ts`

- [ ] **Step 1: Remove shouldGenerateAdvice, keep getRecent7DaysRecords and generateId**

Replace the file content:

```ts
import { getRecords } from '@/lib/storage';

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

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function buildHealthContext(records: ReturnType<typeof getRecords>) {
  if (records.length === 0) return { hasData: false };

  const weights = records.filter((r) => r.weight != null).map((r) => r.weight!);
  const bmis = records.filter((r) => r.bmi != null).map((r) => r.bmi!);
  const bpRecords = records
    .filter((r) => r.systolic != null && r.diastolic != null)
    .map((r) => ({ systolic: r.systolic!, diastolic: r.diastolic! }));
  const sleepHours = records.filter((r) => r.sleepHours != null).map((r) => r.sleepHours!);
  const steps = records.filter((r) => r.steps != null).map((r) => r.steps!);
  const waters = records.filter((r) => r.waterIntake != null).map((r) => r.waterIntake!);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    hasData: true,
    latestWeight: weights.length > 0 ? weights[weights.length - 1] : null,
    latestBMI: bmis.length > 0 ? bmis[bmis.length - 1] : null,
    recentBP: bpRecords.slice(-7),
    avgSleep: sleepHours.length > 0 ? Math.round(avg(sleepHours) * 10) / 10 : null,
    avgSteps: steps.length > 0 ? Math.round(avg(steps)) : null,
    avgWater: waters.length > 0 ? Math.round(avg(waters)) : null,
  };
}
```

- [ ] **Step 2: Verify type check passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/ai.ts
git commit -m "refactor: remove shouldGenerateAdvice, add buildHealthContext"
```

---

### Task 6: Rewrite `/advice` page as chat interface

**Files:**
- Modify: `app/advice/page.tsx`

- [ ] **Step 1: Write the chat page**

```tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, AIAdvice } from '@/types/health';
import { getRecords } from '@/lib/storage';
import { getAdvices, saveAdvice } from '@/lib/advice-storage';
import {
  getCurrentSession,
  saveSession,
  addMessage,
  createSession,
} from '@/lib/chat-storage';
import { buildHealthContext, getRecent7DaysRecords, generateId } from '@/lib/ai';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing session on mount
  useEffect(() => {
    const session = getCurrentSession();
    if (session && session.messages.length > 0) {
      setSessionId(session.id);
      setMessages(session.messages);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist messages whenever they change (skip initial load)
  const prevLenRef = useRef(0);
  useEffect(() => {
    if (messages.length === 0) return;
    if (messages.length === prevLenRef.current) return;
    prevLenRef.current = messages.length;

    if (!sessionId) {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 30)
        : '新对话';
      const newSession = createSession(title);
      newSession.messages = messages;
      newSession.updatedAt = new Date().toISOString();
      setSessionId(newSession.id);
      saveSession(newSession);
    } else {
      const existing = getCurrentSession();
      if (existing && existing.id === sessionId) {
        existing.messages = messages;
        existing.updatedAt = new Date().toISOString();
        saveSession(existing);
      }
    }
  }, [messages, sessionId]);

  async function sendMessage(content?: string) {
    const text = content || input.trim();
    if (!text || loading) return;

    setInput('');
    setError('');

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const records = getRecords();
      const healthContext = buildHealthContext(records);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          healthContext,
        }),
      });

      if (res.status === 401) {
        setError('API Key 未配置，请在 .env.local 中设置 DEEPSEEK_API_KEY');
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '请求失败');
      }

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: data.reply.id,
        role: 'assistant',
        content: data.reply.content,
        createdAt: data.reply.createdAt,
        isWeeklyReport: !!data.weeklyReport,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If weekly report, also save to advice-storage
      if (data.weeklyReport) {
        const recentRecords = getRecent7DaysRecords();
        const sorted = [...recentRecords].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const advice: AIAdvice = {
          id: generateId(),
          startDate: sorted[0]?.date || '',
          endDate: sorted[sorted.length - 1]?.date || '',
          createdAt: new Date().toISOString(),
          summary: data.weeklyReport.summary,
          diet: data.weeklyReport.diet,
          exercise: data.weeklyReport.exercise,
          sleep: data.weeklyReport.sleep,
          rawResponse: JSON.stringify(data.weeklyReport),
        };
        saveAdvice(advice);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickAction(action: string) {
    if (action === 'weekly') {
      sendMessage('请为我生成最近7天的健康周报');
    } else if (action === 'symptom') {
      setInput('我最近感觉');
    } else if (action === 'summary') {
      sendMessage('请帮我总结一下我目前的整体健康状况');
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 180px)' }}>
      {/* Page title */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">AI 健康顾问</h2>
          <p className="text-sm text-gray-400 mt-0.5">基于您的健康数据，提供个性化分析</p>
        </div>
        <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
          DeepSeek
        </span>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 px-3 py-2.5 mb-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 leading-relaxed">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[11px]">
          ℹ️
        </span>
        AI 顾问提供的内容仅供参考，不构成医疗诊断。如有严重症状或紧急情况，请及时就医。
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => handleQuickAction('weekly')}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-200 hover:shadow-md hover:shadow-emerald-200 transition-all disabled:opacity-50"
        >
          📊 生成周报
        </button>
        <button
          onClick={() => handleQuickAction('symptom')}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-all disabled:opacity-50"
        >
          💊 分析症状
        </button>
        <button
          onClick={() => handleQuickAction('summary')}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-all disabled:opacity-50"
        >
          📋 健康摘要
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <span className="flex-shrink-0">✗</span>
          {error}
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 space-y-4 pb-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 via-emerald-200 to-teal-200 flex items-center justify-center text-5xl shadow-lg shadow-emerald-100 animate-[float_3s_ease-in-out_infinite]"
              style={{
                animationName: 'float',
                animationDuration: '3s',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
              }}
            >
              🩺
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">您好，我是您的健康顾问</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                告诉我您的身体状况或不适症状，我会结合您的健康数据给出个性化分析和建议。
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              <button
                onClick={() => setInput('我最近总是头晕、没精神，怎么回事？')}
                className="flex items-center gap-2.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-2xl px-4 py-3 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-all text-left"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                我最近总是头晕、没精神...
              </button>
              <button
                onClick={() => handleQuickAction('summary')}
                className="flex items-center gap-2.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-2xl px-4 py-3 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-all text-left"
              >
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                帮我分析最近的血压情况
              </button>
              <button
                onClick={() => setInput('晚上总是睡不好怎么办？')}
                className="flex items-center gap-2.5 text-sm text-gray-500 bg-white border border-gray-200 rounded-2xl px-4 py-3 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-all text-left"
              >
                <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                晚上睡不好怎么办？
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id}>
              {msg.isWeeklyReport ? (
                <WeeklyReportCard content={msg.content} />
              ) : (
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-[20px_20px_4px_20px] shadow-sm shadow-emerald-200'
                        : 'bg-white text-gray-800 rounded-[20px_20px_20px_4px] border border-gray-100 shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  <span className="text-[11px] text-gray-300 mt-1 px-2">
                    {new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start">
            <div className="flex items-center gap-1.5 px-4 py-3.5 bg-white rounded-[20px_20px_20px_4px] border border-gray-100 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area - fixed bottom */}
      <div className="sticky bottom-0 bg-cream/90 backdrop-blur-sm pt-2 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 flex items-center bg-gray-50 rounded-full px-5 py-2.5 border border-gray-200 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 focus-within:bg-white transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="描述您的症状或健康问题..."
              disabled={loading}
              className="flex-1 border-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-300 font-sans"
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-200 hover:scale-105 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function WeeklyReportCard({ content }: { content: string }) {
  // Try to extract JSON from the AI response
  let report: {
    summary?: { avgWeight?: number | null; avgSteps?: number; avgSleep?: number; avgWater?: number; weightTrend?: string };
    diet?: string;
    exercise?: string;
    sleep?: string;
  } | null = null;
  try {
    const match = content.match(/\{[\s\S]*"weeklyReport"[\s\S]*\}/);
    if (match) report = JSON.parse(match[0]);
  } catch { /* not JSON */ }

  if (!report?.summary) {
    // Fallback: render as regular AI message
    return (
      <div className="flex flex-col items-start">
        <div className="max-w-[75%] px-4 py-3 text-sm leading-relaxed bg-white text-gray-800 rounded-[20px_20px_20px_4px] border border-gray-100 shadow-sm">
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    );
  }

  const trendLabel =
    report.summary.weightTrend === 'up' ? '📈 上升' :
    report.summary.weightTrend === 'down' ? '📉 下降' : '➡️ 平稳';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-[90%]">
      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-5 py-3.5 flex items-center gap-2.5">
        <span>📊</span>
        <span className="text-sm font-semibold text-emerald-700">本周健康周报</span>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-4 gap-3 mb-4">
          {report.summary.avgWeight != null && (
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-base font-bold text-gray-800">{report.summary.avgWeight} <span className="text-xs font-normal">kg</span></div>
              <div className="text-[10px] text-gray-400 mt-0.5">平均体重</div>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-base font-bold text-gray-800">{report.summary.avgSteps?.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">日均步数</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-base font-bold text-gray-800">{report.summary.avgSleep} <span className="text-xs font-normal">h</span></div>
            <div className="text-[10px] text-gray-400 mt-0.5">平均睡眠</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="text-base font-bold text-emerald-600">{trendLabel ? trendLabel.split(' ')[0] : '--'}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">体重趋势</div>
          </div>
        </div>
        {report.diet && (
          <div className="py-2.5 border-t border-gray-100 text-sm leading-relaxed text-gray-600">
            <span className="font-semibold text-gray-700">🍽️ 饮食建议 </span>
            {report.diet}
          </div>
        )}
        {report.exercise && (
          <div className="py-2.5 border-t border-gray-100 text-sm leading-relaxed text-gray-600">
            <span className="font-semibold text-gray-700">🏃 运动建议 </span>
            {report.exercise}
          </div>
        )}
        {report.sleep && (
          <div className="py-2.5 border-t border-gray-100 text-sm leading-relaxed text-gray-600">
            <span className="font-semibold text-gray-700">😴 作息建议 </span>
            {report.sleep}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type check passes**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/advice/page.tsx
git commit -m "feat: rewrite /advice as AI health chat interface"
```

---

### Task 7: Remove AdviceCard from dashboard

**Files:**
- Delete: `components/AdviceCard.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Delete AdviceCard.tsx**

Run: `rm components/AdviceCard.tsx`

- [ ] **Step 2: Strip AdviceCard from app/page.tsx**

Remove these imports:
```tsx
// DELETE these lines:
import { getLatestAdvice, saveAdvice } from '@/lib/advice-storage';
import { shouldGenerateAdvice, getRecent7DaysRecords, generateId } from '@/lib/ai';
import AdviceCard from '@/components/AdviceCard';
```

Remove these state variables:
```tsx
// DELETE these lines:
const [advice, setAdvice] = useState<AIAdvice | null>(null);
const [adviceStatus, setAdviceStatus] = useState<
  'no-key' | 'insufficient' | 'loading' | 'ready' | 'error'
>('insufficient');
const [adviceGap, setAdviceGap] = useState(0);
const [adviceError, setAdviceError] = useState('');
const [generating, setGenerating] = useState(false);
```

Remove `checkAdviceStatus`, `generateAdvice`, `handleRetry` functions. Remove `advice` from the `AIAdvice` import (which is now unused in this file).

Remove the `<AdviceCard ... />` JSX block.

- [ ] **Step 3: Verify no unused imports remain**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/AdviceCard.tsx app/page.tsx
git commit -m "refactor: remove AdviceCard from dashboard"
```

---

### Task 8: Update NavBar label

**Files:**
- Modify: `components/NavBar.tsx`

- [ ] **Step 1: Change the advice tab label**

In the `tabs` array, change:
```tsx
// OLD:
{ href: '/advice', label: '建议', icon: '🤖' },
// NEW:
{ href: '/advice', label: 'AI 顾问', icon: '🤖' },
```

Also remove the `hasUnread` state and the two `useEffect` hooks related to tracking advice read status — this feature no longer applies since the chat page doesn't use auto-generated advice.

Remove the import of `getAdvices`:
```tsx
// DELETE:
import { getAdvices } from '@/lib/advice-storage';
```

Remove the unread dot indicator:
```tsx
// DELETE:
const [hasUnread, setHasUnread] = useState(false);

// DELETE first useEffect entirely
// DELETE second useEffect entirely

// DELETE the unread dot from the Link:
{t.href === '/advice' && hasUnread && (
  <span className="absolute top-1.5 right-1/3 w-2 h-2 bg-red-500 rounded-full" />
)}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/NavBar.tsx
git commit -m "refactor: rename advice tab to AI 顾问, remove unread dot"
```

---

### Task 9: Add keyframe animation to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add float keyframe**

Append to `app/globals.css`:

```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add float keyframe for welcome animation"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: server starts on http://localhost:3000

- [ ] **Step 2: Verify pages load without errors**

Open in browser:
- `http://localhost:3000/` — Dashboard should load without AdviceCard
- `http://localhost:3000/advice` — Chat page should load with welcome empty state
- `http://localhost:3000/history` — Should work as before
- `http://localhost:3000/record` — Should work as before
- `http://localhost:3000/settings` — Should work as before

- [ ] **Step 3: Test chat flow**

1. Send a message in the chat
2. Verify user bubble appears
3. Verify typing indicator shows
4. Verify AI response appears
5. Refresh the page → chat history should persist

- [ ] **Step 4: Test quick actions**

1. Click "📊 生成周报" → should trigger auto-send
2. Click "💊 分析症状" → should set input text
3. Click "📋 健康摘要" → should trigger auto-send

- [ ] **Step 5: Run final type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit any remaining changes**

```bash
git status
# If any files need committing:
git add -A
git commit -m "chore: final tweaks after verification"
```
