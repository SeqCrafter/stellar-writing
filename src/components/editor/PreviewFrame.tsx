'use client'

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { FONT_STYLESHEETS } from '@/lib/fonts'

export type PreviewTheme = 'light' | 'dark'

export interface PreviewHandle {
  scrollToRatio: (ratio: number) => void
  getDocumentHtml: () => string
}

// 预览是独立的 iframe 文档，外层页面加载的字体不会传进来，需要在这里单独引入。
const SHELL = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${FONT_STYLESHEETS.map((href) => `<link rel="stylesheet" href="${href.replace(/&/g, '&amp;')}">`).join('')}
<link rel="stylesheet" href="/stellar/stellar.css"><link rel="stylesheet" href="/stellar/stellar-icons.css"><link rel="stylesheet" href="/stellar/preview-extra.css">
<script src="/stellar/preview-runtime.js"></script></head>
<body data-page-type="content" data-page-layout="post" data-article-style="tech"><div class="site-shell" id="start" data-regions=""><div class="site-workspace"><main class="site-main" id="main"><div id="sw-root"></div></main></div></div></body></html>`

interface Props {
  html: string
  theme: PreviewTheme
  ref?: Ref<PreviewHandle>
}

export function PreviewFrame({ html, theme, ref }: Props) {
  const frame = useRef<HTMLIFrameElement>(null)
  const ready = useRef(false)
  const pending = useRef({ html, theme })

  useEffect(() => {
    pending.current = { html, theme }
    if (ready.current) apply()
  }, [html, theme])

  function apply() {
    const doc = frame.current?.contentDocument
    const root = doc?.getElementById('sw-root')
    if (!doc || !root) return
    doc.documentElement.setAttribute('data-theme', pending.current.theme)
    if (root.innerHTML !== pending.current.html) {
      // 保留滚动位置与已展开的折叠块
      const open = Array.from(root.querySelectorAll('details[open]')).map((d) => d.querySelector('summary')?.textContent ?? '')
      const activeTabs = Array.from(root.querySelectorAll('.tag-plugin.tabs')).map((t) =>
        Array.from(t.querySelectorAll(':scope > .nav-tabs > .tab')).findIndex((x) => x.classList.contains('active')),
      )
      root.innerHTML = pending.current.html
      root.querySelectorAll('details').forEach((d) => {
        const key = d.querySelector('summary')?.textContent ?? ''
        if (open.includes(key)) d.setAttribute('open', '')
      })
      // 标签页保持之前选中的那一页
      root.querySelectorAll('.tag-plugin.tabs').forEach((t, i) => {
        const idx = activeTabs[i]
        if (idx == null || idx < 0) return
        const tabs = t.querySelectorAll(':scope > .nav-tabs > .tab')
        const panes = t.querySelectorAll(':scope > .tab-content > .tab-pane')
        if (!tabs[idx] || !panes[idx]) return
        tabs.forEach((x, k) => x.classList.toggle('active', k === idx))
        panes.forEach((x, k) => x.classList.toggle('active', k === idx))
      })
      const win = frame.current?.contentWindow as (Window & { __swHydrate?: (el: Element) => void }) | null
      win?.__swHydrate?.(root)
    }
  }

  useImperativeHandle(ref, () => ({
    scrollToRatio(ratio) {
      const el = frame.current?.contentDocument?.scrollingElement
      if (!el) return
      el.scrollTop = ratio * (el.scrollHeight - el.clientHeight)
    },
    getDocumentHtml() {
      const doc = frame.current?.contentDocument
      return doc?.getElementById('sw-root')?.innerHTML ?? ''
    },
  }))

  return (
    <iframe
      ref={frame}
      className="preview-frame"
      title="Stellar 预览"
      srcDoc={SHELL}
      onLoad={() => {
        ready.current = true
        apply()
      }}
    />
  )
}
