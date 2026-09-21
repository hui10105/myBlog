---
title: "用 Astro Content Collections 管好博客的内容层"
description: "从目录约定、Schema 校验到页面查询，梳理 Astro Content Collections 的完整用法，并记录迁移旧文章时在日期解析与标签归一化上踩到的坑。"
date: 2025-08-17
tags: ["Astro", "前端", "内容管理"]
category: "学习笔记"
difficulty: "进阶"
draft: false
summary:
  - "Content Collections 的价值在于用 Schema 在构建期拦住脏数据，而不是靠人肉检查 frontmatter"
  - "date 字段必须用 z.coerce.date() 收口，否则 YAML 里的非 ISO 写法会退化成字符串参与排序"
  - "把 category 和 difficulty 定义成枚举，能防止野生分类把标签页和筛选器彻底打散"
  - "查询层用 getCollection 加回调过滤 draft，比在每个页面里写 if 判断更不容易漏"
---

博客写到第四十多篇时，我第一次遇到构建失败。新文章把日期写成了 `2025/8/17`，列表页排序时它被当成字符串处理，于是最新一篇沉到了列表最底下。手动改回来只要十秒钟，但问题不在于笔误，而在于内容层根本没有约束：任何字段写错，都要等到渲染或者用户点进来才会暴露。

这次事故之后，我把文章从「一堆散落的 Markdown 文件」改造成了 Astro 的 Content Collections。

## 为什么值得多写一个配置文件

改造之前，我的 frontmatter 是自由发挥的：有的文章有 `tags`，有的叫 `tag`；摘要有时是三行，有时是七行。改造之后收益很具体：

1. 构建期校验，字段缺失或类型错误直接让构建失败，而不是静默渲染出空白页面。
2. 页面里拿到的是带类型的对象，`post.data.title` 有补全，写错字段名编辑器立刻标红。
3. 查询逻辑集中在一处，排序规则、草稿过滤不再散落在十几个页面组件里。

## 定义集合与 Schema

集合的定义只需要一个文件。下面是我实际在用的版本，注释标出了每个约束挡住的具体问题：

```ts
// src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  // 用 glob loader 扫描目录，文件放在哪里由 base 决定
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string().max(60),
    description: z.string().min(40).max(140),
    // coerce 会把 YAML 解析出的 Date 统一成 Date 对象，
    // 避免 "2025/8/17" 这种写法以字符串身份混进来
    date: z.coerce.date(),
    tags: z.array(z.string()).min(2).max(4),
    category: z.enum(["学习笔记", "踩坑记录", "方法论"]),
    difficulty: z.enum(["入门", "进阶", "深入"]),
    draft: z.boolean().default(false),
    summary: z.array(z.string()).length(4),
  }),
});

export const collections = { blog };
```

| 字段 | 类型 | 我加的约束 | 实际拦住的问题 |
| --- | --- | --- | --- |
| `date` | Date | `z.coerce.date()` | `2025/8/17` 参与排序导致顺序错乱 |
| `tags` | string[] | 2 到 4 个 | 标签页里出现只被用过一次的长句 |
| `summary` | string[] | 恰好 4 条 | 摘要长度参差，列表卡片高度跳动 |
| `category` | enum | 三选一 | 出现「随笔」「杂记」等野生分类 |

## 校验拦下的三类真实错误

先说日期。YAML 会把 `date: 2025-08-17` 解析成一个 UTC 午夜的日期对象，如果我在页面里用本地时区格式化，它有可能显示成前一天。`z.coerce.date()` 解决了「字符串混入」的问题，但时区问题要靠展示层统一处理：我最后固定用 UTC 格式化，日期在哪个时区看都是同一个数字。

其次是标签。我原来习惯写 `tags: Astro, 前端`，YAML 会把这个值解析成单个字符串。改成数组之后，如果我漏掉方括号，Schema 立刻报错，标签页也就不会突然多出一个名叫「Astro, 前端」的聚合项。

第三类是描述长度。以前摘要短的三五字、长的两百多字，SEO 卡片被撑得很丑。加上 `min(40).max(140)` 之后，我在写作时就会被提醒把描述写成一句话讲清楚全文范围。

**迁移旧文章时的五步顺序。** 把四十多篇存量文章迁进集合时我试过几种做法，最后固定成下面五步，顺序比步骤本身更重要：

1. 先只加 schema、不改正文，让构建把所有不合规的文章一次性报出来。
2. 把报错最多的字段临时放宽，例如允许 `description` 暂时为空。
3. 用脚本批量补齐机械字段：日期格式统一、标签从字符串转成数组。
4. 剩下的字段手工过一遍，`category` 和 `difficulty` 必须读完整篇内容才能定。
5. 收紧 schema，删掉第二步放宽的规则，再构建一次确认全绿。

第二步看着像妥协，其实最关键。我第一次尝试一次性收紧全部字段，四十七篇文章报出两百多条错误，改到一半就烦了。分批收紧之后每轮只需要处理十几条，还能一边改一边发现新的错误类型，比如同一个标签在不同文章里写法不一致。

在组件里引用集合类型时，可以直接从集合声明取类型，避免接口和 Schema 两份定义各自漂移：

```ts
import type { CollectionEntry } from "astro:content";

type Post = CollectionEntry<"blog">;

// 列表卡片只需要部分字段，不必依赖完整的集合对象
export type PostCardProps = Pick<
  Post["data"],
  "title" | "description" | "date" | "tags"
>;
```

这样以后在 Schema 里改了字段名，所有用到它的组件会一起报错，不会出现「数据字段改了、组件里还在读旧名字」的静默失败。

## 在页面里查询与排序

Schema 保证数据干净，查询层负责把所有页面共用的规则固化下来：

```ts
import { getCollection } from "astro:content";

// 过滤与排序写在一处：调用方只需要拿结果
export async function getPublishedPosts() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
```

草稿过滤放在回调里，比在每个页面写 `if (post.data.draft) continue` 靠谱得多。之前我就漏过一个页面，把尚未写完的草稿推到了线上，被搜索引擎抓走之后还得手动提交移除请求。

## 小结

Content Collections 并没有让写文章变快，它让写错文章变难。真正有用的不是那几十行 Schema，而是它逼我在动笔前想清楚：这篇文章属于哪个分类、难度是给谁看的、四条要点分别是什么。这些约束反过来提升了我写正文时的结构感。

下一步我打算把 `updated` 字段和 `summary` 的生成接进写作流程：正文写完后由脚本把要点抽取出来，我再手工改一遍，避免每次都靠回忆去补摘要。
