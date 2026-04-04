import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function isReachable(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(url, { redirect: 'manual', signal: controller.signal });
    return res.ok || res.status === 307 || res.status === 308;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureServer(baseUrl) {
  if (await isReachable(baseUrl)) {
    return async () => {};
  }

  const child = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  for (let i = 0; i < 60; i += 1) {
    await delay(1000);
    if (await isReachable(baseUrl)) {
      return async () => {
        child.kill('SIGTERM');
      };
    }
  }

  child.kill('SIGTERM');
  throw new Error(`本地服务启动失败：${baseUrl}`);
}

function parseRgb(input) {
  const match = input.match(/rgba?\(([^)]+)\)/);
  if (!match) return { r: 0, g: 0, b: 0 };
  const [r, g, b] = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  return { r, g, b };
}

function channelToLinear(value) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  return (
    0.2126 * channelToLinear(color.r) +
    0.7152 * channelToLinear(color.g) +
    0.0722 * channelToLinear(color.b)
  );
}

function contrastRatio(a, b) {
  const l1 = luminance(parseRgb(a));
  const l2 = luminance(parseRgb(b));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function createTempPoll() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      title: `Theme QA Poll ${new Date().toISOString()}`,
      description: '用于夜间模式与配色系统自动化验证',
      multi_select: false,
      owner_id: null,
    })
    .select('id')
    .single();

  if (pollError || !poll?.id) throw pollError || new Error('创建测试投票失败');

  const { error: optionError } = await supabase.from('poll_options').insert([
    { poll_id: poll.id, text: '方案 A' },
    { poll_id: poll.id, text: '方案 B' },
  ]);

  if (optionError) throw optionError;

  return {
    id: poll.id,
    cleanup: async () => {
      await supabase.from('polls').delete().eq('id', poll.id);
    },
  };
}

const THEME_CASES = [
  { theme: 'light', palette: 'morandi', displayMode: 'standard' },
  { theme: 'dark', palette: 'morandi', displayMode: 'standard' },
  { theme: 'dark', palette: 'ocean-fog', displayMode: 'contrast' },
  { theme: 'dark', palette: 'warm-dusk', displayMode: 'comfort' },
];

const RESPONSIVE_CASES = [
  { route: '/', viewport: { width: 390, height: 844 } },
  { route: '/polls', viewport: { width: 960, height: 680 } },
  { route: '/create', viewport: { width: 1440, height: 900 } },
];

async function verifyPage(page, route, themeCase) {
  const descriptor = `${route} [${themeCase.theme}/${themeCase.palette}/${themeCase.displayMode}]`;
  const metrics = await page.evaluate(() => {
    const measureContentOverflow = () => {
      const elements = Array.from(document.body.querySelectorAll('*')).filter((element) => {
        return !element.closest('.page-halo-stage') && !element.classList.contains('page-halo');
      });

      const offenders = elements.filter((element) => {
        let current = element.parentElement;
        while (current) {
          const style = getComputedStyle(current);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
            return false;
          }
          current = current.parentElement;
        }
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > window.innerWidth + 1;
      });

      return {
        count: offenders.length,
        maxRight: offenders.reduce((max, element) => Math.max(max, element.getBoundingClientRect().right), 0),
      };
    };

    const resolveColor = (value) => {
      const probe = document.createElement('div');
      probe.style.color = value;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    };

    const sample = (selector, fallbackVar) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      const rootStyle = getComputedStyle(document.documentElement);
      return {
        background:
          style.backgroundColor === 'rgba(0, 0, 0, 0)'
            ? resolveColor(rootStyle.getPropertyValue(fallbackVar || '--surface-1'))
            : style.backgroundColor,
        color: style.color,
        border: style.borderColor,
      };
    };

    const rootStyle = getComputedStyle(document.documentElement);

    return {
      body: {
        background: resolveColor(rootStyle.getPropertyValue('--bg-light')),
        color: getComputedStyle(document.body).color,
        fontSize: Number.parseFloat(getComputedStyle(document.body).fontSize),
        lineHeight: Number.parseFloat(getComputedStyle(document.body).lineHeight),
      },
      heading: sample('main h1, main h2, main h3, main .hero-title, main .type-page, main .type-section, main .text-heading', '--bg-light'),
      card: sample('.card, .modern-card, .feature-panel', '--surface-1'),
      input: sample('input, textarea, select', '--surface-1'),
      primary: sample('.btn-primary', '--primary-violet'),
      secondary: sample('.btn-secondary', '--surface-1'),
      nav: sample('nav', '--surface-overlay'),
      layout: {
        viewportWidth: window.innerWidth,
        overflow: measureContentOverflow(),
      },
    };
  });

  if (!metrics.heading) {
    throw new Error(`${descriptor} 缺少标题节点`);
  }

  const headingContrast = contrastRatio(metrics.heading.color, metrics.body.background);
  if (headingContrast < 4.5) {
    throw new Error(`${descriptor} 标题对比度不足：${headingContrast.toFixed(2)}`);
  }

  if (themeCase.displayMode === 'contrast' && headingContrast < 7) {
    throw new Error(`${descriptor} 高对比模式未达到更高标准：${headingContrast.toFixed(2)}`);
  }

  for (const key of ['card', 'input', 'primary', 'secondary', 'nav']) {
    const sample = metrics[key];
    if (!sample) continue;
    const ratio = contrastRatio(sample.color || metrics.body.color, sample.background || metrics.body.background);
    if (ratio < 3) {
      throw new Error(`${descriptor} ${key} 对比度不足：${ratio.toFixed(2)}`);
    }
  }

  if (themeCase.displayMode === 'comfort') {
    if (metrics.body.fontSize < 16.5) {
      throw new Error(`${descriptor} 舒适阅读字号未放大：${metrics.body.fontSize.toFixed(2)}`);
    }
    if (metrics.body.lineHeight / metrics.body.fontSize < 1.7) {
      throw new Error(`${descriptor} 舒适阅读行高不足：${(metrics.body.lineHeight / metrics.body.fontSize).toFixed(2)}`);
    }
  }
}

