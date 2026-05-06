'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, loading, logout, refresh } = useAuth();
  const router = useRouter();

  // Edit name state
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState('');

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // AI test state
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');

  function startEditName() {
    setName(user?.name || '');
    setNameMsg('');
    setEditingName(true);
  }

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameMsg('名称至少需要2个字符');
      return;
    }
    if (trimmed === user?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    setNameMsg('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json();
        setNameMsg(err.error || '保存失败');
      } else {
        setEditingName(false);
        await refresh();
      }
    } catch {
      setNameMsg('网络错误');
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword) {
      setPasswordMsg({ type: 'err', text: '请输入当前密码' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'err', text: '新密码至少需要6个字符' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: '两次输入的新密码不一致' });
      return;
    }
    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ type: 'err', text: data.error || '修改失败' });
      } else {
        setPasswordMsg({ type: 'ok', text: '密码修改成功' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordMsg({ type: 'err', text: '网络错误' });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  async function handleTestAI() {
    setTestStatus('testing');
    setTestMsg('');
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        setTestStatus('ok');
      } else {
        setTestStatus('fail');
        if (res.status === 401) {
          setTestMsg('API Key 未配置');
        } else {
          const err = await res.json().catch(() => ({}));
          setTestMsg(err.error || `连接失败 (${res.status})`);
        }
      }
    } catch {
      setTestStatus('fail');
      setTestMsg('网络错误');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">个人中心</h2>
        <p className="text-sm text-gray-400 mt-1">管理账户和设置</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">个人信息</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Avatar + email */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    className="flex-1 px-3 py-1.5 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    autoFocus
                    maxLength={32}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="text-xs font-medium text-white bg-emerald-500 px-3 py-1.5 rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex-shrink-0"
                  >
                    {savingName ? '保存中' : '保存'}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 flex-shrink-0"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-gray-800 truncate">{user?.name}</p>
                    <button
                      onClick={startEditName}
                      className="text-xs text-gray-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                    >
                      ✎ 编辑
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{user?.email}</p>
                </>
              )}
              {nameMsg && (
                <p className="text-xs text-red-500 mt-1">{nameMsg}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">修改密码</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">当前密码</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
              placeholder="输入当前密码"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
              placeholder="至少6个字符"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
              placeholder="再次输入新密码"
            />
          </div>

          {passwordMsg && (
            <div
              className={`rounded-xl px-4 py-2.5 text-sm ${
                passwordMsg.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {passwordMsg.text}
            </div>
          )}

          <button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="w-full py-2.5 text-sm font-medium rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {savingPassword ? '保存中...' : '修改密码'}
          </button>
        </div>
      </div>

      {/* AI config card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">AI 服务配置</h3>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
            <p>AI 顾问功能使用 DeepSeek API，API Key 存储在服务端。</p>
            <p>
              在项目根目录的{' '}
              <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">.env.local</code>{' '}
              文件中设置：
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
            onClick={handleTestAI}
            disabled={testStatus === 'testing'}
            className="w-full py-2.5 text-sm font-medium rounded-xl border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            {testStatus === 'testing' ? '检测中...' : '测试连接'}
          </button>

          {testStatus === 'ok' && (
            <div className="bg-emerald-50 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              ✓ API Key 有效，服务正常
            </div>
          )}
          {testStatus === 'fail' && (
            <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
              ✗ {testMsg || '连接失败，请检查'}
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 text-sm font-medium text-red-500 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-red-50 hover:border-red-100 transition-colors"
      >
        退出登录
      </button>
    </div>
  );
}
