'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleTest() {
    setTestStatus('testing');
    setErrorMsg('');
    try {
      const res = await fetch('/api/advice', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setTestStatus('ok');
      } else {
        setTestStatus('fail');
        if (res.status === 401) {
          setErrorMsg('API Key 未配置');
        } else {
          setErrorMsg(`连接失败 (${res.status})`);
        }
      }
    } catch {
      setTestStatus('fail');
      setErrorMsg('网络错误');
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

        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
          <p>API Key 存储在服务端，不经过浏览器。</p>
          <p>
            在项目根目录的 <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">.env.local</code> 文件中设置：
          </p>
          <pre className="bg-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 overflow-x-auto">
            DEEPSEEK_API_KEY=sk-your-key-here
          </pre>
          <p>
            获取 Key：{' '}
            <a
              href="https://platform.deepseek.com"
              target="_blank"
              className="text-emerald-600 underline"
            >
              platform.deepseek.com
            </a>
          </p>
        </div>

        <button
          onClick={handleTest}
          disabled={testStatus === 'testing'}
          className="w-full py-2.5 text-sm font-medium rounded-xl border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testStatus === 'testing' ? '检测中...' : '测试连接'}
        </button>

        {testStatus === 'ok' && (
          <div className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            ✓ API Key 有效，服务正常
          </div>
        )}
        {testStatus === 'fail' && (
          <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            ✗ {errorMsg || '连接失败，请检查'}
          </div>
        )}
      </div>
    </div>
  );
}
