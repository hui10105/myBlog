/**
 * 文章集合的查询与聚合工具。
 * 所有页面都通过这里拿数据，保证排序、过滤规则一致。
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { readingTime, toPlainText } from './site';

export type Post = CollectionEntry<'blog'>;

/** 取全部文章（按日期倒序）。生产构建时过滤掉草稿。 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 文章永久链接（站内绝对路径，不含 base） */
export function postPath(post: Post): string {
  return `/blog/${post.id}/`;
}

/** 阅读时长（分钟） */
export function postReadingTime(post: Post): number {
  return readingTime(post.body ?? '');
}

/** 文章纯文本内容，用于搜索索引 */
export function postPlainText(post: Post): string {
  return toPlainText(post.body ?? '');
}

export interface TagInfo {
  tag: string;
  count: number;
  posts: Post[];
}

/** 统计标签，按文章数倒序、同数量按名称排序 */
export async function getTags(posts?: Post[]): Promise<TagInfo[]> {
  const list = posts ?? (await getPosts());
  const map = new Map<string, Post[]>();
  for (const post of list) {
    for (const tag of post.data.tags) {
      const bucket = map.get(tag) ?? [];
      bucket.push(post);
      map.set(tag, bucket);
    }
  }
  return [...map.entries()]
    .map(([tag, items]) => ({ tag, count: items.length, posts: items }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}

/** 分类统计 */
export async function getCategories(posts?: Post[]): Promise<TagInfo[]> {
  const list = posts ?? (await getPosts());
  const map = new Map<string, Post[]>();
  for (const post of list) {
    const key = post.data.category;
    const bucket = map.get(key) ?? [];
    bucket.push(post);
    map.set(key, bucket);
  }
  return [...map.entries()]
    .map(([tag, items]) => ({ tag, count: items.length, posts: items }))
    .sort((a, b) => b.count - a.count);
}

/** 按年份分组，用于归档式列表 */
export function groupByYear(posts: Post[]): { year: number; posts: Post[] }[] {
  const map = new Map<number, Post[]>();
  for (const post of posts) {
    const year = post.data.date.getUTCFullYear();
    const bucket = map.get(year) ?? [];
    bucket.push(post);
    map.set(year, bucket);
  }
  return [...map.entries()]
    .map(([year, items]) => ({ year, posts: items }))
    .sort((a, b) => b.year - a.year);
}

/**
 * 相关文章：优先标签重合多的，其次日期接近的。
 * 用于文章底部推荐，也方便智能体顺着主题跳转。
 */
export function getRelatedPosts(current: Post, posts: Post[], limit = 3): Post[] {
  const currentTags = new Set(current.data.tags);
  return posts
    .filter((post) => post.id !== current.id)
    .map((post) => {
      const overlap = post.data.tags.filter((tag) => currentTags.has(tag)).length;
      const dayGap = Math.abs(post.data.date.valueOf() - current.data.date.valueOf()) / 86_400_000;
      return { post, score: overlap * 100 - dayGap / 30 };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.post);
}

/** 上一篇 / 下一篇（按时间顺序：更旧的是「上一篇」） */
export function getNeighbors(current: Post, posts: Post[]) {
  const index = posts.findIndex((post) => post.id === current.id);
  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}
