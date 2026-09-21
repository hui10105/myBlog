/**
 * /md/<文章 id>.md —— 直接返回未渲染的原始 Markdown（含 frontmatter）。
 * 这是给 AI 智能体精读全文用的出口，也是文章页「查看 Markdown 源码」的目标。
 */
import type { APIRoute } from 'astro';
import { getPosts } from '../../lib/posts';

// 构建时把源文件原文读进来（?raw 由 Vite 处理）
const rawFiles = import.meta.glob('/src/content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.map((post) => {
    const entry = Object.entries(rawFiles).find(([path]) => path.endsWith(`/${post.id}.md`));
    return {
      params: { id: post.id },
      props: { body: entry?.[1] ?? '', title: post.data.title },
    };
  });
}

export const GET: APIRoute = ({ props }) => {
  const { body } = props as { body: string };
  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
