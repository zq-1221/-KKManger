'use client';

import { useAuth } from '@/components/AuthProvider';
import { usePathname } from 'next/navigation';

export default function HeaderBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/register';
  if (isAuthPage) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🩺</span>
          <h1 className="text-lg font-bold text-emerald-700 tracking-tight">康康助手</h1>
        </div>
        <div className="flex items-center gap-3">
          {!loading && user && (
            <>
              <span className="text-sm text-gray-500">{user.name}</span>
              <button
                onClick={logout}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
              >
                退出
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
