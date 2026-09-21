import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORY_NAMES, DEFAULT_CATEGORY } from './lib/categories';

/**
 * 博客文章集合。
 *
 * 除了常规的标题/日期/标签，这里刻意加了几个「给 AI 智能体用的字段」：
 * - summary：结论式要点列表，智能体不用读全文就能拿到文章骨架
 * - difficulty / category：便于按难度和类型做聚合与筛选
 * - draft：草稿在正式构建时会被过滤掉
 *
 * 修改字段后，如果本地开发服务器报 schema 错误，重启 `pnpm dev` 即可。
 */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    /** 文章标题 */
    title: z.string().max(120),
    /** 一句话摘要：用于列表卡片、SEO description、RSS */
    description: z.string().max(300),
    /** 发布日期 */
    date: z.coerce.date(),
    /** 最后更新日期（可选） */
    updated: z.coerce.date().optional(),
    /** 标签，2-4 个为宜 */
    tags: z.array(z.string()).default([]),
    /** 分类：可选值来自 src/lib/categories.ts */
    category: z.enum(CATEGORY_NAMES).default(DEFAULT_CATEGORY),
    /** 难度分级 */
    difficulty: z.enum(['入门', '进阶', '深入']).default('入门'),
    /** 是否为草稿：草稿只在开发环境可见 */
    draft: z.boolean().default(false),
    /**
     * 结构化要点，3-5 条，每条写成可以独立理解的结论式句子。
     * 这是给 AI 智能体做摘要和问答时优先读取的字段。
     */
    summary: z.array(z.string()).default([]),
    /** 封面图路径（可选，放在 public/ 下） */
    cover: z.string().optional(),
    /** 语言标记，默认中文 */
    lang: z.string().default('zh-CN'),
  }),
});

export const collections = { blog };
