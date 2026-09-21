---
title: "从零搭一个对 AI 友好的博客：Astro + GitHub Pages 实录"
description: "记录用 Astro 和 GitHub Pages 搭建博客的全过程：技术选型的理由、让内容能被 AI 读取的设计，以及六个真实踩坑。"
date: 2026-09-21
tags: ["Astro", "GitHub Pages", "前端工程化", "建站复盘"]
category: "学习笔记"
difficulty: "进阶"
draft: false
summary:
  - "静态博客选 Astro 是因为它的内容集合能给 Markdown 加类型校验，frontmatter 写错会直接让构建失败"
  - "GitHub Pages 项目站点部署在子路径下，站内链接必须统一走一个 withBase 函数，写死绝对路径会让线上全站样式丢失"
  - "仓库名大小写必须和配置里的 base 完全一致，差一个字母就会让所有资源和文章页 404"
  - "主题切换脚本要内联在 head 里且排在样式表之前，否则暗色模式加载时会先闪一下白屏"
---

我一直有记录学习过程的习惯，但笔记散在几个编辑器里，检索全靠回忆。这次决定花一个周末把它理顺：搭一个自己的站点，内容用 Markdown 写，发布自动化，同时让这些笔记能被 AI 智能体直接读取和总结。

这篇文章记录整个过程，重点放在踩过的坑上，因为它们比技术选型更值得记下来。

## 为什么不用现成平台，也不用手写 HTML

先把需求列清楚，选型才不会跑偏：

- 内容必须是纯 Markdown，将来换框架不用重写
- 发布要自动化，push 代码就上线，不想手动上传文件
- 支持亮色和暗色主题，手机上要能看
- 每篇文章要有结构化的元数据，方便以后批量处理

现成平台的问题在于数据不在自己手里，导出格式也未必干净；纯手写 HTML 则会在第三篇文章时就开始折磨人，改一次页脚要动所有文件。静态站点生成器正好在中间：内容是纯文本，页面是构建出来的。

## 选型：为什么最后选了 Astro

| 方案 | 优势 | 放弃的原因 |
| --- | --- | --- |
| Hexo | 中文资料多，主题丰富 | 主题定制要改模板引擎语法，机器可读的输出得自己补 |
| Hugo | 构建速度极快，单二进制 | Go 模板语法改起来门槛高，前端样式也想用熟悉的方式写 |
| Astro | 内容集合带 schema 校验，输出语义干净的静态 HTML | 生态比前两者年轻 |

真正让我定下来的是内容集合的类型校验。它把每篇文章的 frontmatter 变成一个 schema，字段名写错、日期格式不对、标签写成字符串，都会在构建时报错并指出具体文件：

```ts
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().max(120),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    difficulty: z.enum(['入门', '进阶', '深入']).default('入门'),
    draft: z.boolean().default(false),
    summary: z.array(z.string()).default([]),
  }),
});
```

这套约束平时看着繁琐，但它让批量处理成为可能——我可以一次性筛出所有「进阶」且带某个标签的文章拼成阅读清单，也可以让草稿只在本地可见。

## 让内容对 AI 友好：三个出口加一个字段

这一部分是我最想做的。AI 要总结一个博客，最省事的做法不是让它爬 HTML，而是给它准备好的结构化数据。站点在构建时额外生成三个出口：

| 出口 | 内容 | 用途 |
| --- | --- | --- |
| `/llms.txt` | 站点说明、字段含义、文章清单 | 让它先建立全局认识 |
| `/index.json` | 每篇的元数据与要点，不含正文 | 一次性载入，体积可控 |
| `/md/<文章id>.md` | 单篇原始 Markdown | 需要精读时用 |

关键设计在 frontmatter 的 `summary` 字段：每篇 3 到 5 条**结论式**要点。我给自己定了两条写法规则，一条是写「X 会导致 Y」而不是「本文介绍了 X」，另一条是每条都要能脱离上下文独立读懂——因为智能体很可能只截取其中一条来回答别人。

```yaml
summary:
  - "笔记分成闪念、周记、专题、成文四层，各层职责不同，混着放很快就再也检索不到"
  - "周复盘固定回答六个问题，重点是找出低效时间段和只推进一件必须完成的事"
```

配套的还有一份仓库根目录的 `AGENTS.md`，写明内容约定和机器可读出口的维护规则。AI 编程助手打开仓库会自动读到它，这一点在后面的迭代里省了很多重复解释。

## 踩坑清单

下面六个问题都是这次真实遇到的，按发现顺序排列。

### 一、子路径下的 base，写死链接会全站 404

GitHub Pages 的项目站点发布在 `https://用户名.github.io/仓库名/`，也就是站点位于子路径下。这时候如果页面里写 `href="/blog/"`，线上会去请求根路径的 `/blog/`，结果是样式、图片、文章页全部失效。

解决办法是让所有站内链接走同一个函数，构建时自动补前缀：

```ts
export function withBase(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, ''); // '' 或 '/myBlog'
  if (!path || path === '/') return `${base}/` || '/';
  if (/^(https?:)?\/\/|^mailto:|^#/.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
```

