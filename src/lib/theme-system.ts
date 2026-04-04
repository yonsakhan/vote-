export type ThemeMode = 'light' | 'dark';
export type PaletteId = 'morandi' | 'ocean-fog' | 'warm-dusk' | 'custom';
export type DisplayMode = 'standard' | 'contrast' | 'comfort';
export type CustomPalette = {
  accent1: string;
  accent2: string;
  accent3: string;
};

export type ThemeState = {
  theme: ThemeMode;
  palette: PaletteId;
  displayMode: DisplayMode;
};

export const DEFAULT_THEME_STATE: ThemeState = {
  theme: 'light',
  palette: 'morandi',
  displayMode: 'standard',
};

export const STORAGE_KEYS = {
  theme: 'theme-mode',
  palette: 'theme-palette',
  displayMode: 'theme-display-mode',
  customPalette: 'custom-palette',
} as const;

export const PALETTES: Array<{
  id: PaletteId;
  label: string;
  description: string;
  swatch: string;
}> = [
  {
    id: 'morandi',
    label: '莫兰迪',
    description: '雾紫、灰蓝与陶粉的克制平衡',
    swatch: 'linear-gradient(135deg, #66729a, #8570a8, #b07a8d)',
  },
  {
    id: 'ocean-fog',
    label: '冷雾海洋',
    description: '深海蓝、海雾青与银灰的冷静层次',
    swatch: 'linear-gradient(135deg, #2f5f73, #4b6f8d, #7ba2af)',
  },
  {
    id: 'warm-dusk',
    label: '暖岩暮色',
    description: '岩棕、陶橙与暖灰的日暮余温',
    swatch: 'linear-gradient(135deg, #8c5a4b, #a56a54, #c48a64)',
  },
];

export const DEFAULT_CUSTOM_PALETTE: CustomPalette = {
  accent1: '#7f6db0',
  accent2: '#95b3c9',
  accent3: '#c78ca4',
};

export const DISPLAY_MODES: Array<{ value: DisplayMode; label: string; description: string }> = [
  { value: 'standard', label: '标准', description: '均衡配色与默认字号' },
  { value: 'contrast', label: '高对比', description: '增强文字与边界清晰度' },
  { value: 'comfort', label: '舒适阅读', description: '同步放大字号与行高节奏' },
];

function isThemeMode(value: string | undefined | null): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function isPaletteId(value: string | undefined | null): value is PaletteId {
  return value === 'morandi' || value === 'ocean-fog' || value === 'warm-dusk' || value === 'custom';
}

function isDisplayMode(value: string | undefined | null): value is DisplayMode {
  return value === 'standard' || value === 'contrast' || value === 'comfort';
}

function normalizeHexColor(value: string | undefined | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
  }
  return null;
}

function parseRgbColor(value: string) {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function toHexColor(value: { r: number; g: number; b: number }) {
  const channelToHex = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, '0');

  return `#${channelToHex(value.r)}${channelToHex(value.g)}${channelToHex(value.b)}`;
}

function mixHexColors(base: string, target: string, ratio: number) {
  const baseRgb = parseRgbColor(base);
  const targetRgb = parseRgbColor(target);
  if (!baseRgb || !targetRgb) return base;

  return toHexColor({
    r: baseRgb.r + (targetRgb.r - baseRgb.r) * ratio,
    g: baseRgb.g + (targetRgb.g - baseRgb.g) * ratio,
    b: baseRgb.b + (targetRgb.b - baseRgb.b) * ratio,
  });
}

export function normalizeCustomPalette(
  input: Partial<Record<keyof CustomPalette, string | undefined | null>> | null | undefined
): CustomPalette {
  return {
    accent1: normalizeHexColor(input?.accent1) ?? DEFAULT_CUSTOM_PALETTE.accent1,
    accent2: normalizeHexColor(input?.accent2) ?? DEFAULT_CUSTOM_PALETTE.accent2,
    accent3: normalizeHexColor(input?.accent3) ?? DEFAULT_CUSTOM_PALETTE.accent3,
  };
}

