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
          获取 Key：{' '}
          <a
            href="https://platform.deepseek.com"
            target="_blank"
            className="text-emerald-600 underline"
          >
            platform.deepseek.com
          </a>
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
