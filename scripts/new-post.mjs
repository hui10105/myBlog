#!/usr/bin/env node
/**
 * 新建文章脚手架：pnpm new "文章标题"
 *
 * 会自动生成文件名（英文短横线风格需要你自己给，或用当天日期兜底）、
 * 完整的 frontmatter 模板，并写入 src/content/blog/。
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = join(root, 'src/content/blog');

const args = process.argv.slice(2);
const rawTitle = args.filter((arg) => !arg.startsWith('--')).join(' ').trim();
const slugArg = (args.find((arg) => arg.startsWith('--slug=')) || '').split('=')[1];
const tagArg = (args.find((arg) => arg.startsWith('--tags=')) || '').split('=')[1];

if (!rawTitle) {
  console.error('用法：pnpm new "文章标题" [--slug=english-slug] [--tags=标签1,标签2]');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const slug = (slugArg || `${today}-${rawTitle}`)
  .toLowerCase()
  .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
  .replace(/^-+|-+$/g, '');

const tags = (tagArg || '待整理').split(',').map((tag) => tag.trim()).filter(Boolean);

const template = `---
title: "${rawTitle}"
description: "一句话概括这篇文章讲了什么，40-70 字，会用于列表卡片与 SEO"
date: ${today}
tags: [${tags.map((tag) => `"${tag}"`).join(', ')}]
category: "学习笔记"
difficulty: "入门"
draft: true
summary:
  - "要点一：一句话写清最重要的结论"
  - "要点二"
  - "要点三"
---

## 背景

为什么要学这个、解决什么问题。

## 正文

写清楚过程、踩到的坑、当时的判断依据。

## 小结

学到了什么，下一步做什么。
`;

await mkdir(blogDir, { recursive: true });
const target = join(blogDir, `${slug}.md`);

try {
  await access(target);
  console.error(`文件已存在：${target}`);
  process.exit(1);
} catch {
  /* 不存在才继续 */
}

await writeFile(target, template, 'utf8');
console.log(`已创建：src/content/blog/${slug}.md`);
console.log('记得把 draft 改成 false 才会正式发布，并补全 summary 里的要点。');
