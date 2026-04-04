import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const TARGET_DIRS = ['src/app', 'src/components', 'src/lib'];
const FILE_EXTENSIONS = new Set(['.ts', '.tsx']);
const RAW_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3,8})\b|rgba?\(|hsla?\(/g;
const ALLOWLIST = new Set([
  'src/components/palette-picker.tsx',
  'src/lib/theme-system.ts',
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

const violations = [];

for (const relativeDir of TARGET_DIRS) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) continue;

  for (const file of walk(absoluteDir)) {
    const relativePath = path.relative(ROOT, file);
    if (ALLOWLIST.has(relativePath)) continue;

    const content = fs.readFileSync(file, 'utf8');
    const matches = [...content.matchAll(RAW_COLOR_PATTERN)];
    if (matches.length === 0) continue;

    violations.push({
      file: relativePath,
      snippets: matches.slice(0, 5).map((match) => match[0]),
    });
  }
}

if (violations.length > 0) {
  console.error('发现主题硬编码颜色，请改为主题变量或语义样式类：');
  for (const violation of violations) {
    console.error(`- ${violation.file}`);
    for (const snippet of violation.snippets) {
      console.error(`  ${snippet}`);
    }
  }
  process.exit(1);
}

console.log('主题硬编码检查通过。');
