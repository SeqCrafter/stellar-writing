// Stellar 文章渲染管线，顺序与 Hexo 的 post render 一致：
//   1. 围栏代码块先高亮并替换为占位（backtick_code_block）
//   2. 顶层 {% 标签 %} 替换为占位，正文交给 Markdown（hexo-renderer-marked 默认参数）
//   3. 渲染标签：块级标签先展开内部嵌套标签，再调用原版标签函数（Nunjucks 语义）
//   4. 回填占位，并执行 Stellar 的 after_post_render 过滤器（表格滚动容器）
import { Marked, type Tokens } from 'marked'
import * as yaml from 'js-yaml'
import { splitTagArgs } from './args'
import { createContext, type StellarContext } from './context'
import { highlightBlock } from './highlight'
import icons from './generated/icons.json'
import stellarConfig from './generated/config.json'
import katex from 'katex'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vendorRegistry: VendorEntry[] = require('./vendor/registry.js')

type TagFn = (this: unknown, args: string[], content?: string) => string
interface VendorEntry { name: string; ends: boolean; variant: string | null; factory: (ctx: StellarContext, variant?: string) => TagFn }
interface TagDef { ends: boolean; fn: TagFn }

export interface FrontMatter {
  title?: string
  date?: string | Date
  updated?: string | Date
  tags?: string[] | string
  categories?: string[] | string
  description?: string
  cover?: string
  banner?: string
  [key: string]: unknown
}

export interface RenderResult {
  html: string
  frontMatter: FrontMatter
  frontMatterError?: string
  body: string
  wordCount: number
  errors: string[]
  render: RenderOptions
}

export interface RenderOptions {
  /** 数学公式：katex 在编辑器内渲染（相当于博客的 KaTeX Markdown 渲染器），mathjax 交给预览页客户端排版 */
  math: 'katex' | 'mathjax' | null
  /** Mermaid 参数（theme 等），null 表示不渲染 */
  diagrams: Record<string, unknown> | null
}

/**
 * 与 scripts/lib/contribution-registry.js 相同的选择规则：
 * render.math 省略时沿用 features.math.provider；
 * render.diagrams 为 false 关闭、字符串指定 provider、对象视为 mermaid 并合并参数，省略时沿用 features.diagrams.provider。
 */
export function resolveRenderOptions(fm: FrontMatter): RenderOptions {
  const render = (fm.render && typeof fm.render === 'object' ? fm.render : {}) as Record<string, unknown>
  const features = (stellarConfig as { features: { math: { provider: string | null }; diagrams: { provider: string | null; mermaid: Record<string, unknown> } } }).features
  const mathValue = render.math === false ? null : (render.math as string | undefined) || features.math.provider
  const math = mathValue === 'katex' || mathValue === 'mathjax' ? mathValue : null
  const override = render.diagrams
  const provider =
    override === false ? null : typeof override === 'string' ? override : override && typeof override === 'object' ? 'mermaid' : features.diagrams.provider
  let diagrams: Record<string, unknown> | null = null
  if (provider === 'mermaid') {
    const { js: _js, ...base } = features.diagrams.mermaid
    void _js
    const own = override && typeof override === 'object' ? { ...(override as Record<string, unknown>) } : {}
    delete own.js
    diagrams = { ...base, ...own }
  }
  return { math, diagrams }
}

// 与 Hexo PostRenderEscape 相同的占位形式：<!--\uFFFC{n}-->。
// 位于行首时它是 HTML 块，能打断段落；位于行内时是内联 HTML。
const PLACEHOLDER = (n: number) => `<!--\uFFFC${n}-->`
const PLACEHOLDER_RE = /(?:<|&lt;)!--\uFFFC(\d+)--(?:>|&gt;)/g

function escapeText(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// hexo-util slugize：去 HTML、特殊字符转 -、合并连续分隔符、去首尾分隔符（hexo-renderer-marked 默认不改大小写）
function slugify(text: string) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'<>,.?/]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function unescapeText(s: string) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
}

// ---------------- Markdown ----------------