export function serializeCustomPalette(palette: CustomPalette) {
  return JSON.stringify(normalizeCustomPalette(palette));
}

export function parseCustomPalette(value: string | undefined | null) {
  if (!value) return DEFAULT_CUSTOM_PALETTE;

  try {
    const decoded = value.includes('%') ? decodeURIComponent(value) : value;
    const parsed = JSON.parse(decoded) as Partial<CustomPalette>;
    return normalizeCustomPalette(parsed);
  } catch {
    return DEFAULT_CUSTOM_PALETTE;
  }
}

export function readCustomPaletteFromStorage() {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_PALETTE;
  return parseCustomPalette(window.localStorage.getItem(STORAGE_KEYS.customPalette));
}

export function normalizeThemeState(input: Partial<Record<keyof ThemeState, string | undefined | null>>): ThemeState {
  return {
    theme: isThemeMode(input.theme) ? input.theme : DEFAULT_THEME_STATE.theme,
    palette: isPaletteId(input.palette) ? input.palette : DEFAULT_THEME_STATE.palette,
    displayMode: isDisplayMode(input.displayMode) ? input.displayMode : DEFAULT_THEME_STATE.displayMode,
  };
}

export function readThemeStateFromStorage(): ThemeState {
  if (typeof window === 'undefined') return DEFAULT_THEME_STATE;

  const storedTheme = window.localStorage.getItem(STORAGE_KEYS.theme);
  const storedPalette = window.localStorage.getItem(STORAGE_KEYS.palette);
  const storedDisplayMode = window.localStorage.getItem(STORAGE_KEYS.displayMode);

  return normalizeThemeState({
    theme:
      isThemeMode(storedTheme)
        ? storedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light',
    palette: storedPalette,
    displayMode: storedDisplayMode,
  });
}

export function readThemeStateFromDataset(): ThemeState {
  if (typeof document === 'undefined') return DEFAULT_THEME_STATE;

  return normalizeThemeState({
    theme: document.documentElement.dataset.theme,
    palette: document.documentElement.dataset.palette,
    displayMode: document.documentElement.dataset.displayMode,
  });
}

export function readResolvedThemeState(): ThemeState {
  if (typeof document === 'undefined') return DEFAULT_THEME_STATE;

  const datasetState = readThemeStateFromDataset();
  const hasThemeDataset = isThemeMode(document.documentElement.dataset.theme);
  const hasPaletteDataset = isPaletteId(document.documentElement.dataset.palette);
  const hasDisplayModeDataset = isDisplayMode(document.documentElement.dataset.displayMode);

  if (hasThemeDataset && hasPaletteDataset && hasDisplayModeDataset) {
    return datasetState;
  }

  return readThemeStateFromStorage();
}

export function applyThemeState(state: ThemeState) {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.palette = state.palette;
  document.documentElement.dataset.displayMode = state.displayMode;
  document.documentElement.style.colorScheme = state.theme;
}

export function getCustomPaletteStyleVariables(input: CustomPalette) {
  const palette = normalizeCustomPalette(input);
  const accent4 = mixHexColors(palette.accent2, '#ffffff', 0.36);
  const neutralStrong = mixHexColors(palette.accent1, '#1d2433', 0.82);
  const neutralBody = mixHexColors(neutralStrong, '#ffffff', 0.24);
  const neutralMuted = mixHexColors(neutralBody, '#ffffff', 0.32);
  const page0 = mixHexColors(palette.accent3, '#ffffff', 0.9);
  const page1 = mixHexColors(palette.accent2, '#ffffff', 0.84);
  const shadow = `color-mix(in srgb, ${palette.accent1} 12%, rgba(30, 35, 48, 0.12))`;
  const shadowDeep = `color-mix(in srgb, ${palette.accent1} 18%, rgba(30, 35, 48, 0.22))`;
  const borderSoft = `color-mix(in srgb, ${palette.accent2} 16%, rgba(128, 139, 160, 0.18))`;
  const borderStrong = `color-mix(in srgb, ${palette.accent2} 24%, rgba(128, 139, 160, 0.28))`;

  return {
    '--palette-accent-1': palette.accent1,
    '--palette-accent-2': palette.accent2,
    '--palette-accent-3': palette.accent3,
    '--palette-accent-4': accent4,
    '--palette-neutral-strong': neutralStrong,
    '--palette-neutral-body': neutralBody,
    '--palette-neutral-muted': neutralMuted,
    '--palette-page-0': page0,
    '--palette-page-1': page1,
    '--palette-shadow': shadow,
    '--palette-shadow-deep': shadowDeep,
    '--palette-border-soft': borderSoft,
    '--palette-border-strong': borderStrong,
  } as const;
}

