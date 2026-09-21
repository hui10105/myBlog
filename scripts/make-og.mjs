#!/usr/bin/env node
/**
 * 生成社交分享图 public/og-default.png（1200×630）。
 * 依赖 Astro 自带的 sharp，改完文案后执行：node scripts/make-og.mjs
 */
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import SITE from '../site.config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public');

const esc = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#12141c" />
      <stop offset="60%" stop-color="#1b1f2e" />
      <stop offset="100%" stop-color="#2a2350" />
    </linearGradient>
    <radialGradient id="glow" cx="0.15" cy="0.05" r="0.9">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.55" />
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glow2" cx="0.95" cy="0.9" r="0.7">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#glow)" />
  <rect width="1200" height="630" fill="url(#glow2)" />

  <g transform="translate(88, 96)">
    <rect width="56" height="56" rx="14" fill="#6366f1" />
    <text x="28" y="39" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
          font-size="30" font-weight="700" fill="#ffffff" text-anchor="middle">学</text>
    <text x="76" y="28" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
          font-size="22" font-weight="600" fill="#e8e9f2">${esc(SITE.title)}</text>
    <text x="76" y="52" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
          font-size="16" fill="#9aa0b5">${esc(SITE.tagline)}</text>
  </g>

  <text x="88" y="330" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
        font-size="46" font-weight="700" fill="#ffffff">记录学习经历</text>
  <text x="88" y="398" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
        font-size="46" font-weight="700" fill="#a5b4fc">沉淀可复用的经验</text>

  <text x="88" y="470" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
        font-size="22" fill="#c3c8db">前端工程 · TypeScript · 算法 · 网络 · 学习方法</text>

  <g transform="translate(88, 512)">
    <rect width="330" height="46" rx="23" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.16" />
    <text x="24" y="30" font-family="SF Mono, Menlo, monospace" font-size="18" fill="#c7d2fe">/llms.txt · /index.json</text>
  </g>

  <text x="1112" y="548" text-anchor="end" font-family="PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif"
        font-size="18" fill="#8b90a8">内容对 AI 智能体友好</text>
</svg>`;

await mkdir(outDir, { recursive: true });
const target = join(outDir, 'og-default.png');
await sharp(Buffer.from(svg)).png().toFile(target);
console.log(`已生成 ${target}`);