function renderTex(tex: string, display: boolean, provider: 'katex' | 'mathjax') {
  if (provider === 'mathjax') {
    // 原样交给 MathJax（delimiters 与 runtime/extensions/mathjax.js 一致），只做 HTML 转义
    return display ? `<p>$$${escapeText(tex)}$$</p>\n` : `$${escapeText(tex)}$`
  }
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'htmlAndMathml' }) + (display ? '\n' : '')
  } catch (e) {
    return `<span class="sw-tag-error">${escapeText((e as Error).message)}</span>`
  }
}

function createMarked(math: RenderOptions['math'] = null) {
  const marked = new Marked({ gfm: true, breaks: true })
  if (math) {
    // $$…$$ 块级公式与 $…$ 行内公式；先于 Markdown 解析，避免 _ * 被当成强调
    marked.use({
      extensions: [
        {
          name: 'mathBlock',
          level: 'block',
          start: (src: string) => src.match(/\$\$/)?.index,
          tokenizer(src: string) {
            const m = /^\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/.exec(src)
            if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() }
          },
          renderer: (token) => renderTex(token.text as string, true, math),
        },
        {
          name: 'mathInline',
          level: 'inline',
          start: (src: string) => src.indexOf('$') >= 0 ? src.indexOf('$') : undefined,
          tokenizer(src: string) {
            const m = /^\$\$([^$]+?)\$\$|^\$(?!\s)((?:\\.|[^$\\\n])+?)(?<!\s)\$(?!\d)/.exec(src)
            if (m) return { type: 'mathInline', raw: m[0], text: (m[1] ?? m[2]).trim(), display: m[1] !== undefined }
          },
          renderer: (token) => renderTex(token.text as string, Boolean(token.display), math),
        },
      ],
    })
  }
  const usedIds = new Map<string, number>()
  marked.use({
    renderer: {
      // 与 hexo-renderer-marked 一致的标题结构：id + headerlink
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Heading) {
        const text = this.parser.parseInline(token.tokens)
        const plain = unescapeText(text.replace(/<[^>]*>/g, '')).trim()
        // 与 hexo-renderer-marked 一致：重复的 id 追加 -1、-2
        let id = slugify(plain)
        const seen = usedIds.get(id)
        usedIds.set(id, (seen ?? -1) + 1)
        if (seen !== undefined) id = `${id}-${seen + 1}`
        return `<h${token.depth} id="${id}"><a href="#${id}" class="headerlink" title="${escapeText(plain)}"></a>${text}</h${token.depth}>`
      },
    },
  })
  return marked
}

// ---------------- 代码块 ----------------

function extractCodeBlocks(src: string, store: string[], mermaid = false) {
  const lines = src.split('\n')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const open = /^(\s*)(`{3,}|~{3,})\s*([^`\n]*)$/.exec(lines[i])
    if (!open) {
      out.push(lines[i])
      continue
    }
    const [, indent, fence, info] = open
    const closeRe = new RegExp(`^\\s*${fence[0] === '`' ? '`' : '~'}{${fence.length},}\\s*$`)
    let j = i + 1
    while (j < lines.length && !closeRe.test(lines[j])) j++
    const code = lines
      .slice(i + 1, j)
      .map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l.trimStart()))
      .join('\n')
    const [lang = '', ...rest] = info.trim().split(/\s+/)
    let caption: string | undefined, url: string | undefined, linkText: string | undefined
    if (rest.length > 0) {
      const urlIdx = rest.findIndex((t) => /^(https?:)?\/\//.test(t))
      if (urlIdx >= 0) {
        caption = rest.slice(0, urlIdx).join(' ')
        url = rest[urlIdx]
        linkText = rest.slice(urlIdx + 1).join(' ') || undefined
      } else {
        caption = rest.join(' ')
      }
    }
    if (mermaid && lang === 'mermaid') {
      // 输出 Stellar diagrams 扩展消费的 .mermaid 节点
      store.push(`<pre class="mermaid">${escapeText(code)}</pre>`)
    } else {
      store.push(highlightBlock(code, { lang, caption, url, linkText }))
    }
    out.push(`${indent}<pre data-sw-code="${store.length - 1}"></pre>`)
    // 保持行数一致，方便编辑器与预览按行同步
    for (let k = i + 1; k <= Math.min(j, lines.length - 1); k++) out.push('')
    i = j
  }
  return out.join('\n')
}