export function applyCustomPalette(palette: CustomPalette) {
  if (typeof document === 'undefined') return;

  const variables = getCustomPaletteStyleVariables(palette);
  Object.entries(variables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

export function clearCustomPalette() {
  if (typeof document === 'undefined') return;

  [
    '--palette-accent-1',
    '--palette-accent-2',
    '--palette-accent-3',
    '--palette-accent-4',
    '--palette-neutral-strong',
    '--palette-neutral-body',
    '--palette-neutral-muted',
    '--palette-page-0',
    '--palette-page-1',
    '--palette-shadow',
    '--palette-shadow-deep',
    '--palette-border-soft',
    '--palette-border-strong',
  ].forEach((key) => {
    document.documentElement.style.removeProperty(key);
  });
}

export function applyThemeAppearance(state: ThemeState, customPalette?: CustomPalette) {
  applyThemeState(state);
  if (state.palette === 'custom') {
    applyCustomPalette(customPalette ?? DEFAULT_CUSTOM_PALETTE);
    return;
  }
  clearCustomPalette();
}

function persistCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

export function persistThemeState(state: ThemeState) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(STORAGE_KEYS.theme, state.theme);
  window.localStorage.setItem(STORAGE_KEYS.palette, state.palette);
  window.localStorage.setItem(STORAGE_KEYS.displayMode, state.displayMode);
  persistCookie(STORAGE_KEYS.theme, state.theme);
  persistCookie(STORAGE_KEYS.palette, state.palette);
  persistCookie(STORAGE_KEYS.displayMode, state.displayMode);
}

export function persistThemeMode(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  persistCookie(STORAGE_KEYS.theme, theme);
}

export function persistPalette(palette: PaletteId) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.palette, palette);
  persistCookie(STORAGE_KEYS.palette, palette);
}

export function persistCustomPalette(palette: CustomPalette) {
  if (typeof window === 'undefined') return;
  const serialized = serializeCustomPalette(palette);
  window.localStorage.setItem(STORAGE_KEYS.customPalette, serialized);
  persistCookie(STORAGE_KEYS.customPalette, serialized);
}

export function persistDisplayMode(displayMode: DisplayMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.displayMode, displayMode);
  persistCookie(STORAGE_KEYS.displayMode, displayMode);
}

export const THEME_BOOTSTRAP_SCRIPT = `
try {
  var storedTheme = localStorage.getItem('${STORAGE_KEYS.theme}');
  var storedPalette = localStorage.getItem('${STORAGE_KEYS.palette}');
  var storedDisplayMode = localStorage.getItem('${STORAGE_KEYS.displayMode}');
  var theme = storedTheme === 'dark' || storedTheme === 'light'
    ? storedTheme
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var palette = storedPalette === 'morandi' || storedPalette === 'ocean-fog' || storedPalette === 'warm-dusk'
    ? storedPalette
    : 'morandi';
  var displayMode = storedDisplayMode === 'contrast' || storedDisplayMode === 'comfort'
    ? storedDisplayMode
    : 'standard';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.palette = palette;
  document.documentElement.dataset.displayMode = displayMode;
  document.documentElement.style.colorScheme = theme;
} catch (error) {
  document.documentElement.dataset.theme = 'light';
  document.documentElement.dataset.palette = 'morandi';
  document.documentElement.dataset.displayMode = 'standard';
  document.documentElement.style.colorScheme = 'light';
}
`;
