// 模拟 Hexo 渲染上下文（ctx），让原版 Stellar 标签插件源码可以在浏览器里直接运行。
import config from './generated/config.json'
import icons from './generated/icons.json'
import i18n from './generated/i18n.json'
import * as yaml from 'js-yaml'
import { joinTags, joinURLParams, mapArgs } from './args'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dynamicColor = require('./vendor/lib/dynamic_color.js')

type Dict = Record<string, unknown>

const iconMap = icons as Record<string, string>

function lookup(obj: unknown, key: string): unknown {
  let cur = obj
  for (const k of key.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Dict)[k]
  }
  return cur
}

function translator(lang: string) {
  const table = (i18n as Dict)[lang] ?? (i18n as Dict)['zh-CN']
  return (key: string, ...args: unknown[]) => {
    const value = lookup(table, key)
    if (typeof value !== 'string') return key
    let i = 0
    return value.replace(/%[sd]/g, () => String(args[i++] ?? ''))
  }
}

function icon(key: string, args?: string, inline?: boolean) {
  const result = iconMap[key] ?? key
  if (result.startsWith('/') || result.startsWith('https://') || result.startsWith('http://')) {
    return `<img ${args && args.length > 0 ? args : ''} src="${result}" />`
  }
  // 原主题对非首屏 SVG 输出占位符，由客户端异步替换为原 SVG；预览里直接内联同样的结果
  void inline
  return result
}

export interface StellarContext {
  args: { map: typeof mapArgs; joinTags: typeof joinTags; joinURLParams: typeof joinURLParams }
  utils: { icon: typeof icon; iconData: (key: string) => string }
  render: { renderSync: (opts: { text?: string; engine?: string }) => unknown }
  stellar: { config: typeof config; data: { icons: Record<string, string>; links: Dict; wiki: { tree: Dict } } }
  theme: { i18n: { __: (lang: string) => (key: string, ...args: unknown[]) => string } }
  config: { language: string; root: string; url: string }
  extend: { helper: { get: (name: string) => unknown } }
  __: (key: string, ...args: unknown[]) => string
}

export function createContext(renderMarkdown: (text: string) => string, language = 'zh-CN'): StellarContext {
  return {
    args: { map: mapArgs, joinTags, joinURLParams },
    utils: { icon, iconData: (key) => iconMap[key] ?? '' },
    render: { renderSync: ({ text, engine }) => (engine === 'yaml' ? yaml.load(text ?? '') : renderMarkdown(text ?? '')) },
    stellar: { config, data: { icons: iconMap, links: {}, wiki: { tree: {} } } },
    theme: { i18n: { __: translator } },
    config: { language, root: '/', url: '' },
    extend: { helper: { get: (name) => (name === 'dynamic_color' ? dynamicColor : undefined) } },
    __: translator(language),
  }
}
