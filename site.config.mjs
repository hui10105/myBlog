/**
 * 站点全局配置 —— 部署到 GitHub Pages 时只需要改这里。
 *
 * 用法（项目站点）：把 GITHUB_USER 改成你的 GitHub 用户名，
 * 站点将发布到 https://<GITHUB_USER>.github.io/myBolg/
 *
 * 如果以后想换成用户站点（仓库名改成 <用户名>.github.io，站点在根路径），
 * 把 REPO_NAME 改成 `${GITHUB_USER}.github.io` 即可，其余不用动。
 */

export const GITHUB_USER = 'YOUR_GITHUB_USERNAME';
export const REPO_NAME = 'myBolg';

/** 是否为「用户/组织站点」：仓库名为 <用户名>.github.io 时站点位于根路径 */
const isUserSite = REPO_NAME.toLowerCase() === `${GITHUB_USER.toLowerCase()}.github.io`;

/** 站点根地址，例如 https://yourname.github.io */
export const SITE_ORIGIN = `https://${GITHUB_USER}.github.io`;

/** 部署后的实际访问地址，例如 https://yourname.github.io/myBolg */
export const SITE_URL = isUserSite ? SITE_ORIGIN : `${SITE_ORIGIN}/${REPO_NAME}`;

/** URL 前缀，用户站点为 '/'，项目站点为 '/myBolg' */
export const BASE_PATH = isUserSite ? '/' : `/${REPO_NAME}`;

export const SITE = {
  /** 站点标题，显示在页头和浏览器标签 */
  title: '我的学习笔记',
  /** 站点副标题，一句话介绍 */
  tagline: '把学过的、踩过的坑，写成能复用的经验',
  /** 用于 SEO 和 RSS 的描述 */
  description:
    '记录编程学习经历与经验教训的个人博客：前端工程化、TypeScript、算法、网络原理和学习方法论，每篇文章都带结构化摘要，方便人和 AI 智能体快速阅读。',
  /** 站点语言 */
  lang: 'zh-CN',
  /** 作者名 */
  author: 'Blogger',
  /** 默认强调色，可选 indigo / emerald / amber / rose */
  defaultAccent: 'indigo',
  /** 默认外观模式，可选 light / dark / auto */
  defaultMode: 'auto',
  /** 导航栏 */
  nav: [
    { label: '首页', href: '/' },
    { label: '全部文章', href: '/blog/' },
    { label: '标签', href: '/tags/' },
    { label: '关于', href: '/about/' },
  ],
  /** 页脚社交链接，href 为 '#' 时不会显示 */
  social: [
    { label: 'GitHub', href: `https://github.com/${GITHUB_USER}` },
    { label: 'RSS', href: '/rss.xml' },
    { label: 'llms.txt', href: '/llms.txt' },
  ],
};

export default SITE;
