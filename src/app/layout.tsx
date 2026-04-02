import type { Metadata } from "next";
import Link from "next/link";
import AuthHashBridge from "@/components/auth-hash-bridge";
import AuthButtons from "@/components/auth-buttons";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoteFlow | 在线投票",
  description: "创建实时投票，收集真实反馈，分析数据洞察",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <AuthHashBridge />
        {/* Navigation */}
        <nav className="sticky top-0 z-50 glass">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <span className="text-white text-xl font-bold">V</span>
              </div>
              <span className="text-2xl font-bold text-slate-800 group-hover:opacity-80 transition-opacity">
                VoteFlow
              </span>
            </Link>
            
            <div className="flex items-center gap-8">
              <Link href="/" className="text-sm font-semibold text-blue-600">
                首页
              </Link>
              <Link href="/polls" className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                投票列表
              </Link>
              <Link href="/my" className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                我的投票
              </Link>
              <Link href="/about" className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                关于
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/create"
                className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <span>+</span>
                创建投票
              </Link>
              <AuthButtons />
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-6 py-10">
          {children}
        </main>

        <footer className="text-center py-8 text-sm text-slate-400">
          © 2024 VoteFlow. 保留所有权利。
        </footer>
      </body>
    </html>
  );
}