// 行内代码占位：私有区字符，Markdown 原样保留，不会被当成 HTML 块
const INLINE_CODE = (n: number) => `\uE000${n}\uE001`
const INLINE_CODE_RE = /\uE000(\d+)\uE001/g

function restoreCodeBlocks(html: string, store: string[]) {
  return html
    .replace(/(?:<p>)?<pre data-sw-code="(\d+)"><\/pre>(?:<\/p>)?/g, (_, n) => store[Number(n)] ?? '')
    .replace(INLINE_CODE_RE, (_, n) => store[Number(n)] ?? '')
}

/**
 * 行内代码里的 {% %} 按代码原样显示，不当作标签执行。
 * 只替换含 {% 的代码段，其余行内代码仍交给 Markdown 渲染器。
 */
function protectInlineCode(src: string, store: string[]) {
  let out = ''
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\' && src[i + 1] === '`') {
      out += src.slice(i, i + 2)
      i += 2
      continue
    }
    if (ch !== '`') {
      out += ch
      i++
      continue
    }
    let n = 1
    while (src[i + n] === '`') n++
    // 找到长度完全相同的结束反引号串，且不跨越空行
    let j = i + n
    let close = -1
    while (j < src.length) {
      if (src[j] === '\n' && /^\n[ \t]*\n/.test(src.slice(j))) break
      if (src[j] === '`') {
        let m = 1
        while (src[j + m] === '`') m++
        if (m === n) {
          close = j
          break
        }
        j += m
        continue
      }
      j++
    }
    if (close < 0) {
      out += src.slice(i, i + n)
      i += n
      continue
    }
    const raw = src.slice(i + n, close)
    if (raw.includes('{%')) {
      let code = raw.replace(/\n/g, ' ')
      if (/^ .*[^ ].* $/.test(code)) code = code.slice(1, -1)
      store.push(`<code>${escapeText(code)}</code>`)
      out += INLINE_CODE(store.length - 1)
    } else {
      out += src.slice(i, close + n)
    }
    i = close + n
  }
  return out
}

// ---------------- 标签 ----------------

function inlineLabel(tag: string): TagFn {
  return (args) => `<${tag}>${args.join(' ')}</${tag}>`
}

function buildRegistry(ctx: StellarContext): Map<string, TagDef> {
  const map = new Map<string, TagDef>()
  for (const entry of vendorRegistry) {
    map.set(entry.name, { ends: entry.ends, fn: entry.factory(ctx, entry.variant ?? undefined) })
  }
  // scripts/tags/inline-labels.js
  for (const t of ['u', 'emp', 'wavy', 'del', 'kbd', 'psw', 'blur']) map.set(t, { ends: false, fn: inlineLabel(t) })
  for (const t of ['sup', 'sub']) {
    map.set(t, {
      ends: false,
      fn: (raw) => {
        const args = ctx.args.map(raw, ['color'], ['text'])
        return `<${t} class="tag-plugin colorful ${t}" ${ctx.args.joinTags(args, ['color']).join(' ')}>${args.text}</${t}>`
      },
    })
  }
  return map
}

export const TAG_NAMES: string[] = [...vendorRegistry.map((e) => e.name), 'u', 'emp', 'wavy', 'del', 'kbd', 'psw', 'blur', 'sup', 'sub']
export const BLOCK_TAGS = new Set(vendorRegistry.filter((e) => e.ends).map((e) => e.name))

const TAG_RE = /\{%-?\s*([\w-]+)([\s\S]*?)-?%\}/g

interface Scanned { start: number; end: number; name: string; args: string; content?: string }

