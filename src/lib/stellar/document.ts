// 按 Stellar 文章页的 DOM 结构包装渲染结果：
// layout/_partial/main/navbar/article_banner.ejs + <article class="md-text content"> + post_tags.ejs
import type { FrontMatter } from './render'
import icons from './generated/icons.json'

const iconMap = icons as Record<string, string>

function esc(s: unknown) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function toList(v: unknown): string[] {
  if (v == null) return []
  if (Array.isArray(v)) return v.flat().map(String)
  return String(v).split(/[,，]/).map((s) => s.trim()).filter(Boolean)
}

function fmtDate(v: unknown): string {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(String(v))
  if (Number.isNaN(d.getTime())) return esc(v)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function readingMinutes(words: number) {
  return Math.max(1, Math.round(words / 300))
}

export function articleBanner(fm: FrontMatter, words: number) {
  const title = fm.title ? esc(fm.title) : ''
  const categories = toList(fm.categories)
  const cover = typeof fm.cover === 'string' ? fm.cover : typeof fm.banner === 'string' ? fm.banner : ''
  let crumbs = `<a class="cap breadcrumb" href="#">首页</a><span class="sep"></span><a class="cap breadcrumb" href="#">博客</a>`
  for (const c of categories) crumbs += `<span class="sep"></span><a class="cap breadcrumb-link" href="#">${esc(c)}</a>`

  let meta = '<div class="flex-row" id="post-meta">'
  const created = fmtDate(fm.date)
  if (created) meta += `<span class="text created">发布于：<time>${created}</time></span>`
  const updated = fmtDate(fm.updated)
  if (updated && updated !== created) meta += `<span class="sep updated"></span><span class="text updated">更新于：<time>${updated}</time></span>`
  meta += '</div>'

  const right = words > 0 ? `<div class="right"><span class="cap reading">${words} 字 · ${readingMinutes(words)} 分钟</span></div>` : ''
  const top = `<div class="top bread-nav footnote"><div class="top-row"><div class="left" id="breadcrumb">${crumbs}</div>${right}</div><div class="meta-row">${meta}</div></div>`
  const subtitle = fm.description ? `<div class="text subtitle">${esc(fm.description)}</div>` : ''
  const bottom = title
    ? `<div class="bottom${subtitle ? '' : ' only-title'}"><div class="text-area"><h1 class="text title"><span>${title}</span></h1>${subtitle}</div></div>`
    : ''
  const bg = cover ? ` style="--bg-url:url('${cover.replace(/'/g, '%27')}')"` : ''
  const img = cover ? `<img class="lazy bg" data-src="${esc(cover)}">` : ''
  const mask = cover ? '<div class="banner-mask banner-mask-top" aria-hidden="true"></div><div class="banner-mask banner-mask-bottom" aria-hidden="true"></div>' : ''
  return `<div class="article-banner-wrap"><div class="article banner top"${bg}>${img}<div class="content"${cover ? ' data-text-adaptive="split"' : ''}>${mask}${top}${bottom}</div></div></div>`
}

export function articleTags(fm: FrontMatter) {
  const tags = toList(fm.tags)
  if (tags.length === 0) return ''
  const hash = iconMap['default:hashtag'] ?? '#'
  return `<div class="article-tags">${tags.map((t) => `<a class="tag" href="#">${hash}${esc(t)}</a>`).join('')}</div>`
}
