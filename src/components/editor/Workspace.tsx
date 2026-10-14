'use client'

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { renderStellar } from '@/lib/stellar/render'
import { articleBanner, articleTags, readingMinutes } from '@/lib/stellar/document'
import type { TagSnippet } from '@/lib/stellar/catalog'
import { SAMPLE_POST } from '@/lib/sample'
import { CodeEditor, type EditorHandle } from './CodeEditor'
import { PreviewFrame, type PreviewHandle, type PreviewTheme } from './PreviewFrame'
import { TagPalette } from './TagPalette'
import { Icon } from './icons'
import { Toolbar } from './Toolbar'

export type View = 'edit' | 'split' | 'preview'

const DRAFT_KEY = 'stellar-writing:draft'
const PREFS_KEY = 'stellar-writing:prefs'

interface Draft { source: string; fileName: string; savedAt: number }
interface Prefs { view: View; theme: PreviewTheme; split: number; sync: boolean }

function load<T>(key: string): Partial<T> | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Partial<T>) : null
  } catch {
    return null
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function timeLabel(ts: number) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function slugFile(title: unknown) {
  const base = typeof title === 'string' && title.trim() ? title.trim() : 'untitled'
  return base.replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 60) + '.md'
}

export default function Workspace() {
  const [initial] = useState(() => {
    const draft = load<Draft>(DRAFT_KEY)
    const prefs = load<Prefs>(PREFS_KEY)
    return {
      source: typeof draft?.source === 'string' ? draft.source : SAMPLE_POST,
      fileName: draft?.fileName ?? '',
      savedAt: draft?.savedAt ?? 0,
      view: prefs?.view ?? 'split',
      theme: prefs?.theme ?? 'light',
      split: prefs?.split ?? 0.5,
      sync: prefs?.sync ?? true,
    }
  })
  const [source, setSource] = useState(initial.source)
  const [fileName, setFileName] = useState(initial.fileName)
  const [savedAt, setSavedAt] = useState(initial.savedAt)
  const [saveFailed, setSaveFailed] = useState(false)
  const [view, setView] = useState<View>(initial.view)
  const [theme, setTheme] = useState<PreviewTheme>(initial.theme)
  const [split, setSplit] = useState(initial.split)
  const [sync, setSync] = useState(initial.sync)
  const [cursor, setCursor] = useState({ line: 1, col: 1, heading: 0 })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [narrow, setNarrow] = useState(false)

  const editor = useRef<EditorHandle | null>(null)
  const preview = useRef<PreviewHandle>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const panes = useRef<HTMLDivElement>(null)

  // 渲染：输入时优先保证编辑器流畅，预览延后一帧
  const deferred = useDeferredValue(source)
  const result = useMemo(() => renderStellar(deferred), [deferred])
  const previewHtml = useMemo(
    () =>
      articleBanner(result.frontMatter, result.wordCount) +
      `<article class="md-text content">${result.html}</article>` +
      articleTags(result.frontMatter),
    [result],
  )

  // 自动保存草稿
  useEffect(() => {
    const id = setTimeout(() => {
      const now = Date.now()
      if (store(DRAFT_KEY, { source, fileName, savedAt: now })) {
        setSavedAt(now)
        setSaveFailed(false)
      } else {
        setSaveFailed(true)
      }
    }, 600)
    return () => clearTimeout(id)
  }, [source, fileName])

  useEffect(() => {
    store(PREFS_KEY, { view, theme, split, sync })
  }, [view, theme, split, sync])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 820px)')
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // 点击菜单以外的地方（包括预览 iframe）时收起下拉菜单
  useEffect(() => {
    const closeMenus = (target: EventTarget | null) => {
      document.querySelectorAll('details.menu[open]').forEach((menu) => {
        if (!(target instanceof Node) || !menu.contains(target)) menu.removeAttribute('open')
      })
    }
    const onDown = (e: PointerEvent) => closeMenus(e.target)
    const onBlur = () => closeMenus(null)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 2200)
    return () => clearTimeout(id)
  }, [notice])

  const effectiveView: View = narrow && view === 'split' ? 'edit' : view

  const saveNow = useCallback(() => {
    const now = Date.now()
    if (store(DRAFT_KEY, { source, fileName, savedAt: now })) {
      setSavedAt(now)
      setNotice('草稿已保存在本机浏览器')
    } else {
      setSaveFailed(true)
      setNotice('保存失败：浏览器存储不可用，请导出 .md 备份')
    }
  }, [source, fileName])

  function insertTag(tag: TagSnippet) {
    setPaletteOpen(false)
    if (effectiveView === 'preview') setView(narrow ? 'edit' : 'split')
    requestAnimationFrame(() => editor.current?.insertSnippet(tag.snippet, tag.block))
  }

  function download() {
    const name = fileName || slugFile(result.frontMatter.title)
    const blob = new Blob([source], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    setNotice(`已导出 ${name}`)
  }

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(result.html)
      setNotice('文章 HTML 已复制')
    } catch {
      setNotice('复制失败：浏览器没有授予剪贴板权限')
    }
  }

  function openFile(file: File) {
    file.text().then((text) => {
      setSource(text)
      setFileName(file.name)
      editor.current?.setValue(text)
      setNotice(`已打开 ${file.name}`)
    })
  }

  function resetSample() {
    if (source !== SAMPLE_POST && !window.confirm('用示例文章替换当前内容？当前草稿会被覆盖。')) return
    setSource(SAMPLE_POST)
    setFileName('')
    editor.current?.setValue(SAMPLE_POST)
  }

  function startDrag(e: React.PointerEvent) {
    const box = panes.current?.getBoundingClientRect()
    if (!box) return
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    document.body.classList.add('is-resizing')
    const move = (ev: PointerEvent) => setSplit(Math.min(0.75, Math.max(0.25, (ev.clientX - box.left) / box.width)))
    const up = () => {
      document.body.classList.remove('is-resizing')
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  const title = typeof result.frontMatter.title === 'string' && result.frontMatter.title.trim() ? result.frontMatter.title : '未命名文章'
  const issues = result.errors.length + (result.frontMatterError ? 1 : 0)

  return (
    <div className="app" data-view={effectiveView}>
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand" aria-label="Stellar Writing">
            <Icon name="star" />
          </span>
          <div className="doc-meta">
            <h1 className="doc-title" title={title}>{title}</h1>
            <p className={saveFailed ? 'save-state is-error' : 'save-state'}>
              {saveFailed ? '未能保存到本机' : savedAt ? `已保存 ${timeLabel(savedAt)}` : '未保存'}
              {fileName && <span className="file-name"> · {fileName}</span>}
            </p>
          </div>
        </div>

        <div className="topbar-right">
          <button className="btn btn-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title={theme === 'light' ? '预览切换为深色' : '预览切换为浅色'} aria-label="切换预览深浅色">
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
          <details className="menu">
            <summary className="btn btn-icon" aria-label="文件" title="文件">
              <Icon name="dots" />
            </summary>
            <div className="menu-pop" onClick={(e) => (e.currentTarget.parentElement as HTMLDetailsElement).removeAttribute('open')}>
              <button onClick={() => fileInput.current?.click()}><Icon name="upload" />打开 .md 文件</button>
              <button onClick={download}><Icon name="download" />导出 .md 文件</button>
              <button onClick={copyHtml}><Icon name="copy" />复制文章 HTML</button>
              <hr />
              <button onClick={() => setSync(!sync)}><Icon name={sync ? 'check' : 'blank'} />滚动同步</button>
              <button onClick={resetSample}><Icon name="reset" />载入示例文章</button>
            </div>
          </details>
          <input
            ref={fileInput}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) openFile(f)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      <Toolbar
        editor={editor}
        heading={cursor.heading}
        view={effectiveView}
        views={narrow ? ['edit', 'preview'] : ['edit', 'split', 'preview']}
        onView={setView}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <div className="panes" ref={panes} style={{ '--split': `${split * 100}%` } as React.CSSProperties}>
        <section className="pane pane-editor" aria-label="Markdown 编辑器">
          <CodeEditor
            initialValue={initial.source}
            handleRef={editor}
            onChange={setSource}
            onCursor={(line, col, heading) => setCursor({ line, col, heading })}
            onScroll={(r) => sync && effectiveView === 'split' && preview.current?.scrollToRatio(r)}
            onSave={saveNow}
            onOpenPalette={() => setPaletteOpen(true)}
          />
        </section>
        <div className="divider" onPointerDown={startDrag} onDoubleClick={() => setSplit(0.5)} role="separator" aria-orientation="vertical" title="拖动调整宽度，双击还原" />
        <section className="pane pane-preview" aria-label="Stellar 预览" data-theme={theme}>
          <PreviewFrame ref={preview} html={previewHtml} theme={theme} />
        </section>
      </div>

      <footer className="statusbar">
        <span>第 {cursor.line} 行，第 {cursor.col} 列</span>
        <span>{result.wordCount.toLocaleString('zh-CN')} 字 · 约 {readingMinutes(result.wordCount)} 分钟</span>
        {issues > 0 ? (
          <span className="status-issue" title={[result.frontMatterError, ...result.errors].filter(Boolean).join('\n')}>
            <Icon name="warn" />
            {result.frontMatterError ? 'Front Matter 格式有误' : `${result.errors.length} 处标签需要检查`}
          </span>
        ) : (
          <span className="status-ok">标签全部可渲染</span>
        )}
        <span className="status-spacer" />
        <span className="status-hint">输入 {'{%'} 补全标签 · ⌘/ 打开标签库 · ⌘S 保存</span>
      </footer>

      {paletteOpen && <TagPalette onClose={() => setPaletteOpen(false)} onPick={insertTag} />}
      {notice && (
        <div className="notice" role="status" key={notice}>
          {notice}
        </div>
      )}
    </div>
  )
}
