// 从 hexo-theme-stellar 源码同步编辑器预览所需的资源：
// 1. 编译原版 Stylus 样式        -> public/stellar/stellar.css
// 2. 解析主题默认配置（camelCase）-> src/lib/stellar/generated/config.json
// 3. 图标与多语言                -> src/lib/stellar/generated/{icons,i18n}.json
// 4. 原版标签插件源码            -> src/lib/stellar/vendor/**
//
// 主题升级后重新运行 `bun run sync:stellar` 即可。
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import stylus from 'stylus'
import * as yaml from 'js-yaml'

const root = path.resolve(import.meta.dirname, '..')
const themeDir = path.resolve(root, process.env.STELLAR_THEME_DIR || '../hexo-theme-stellar')
const libDir = path.join(root, 'src/lib/stellar')
const genDir = path.join(libDir, 'generated')
const vendorDir = path.join(libDir, 'vendor')

const readYaml = (file) => yaml.load(fs.readFileSync(path.join(themeDir, file), 'utf8'))
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')

function getProperty(obj, key) {
  let cur = obj
  for (const k of key.split('.')) {
    if (cur == null || typeof cur !== 'object' || !(k in cur)) return null
    cur = cur[k]
  }
  return cur
}

// 站点覆盖配置（与 Hexo 的 _config.stellar.yml 相同，对象深度合并、数组整体替换）
function merge(base, override) {
  if (override == null || typeof override !== 'object' || Array.isArray(override)) return override
  const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) }
  for (const [k, v] of Object.entries(override)) out[k] = merge(out[k], v)
  return out
}
const siteConfigPath = path.join(root, '_config.stellar.yml')
const siteConfig = fs.existsSync(siteConfigPath) ? yaml.load(fs.readFileSync(siteConfigPath, 'utf8')) || {} : {}

// ---------- 1. CSS ----------
const themeConfig = merge(readYaml('_config.yml'), siteConfig)
const cssDir = path.join(themeDir, 'source/css')
const css = stylus(fs.readFileSync(path.join(cssDir, 'main.styl'), 'utf8'))
  .set('filename', path.join(cssDir, 'main.styl'))
  .set('paths', [cssDir])
  // 与 hexo-renderer-stylus 一致：hexo-config('a.b.c') 读取主题配置
  .define('hexo-config', (data) => getProperty(themeConfig, data.val))
  .render()
fs.mkdirSync(path.join(root, 'public/stellar'), { recursive: true })
fs.writeFileSync(path.join(root, 'public/stellar/stellar.css'), css)

