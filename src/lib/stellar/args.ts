// 与 scripts/events/lib/utils.js 中 hexo.args 一致的参数工具，以及 Hexo/Nunjucks 的标签参数切分。

export type TagArgs = Record<string, string | undefined> & { others?: string[] }

export function mapArgs(args: unknown, keys: string[], others?: string | string[]): TagArgs {
  if (!Array.isArray(args)) return args as TagArgs
  const map: Record<string, unknown> & { others: string[] } = { others: [] }
  for (const arg of args as string[]) {
    const kv = String(arg).trim()
    if (kv.includes('://') && kv.split(':').length === 2) {
      // 纯 url
      map.others.push(kv)
    } else {
      const parts = kv.split(':')
      if (parts.length > 1) {
        if (keys.includes(parts[0])) {
          map[parts.shift() as string] = parts.join(':')
        } else {
          map.others.push(parts.join(':'))
        }
      } else if (parts.length === 1) {
        map.others.push(parts[0])
      }
    }
  }
  // 解析不带 key 的参数，最后一段合并到最后一个参数中
  if (others && others.length > 0 && map.others.length > 0) {
    const list = Array.isArray(others) ? others : [others]
    for (const name of list) map[name] = map.others.shift()
    if (map.others.length > 0) {
      map[list[list.length - 1]] += ' ' + map.others.join(' ')
      map.others = []
    }
  }
  return map as TagArgs
}

export function joinTags(args: Record<string, unknown>, keys: string | string[]): string[] {
  const list = Array.isArray(keys) ? keys : [keys]
  const ret: string[] = []
  for (const key of list) {
    const v = args[key]
    if (v && (v as string).length > 0) ret.push(`${key}="${v}"`)
  }
  return ret
}

export function joinURLParams(args: Record<string, unknown>, keys: string | string[]): string {
  const list = Array.isArray(keys) ? keys : [keys]
  const ret: string[] = []
  for (const key of list) {
    const v = args[key]
    if (v && (v as string).length > 0) ret.push(`${key}=${v}`)
  }
  return ret.join('&')
}

/**
 * 与 Hexo 的 Nunjucks 标签解析一致：按空白切分，引号内的空白保留且引号本身被去掉，
 * 引号段与相邻字符拼接（title:"a b" -> title:a b）。
 */
export function splitTagArgs(raw: string): string[] {
  const out: string[] = []
  let cur = ''
  let has = false
  let i = 0
  while (i < raw.length) {
    const ch = raw[i]
    if (ch === '"' || ch === "'") {
      const end = raw.indexOf(ch, i + 1)
      if (end === -1) {
        cur += raw.slice(i)
        has = true
        break
      }
      cur += raw.slice(i + 1, end).replace(/\\(["'\\])/g, '$1')
      has = true
      i = end + 1
      continue
    }
    if (/\s/.test(ch)) {
      if (has) out.push(cur.trim())
      cur = ''
      has = false
    } else {
      cur += ch
      has = true
    }
    i++
  }
  if (has && cur.trim() !== '') out.push(cur.trim())
  return out
}
