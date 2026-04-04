'use client';

import { useTheme } from '@/components/theme-provider';

export default function ThemeToggle() {
  const {
    ready,
    state: { theme },
    toggleTheme,
  } = useTheme();

  const label = ready ? (theme === 'dark' ? '切换到日间模式' : '切换到夜间模式') : '切换主题模式';
  const icon = ready ? (theme === 'dark' ? '☀' : '☾') : '◐';
  const text = ready ? (theme === 'dark' ? '日间' : '夜间') : '主题';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      data-theme-ready={ready ? 'true' : 'false'}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle-icon">{icon}</span>
      <span className="hidden sm:inline">{text}</span>
    </button>
  );
}
