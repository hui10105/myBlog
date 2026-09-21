# 我的学习笔记 · 个人博客

一个记录学习经历与经验的中文技术博客，用 Astro 构建、托管在 GitHub Pages 上。
设计上有一个明确目标：**内容不仅能给人看，也能被 AI 智能体直接读取和总结。**

- 纯静态输出，无服务端、无数据库、无追踪脚本
- 亮色 / 暗色 / 跟随系统三种外观 + 四种强调色，选择持久化且不闪白
- 每篇文章带结构化 frontmatter 与结论式要点摘要
- 自动生成 `/llms.txt`、`/index.json`、`/md/<id>.md` 三个机器可读出口
- 站内搜索、RSS、Sitemap、标签与分类聚合、文章目录、相关文章推荐

---

## 一、本地开发

```bash
pnpm install     # 安装依赖
pnpm dev         # 启动开发服务器，默认 http://localhost:4321
pnpm build       # 构建到 dist/
pnpm preview     # 本地预览构建结果
```

Node 版本要求 18.20+ / 20.3+ / 22 以上，推荐 22。

---

## 二、部署前必做的一步

打开 `site.config.mjs`，把用户名改成你自己的：

```js
export const GITHUB_USER = 'YOUR_GITHUB_USERNAME'; // ← 改成你的 GitHub 用户名
export const REPO_NAME = 'myBlog';
```

只改这一处即可。文件名和站点地址会据此自动推导：

| 配置 | 结果 |
| --- | --- |
| `GITHUB_USER = 'alice'`、`REPO_NAME = 'myBlog'` | 访问 `https://alice.github.io/myBlog/`，`base = /myBlog` |
| `GITHUB_USER = 'alice'`、`REPO_NAME = 'alice.github.io'` | 访问 `https://alice.github.io/`，`base = /`（用户站点，根路径） |

> 这一步很关键：GitHub Pages 的项目站点部署在子路径下，`base` 配错会导致线上样式、图片、文章页全部 404。

## 三、部署到 GitHub Pages

1. 在 GitHub 上新建一个仓库，名字用 `myBlog`（或改成 `你的用户名.github.io` 做用户站点）。
2. 关联并推送代码：

   ```bash
   git init
   git add .
   git commit -m "chore: 初始化博客"
   git branch -M main
   git remote add origin git@github.com:<你的用户名>/myBlog.git
   git push -u origin main
   ```

3. 打开仓库 **Settings → Pages**，把 **Source** 选为 **GitHub Actions**（不是 "Deploy from a branch"）。
4. 推送到 `main` 后，`.github/workflows/deploy.yml` 会自动构建并部署，进度在仓库的 **Actions** 页可以看到。
5. 部署完成后访问 `https://<你的用户名>.github.io/myBlog/`。

之后每次 `git push` 都会自动重新发布，不需要手动构建。

---

## 四、写文章

```bash
pnpm new "文章标题" --slug=english-slug --tags=标签1,标签2
```

脚本会在 `src/content/blog/` 下生成带完整 frontmatter 的模板。也可以直接新建 `.md` 文件，
文件名就是文章 URL（`src/content/blog/foo.md` → `/blog/foo/`）。

### frontmatter 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | ✅ | 文章标题 |
| `description` | ✅ | 一句话摘要，用于列表卡片、SEO、RSS |
| `date` | ✅ | 发布日期，`2025-09-14` 或带引号的 ISO 字符串 |
| `updated` | | 最后更新日期，有更新时填 |
| `tags` | | 标签数组，2-4 个为宜，是标签页聚合的依据 |
| `category` | | 分类，三选一：学习笔记 / 专题总结 / 游戏开发 |
| `difficulty` | | `入门` / `进阶` / `深入`，默认「入门」 |
| `draft` | | 默认 `false`。`true` 时只在 `pnpm dev` 可见，线上构建会跳过 |
| `summary` | | **结论式要点数组**，3-5 条，AI 做总结时优先读这个字段 |
| `cover` | | 封面图路径（可选） |
| `lang` | | 内容语言，默认 `zh-CN` |

示例：

```yaml
---
title: "把 git rebase 变成日常"
description: "一次整理十七个提交的复盘：什么时候该 rebase，什么时候千万别动。"
date: 2025-09-14
tags: ["Git", "工程实践"]
category: "踩坑记录"
difficulty: "进阶"
draft: false
summary:
  - "只 rebase 尚未共享的本地提交，已经推送并被他人拉取的分支不要改写历史"
  - "用 git rebase -i 合并零碎提交，比事后写一大段 commit message 更省事"
  - "冲突反复出现的根因通常是提交粒度太粗，而不是 rebase 本身麻烦"
---

## 背景
...
```

### 写 `summary` 的建议

`summary` 是整站「对 AI 友好」的关键，写法上有三条经验：

1. **写结论，不写目录。** 用「X 会导致 Y」而不是「本文介绍了 X」。
2. **每条能独立读懂。** 智能体可能只截取其中一条回答用户。
3. **覆盖不同侧面。** 一条讲原理、一条讲取舍、一条讲踩坑、一条讲适用边界。

### 图片

