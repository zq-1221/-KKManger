import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: '康康助手',
  description: '个人健康数据管理',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen pb-20">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">🩺</span>
            <h1 className="text-lg font-bold text-emerald-700 tracking-tight">康康助手</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>

        <NavBar />
      </body>
    </html>
  );
}
