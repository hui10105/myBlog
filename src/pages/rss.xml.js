/**
 * RSS 订阅源：只输出正式发布的文章。
 */
import rss from '@astrojs/rss';
import { getPosts } from '../lib/posts';
import { SITE } from '../lib/site';

export async function GET(context) {
  const posts = await getPosts();

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? 'https://example.com',
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${post.id}/`,
      categories: [...post.data.tags, post.data.category],
      author: SITE.author,
    })),
    customData: `<language>${SITE.lang}</language>`,
  });
}
