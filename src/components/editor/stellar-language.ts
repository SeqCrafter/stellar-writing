// CodeMirror 扩展：Stellar 标签的语法着色、{% 自动补全、主题。
import { autocompletion, snippetCompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { RangeSetBuilder, type Extension } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { TAG_CATALOG } from '@/lib/stellar/catalog'

// ---------- 标签着色 ----------
const tagMark = Decoration.mark({ class: 'cm-st-tag' })
const tagNameMark = Decoration.mark({ class: 'cm-st-name' })
const tagKeyMark = Decoration.mark({ class: 'cm-st-key' })
const commentMark = Decoration.mark({ class: 'cm-st-split' })

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    const re = /\{%-?\s*(end)?([\w-]+)([\s\S]*?)-?%\}|<!--\s*(tab|cell|node|folder|okr|chatcell|chattip|section|paragraph|line)\b[\s\S]*?-->/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const start = from + m.index
      const end = start + m[0].length
      if (m[4]) {
        builder.add(start, end, commentMark)
        continue
      }
      const nameStart = start + m[0].indexOf(m[2], 2)
      builder.add(start, nameStart, tagMark)
      builder.add(nameStart, nameStart + m[2].length, tagNameMark)
      // key:value 中的 key
      const argsText = m[3]
      const argsStart = nameStart + m[2].length
      const keyRe = /(^|\s)([a-z_]+):(?!\/\/)/g
      let last = argsStart
      let k: RegExpExecArray | null
      while ((k = keyRe.exec(argsText))) {
        const ks = argsStart + k.index + k[1].length
        if (ks > last) builder.add(last, ks, tagMark)
        builder.add(ks, ks + k[2].length + 1, tagKeyMark)
        last = ks + k[2].length + 1
      }
      if (end > last) builder.add(last, end, tagMark)
    }
  }
  return builder.finish()
}

const stellarTagHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = buildDecorations(u.view)
    }
  },
  { decorations: (v) => v.decorations },
)

// ---------- 自动补全 ----------
const tagOptions = TAG_CATALOG.map((tag) =>
  snippetCompletion(tag.snippet.replace(/^\{%\s*/, ''), {
    label: tag.name,
    detail: tag.label,
    info: tag.syntax,
    type: tag.block ? 'class' : 'keyword',
  }),
)

function stellarCompletions(ctx: CompletionContext): CompletionResult | null {
  // 光标前是 {% 加可选的标签名
  const before = ctx.matchBefore(/\{%\s*[\w-]*/)
  if (!before) return null
  const nameStart = before.from + before.text.search(/[\w-]*$/)
  const line = ctx.state.doc.lineAt(ctx.pos)
  const after = line.text.slice(ctx.pos - line.from)
  // 已在补全过的标签里面（后面已有 %}）时，只补名字
  const hasClose = /^[\w-]*\s[^\n]*%\}/.test(after)
  return {
    from: nameStart,
    options: hasClose ? TAG_CATALOG.map((tag) => ({ label: tag.name, detail: tag.label, info: tag.syntax, type: 'keyword' })) : tagOptions,
    validFor: /^[\w-]*$/,
  }
}

// ---------- 主题 ----------
const markdownHighlight = HighlightStyle.define([
  { tag: t.heading1, class: 'cm-md-h cm-md-h1' },
  { tag: t.heading2, class: 'cm-md-h cm-md-h2' },
  { tag: [t.heading3, t.heading4, t.heading5, t.heading6], class: 'cm-md-h' },
  { tag: t.strong, class: 'cm-md-strong' },
  { tag: t.emphasis, class: 'cm-md-em' },
  { tag: t.strikethrough, class: 'cm-md-del' },
  { tag: [t.link, t.url], class: 'cm-md-link' },
  { tag: t.monospace, class: 'cm-md-code' },
  { tag: t.quote, class: 'cm-md-quote' },
  { tag: [t.processingInstruction, t.meta, t.contentSeparator], class: 'cm-md-meta' },
  { tag: t.comment, class: 'cm-md-comment' },
  { tag: [t.keyword, t.operator], class: 'cm-code-kw' },
  { tag: [t.string, t.special(t.string)], class: 'cm-code-str' },
  { tag: [t.number, t.bool, t.atom], class: 'cm-code-num' },
  { tag: [t.propertyName, t.attributeName], class: 'cm-code-prop' },
  { tag: [t.typeName, t.className, t.tagName], class: 'cm-code-type' },
  { tag: t.list, class: 'cm-md-list' },
])

const baseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: 'var(--editor-font-size)', backgroundColor: 'transparent' },
  '.cm-scroller': { fontFamily: 'var(--font-editor)', lineHeight: '1.75' },
  '.cm-content': { padding: '28px 0 40vh', caretColor: 'var(--accent)', maxWidth: '760px' },
  '.cm-line': { padding: '0 28px 0 8px' },
  '.cm-gutters': { backgroundColor: 'transparent', border: 'none', color: 'var(--ink-faint)' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 6px 0 18px', minWidth: '44px', fontVariantNumeric: 'tabular-nums' },
  '.cm-activeLine': { backgroundColor: 'var(--line-active)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ink-soft)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'var(--selection) !important' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-tooltip': { border: '1px solid var(--rule)', backgroundColor: 'var(--surface-raised)', borderRadius: '10px', boxShadow: 'var(--shadow-pop)', overflow: 'hidden' },
  '.cm-tooltip-autocomplete > ul': { fontFamily: 'var(--font-ui)', maxHeight: '18em' },
  '.cm-tooltip-autocomplete > ul > li': { padding: '4px 10px !important', lineHeight: '1.6' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'var(--accent-wash)', color: 'var(--ink)' },
  '.cm-completionLabel': { fontFamily: 'var(--font-editor)', fontWeight: '600' },
  '.cm-completionDetail': { marginLeft: '10px', color: 'var(--ink-soft)', fontStyle: 'normal' },
  '.cm-completionInfo': { fontFamily: 'var(--font-editor)', fontSize: '12px', padding: '8px 10px', maxWidth: '360px' },
  '.cm-panels': { backgroundColor: 'var(--surface-raised)', color: 'var(--ink)' },
  '.cm-panels-top': { borderBottom: '1px solid var(--rule)' },
  '.cm-searchMatch': { backgroundColor: 'var(--accent-wash)' },
  '.cm-snippetField': { backgroundColor: 'var(--accent-wash)', borderRadius: '3px' },
})

export function stellarExtensions(): Extension[] {
  return [
    baseTheme,
    syntaxHighlighting(markdownHighlight),
    stellarTagHighlight,
    autocompletion({ override: [stellarCompletions], activateOnTyping: true, icons: false }),
  ]
}
