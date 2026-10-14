'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TAG_CATALOG, TAG_GROUPS, type TagSnippet } from '@/lib/stellar/catalog'

interface Props {
  onClose: () => void
  onPick: (tag: TagSnippet) => void
}

// 由父组件按需挂载，每次打开都是全新状态
export function TagPalette({ onClose, onPick }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TAG_CATALOG
    return TAG_CATALOG.filter((t) => t.name.includes(q) || t.label.toLowerCase().includes(q) || t.group.includes(q))
  }, [query])

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const current = items[Math.min(active, items.length - 1)]

  return (
    <div className="palette-scrim" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-label="插入 Stellar 标签" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-search">
          <span className="palette-prompt" aria-hidden>{'{%'}</span>
          <input
            ref={input}
            autoFocus
            value={query}
            placeholder="搜索标签，例如 note、折叠、时间线"
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              // 中文输入法选词时的回车不触发插入
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter' && current) {
                e.preventDefault()
                onPick(current)
              } else if (e.key === 'Escape') {
                onClose()
              }
            }}
          />
          <kbd className="palette-esc">Esc</kbd>
        </div>
        <div className="palette-body">
          <div className="palette-list" ref={list}>
            {items.length === 0 && <p className="palette-empty">没有找到「{query}」相关的标签</p>}
            {TAG_GROUPS.map((group) => {
              const groupItems = items.filter((t) => t.group === group)
              if (groupItems.length === 0) return null
              return (
                <section key={group}>
                  <h3>{group}</h3>
                  {groupItems.map((tag) => {
                    const index = items.indexOf(tag)
                    return (
                      <button
                        key={tag.name}
                        data-index={index}
                        className={index === active ? 'palette-item is-active' : 'palette-item'}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => onPick(tag)}
                      >
                        <span className="palette-name">{tag.name}</span>
                        <span className="palette-label">{tag.label}</span>
                        {tag.block && <span className="palette-badge">块级</span>}
                      </button>
                    )
                  })}
                </section>
              )
            })}
          </div>
          {current && (
            <aside className="palette-detail">
              <p className="palette-detail-title">
                {current.label} <span>{current.name}</span>
              </p>
              <p className="palette-detail-label">语法</p>
              <code>{current.syntax}</code>
              <p className="palette-detail-label">将插入</p>
              <pre>{current.snippet.replace(/\$\{([^}]*)\}/g, '$1')}</pre>
              <p className="palette-hint">回车插入，Tab 在占位之间跳转</p>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
