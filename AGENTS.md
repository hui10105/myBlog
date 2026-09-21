# AGENTS.md

给 AI 编程助手 / 智能体的工作说明。在这个仓库里做任何改动前先读完本文件。

## 项目性质

这是一个 Astro 5 + Tailwind CSS 4 的**纯静态**中文博客，输出到 `dist/` 后托管在 GitHub Pages。
没有服务端、没有数据库、没有 API 路由（只有构建时生成的静态端点）。所有内容和页面在构建时确定。

## 硬性约束

1. **不要改动 `pnpm build` 的静态输出方式**（`output: 'static'`），也不要引入需要 Node 运行时或数据库的功能。
2. **所有站内链接必须走 `withBase()`**（`src/lib/site.ts`）。GitHub Pages 项目站点部署在 `/myBlog` 子路径下，写死 `/blog/` 这类绝对路径会导致线上 404。
3. **`site.config.mjs` 里的 `GITHUB_USER` 是部署的唯一开关**，不要把它硬编码到其他文件里。
4. 新增文章只放在 `src/content/blog/`，不要为了排版方便去改 `content.config.ts` 的字段语义；确需新增字段时同步更新 `README.md` 的字段表、`src/pages/llms.txt.ts` 的字段说明表、以及 `src/pages/index.json.ts` 的 `schema` 段。
5. 样式改动集中在 `src/styles/global.css`：主题色变量在 `:root` / `.dark`，组件级样式在 `@layer components`，文章排版在文件末尾的 `.article`。**新增颜色不要在组件里写死十六进制值**，用 `var(--accent)`、`var(--surface)`、`var(--line)` 等变量，否则暗色模式和强调色切换会失效。
6. 提交前必须跑 `pnpm build` 且构建通过。

## 内容约定（写文章时必须遵守）

每篇 Markdown 的 frontmatter 必须符合 `src/content.config.ts` 的 schema：

- 必填：`title`、`description`、`date`
- 常用：`tags`（2-4 个）、`category`（学习笔记 / 专题总结 / 游戏开发）、`difficulty`（入门 / 进阶 / 深入）
- `draft: true` 的文章只在 `pnpm dev` 可见，不进线上构建
- `summary`：3-5 条**结论式**要点。这是全站对 AI 友好的核心字段——智能体做总结时优先读它，而不是读全文。写「X 会导致 Y」，不要写「本文介绍了 X」；每条要能脱离上下文独立理解

正文从 `##` 开始（一级标题由 `title` 提供），中文为主，代码块标注语言。

## 机器可读出口（改动内容时要一并维护）

| 文件 | 作用 | 何时需要改 |
| --- | --- | --- |
| `src/pages/llms.txt.ts` | 站点说明书：内容范围、字段含义、文章清单、推荐用法 | 新增/修改 frontmatter 字段时同步更新字段表 |
| `src/pages/index.json.ts` | 全部文章元数据 + `summary` 要点 | 同上，同步更新 `schema` 段 |
| `src/pages/search-index.json.ts` | 含正文纯文本的搜索索引 | 一般不用动 |
| `src/pages/md/[...id].md.ts` | 单篇原始 Markdown 出口 | 一般不用动 |

这四个出口**完全由构建过程生成，不要手工编辑产物**（`dist/` 是构建结果，已在 `.gitignore` 中）。

## 常见任务

- **新增文章**：`pnpm new "标题" --slug=english-slug --tags=A,B`，然后补全 `summary` 并把 `draft` 改为 `false`。
- **新增分类**：只改 `src/lib/categories.ts` 的 `CATEGORIES` 加一项（名称 + 说明），schema 与分类页都会自动跟上；现有三个分类是学习笔记 / 专题总结 / 游戏开发。
- **改站点信息**：只改 `site.config.mjs`。
- **改主题/配色**：改 `src/styles/global.css` 的 CSS 变量；强调色还需要在 `ThemeToggle.astro` 增加色板按钮。
- **改分享图**：改 `scripts/make-og.mjs` 文案后执行 `node scripts/make-og.mjs`（依赖 devDependency `sharp`）。
- **验证**：`pnpm build`，必要时 `pnpm preview` 后用浏览器检查亮/暗两种模式和移动端宽度。

## 给「总结博客」类任务的执行流程

当用户要求总结这个博客、生成复习清单或分析学习轨迹时：

1. 优先读 `src/content/blog/*.md` 的 frontmatter（本地）或 `/index.json`（线上），不要一上来读全文——`summary` 字段已经包含每篇的结论。
2. 需要细节时再按 `id` 读对应正文文件或 `/md/<id>.md`。
3. 输出时按主题（`tags`）或时间（`date`）聚类，并明确指出结论来自哪篇文章的标题。
4. 不要修改文章内容来完成总结任务，除非用户明确要求写入新文件。
