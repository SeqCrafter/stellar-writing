'use client'

import { useRef } from 'react'
import type { EditorHandle, LinePrefix } from './CodeEditor'
import { Icon } from './icons'
import type { View } from './Workspace'

interface Props {
  editor: React.RefObject<EditorHandle | null>
  heading: number
  view: View
  views: View[]
  onView: (view: View) => void
  onOpenPalette: () => void
}

const VIEW_META: Record<View, { icon: string; label: string }> = {
  edit: { icon: 'view-edit', label: '沉浸写作（只看源码）' },
  split: { icon: 'view-split', label: '对照（边写边看）' },
  preview: { icon: 'view-preview', label: '只看预览' },
}

const HEADINGS = [
  { level: 0, label: '正文' },
  { level: 1, label: '标题 1' },
  { level: 2, label: '标题 2' },
  { level: 3, label: '标题 3' },
  { level: 4, label: '标题 4' },
  { level: 5, label: '标题 5' },
]

type Item =
  | { kind: 'wrap'; icon: string; title: string; before: string; after: string; fallback: string }
  | { kind: 'prefix'; icon: string; title: string; prefix: LinePrefix }
  | { kind: 'block'; icon: string; title: string; snippet: string; block?: boolean }
  | { kind: 'sep' }

// 与 Stellar 一致的写法：下划线用 Stellar 的 {% u %} 行内标签
const GROUPS: Item[] = [
  { kind: 'wrap', icon: 'bold', title: '粗体（⌘B）', before: '**', after: '**', fallback: '粗体' },
  { kind: 'wrap', icon: 'italic', title: '斜体（⌘I）', before: '*', after: '*', fallback: '斜体' },
  { kind: 'wrap', icon: 'strike', title: '删除线', before: '~~', after: '~~', fallback: '删除线' },
  { kind: 'wrap', icon: 'underline', title: '下划线（Stellar {% u %}）', before: '{% u ', after: ' %}', fallback: '下划线' },
  { kind: 'sep' },
  { kind: 'block', icon: 'link', title: '链接', snippet: '[${链接文字}](${https://})' },
  { kind: 'wrap', icon: 'code', title: '行内代码', before: '`', after: '`', fallback: 'code' },
  { kind: 'block', icon: 'codeblock', title: '代码块', snippet: '```${js}\n${代码}\n```', block: true },
  { kind: 'sep' },
  { kind: 'prefix', icon: 'quote', title: '引用', prefix: 'quote' },
  { kind: 'prefix', icon: 'ul', title: '无序列表', prefix: 'ul' },
  { kind: 'prefix', icon: 'ol', title: '有序列表', prefix: 'ol' },
  { kind: 'prefix', icon: 'task', title: '任务列表', prefix: 'task' },
  { kind: 'block', icon: 'hr', title: '分割线', snippet: '---', block: true },
  { kind: 'sep' },
  { kind: 'block', icon: 'image', title: '图片', snippet: '![${图片说明}](${https://})' },
  { kind: 'block', icon: 'table', title: '表格', snippet: '| ${列 1} | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |', block: true },
]

export function Toolbar({ editor, heading, view, views, onView, onOpenPalette }: Props) {
  const headingMenu = useRef<HTMLDetailsElement>(null)
  // 只看预览时编辑器不可见，格式按钮置灰
  const editing = view !== 'preview'

  function run(item: Item) {
    const ed = editor.current
    if (!ed) return
    if (item.kind === 'wrap') ed.wrapSelection(item.before, item.after, item.fallback)
    else if (item.kind === 'prefix') ed.toggleLinePrefix(item.prefix)
    else if (item.kind === 'block') ed.insertSnippet(item.snippet, item.block)
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="编辑工具栏" data-editing={view !== 'preview'}>
      <button className="tool" disabled={!editing} title="撤销（⌘Z）" aria-label="撤销" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.current?.undo()}>
        <Icon name="undo" />
      </button>
      <button className="tool" disabled={!editing} title="重做（⇧⌘Z）" aria-label="重做" onMouseDown={(e) => e.preventDefault()} onClick={() => editor.current?.redo()}>
        <Icon name="redo" />
      </button>
      <span className="tool-sep" />
      <details className="menu tool-menu" ref={headingMenu} data-disabled={!editing || undefined}>
        <summary className="tool tool-wide" title="段落样式" onMouseDown={(e) => e.preventDefault()}>
          <span className="tool-heading">{heading > 0 ? `H${heading}` : '正文'}</span>
          <Icon name="chevron" />
        </summary>
        <div className="menu-pop menu-pop-left">
          {HEADINGS.map((h) => (
            <button
              key={h.level}
              className={heading === h.level ? 'is-current' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editor.current?.setHeading(h.level)
                headingMenu.current?.removeAttribute('open')
              }}
            >
              <span className={`heading-sample h${h.level}`}>{h.label}</span>
              {h.level > 0 && <kbd>{'#'.repeat(h.level)}</kbd>}
            </button>
          ))}
        </div>
      </details>
      <span className="tool-sep" />
      {GROUPS.map((item, i) =>
        item.kind === 'sep' ? (
          <span key={i} className="tool-sep" />
        ) : (
          <button key={i} className="tool" disabled={!editing} title={item.title} aria-label={item.title} onMouseDown={(e) => e.preventDefault()} onClick={() => run(item)}>
            <Icon name={item.icon} />
          </button>
        ),
      )}
      <span className="tool-spacer" />
      <div className="tool-views" role="radiogroup" aria-label="视图">
        {views.map((v) => (
          <button
            key={v}
            role="radio"
            aria-checked={view === v}
            aria-label={VIEW_META[v].label}
            title={VIEW_META[v].label}
            className={view === v ? 'tool is-on' : 'tool'}
            onClick={() => onView(v)}
          >
            <Icon name={VIEW_META[v].icon} />
          </button>
        ))}
      </div>
      <span className="tool-sep" />
      <button className="tool tool-accent" title="插入 Stellar 标签（⌘/）" aria-label="插入 Stellar 标签" onMouseDown={(e) => e.preventDefault()} onClick={onOpenPalette}>
        <span className="tool-glyph" aria-hidden>{'{%'}</span>
      </button>
    </div>
  )
}