放在 `public/` 下，正文里用 `![说明](/myBlog/images/foo.png)` 引用（注意带上 `base` 前缀），
或者直接放进 `src/assets/` 用相对路径引用，交给 Astro 处理。

---

## 五、让 AI 智能体总结这个博客

站点构建时会自动生成三个出口，不需要手工维护：

| 地址 | 内容 | 适合场景 |
| --- | --- | --- |
| `/llms.txt` | 站点说明书：内容范围、frontmatter 字段含义、推荐引用方式 + 全部文章清单 | 让智能体先建立全局认识 |
| `/index.json` | 全部文章的元数据与 `summary` 要点（不含正文，体积小） | 归纳主题、生成复习清单 |
| `/md/<文章id>.md` | 单篇文章的原始 Markdown（含 frontmatter） | 精读某一篇 |
| `/search-index.json` | 含正文纯文本的全文索引 | 自建检索 / 向量化 |

用法示例（把地址换成你自己的站点）：

```text
请读取 https://<用户名>.github.io/myBlog/llms.txt，
然后总结这个博客目前主要在研究哪些主题，指出我重复踩过的坑，
最后给出一份按优先级排序的复习清单。
```

```bash
# 用于脚本或 agent 工具链
curl -sL https://<用户名>.github.io/myBlog/index.json | jq '.posts[] | {title, tags, summary}'
curl -sL https://<用户名>.github.io/myBlog/md/my-learning-system.md
```

仓库根目录还有一份 `AGENTS.md`，里面写清了内容约定与整理流程，
AI 编程助手（Claude Code、Cursor、Codex 等）打开这个仓库时会自动读到。

---

## 六、个性化定制

| 想改什么 | 改哪里 |
| --- | --- |
| 站点标题、副标题、描述、作者、导航、社交链接 | `site.config.mjs` 的 `SITE` |
| 默认外观与强调色 | `site.config.mjs` 的 `defaultMode` / `defaultAccent` |
| 博客分类（名称与说明文案） | `src/lib/categories.ts` 的 `CATEGORIES`，加一项即可 |
| 配色（亮色 / 暗色全套颜色变量） | `src/styles/global.css` 顶部的 `:root` 与 `.dark` |
| 强调色候选 | `src/components/ThemeToggle.astro`（色板按钮 + `global.css` 里的 `[data-accent=...]`） |
| 字体 | `src/styles/global.css` 的 `@theme inline` 中 `--font-sans` / `--font-mono` |
| 文章排版（标题、代码块、表格样式） | `src/styles/global.css` 末尾的 `.article` 规则 |
| 社交分享图 | 改 `scripts/make-og.mjs` 里的文案后执行 `node scripts/make-og.mjs` |
| 首页文案与板块 | `src/pages/index.astro` |

---

## 七、目录结构

```
├─ site.config.mjs          # 站点配置（部署前必改 GITHUB_USER）
├─ astro.config.mjs         # Astro 配置：base、sitemap、代码高亮
├─ scripts/
│  ├─ new-post.mjs          # 新建文章脚手架
│  └─ make-og.mjs           # 生成社交分享图
├─ public/                  # 静态资源（favicon、og-default.png）
├─ src/
│  ├─ content.config.ts     # 文章集合的 frontmatter schema
│  ├─ content/blog/         # 所有文章（Markdown）
│  ├─ lib/
│  │  ├─ site.ts            # base 拼接、日期格式化、阅读时长
│  │  └─ posts.ts           # 文章查询、标签聚合、相关文章
│  ├─ layouts/BaseLayout.astro
│  ├─ components/           # 页头、页脚、主题开关、搜索、文章卡片
│  ├─ pages/
│  │  ├─ index.astro        # 首页
│  │  ├─ blog/              # 文章列表 + 文章详情
│  │  ├─ tags/              # 标签索引 + 标签详情
│  │  ├─ about.astro 404.astro
│  │  ├─ llms.txt.ts        # 给 AI 的站点说明书
│  │  ├─ index.json.ts      # 给 AI 的 JSON 索引
│  │  ├─ search-index.json.ts
│  │  ├─ md/[...id].md.ts   # 原始 Markdown 出口
│  │  ├─ rss.xml.js  robots.txt.ts
│  └─ styles/global.css     # 设计系统：主题变量 + 排版 + 动画
└─ .github/workflows/deploy.yml
```

---

## 八、常见问题

**线上样式全丢、文章 404？**
`site.config.mjs` 里的 `GITHUB_USER` 或 `REPO_NAME` 和实际仓库不一致，导致 `base` 配错。改完重新 push。

**文章写了但线上看不到？**
检查 frontmatter 里 `draft` 是不是还是 `true`；草稿只在本地开发可见。

**构建报 frontmatter 校验错误？**
字段类型和 `src/content.config.ts` 里的 schema 不符，报错信息会指出具体文件与字段。

**想换域名？**
把 `site.config.mjs` 里的 `SITE_ORIGIN` 改成你的域名，并在仓库 Pages 设置里填写 Custom domain。

**搜索搜不到新文章？**
搜索索引在构建时生成，改完文章需要重新构建（或重启 `pnpm dev`）。

---

内容许可：个人学习、总结、检索均可使用，引用请注明出处并附原文链接。
