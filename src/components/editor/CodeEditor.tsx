'use client'

import { useEffect, useRef } from 'react'
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, undo } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { completionKeymap, snippet } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { drawSelection, dropCursor, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder } from '@codemirror/view'
import { stellarExtensions } from './stellar-language'

export interface EditorHandle {
  insertSnippet: (template: string, block?: boolean) => void
  wrapSelection: (before: string, after: string, fallback: string) => void
  focus: () => void
  setValue: (text: string) => void
  scrollToLine: (line: number) => void
  undo: () => void
  redo: () => void
  setHeading: (level: number) => void
  toggleLinePrefix: (kind: LinePrefix) => void
}

export type LinePrefix = 'quote' | 'ul' | 'ol' | 'task'

const PREFIX_RE: Record<LinePrefix, RegExp> = {
  quote: /^(\s*)> ?/,
  ul: /^(\s*)[-*+] (?!\[[ xX]\] )/,
  ol: /^(\s*)\d+[.)] /,
  task: /^(\s*)[-*+] \[[ xX]\] /,
}
const ANY_PREFIX = /^(\s*)(?:> ?|[-*+] \[[ xX]\] |[-*+] |\d+[.)] )/

interface Props {
  initialValue: string
  onChange: (value: string) => void
  onCursor: (line: number, col: number, heading: number) => void
  onScroll: (ratio: number) => void
  handleRef: React.RefObject<EditorHandle | null>
  onSave: () => void
  onOpenPalette: () => void
}

export function CodeEditor({ initialValue, onChange, onCursor, onScroll, handleRef, onSave, onOpenPalette }: Props) {
  const host = useRef<HTMLDivElement>(null)
  // 回调放进 ref，编辑器只创建一次
  const cb = useRef({ onChange, onCursor, onScroll, onSave, onOpenPalette })
  useEffect(() => {
    cb.current = { onChange, onCursor, onScroll, onSave, onOpenPalette }
  })

  useEffect(() => {
    if (!host.current) return
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          dropCursor(),
          indentOnInput(),
          bracketMatching(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          search({ top: true }),
          EditorView.lineWrapping,
          placeholder('从这里开始写。输入 {% 插入 Stellar 标签'),
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          stellarExtensions(),
          keymap.of([
            { key: 'Mod-s', preventDefault: true, run: () => (cb.current.onSave(), true) },
            { key: 'Mod-/', preventDefault: true, run: () => (cb.current.onOpenPalette(), true) },
            { key: 'Mod-b', run: (v) => wrap(v, '**', '**', '粗体') },
            { key: 'Mod-i', run: (v) => wrap(v, '*', '*', '斜体') },
            ...completionKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...defaultKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) cb.current.onChange(u.state.doc.toString())
            if (u.selectionSet || u.docChanged) {
              const head = u.state.selection.main.head
              const line = u.state.doc.lineAt(head)
              const h = /^(#{1,6})\s/.exec(line.text)
              cb.current.onCursor(line.number, head - line.from + 1, h ? h[1].length : 0)
            }
          }),
          EditorView.domEventHandlers({
            scroll: (_e, v) => {
              const el = v.scrollDOM
              const max = el.scrollHeight - el.clientHeight
              cb.current.onScroll(max > 0 ? el.scrollTop / max : 0)
            },
          }),
        ],
      }),
    })

    function wrap(v: EditorView, before: string, after: string, fallback: string) {
      const { from, to } = v.state.selection.main
      // 已被同样的标记包住时取消
      if (from !== to && v.state.sliceDoc(from - before.length, from) === before && v.state.sliceDoc(to, to + after.length) === after) {
        v.dispatch({
          changes: [{ from: from - before.length, to: from, insert: '' }, { from: to, to: to + after.length, insert: '' }],
          selection: { anchor: from - before.length, head: to - before.length },
        })
        v.focus()
        return true
      }
      const text = v.state.sliceDoc(from, to) || fallback
      v.dispatch({
        changes: { from, to, insert: before + text + after },
        selection: { anchor: from + before.length, head: from + before.length + text.length },
      })
      v.focus()
      return true
    }

    handleRef.current = {
      insertSnippet(template, block) {
        const { from, to } = view.state.selection.main
        let tpl = template
        if (block) {
          // 块级标签前后留空行，避免和相邻段落粘在一起
          const doc = view.state.doc
          const line = doc.lineAt(from)
          const endLine = doc.lineAt(to)
          const textBefore = line.text.slice(0, from - line.from)
          const textAfter = endLine.text.slice(to - endLine.from)
          const prevBlank = line.number === 1 || doc.line(line.number - 1).text.trim() === ''
          const nextBlank = endLine.number === doc.lines || doc.line(endLine.number + 1).text.trim() === ''
          if (textBefore.trim() !== '') tpl = '\n\n' + tpl
          else if (!prevBlank) tpl = '\n' + tpl
          if (textAfter.trim() !== '') tpl += '\n\n'
          else if (!nextBlank) tpl += '\n'
        }
        snippet(tpl)({ state: view.state, dispatch: view.dispatch }, null, from, to)
        view.focus()
      },
      wrapSelection(before, after, fallback) {
        wrap(view, before, after, fallback)
      },
      focus: () => view.focus(),
      setValue(text) {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, selection: { anchor: 0 } })
        view.scrollDOM.scrollTop = 0
      },
      undo() {
        undo(view)
        view.focus()
      },
      redo() {
        redo(view)
        view.focus()
      },
      setHeading(level) {
        const { from, to } = view.state.selection.main
        const changes = []
        for (let n = view.state.doc.lineAt(from).number; n <= view.state.doc.lineAt(to).number; n++) {
          const line = view.state.doc.line(n)
          const m = /^#{1,6}\s+/.exec(line.text)
          const prefix = level > 0 ? '#'.repeat(level) + ' ' : ''
          changes.push({ from: line.from, to: line.from + (m ? m[0].length : 0), insert: prefix })
        }
        view.dispatch({ changes })
        view.focus()
      },
      toggleLinePrefix(kind) {
        const { from, to } = view.state.selection.main
        const first = view.state.doc.lineAt(from).number
        const last = view.state.doc.lineAt(to).number
        const lines = []
        for (let n = first; n <= last; n++) lines.push(view.state.doc.line(n))
        const allHave = lines.every((l) => PREFIX_RE[kind].test(l.text))
        const changes = lines.map((line, i) => {
          const m = ANY_PREFIX.exec(line.text)
          const indent = m ? m[1] : (/^\s*/.exec(line.text)?.[0] ?? '')
          const removeTo = line.from + (m ? m[0].length : indent.length)
          let insert = indent
          if (!allHave) {
            insert += kind === 'quote' ? '> ' : kind === 'ul' ? '- ' : kind === 'task' ? '- [ ] ' : `${i + 1}. `
          }
          return { from: line.from, to: removeTo, insert }
        })
        view.dispatch({ changes })
        view.focus()
      },
      scrollToLine(lineNo) {
        const line = view.state.doc.line(Math.min(Math.max(1, lineNo), view.state.doc.lines))
        view.dispatch({ selection: { anchor: line.from }, effects: EditorView.scrollIntoView(line.from, { y: 'center' }) })
        view.focus()
      },
    }
    return () => {
      handleRef.current = null
      view.destroy()
    }
    // 只在挂载时创建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={host} className="code-editor" />
}
