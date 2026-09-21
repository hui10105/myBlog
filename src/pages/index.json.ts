/**
 * /index.json —— 全站文章的结构化索引，专为 AI 智能体设计。
 * 只包含元数据和要点，不包含正文，体积可控，适合直接喂给模型。
 */
import type { APIRoute } from 'astro';
import { getPosts, getTags, postReadingTime, postPath } from '../lib/posts';
import { SITE, absoluteUrl, withBase } from '../lib/site';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPosts();
  const tags = await getTags(posts);
  const origin = site?.origin ?? 'https://example.com';
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  const payload = {
    site: {
      title: SITE.title,
      description: SITE.description,
      language: SITE.lang,
      author: SITE.author,
      url: absoluteUrl('/', origin),
      llmsTxt: absoluteUrl('/llms.txt', origin),
      rss: absoluteUrl('/rss.xml', origin),
    },
    schema: {
      title: 'string，文章标题',
      description: 'string，一句话摘要',
      summary: 'string[]，结论式要点，做总结时优先使用这个字段',
      date: 'string，发布日期 YYYY-MM-DD',
      updated: 'string | null，最后更新日期',
      tags: 'string[]，主题标签',
      category: '学习笔记 | 专题总结 | 游戏开发',
      difficulty: '入门 | 进阶 | 深入',
      lang: 'string，内容语言',
      cover: 'string | null，封面图地址',
      readingMinutes: 'number，预计阅读时长',
      characters: 'number，正文字符数',
      url: 'string，文章页面规范链接',
      rawMarkdown: 'string，原始 Markdown 地址',
    },
    stats: {
      postCount: posts.length,
      tagCount: tags.length,
      latestPostDate: posts[0]?.data.date.toISOString().slice(0, 10) ?? null,
    },
    tags: tags.map((item) => ({ tag: item.tag, count: item.count })),
    posts: posts.map((post) => ({
      id: post.id,
      title: post.data.title,
      description: post.data.description,
      summary: post.data.summary,
      date: post.data.date.toISOString().slice(0, 10),
      updated: post.data.updated ? post.data.updated.toISOString().slice(0, 10) : null,
      tags: post.data.tags,
      category: post.data.category,
      difficulty: post.data.difficulty,
      lang: post.data.lang,
      cover: post.data.cover ? new URL(withBase(post.data.cover), origin).href : null,
      readingMinutes: postReadingTime(post),
      characters: post.body?.length ?? 0,
      url: absoluteUrl(postPath(post), origin),
      rawMarkdown: new URL(`${base}/md/${post.id}.md`, origin).href,
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
