'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage, AIAdvice } from '@/types/health';
import { saveAdvice } from '@/lib/advice-storage';
import {
  getCurrentSession,
  saveSession,
  createSession,
} from '@/lib/chat-storage';
import { buildHealthContext, getRecent7DaysRecords, generateId } from '@/lib/ai';
import MarkdownRenderer from '@/components/MarkdownRenderer';

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
      const records = getRecent7DaysRecords();
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
        setMessages(messages);
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
      setMessages(messages);
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
            <div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 via-emerald-200 to-teal-200 flex items-center justify-center text-5xl shadow-lg shadow-emerald-100"
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
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
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

      {/* Input area - sticky bottom */}
      <div className="sticky bottom-0 bg-[#fefcf7]/90 backdrop-blur-sm pt-2 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 flex items-center bg-gray-50 rounded-full px-5 py-2.5 border border-gray-200 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 focus-within:bg-white transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="描述您的症状或健康问题..."
              disabled={loading}
              className="flex-1 border-none bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-300"
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
          <MarkdownRenderer content={content} />
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
