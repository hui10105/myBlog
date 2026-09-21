/**
 * robots.txt：允许全部抓取，并显式欢迎 AI 智能体读取机器可读出口。
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('https://example.com');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const sitemap = new URL(`${base}/sitemap-index.xml`, origin).href;

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# 欢迎 AI 智能体读取以下机器可读出口',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
