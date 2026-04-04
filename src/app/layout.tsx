import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import AuthHashBridge from '@/components/auth-hash-bridge';
import AuthButtons from '@/components/auth-buttons';
import DisplayModePicker from '@/components/display-mode-picker';
import PalettePicker from '@/components/palette-picker';
import ThemeProvider from '@/components/theme-provider';
import ThemeToggle from '@/components/theme-toggle';
import {
  DEFAULT_THEME_STATE,
  getCustomPaletteStyleVariables,
  normalizeThemeState,
  parseCustomPalette,
  STORAGE_KEYS,
} from '@/lib/theme-system';
import './globals.css';

export const metadata: Metadata = {
  title: 'VoteFlow | 在线投票',
  description: '创建实时投票，收集真实反馈，分析数据洞察',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialThemeState = normalizeThemeState({
    theme: cookieStore.get(STORAGE_KEYS.theme)?.value,
    palette: cookieStore.get(STORAGE_KEYS.palette)?.value,
    displayMode: cookieStore.get(STORAGE_KEYS.displayMode)?.value,
  });
  const initialCustomPalette = parseCustomPalette(cookieStore.get(STORAGE_KEYS.customPalette)?.value);
  const initialStyle =
    initialThemeState.palette === 'custom'
      ? (getCustomPaletteStyleVariables(initialCustomPalette) as CSSProperties)
      : undefined;

  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      data-theme={initialThemeState.theme ?? DEFAULT_THEME_STATE.theme}
      data-palette={initialThemeState.palette ?? DEFAULT_THEME_STATE.palette}
      data-display-mode={initialThemeState.displayMode ?? DEFAULT_THEME_STATE.displayMode}
      style={initialStyle}
    >
      <body className="min-h-screen antialiased">
        <ThemeProvider initialState={initialThemeState} initialCustomPalette={initialCustomPalette}>
          <AuthHashBridge />
          <div className="page-halo-stage pointer-events-none fixed inset-x-0 top-0 z-0 h-[32rem] overflow-hidden">
            <div className="page-halo page-halo-violet left-[-8rem] top-[-6rem] h-72 w-72" />
            <div className="page-halo page-halo-fuchsia right-[-10rem] top-6 h-96 w-96" />
          </div>
          <nav className="site-nav sticky top-4 z-50 mt-4 rounded-[28px] glass">
            <div className="site-nav-inner">
              <Link href="/" className="site-brand group">
                <div className="brand-mark">
                  <span className="text-white text-lg font-bold">V</span>
                </div>
                <div className="site-brand-copy">
                  <span className="site-brand-title">
                    VoteFlow
                  </span>
                  <span className="site-brand-subtitle">
                    Avant Polling
                  </span>
                </div>
              </Link>

              <div className="site-nav-center">
                <div className="nav-pill site-nav-links">
                  <Link href="/" className="nav-link">
                    首页
                  </Link>
                  <Link href="/polls" className="nav-link">
                    投票列表
                  </Link>
                  <Link href="/my" className="nav-link">
                    我的投票
                  </Link>
                  <Link href="/about" className="nav-link">
                    关于
                  </Link>
                </div>
              </div>

              <div className="site-nav-tools">
                <div className="site-theme-controls glass-subtle">
                  <PalettePicker />
                  <ThemeToggle />
                </div>

                <div className="site-nav-actions">
                  <DisplayModePicker />
                  <Link
                    href="/create"
                    className="site-nav-create btn-primary inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-center font-semibold"
                  >
                    <span className="text-base">✦</span>
                    创建投票
                  </Link>
                  <AuthButtons />
                </div>
              </div>
            </div>
          </nav>

          <main className="site-main page-shell relative z-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
            {children}
          </main>

          <footer className="site-footer page-shell relative z-10 mt-10 px-4 pb-10 sm:px-6 lg:px-8">
            <div className="card flex flex-col gap-4 px-6 py-6 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold text-heading">VoteFlow</div>
                <div>现代、先锋、可分享的在线投票体验</div>
              </div>
              <div className="micro-label">
                Cloudflare × Supabase × Next.js
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