// ---------- 2. 配置 ----------
// 主题的配置解析器依赖 js-yaml，从本项目的 node_modules 解析
const requireFromTheme = createRequire(path.join(themeDir, 'package.json'))
const Module = createRequire(import.meta.url)('node:module')
process.env.NODE_PATH = [path.join(root, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter)
Module._initPaths()
const { parseStellarConfig } = requireFromTheme('./scripts/lib/config-schema')
const stellarConfig = parseStellarConfig({ source: '_config.stellar.yml', themeConfig: siteConfig, mode: 'recover' })
fs.mkdirSync(genDir, { recursive: true })
writeJson(path.join(genDir, 'config.json'), stellarConfig)

// ---------- 3. 图标与多语言 ----------
const icons = readYaml('_data/icons.yml')
writeJson(path.join(genDir, 'icons.json'), icons)

// 与 scripts/lib/client-assets.js 生成的 css/stellar-icons.css 一致：
// 引用块引号、h3 箭头、加载动画等用 mask-image: var(--icon-xxx) 显示的图标
const cssIconVars = {
  '--icon-h3-left': 'default:arrow-left', '--icon-h3-right': 'default:arrow-right',
  '--icon-quote-left': 'quot:quote-left', '--icon-quote-right': 'quot:quote-right',
  '--icon-loading': 'default:loading',
}
const iconDecls = []
for (const [name, key] of Object.entries(cssIconVars)) {
  const raw = icons[key]
  if (!raw) continue
  const url = key !== 'default:loading' || raw.trim().startsWith('<svg') ? `data:image/svg+xml,${encodeURIComponent(raw)}` : raw
  iconDecls.push(`${name}:url(${JSON.stringify(url).replace(/</g, '\\3c ')});`)
}
fs.writeFileSync(path.join(root, 'public/stellar/stellar-icons.css'), iconDecls.length ? `:root{${iconDecls.join('')}}\n` : '')
const i18n = {}
for (const f of fs.readdirSync(path.join(themeDir, 'languages'))) {
  if (f.endsWith('.yml')) i18n[f.replace(/\.yml$/, '')] = readYaml(path.join('languages', f))
}
writeJson(path.join(genDir, 'i18n.json'), i18n)

// ---------- 4. 标签源码 ----------
fs.rmSync(vendorDir, { recursive: true, force: true })
const copies = []
function copyFile(src, dest, transform) {
  let code = fs.readFileSync(path.join(themeDir, src), 'utf8')
  // hexo-util -> 浏览器端垫片；../../lib/xxx -> vendor/lib/xxx
  const depth = path.relative(path.dirname(dest), path.join(libDir, 'shims')).split(path.sep).join('/')
  code = code.replace(/require\((['"])hexo-util\1\)/g, `require('${depth}/hexo-util')`)
  code = code.replace(/require\((['"])\.\.\/\.\.\/(?:\.\.\/)?lib\/([\w-]+)\1\)/g, (_, q, name) => {
    const rel = path.relative(path.dirname(dest), path.join(vendorDir, 'lib', name)).split(path.sep).join('/')
    return `require('${rel.startsWith('.') ? rel : './' + rel}')`
  })
  if (transform) code = transform(code)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, code)
  copies.push(path.relative(root, dest))
}

const tagLibDir = path.join(themeDir, 'scripts/tags/lib')
for (const f of fs.readdirSync(tagLibDir)) {
  if (f.endsWith('.js')) copyFile(`scripts/tags/lib/${f}`, path.join(vendorDir, 'tags', f))
}
for (const f of fs.readdirSync(path.join(tagLibDir, 'read'))) {
  if (f.endsWith('.js')) copyFile(`scripts/tags/lib/read/${f}`, path.join(vendorDir, 'tags/read', f))
}
for (const name of ['ui-capabilities', 'service-provider', 'mdrender_html', 'internal-constants']) {
  copyFile(`scripts/lib/${name}.js`, path.join(vendorDir, 'lib', `${name}.js`))
}
copyFile('scripts/helpers/dynamic_color.js', path.join(vendorDir, 'lib/dynamic_color.js'), (code) =>
  code.replace(/hexo\.extend\.helper\.register\(\s*["']dynamic_color["']\s*,\s*dynamic_color\s*\);?/, 'module.exports = dynamic_color;')
)

// 标签注册表：从 scripts/tags/index.js 解析 name / 文件 / 是否为块级标签
const indexSrc = fs.readFileSync(path.join(themeDir, 'scripts/tags/index.js'), 'utf8')
const registry = []
const re = /hexo\.extend\.tag\.register\('([\w-]+)',\s*require\('\.\/lib\/([\w/-]+)'\)\(hexo(?:,\s*'([\w-]+)')?\)(?:,\s*(true|\{\s*ends:\s*true\s*\}))?\)/g
for (const m of indexSrc.matchAll(re)) {
  registry.push({ name: m[1], file: m[2], variant: m[3] || null, ends: Boolean(m[4]) })
}
let reg = "/* 自动生成：bun run sync:stellar */\n/* eslint-disable */\n'use strict'\n\nmodule.exports = [\n"
for (const r of registry) {
  reg += `  { name: '${r.name}', ends: ${r.ends}, variant: ${r.variant ? `'${r.variant}'` : 'null'}, factory: require('./tags/${r.file}') },\n`
}
reg += ']\n'
fs.writeFileSync(path.join(vendorDir, 'registry.js'), reg)
fs.writeFileSync(path.join(vendorDir, 'README.md'), '本目录由 `scripts/build-stellar.mjs` 从 hexo-theme-stellar 复制生成，请勿手动修改。\n')

console.log(`stellar.css ${(css.length / 1024).toFixed(1)} KB`)
console.log(`tags ${registry.length} (${registry.filter(r => r.ends).length} block), vendor files ${copies.length}`)
