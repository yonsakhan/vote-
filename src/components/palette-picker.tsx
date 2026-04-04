'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/components/theme-provider';
import { DEFAULT_CUSTOM_PALETTE, PALETTES } from '@/lib/theme-system';

export default function PalettePicker() {
  const {
    ready,
    customPalette,
    state: { palette },
    setPalette,
    setCustomPalette,
  } = useTheme();
  const [open, setOpen] = useState(false);
  const resolvedCustomPalette = customPalette ?? DEFAULT_CUSTOM_PALETTE;
  const [draft, setDraft] = useState(resolvedCustomPalette);

  useEffect(() => {
    setDraft(resolvedCustomPalette);
  }, [resolvedCustomPalette]);

  const customSwatch = useMemo(
    () =>
      `linear-gradient(135deg, ${draft.accent1}, ${draft.accent2}, ${draft.accent3})`,
    [draft.accent1, draft.accent2, draft.accent3]
  );

  const applyCustomPalette = () => {
    setCustomPalette(draft);
    setOpen(false);
  };

  return (
    <div
      className={open ? 'palette-picker palette-picker-open' : 'palette-picker'}
      data-theme-ready={ready ? 'true' : 'false'}
    >
      <div className="palette-picker-list" role="list" aria-label="切换主题方案">
        {PALETTES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPalette(item.id)}
            className={item.id === palette ? 'palette-swatch palette-swatch-active' : 'palette-swatch'}
            aria-label={`切换到${item.label}`}
            title={item.label}
          >
            <span className="palette-swatch-core" style={{ background: item.swatch }} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={palette === 'custom' ? 'palette-swatch palette-swatch-active palette-swatch-custom' : 'palette-swatch palette-swatch-custom'}
          aria-label="打开自定义配色"
          title="自定义配色"
        >
          <span className="palette-swatch-core palette-swatch-core-custom" style={{ background: customSwatch }}>
            +
          </span>
        </button>
      </div>
      {open ? (
        <div className="palette-custom-panel">
          <div className="palette-custom-grid">
            <label className="palette-custom-field">
              <span className="palette-custom-chip" style={{ backgroundColor: draft.accent1 }} />
              <input
                type="color"
                value={draft.accent1}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, accent1: event.target.value }));
                }}
                aria-label="选择自定义主色"
              />
            </label>
            <label className="palette-custom-field">
              <span className="palette-custom-chip" style={{ backgroundColor: draft.accent2 }} />
              <input
                type="color"
                value={draft.accent2}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, accent2: event.target.value }));
                }}
                aria-label="选择自定义辅色"
              />
            </label>
            <label className="palette-custom-field">
              <span className="palette-custom-chip" style={{ backgroundColor: draft.accent3 }} />
              <input
                type="color"
                value={draft.accent3}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, accent3: event.target.value }));
                }}
                aria-label="选择自定义点缀色"
              />
            </label>
          </div>
          <div className="palette-custom-actions">
            <button
              type="button"
              className="btn-secondary rounded-full px-3 py-2 text-sm font-semibold"
              onClick={() => {
                setDraft(DEFAULT_CUSTOM_PALETTE);
              }}
            >
              重置
            </button>
            <button
              type="button"
              className="btn-primary rounded-full px-3 py-2 text-sm font-semibold"
              onClick={applyCustomPalette}
            >
              应用
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