/** 扫描下一个标签（含块级标签的结束位置）。 */
function scanTags(src: string, registry: Map<string, TagDef>): Array<Scanned | { error: string; start: number; end: number }> {
  const result: Array<Scanned | { error: string; start: number; end: number }> = []
  TAG_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TAG_RE.exec(src))) {
    const [full, name, args] = m
    const start = m.index
    if (name === 'raw') {
      const endRe = /\{%-?\s*endraw\s*-?%\}/g
      endRe.lastIndex = start + full.length
      const e = endRe.exec(src)
      const end = e ? e.index + e[0].length : src.length
      result.push({ start, end, name: 'raw', args: '', content: src.slice(start + full.length, e ? e.index : src.length) })
      TAG_RE.lastIndex = end
      continue
    }
    if (name.startsWith('end')) {
      result.push({ start, end: start + full.length, error: `多余的结束标签 {% ${name} %}` })
      continue
    }
    const def = registry.get(name)
    if (!def) {
      result.push({ start, end: start + full.length, error: `未知标签 {% ${name} %}` })
      continue
    }
    if (!def.ends) {
      result.push({ start, end: start + full.length, name, args })
      continue
    }
    // 块级标签：计数同名嵌套，找到匹配的 endxxx
    const pair = new RegExp(`\\{%-?\\s*(end)?${name}(?:\\s[\\s\\S]*?)?\\s*-?%\\}`, 'g')
    pair.lastIndex = start + full.length
    let depth = 1
    let p: RegExpExecArray | null
    let closeStart = -1
    let closeEnd = -1
    while ((p = pair.exec(src))) {
      depth += p[1] ? -1 : 1
      if (depth === 0) {
        closeStart = p.index
        closeEnd = p.index + p[0].length
        break
      }
    }
    if (closeStart < 0) {
      result.push({ start, end: start + full.length, error: `{% ${name} %} 缺少 {% end${name} %}` })
      continue
    }
    result.push({ start, end: closeEnd, name, args, content: src.slice(start + full.length, closeStart) })
    TAG_RE.lastIndex = closeEnd
  }
  return result
}

function errorBox(message: string) {
  return `<span class="sw-tag-error" title="${escapeText(message)}">${escapeText(message)}</span>`
}

// ---------------- 主流程 ----------------

export function parseFrontMatter(src: string): { data: FrontMatter; body: string; error?: string; lines: number } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src)
  if (!m) return { data: {}, body: src, lines: 0 }
  const lines = m[0].split('\n').length - (m[0].endsWith('\n') ? 1 : 0)
  try {
    const data = (yaml.load(m[1]) as FrontMatter) || {}
    return { data: typeof data === 'object' ? data : {}, body: src.slice(m[0].length), lines }
  } catch (e) {
    return { data: {}, body: src.slice(m[0].length), error: (e as Error).message.split('\n')[0], lines }
  }
}

export function countWords(text: string) {
  const plain = text.replace(/```[\s\S]*?```/g, '').replace(/\{%[\s\S]*?%\}/g, '').replace(/<[^>]+>/g, '')
  const cjk = (plain.match(/[一-龥぀-ヿ가-힯]/g) || []).length
  const words = (plain.replace(/[一-龥぀-ヿ가-힯]/g, ' ').match(/[A-Za-z0-9_À-ɏ]+/g) || []).length
  return cjk + words
}

