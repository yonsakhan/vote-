# Theme System

## Goals

- 用统一令牌层接管背景、文字、卡片、边框、阴影与状态色
- 支持莫兰迪、冷雾海洋、暖岩暮色三套可持续扩展的主题方案
- 让标准 / 高对比 / 舒适阅读同时联动颜色、字号与行高节奏
- 让手机、窄高比窗口、常规桌面和超宽窗口都保持稳定阅读宽度

## Theme Model

主题状态仍然挂在 `document.documentElement.dataset` 上，但内部模型升级为三层：

1. 基础色卡
   - `--palette-accent-*`
   - `--palette-neutral-*`
   - `--palette-page-*`
   - `--palette-surface-*`
2. 语义令牌
   - `--text-primary`
   - `--text-secondary`
   - `--surface-1`
   - `--surface-2`
   - `--surface-3`
   - `--card-border`
   - `--shadow-elevated`
   - `--accent-fg`
3. 组件语义类
   - `.card`
   - `.modern-card`
   - `.feature-panel`
   - `.btn-primary`
   - `.input-field`
   - `.palette-picker`
   - `.theme-toggle`

当前主题状态字段：

- `data-theme`
  - `light`
  - `dark`
- `data-palette`
  - `morandi`
  - `ocean-fog`
  - `warm-dusk`
- `data-display-mode`
  - `standard`
  - `contrast`
  - `comfort`

持久化键：

- `theme-mode`
- `theme-palette`
- `theme-display-mode`

状态定义与预注入脚本位于 [theme-system.ts](file:///Users/onahan/Documents/trae_projects/vote-system/src/lib/theme-system.ts)。

## Palette Presets

首批内置方案：

- `morandi`
  - 标签：莫兰迪
  - 特征：雾紫、灰蓝、陶粉，整体克制柔和
- `ocean-fog`
  - 标签：冷雾海洋
  - 特征：深海蓝、海雾青、银灰，冷静清透
- `warm-dusk`
  - 标签：暖岩暮色
  - 特征：岩棕、陶橙、暖灰，适合偏暖阅读氛围

配色元数据除了 `id`/`label` 之外，还保留 `description` 与 `swatch`，方便后续扩展设计方案。

## Typography Scale

排版令牌在 [globals.css](file:///Users/onahan/Documents/trae_projects/vote-system/src/app/globals.css) 中统一定义：

- 缩放
  - `--type-scale-base`
  - `--type-scale-device`
  - `--type-scale`
- 字号
  - `--font-size-display`
  - `--font-size-page`
  - `--font-size-heading`
  - `--font-size-body`
  - `--font-size-caption`
  - `--font-size-control`
- 行高
  - `--line-height-heading`
  - `--line-height-body`
  - `--line-height-copy`

语义排版类：

- `.type-display`
- `.type-page`
- `.type-section`
- `.type-body`
- `.type-caption`
- `.micro-label`

行为规则：

- `standard` 使用默认字号与节奏
- `contrast` 提高文本与边界清晰度
- `comfort` 同时放大字号、提升正文行高，并让暖色背景更适合长时间阅读
- `max-width: 640px` 时通过 `--type-scale-device` 自动收窄字号，避免手机端挤压

## Responsive Layout

全局布局类：

- `.page-shell`
- `.page-reading-shell`
- `.site-nav`
- `.site-nav-inner`
- `.site-nav-actions`
- `.site-nav-links`

规则：

- 超宽窗口通过 `--page-max-width` 与 `--page-max-width-reading` 限制阅读宽度
- 窄屏时导航工具区自动换行，主题方案选择器切换为单列卡片
- 矮窗口时降低导航吸附偏移，减少首屏被占用的高度
- 表单页与详情页在 `xl` 前优先堆叠内容，避免固定侧栏压缩主体

## Dark Layering

暗色模式不再只切换背景颜色，还会同步强化：

- 卡片描边：`--card-border`
- 表面高光：`--card-highlight`
- 投影深度：`--shadow-elevated`、`--shadow-floating`
- 面板渐变：`.modern-card`、`.feature-panel`
- 控件底色：`.input-field`、`.theme-toggle`、`.theme-select`

目标是让卡片与页面背景始终保持清晰分层，同时保留当前配色方案的气质。

## Developer Rules

- 不要在 `tsx/ts` 组件里直接写 `#xxxxxx`、`rgb(...)`、`rgba(...)`、`hsl(...)`
- 新增主题方案时，优先补充 [theme-system.ts](file:///Users/onahan/Documents/trae_projects/vote-system/src/lib/theme-system.ts) 的元数据和 [globals.css](file:///Users/onahan/Documents/trae_projects/vote-system/src/app/globals.css) 的基础色卡映射
- 组件优先消费语义类和令牌，不要在页面中继续堆叠原始颜色与字号类
- 页面需要新视觉样式时，先在全局样式层抽象成语义类

## Automation

可用脚本：

```bash
npm run lint:theme
npm run test:theme
```

- `lint:theme`
  - 检查 `src/app`、`src/components`、`src/lib` 中的原始颜色字面量
  - 允许主题元数据文件维护合法色卡常量
- `test:theme`
  - 验证首页、列表页、关于页、登录页、创建页、我的投票页以及临时投票详情页
  - 在 `light/dark + 莫兰迪/冷雾海洋/暖岩暮色 + standard/contrast/comfort` 下检查主题同步与颜色对比度
  - 补充手机、窄高比窗口和大屏创建页的响应式校验

## Scope

当前仓库主要覆盖营销首页、投票列表、创建页、详情页、登录页、我的投票与结果展示。图表、表格、抽屉、弹窗等组件仍不在这套自动化规则的覆盖范围内。
