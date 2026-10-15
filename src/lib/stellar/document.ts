// 按 Stellar 文章页的 DOM 结构包装渲染结果：
// layout/_partial/main/navbar/article_banner.ejs + <article class="md-text content"> + post_tags.ejs
import type { FrontMatter } from './render'
import icons from './generated/icons.json'
import i18n from './generated/i18n.json'
import config from './generated/config.json'

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

// scripts/lib/ai_label.js：颜色与图标由主题固定，文案来自 languages/*.yml 的 meta.ai_label.*
const AI_LABELS: Record<string, { color: string; icon: string }> = {
  manual: { color: '#03a9f4', icon: 'default:shield-user' },
  reviewed: { color: '#4caf50', icon: 'default:shield-check' },
  polished: { color: '#4caf50', icon: 'default:shield-up' },
  generated: { color: '#ff9800', icon: 'default:shield-warning' },
}

function aiLabel(value: unknown, extraClass: string, noColor: boolean) {
  if (typeof value !== 'string' || !AI_LABELS[value]) return ''
  const text = (i18n as Record<string, { meta?: { ai_label?: Record<string, string> } }>)['zh-CN']?.meta?.ai_label?.[value]
  if (!text) return ''
  const def = AI_LABELS[value]
  const icon = iconMap[def.icon] ?? ''
  const style = noColor ? '' : ` style="color:${def.color}"`
  return `<span class="${extraClass} ai-label"${style}>${icon}${esc(text)}</span>`
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

/** 与 layout/_partial/main/navbar/article_banner.ejs 相同的字段规则。 */
export function articleBanner(fm: FrontMatter, words: number) {
  const banner = obj(fm.banner)
  if (banner.enabled === false) return ''
  const article = obj(fm.article)

  // 背景图读取 cover；banner.background 省略时继承 article.banner.background，false 改为纯色横幅
  let bannerImage = typeof fm.cover === 'string' ? fm.cover : ''
  const background = banner.background ?? (config as { article?: { banner?: { background?: unknown } } }).article?.banner?.background
  if (background === false) bannerImage = ''
  const hasImage = bannerImage.length > 0

  const headline = typeof banner.headline === 'string' ? banner.headline : typeof fm.title === 'string' ? fm.title : ''
  const tagline = typeof banner.tagline === 'string' ? banner.tagline : ''
  const avatar = typeof banner.avatar === 'string' ? banner.avatar : ''

  let top = ''
  if (fm.breadcrumb !== false) {
    const categories = toList(fm.categories)
    let crumbs = `<a class="cap breadcrumb" href="#">首页</a><span class="sep"></span><a class="cap breadcrumb" href="#">博客</a>`
    for (const c of categories) crumbs += `<span class="sep"></span><a class="cap breadcrumb-link" href="#">${esc(c)}</a>`

    let meta = '<div class="flex-row" id="post-meta">'
    const created = fmtDate(fm.date)
    if (created) meta += `<span class="text created">发布于：<time>${created}</time></span>`
    const updated = fmtDate(fm.updated)
    if (updated && updated !== created) meta += `<span class="sep updated"></span><span class="text updated">更新于：<time>${updated}</time></span>`
    meta += '</div>'

    let rightHtml = words > 0 ? `<span class="cap reading">${words} 字 · ${readingMinutes(words)} 分钟</span>` : ''
    // AI 成分标签：第一行最右；横幅有背景图时不用配置色
    rightHtml += aiLabel(article.ai_label, 'cap', hasImage)
    const right = rightHtml ? `<div class="right">${rightHtml}</div>` : ''
    top = `<div class="top bread-nav footnote"><div class="top-row"><div class="left" id="breadcrumb">${crumbs}</div>${right}</div><div class="meta-row">${meta}</div></div>`
  }

  let bottom = ''
  if (headline) {
    const titleHtml = `<h1 class="text title"><span>${esc(headline)}</span></h1>`
    const subtitle = tagline ? `<div class="text subtitle">${esc(tagline)}</div>` : ''
    const icon = avatar ? `<img class="lazy avatar" data-src="${esc(avatar)}">` : ''
    bottom = `<div class="bottom${subtitle ? '' : ' only-title'}">${icon}<div class="text-area">${titleHtml}${subtitle}</div></div>`
  }
  if (!top && !bottom) return ''

  const bg = hasImage ? ` style="--bg-url:url('${bannerImage.replace(/'/g, '%27')}')"` : ''
  const img = hasImage ? `<img class="lazy bg" data-src="${esc(bannerImage)}">` : ''
  const mask = hasImage ? '<div class="banner-mask banner-mask-top" aria-hidden="true"></div><div class="banner-mask banner-mask-bottom" aria-hidden="true"></div>' : ''
  return `<div class="article-banner-wrap"><div class="article banner top"${bg}>${img}<div class="content"${hasImage ? ' data-text-adaptive="split"' : ''}>${mask}${top}${bottom}</div></div></div>`
}

/** 文章排版风格：Front Matter article.style 覆盖全局 article.style（tech / story）。 */
export function articleStyle(fm: FrontMatter): string {
  const style = obj(fm.article).style
  if (typeof style === 'string' && style) return style
  return (config as { article?: { style?: string } }).article?.style ?? 'tech'
}

export function articleTags(fm: FrontMatter) {
  const tags = toList(fm.tags)
  if (tags.length === 0) return ''
  const hash = iconMap['default:hashtag'] ?? '#'
  return `<div class="article-tags">${tags.map((t) => `<a class="tag" href="#">${hash}${esc(t)}</a>`).join('')}</div>`
}