export function renderStellar(source: string, language = 'zh-CN'): RenderResult {
  const errors: string[] = []
  const fm = parseFrontMatter(source)
  const renderOptions = resolveRenderOptions(fm.data)
  const codeStore: string[] = []
  const marked = createMarked(renderOptions.math)
  const md = (text: string) => restoreCodeBlocks(marked.parse(text, { async: false }) as string, codeStore)
  const ctx = createContext(md, language)
  const registry = buildRegistry(ctx)
  const pageThis = { __: ctx.__, page: fm.data }

  const renderTag = (t: Scanned): string => {
    if (t.name === 'raw') return t.content ?? ''
    const def = registry.get(t.name)!
    let content = t.content
    if (content !== undefined) content = expandNested(content)
    try {
      const out = def.fn.call(pageThis, splitTagArgs(t.args), content)
      return typeof out === 'string' ? out : ''
    } catch (e) {
      const msg = `{% ${t.name} %} 渲染失败：${(e as Error).message}`
      errors.push(msg)
      return errorBox(msg)
    }
  }

  // Nunjucks 会先渲染块内的嵌套标签，再把结果交给外层标签
  const expandNested = (text: string): string => {
    const found = scanTags(text, registry)
    if (found.length === 0) return text
    let out = ''
    let pos = 0
    for (const t of found) {
      out += text.slice(pos, t.start)
      if ('error' in t) {
        errors.push(t.error)
        out += errorBox(t.error)
      } else {
        out += renderTag(t)
      }
      pos = t.end
    }
    return out + text.slice(pos)
  }

  // 1. 代码块（保留 front matter 占位行，保证行号对应）
  const fmPadding = '\n'.repeat(fm.lines)
  let body = protectInlineCode(extractCodeBlocks(fm.body, codeStore, renderOptions.diagrams !== null), codeStore)

  // 2. 顶层标签 -> 占位
  const outputs: string[] = []
  const found = scanTags(body, registry)
  if (found.length > 0) {
    let next = ''
    let pos = 0
    for (const t of found) {
      next += body.slice(pos, t.start)
      let html: string
      if ('error' in t) {
        errors.push(t.error)
        html = errorBox(t.error)
      } else {
        html = renderTag(t)
      }
      outputs.push(html)
      // 块级标签输出保持源码行数，便于滚动同步
      const lineCount = body.slice(t.start, t.end).split('\n').length - 1
      next += PLACEHOLDER(outputs.length - 1) + '\n'.repeat(lineCount)
      pos = t.end
    }
    body = next + body.slice(pos)
  }

  const unclosed = body.match(/\{%(?![\s\S]*?%\})[^\n]*/)
  if (unclosed) errors.push(`标签缺少结尾的 %}：${unclosed[0].slice(0, 24)}`)

  // 3. Markdown
  let html = marked.parse(fmPadding + body, { async: false }) as string

  // 4. 回填标签、代码块
  html = html.replace(PLACEHOLDER_RE, (_, n) => outputs[Number(n)] ?? '')
  html = restoreCodeBlocks(html, codeStore)
  html = postProcess(html)

  return {
    html,
    frontMatter: fm.data,
    frontMatterError: fm.error,
    render: renderOptions,
    body: fm.body,
    wordCount: countWords(fm.body),
    errors,
  }
}

const LINK_ICON = (icons as Record<string, string>)['default:link'] ?? ''
// 站点 url：与 Hexo 一样，站内相对链接也按 http(s) 处理
const SITE_URL = 'https://example.com'

/**
 * Stellar 的 after_post_render / after_render:html 过滤器：
 * - md_table.js：普通表格包一层 .md-table-scroll
 * - md_link.js：正文外链前加链接图标并标记 data-md-link
 * - img_lazyload.js：图片改为懒加载（预览运行时会立即加载）
 */
function postProcess(html: string) {
  if (typeof DOMParser === 'undefined') return html
  if (!html.includes('<table') && !html.includes('<a') && !html.includes('<img')) return html
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  doc.querySelectorAll('table').forEach((table) => {
    if (table.parentElement?.classList.contains('md-table-scroll')) return
    if (table.closest('.highlight') || table.closest('.tag-plugin.table')) return
    const wrap = doc.createElement('div')
    wrap.className = 'md-table-scroll'
    table.replaceWith(wrap)
    wrap.appendChild(table)
  })
  doc.querySelectorAll('a[href]').forEach((link) => {
    const href = (link.getAttribute('href') ?? '').trim()
    if (!href || href.startsWith('#') || link.getAttribute('class') || link.getAttribute('role')) return
    if (link.matches('[cardlink], [data-md-link], [data-siteinfo-api]')) return
    if (link.closest('pre, code, .highlight, .footnotes')) return
    if (link.querySelector('img, svg') || !link.textContent?.trim()) return
    let url: URL
    try {
      url = new URL(href, SITE_URL)
    } catch {
      return
    }
    if (!['http:', 'https:'].includes(url.protocol)) return
    link.setAttribute('data-md-link', '')
    link.insertAdjacentHTML('afterbegin', `<span class="md-link-icon ui-icon" aria-hidden="true">${LINK_ICON}</span>`)
  })
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src') ?? ''
    if (img.hasAttribute('data-src') || img.hasAttribute('srcset') || img.hasAttribute('no-lazy') || !src || src.startsWith('data:image')) return
    img.classList.add('lazy')
    img.setAttribute('data-src', src)
    img.removeAttribute('src')
  })
  return doc.body.innerHTML
}
