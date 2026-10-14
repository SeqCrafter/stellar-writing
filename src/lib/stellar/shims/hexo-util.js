// 浏览器端 hexo-util 垫片：只实现 Stellar 标签插件用到的函数，行为与 hexo-util 保持一致。
'use strict'

const htmlEntityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
  '/': '&#x2F;',
  '=': '&#x3D;'
}

function unescapeHTML(str) {
  return String(str)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&#96;/g, '`').replace(/&#x2F;/g, '/')
    .replace(/&#x3D;/g, '=').replace(/&amp;/g, '&')
}

function escapeHTML(str) {
  if (typeof str !== 'string') throw new TypeError('str must be a string!')
  return unescapeHTML(str).replace(/[&<>"'`/=]/g, (c) => htmlEntityMap[c])
}

function isExternal(path) {
  return /^(\w+:)?\/\//.test(path) || /^(mailto|tel|data|javascript):/.test(path)
}

function url_for(path = '/') {
  if (path == null) return '/'
  path = String(path)
  if (path.startsWith('#') || isExternal(path)) return path
  const root = (this && this.config && this.config.root) || '/'
  if (path.startsWith(root)) return path
  return root + path.replace(/^\//, '')
}

function full_url_for(path = '/') {
  path = String(path ?? '/')
  if (isExternal(path) || path.startsWith('#')) return path
  const base = ((this && this.config && this.config.url) || '').replace(/\/+$/, '')
  return base + url_for.call(this, path)
}

module.exports = { escapeHTML, unescapeHTML, url_for, full_url_for }
