// 复刻 hexo-util highlight（hljs: false、line_number: true、wrap: true）的输出结构：
// <figure class="highlight lang"><figcaption/>?<table><tr><td class="gutter">…</td><td class="code">…</td></tr></table></figure>
import hljs from 'highlight.js/lib/common'

hljs.configure({ classPrefix: '' })

function escapeCode(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 把含跨行 span 的高亮 HTML 切成逐行 HTML，每行自闭合并在下一行重新打开。 */
function splitLines(html: string): string[] {
  const lines: string[] = []
  const stack: string[] = []
  let cur = ''
  const re = /(<span[^>]*>)|(<\/span>)|(\n)|([^<\n]+|<)/g
  for (const m of html.matchAll(re)) {
    if (m[1]) {
      stack.push(m[1])
      cur += m[1]
    } else if (m[2]) {
      stack.pop()
      cur += m[2]
    } else if (m[3]) {
      cur += '</span>'.repeat(stack.length)
      lines.push(cur)
      cur = stack.join('')
    } else {
      cur += m[4]
    }
  }
  lines.push(cur)
  return lines
}

const LANG_ALIAS: Record<string, string> = { sh: 'bash', zsh: 'bash', shell: 'bash', yml: 'yaml', js: 'javascript', ts: 'typescript', py: 'python', rs: 'rust', md: 'markdown', html: 'xml', vue: 'xml' }

export interface CodeBlockOptions {
  lang: string
  caption?: string
  url?: string
  linkText?: string
}

export function highlightBlock(code: string, opts: CodeBlockOptions): string {
  code = code.replace(/\t/g, '  ').replace(/\n$/, '')
  const lang = (opts.lang || '').trim()
  const hlLang = LANG_ALIAS[lang.toLowerCase()] || lang.toLowerCase()
  let html: string
  if (hlLang && hljs.getLanguage(hlLang)) {
    try {
      html = hljs.highlight(code, { language: hlLang, ignoreIllegals: true }).value
    } catch {
      html = escapeCode(code)
    }
  } else {
    html = escapeCode(code)
  }
  const lines = splitLines(html)
  let gutter = ''
  let body = ''
  lines.forEach((line, i) => {
    gutter += `<span class="line">${i + 1}</span><br>`
    body += `<span class="line">${line}</span><br>`
  })
  let caption = ''
  if (opts.caption) {
    caption = `<figcaption><span>${opts.caption}</span>`
    if (opts.url) caption += `<a href="${opts.url}">${opts.linkText || 'link'}</a>`
    caption += '</figcaption>'
  }
  const cls = lang ? ` ${lang}` : ' plaintext'
  return `<figure class="highlight${cls}">${caption}<table><tr><td class="gutter"><pre>${gutter}</pre></td><td class="code"><pre>${body}</pre></td></tr></table></figure>`
}
