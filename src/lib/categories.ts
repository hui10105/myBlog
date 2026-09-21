/**
 * 博客分类的唯一真相。
 *
 * - `src/content.config.ts` 用它约束文章 frontmatter 里 `category` 的取值
 * - 分类页面用它生成页面、说明文案和空分类占位
 *
 * 新增分类只需要在这里加一项，schema 校验和分类页都会自动跟上。
 * 注意：不要把这个清单挪到 src/ 之外，Astro 的内容配置加载器解析不了外部相对导入。
 */
export interface CategoryDef {
  /** 分类名，会写进文章的 frontmatter */
  name: string;
  /** 分类页与列表卡片上的说明文案 */
  note: string;
}

export const CATEGORIES = [
  { name: '学习笔记', note: '日常所学、踩坑与解法，按时间累积' },
  { name: '专题总结', note: '围绕某个主题的深度梳理，篇幅更长' },
  { name: '游戏开发', note: '引擎、图形与玩法实现的过程记录' },
] as const;

/** 分类名元组，供 zod 的 z.enum 使用 */
export const CATEGORY_NAMES = CATEGORIES.map((item) => item.name) as unknown as [string, ...string[]];

/** 新建文章时的默认分类 */
export const DEFAULT_CATEGORY: string = CATEGORY_NAMES[0];

/** 取分类的说明文案 */
export function categoryNote(name: string): string {
  return CATEGORIES.find((item) => item.name === name)?.note ?? '这个分类还没有说明文案';
}
