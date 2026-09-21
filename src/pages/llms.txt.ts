/**
 * /llms.txt —— 给 AI 智能体的站点说明书。
 * 遵循 llms.txt 约定：用 Markdown 描述站点内容范围、字段含义和推荐用法，
 * 智能体读完这个文件就知道该怎么读、怎么引用这个博客。
 */
import type { APIRoute } from 'astro';
import { getPosts, getTags } from '../lib/posts';
import { SITE, absoluteUrl } from '../lib/site';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const tags = await getTags(posts);
  const origin = site?.origin ?? 'https://example.com';
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const url = (path: string) => new URL(`${base}${path}`, origin).href;

  const lines: string[] = [];

  lines.push(`# ${SITE.title}`);
  lines.push('');
  lines.push(`> ${SITE.description}`);
  lines.push('');
  lines.push(
    `本站是 ${SITE.author} 的个人学习博客，共 ${posts.length} 篇文章，全部为中文技术学习笔记，` +
      `内容涵盖 ${tags
        .slice(0, 8)
        .map((item) => item.tag)
        .join('、')} 等主题。文章记录学习过程、踩坑经验与复盘方法，` +
      `适合用于总结、检索、生成学习计划或回答问题。`,
  );
  lines.push('');

  lines.push('## 推荐读取方式');
  lines.push('');
  lines.push('1. 只想快速了解全站内容：读取本文件，或读取下方的 JSON 索引。');
  lines.push('2. 需要总结某一篇文章：优先读它的 `summary` 字段（结论式要点），需要细节再读全文。');
  lines.push('3. 需要精读全文：使用每篇文章的 `rawMarkdown` 地址，能拿到带 frontmatter 的原始 Markdown。');
  lines.push('4. 引用时请使用每篇文章的 `url`（规范链接），不要使用本文件的地址作为出处。');
  lines.push('');

  lines.push('## 机器可读入口');
  lines.push('');
  lines.push(`- [JSON 索引](${url('/index.json')}): 全部文章的元数据与要点摘要，体积小，适合一次性载入。`);
  lines.push(`- [搜索索引](${url('/search-index.json')}): 含正文纯文本，体积较大，适合做全文检索。`);
  lines.push(`- [RSS](${url('/rss.xml')}): 订阅最新更新。`);
  lines.push(`- [Sitemap](${url('/sitemap-index.xml')}): 全站页面清单。`);
  lines.push(`- 原始 Markdown 模板: ${origin}${base}/md/<文章id>.md`);
  lines.push('');

  lines.push('## Frontmatter 字段含义');
  lines.push('');
  lines.push('每篇文章的 frontmatter 包含以下字段，理解它们可以更准确地使用本站内容：');
  lines.push('');
  lines.push('| 字段 | 类型 | 含义 |');
  lines.push('| --- | --- | --- |');
  lines.push('| `title` | string | 文章标题 |');
  lines.push('| `description` | string | 一句话摘要，适合直接作为文章概述 |');
  lines.push('| `date` | date | 首次发布日期（YYYY-MM-DD） |');
  lines.push('| `updated` | date? | 最后更新日期，缺失表示未更新过 |');
  lines.push('| `tags` | string[] | 主题标签，用于聚合与检索 |');
  lines.push('| `category` | 学习笔记/专题总结/游戏开发 | 文章分类 |');
  lines.push('| `difficulty` | 入门/进阶/深入 | 内容难度分级 |');
  lines.push('| `summary` | string[] | **结论式要点列表，做摘要时优先使用** |');
  lines.push('| `cover` | string? | 封面图地址，缺失表示无封面 |');
  lines.push('| `lang` | string | 内容语言，本站为 zh-CN |');
  lines.push('| `draft` | boolean | 草稿标记，正式发布的内容均为 false |');
  lines.push('');

  lines.push('## 文章列表');
  lines.push('');
  for (const post of posts) {
    const date = post.data.date.toISOString().slice(0, 10);
    lines.push(`### ${post.data.title}`);
    lines.push('');
    lines.push(`- 发布日期: ${date}`);
    lines.push(`- 标签: ${post.data.tags.join(', ') || '无'}`);
    lines.push(`- 分类: ${post.data.category} · 难度: ${post.data.difficulty}`);
    lines.push(`- 摘要: ${post.data.description}`);
    lines.push(`- 页面: ${absoluteUrl(`/blog/${post.id}/`, origin)}`);
    lines.push(`- 原始 Markdown: ${url(`/md/${post.id}.md`)}`);
    if (post.data.summary.length > 0) {
      lines.push(`- 要点:`);
      for (const point of post.data.summary) {
        lines.push(`  - ${point}`);
      }
    }
    lines.push('');
  }

  lines.push('## 标签索引');
  lines.push('');
  for (const tag of tags) {
    lines.push(`- ${tag.tag} (${tag.count} 篇): ${url(`/tags/${encodeURIComponent(tag.tag)}/`)}`);
  }
  lines.push('');

  lines.push('## 使用许可');
  lines.push('');
  lines.push(
    '本站内容可用于个人学习、总结与检索。引用或转载时请注明来源并附上原文链接。',
  );
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