于是项目里多了一条硬规矩：任何新增页面都不许手写绝对路径。这条规矩后来救了我一次，见下一条。

### 二、仓库名大小写，差一个字母就出事

我在配置里把仓库名写成了 `myBolg`，而实际在 GitHub 上创建的是 `myBlog`。`b` 和 `l` 的顺序错了。这个名字不会让构建失败，本地开发也完全正常，因为 `BASE_URL` 由配置推导，自己和自己是一致的。

但推到线上就出问题了：站点部署在 `/myBlog/` 下，而页面里的资源可能指向 `/myBolg/`，错的那一种全部 404。这类问题最麻烦的地方在于——**本地永远不会暴露它**。

处理办法是把仓库名收敛成配置里的唯一一处常量，其余全部由它推导，并在部署前用真实地址检查一遍构建产物。检查方式很土但有效：

```bash
# 构建后确认产物里只有一个前缀，没有残留的旧名字
grep -oE 'href="/my[^"]*"' dist/index.html | sort -u | head
grep -rl 'myBolg' dist/ || echo "OK：无残留"
```

### 三、Pages 的 Source 必须选 GitHub Actions

仓库设置里的 Pages 有两套模式：从分支部署，或者用 GitHub Actions 部署。用第二种工作流时，如果 Source 还停留在默认状态，流水线会长成这个样子——构建成功、部署失败：

```
- build:  completed/success
- deploy: completed/failure  ← 失败步骤：Deploy to GitHub Pages
```

这个结果很容易被误读成工作流写错了。实际上产物已经上传成功，只是仓库还没允许 Pages 用工作流方式发布。把 Source 改成 GitHub Actions 就通了，之后每次 push 自动上线。

### 四、`.js` 文件里不能写 TypeScript 类型标注

RSS 那个端点我顺手命名成 `rss.xml.js`，因为要输出 XML。文件里写了 `context: APIContext`，结果构建直接报语法错误：

```
src/pages/rss.xml.js (5:12): Expected ',', got '{'
```

原因是这个文件按 `.js` 解析，类型标注不是合法的 JavaScript。要么把文件改成 `.ts`，要么删掉类型标注。我选了后者，因为 `.js` 后缀本身是这个路由约定的一部分。

### 五、pnpm 的严格依赖，提升不到的行用不了

生成社交分享图的脚本需要 `sharp`。它其实是 Astro 的依赖，已经躺在 `node_modules` 里了，但 pnpm 不用扁平化的目录结构，脚本里 `import 'sharp'` 依然报找不到模块。

处理方式很简单：需要什么就显式声明什么，把它加进 devDependencies。这件事也提醒我，**能 import 到某个包不代表它属于你**，依赖关系写清楚比省一次安装更重要。

### 六、暗色模式闪白

主题切换用 CSS 变量加一个挂在根元素上的 class，逻辑本身没什么难度。但我第一次把切换代码放在了页面底部的脚本里，结果每次加载暗色主题都会先闪一下白屏，再变黑。

修复办法是把读取本地存储、设置 class 的那几行内联在 `<head>` 里，并且排在样式表之前：

```html
<script is:inline>
  (function () {
    var mode = localStorage.getItem('theme-mode') || 'auto';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle(
      'dark',
      mode === 'dark' || (mode === 'auto' && prefersDark)
    );
  })();
</script>
```

判断标准很简单：**这段代码必须在浏览器首次绘制之前执行完**，否则用户就会看到中间态。

## 主题切换最后是怎么实现的

配色收敛成一组 CSS 变量，亮色定义在 `:root`，暗色定义在 `.dark` 下，强调色再通过根元素上的 `data-accent` 属性切换：

```css
:root { --surface: oklch(100% 0 0); --ink: oklch(24% 0.021 265); }
.dark { --surface: oklch(22.5% 0.02 265); --ink: oklch(94% 0.01 262); }
[data-accent='emerald'] { --accent: oklch(56% 0.13 168); }
```

组件里只用 `var(--surface)`、`var(--accent)` 这类变量，不写死颜色值。这样加一套配色只需要补一组变量，避免在几十个文件里逐个替换。目前提供亮色、暗色、跟随系统三种模式，以及四种强调色，选择存在浏览器本地。

## 小结

这次搭建最值得留下的三点体会：

1. **配置只能有一份真相。** 仓库名、站点地址这类会出现在几十个地方的值，一旦靠手抄就迟早不一致，而且往往只在线上暴露。
2. **机器可读是设计出来的，不是自然产生的。** 让 AI 能总结我的笔记，靠的不是它更聪明，而是我提前把字段和约束写清楚。
3. **约束换来的自动化是划算的。** frontmatter 的 schema 校验让我多写了几行配置，换来的是再也不用担心元数据写错。

下一步我打算把示例内容换成真实笔记，按三个类别整理：学习笔记放日常所学与踩坑，专题总结放某个主题的深度梳理，游戏开发单独成类记录引擎和玩法实现的过程。分类定下来之后，标签继续承担更细粒度的检索，两者各管一层。
