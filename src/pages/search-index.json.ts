/**
 * /search-index.json —— 站内搜索用的索引（含正文纯文本）。
 * 由搜索弹窗在首次打开时按需加载。
 */
import type { APIRoute } from 'astro';
import { getPosts, postPath, postPlainText } from '../lib/posts';

export const GET: APIRoute = async () => {
  const posts = await getPosts();

  const index = posts.map((post) => ({
    id: post.id,
    title: post.data.title,
    description: post.data.description,
    tags: post.data.tags,
    category: post.data.category,
    difficulty: post.data.difficulty,
    date: post.data.date.toISOString().slice(0, 10),
    url: postPath(post),
    // 截断正文，避免索引过大（草稿在 getPosts 里已过滤）
    text: postPlainText(post).slice(0, 6000),
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
