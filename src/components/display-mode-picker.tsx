'use client';

import { useTheme } from '@/components/theme-provider';
import { DISPLAY_MODES, type DisplayMode } from '@/lib/theme-system';

export default function DisplayModePicker() {
  const {
    ready,
    state: { displayMode },
    setDisplayMode,
  } = useTheme();

  return (
    <label className="theme-select" data-theme-ready={ready ? 'true' : 'false'}>
      <span className="hidden xl:inline micro-label">显示</span>
      <select
        value={displayMode}
        onChange={(event) => {
          const nextMode = event.target.value as DisplayMode;
          setDisplayMode(nextMode);
        }}
        className="theme-select-input"
        aria-label="切换显示模式"
      >
        {DISPLAY_MODES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
