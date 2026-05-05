'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: '首页', icon: '📊' },
  { href: '/record', label: '录入', icon: '📝' },
  { href: '/history', label: '历史', icon: '📋' },
  { href: '/advice', label: 'AI 顾问', icon: '🤖' },
  { href: '/settings', label: '我的', icon: '👤' },
];

export default function NavBar() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/register') return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-t border-gray-100">
      <div className="max-w-2xl mx-auto flex">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