async function verifyResponsiveLayout(page, route, viewport) {
  const summary = await page.evaluate(() => {
    const overflow = Array.from(document.body.querySelectorAll('*'))
      .filter((element) => !element.closest('.page-halo-stage') && !element.classList.contains('page-halo'))
      .filter((element) => {
        let current = element.parentElement;
        while (current) {
          const style = getComputedStyle(current);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
            return false;
          }
          current = current.parentElement;
        }
        return true;
      })
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.left < -1 || rect.right > window.innerWidth + 1);

    const nav = document.querySelector('nav');
    const palettePicker = document.querySelector('.palette-picker');
    const sticky = document.querySelector('.xl\\:sticky, .sticky');

    return {
      viewportWidth: window.innerWidth,
      overflowCount: overflow.length,
      overflowMaxRight: overflow.reduce((max, rect) => Math.max(max, rect.right), 0),
      navHeight: nav?.getBoundingClientRect().height ?? 0,
      paletteWidth: palettePicker?.getBoundingClientRect().width ?? 0,
      stickyTop: sticky ? getComputedStyle(sticky).top : '',
    };
  });

  if (summary.overflowCount > 0 && summary.overflowMaxRight - summary.viewportWidth > 6) {
    throw new Error(`${route} 响应式布局出现横向溢出 [${viewport.width}x${viewport.height}]`);
  }

  if (route === '/' && summary.navHeight > viewport.height * 0.5) {
    throw new Error(`${route} 手机导航占用空间过高 [${viewport.width}x${viewport.height}]`);
  }

  if (route === '/polls' && summary.paletteWidth > summary.viewportWidth) {
    throw new Error(`${route} 窄高比窗口下主题工具溢出`);
  }
}

async function waitForThemedContent(page) {
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
  await page.waitForFunction(() => !document.querySelector('.loader-ring'), { timeout: 12000 }).catch(() => null);
  await page.waitForTimeout(500);
}

async function main() {
  loadEnvFile('.env.local');

  const baseUrl = process.env.THEME_TEST_BASE_URL || process.env.LOCAL_TEST_BASE_URL || 'http://localhost:3000';
  const stopServer = await ensureServer(baseUrl);
  const tempPoll = await createTempPoll();

  const routes = ['/', '/polls', '/about', '/login', '/create', '/my'];
  if (tempPoll?.id) routes.push(`/vote/${tempPoll.id}`);

  const browser = await chromium.launch({ headless: true });

  try {
    for (const themeCase of THEME_CASES) {
      for (const route of routes) {
        const descriptor = `${route} [${themeCase.theme}/${themeCase.palette}/${themeCase.displayMode}]`;
        console.log(`Verifying ${descriptor}`);
        const context = await browser.newContext();
        await context.addInitScript((state) => {
          localStorage.setItem('theme-mode', state.theme);
          localStorage.setItem('theme-palette', state.palette);
          localStorage.setItem('theme-display-mode', state.displayMode);
          document.documentElement.dataset.theme = state.theme;
          document.documentElement.dataset.palette = state.palette;
          document.documentElement.dataset.displayMode = state.displayMode;
        }, themeCase);

        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await waitForThemedContent(page);
        await page.waitForTimeout(400);
        await verifyPage(page, route, themeCase);
        await context.close();
      }
    }

    for (const responsiveCase of RESPONSIVE_CASES) {
      const context = await browser.newContext({ viewport: responsiveCase.viewport });
      await context.addInitScript((state) => {
        localStorage.setItem('theme-mode', state.theme);
        localStorage.setItem('theme-palette', state.palette);
        localStorage.setItem('theme-display-mode', state.displayMode);
        document.documentElement.dataset.theme = state.theme;
        document.documentElement.dataset.palette = state.palette;
        document.documentElement.dataset.displayMode = state.displayMode;
      }, { theme: 'dark', palette: 'morandi', displayMode: 'comfort' });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      console.log(`Verifying responsive ${responsiveCase.route} [${responsiveCase.viewport.width}x${responsiveCase.viewport.height}]`);
      await page.goto(`${baseUrl}${responsiveCase.route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitForThemedContent(page);
      await page.waitForTimeout(300);
      await verifyResponsiveLayout(page, responsiveCase.route, responsiveCase.viewport);
      await context.close();
    }
  } finally {
    await browser.close();
    if (tempPoll) await tempPoll.cleanup();
    await stopServer();
  }

  console.log('主题系统自动化验证通过。');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
