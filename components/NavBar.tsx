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
    const lastVisited =
      typeof window !== 'undefined' ? localStorage.getItem('advice_last_visited') : null;
    if (advices.length > 0) {
      if (
        !lastVisited ||
        new Date(advices[0].createdAt).getTime() > new Date(lastVisited).getTime()
      ) {
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
