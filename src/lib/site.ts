/**
 * 站点级小工具：路径拼接、日期格式化、阅读时长估算。
 */
import SITE from '../../site.config.mjs';

export { SITE };

/**
 * 给站内绝对路径加上部署 base 前缀。
 * GitHub Pages 项目站点部署在子路径下，所有站内链接都必须走这个函数，
 * 否则样式、图片、文章页在线上都会 404。
 */
export function withBase(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, ''); // '' 或 '/myBlog'
  if (!path || path === '/') return `${base}/` || '/';
  if (/^(https?:)?\/\/|^mailto:|^#/.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * 把站内路径变成完整绝对 URL（用于 canonical / og:url / sitemap）。
 * 同时兼容 Astro.url.pathname 是否已包含 base 两种情况。
 */
export function absoluteUrl(pathname = '/', origin?: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const host = origin ?? 'https://example.com';
  // 目录型路径统一补上结尾斜杠（首页为 /myBlog/ 而不是 /myBlog），
  // 带扩展名的文件路径（如 /llms.txt）保持原样
  const normalized =
    !/\.[a-z0-9]+$/i.test(pathname) && !pathname.endsWith('/') ? `${pathname}/` : pathname;
  const withPrefix = base && normalized.startsWith(base) ? normalized : `${base}${normalized}`;
  return new URL(withPrefix, host).href;
}

/** 把 Date 格式化为 2025年9月14日 */
export function formatDateCN(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** 把 Date 格式化为 2025-09-14，用于 <time datetime> */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * 估算阅读时长（分钟）。
 * 中文按 400 字/分钟，英文按 200 词/分钟粗略折算。
 */
export function readingTime(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9_'-]+/g) || []).length;
  const minutes = cjk / 400 + words / 200;
  return Math.max(1, Math.round(minutes));
}

/** 取纯文本（去掉 markdown 语法），用于搜索索引和摘要 */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
