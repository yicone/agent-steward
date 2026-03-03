# Tailwind v4 + shadcn/ui 迁移说明

本项目正在从 legacy 全局 CSS（`src/app/globals.css` 内的 `.btn/.card/...`）迁移到 **Tailwind CSS v4 + shadcn/ui** 的组件化样式体系。迁移将以“增量替换”的方式推进：旧样式会在一段时间内与 Tailwind 并存。

## 代码侧已完成的接入点

- Tailwind PostCSS 插件：`postcss.config.mjs`
- Tailwind 入口与主题 token：`src/app/globals.css`（`@import "tailwindcss";` + `@theme { ... }`）
- shadcn 组件目录与工具函数：
  - `src/lib/utils.ts`（`cn`）
  - `src/components/ui/button.tsx`
  - `components.json`

## 你需要做的本地操作（一次性）

1) 安装依赖并更新 lockfile：

```bash
pnpm install
```

2) 验证：

```bash
pnpm dev
```

可选（更严格）：

```bash
pnpm lint
pnpm test
```

## 迁移策略（约定）

- 新增 UI 优先使用 `src/components/ui/*`（shadcn 风格）与 Tailwind utility classes。
- 现存 `globals.css` 的 legacy class 只做必要修复，不继续扩写为“新组件库”。
- 需要结构化交互（Tabs/Accordion/Dialog/Tooltip）时优先选 Radix primitives，并封装到 `src/components/ui/*`。

