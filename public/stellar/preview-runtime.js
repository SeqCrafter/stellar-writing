// 预览 iframe 内的轻量运行时：复刻 Stellar 客户端里与标签插件相关的行为
// （source/js/main.js 的 tabs / util.copy、runtime/extensions/lazy-loading.js 的懒加载）。
// 内容每次重绘都会替换，所以全部使用事件委托 + hydrate()。
(function () {
  'use strict'

  function toast(msg) {
    var el = document.createElement('div')
    el.className = 'sw-toast'
    el.textContent = msg
    document.body.appendChild(el)
    setTimeout(function () { el.classList.add('out') }, 1600)
    setTimeout(function () { el.remove() }, 2000)
  }

  window.util = window.util || {}
  window.util.copy = function (id, msg) {
    var el = document.getElementById(id)
    if (!el) return
    el.select()
    navigator.clipboard.writeText(el.value).then(function () { if (msg) toast(msg) }).catch(function () {})
  }
  window.util.toggle = function (id) {
    var el = document.getElementById(id)
    if (el) el.classList.toggle('display')
  }

  // tabs：与 registerTabsTag 一致
  document.addEventListener('click', function (event) {
    var tab = event.target.closest && event.target.closest('.tabs .nav-tabs .tab')
    if (tab) {
      event.preventDefault()
      if (tab.classList.contains('active')) return
      Array.prototype.forEach.call(tab.parentNode.children, function (t) { t.classList.toggle('active', t === tab) })
      var href = tab.querySelector('a').getAttribute('href').replace('#', '')
      var pane = document.getElementById(href)
      if (pane) Array.prototype.forEach.call(pane.parentNode.children, function (p) { p.classList.toggle('active', p === pane) })
      return
    }
    // 预览里不跳转站内/外链，避免 iframe 被导航走
    var a = event.target.closest && event.target.closest('a[href]')
    if (a) {
      var href2 = a.getAttribute('href')
      if (href2 && href2.charAt(0) === '#') {
        event.preventDefault()
        var target = document.getElementById(decodeURIComponent(href2.slice(1)))
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (href2) {
        event.preventDefault()
        if (/^https?:\/\//.test(href2)) window.open(href2, '_blank', 'noopener')
      }
    }
  })

  function hydrate(root) {
    // 懒加载：直接加载并标记 loaded
    root.querySelectorAll('img.lazy[data-src], img[data-src]:not([src])').forEach(function (img) {
      img.addEventListener('load', function () { img.classList.add('loaded') }, { once: true })
      img.addEventListener('error', function () { img.classList.add('error') }, { once: true })
      img.src = img.getAttribute('data-src')
    })
    root.querySelectorAll('[data-bg]').forEach(function (el) {
      el.style.backgroundImage = 'url("' + el.getAttribute('data-bg') + '")'
      el.classList.add('loaded')
    })
    root.querySelectorAll('.lazy:not(img)').forEach(function (el) { el.classList.add('loaded') })
    // 动态数据服务（友链、GitHub 卡片、远程 Markdown 等）需要站点运行时，预览中给出占位说明
    root.querySelectorAll('.data-service, .ds-mdrender').forEach(function (el) {
      if (el.querySelector('.sw-ds-hint')) return
      var cls = Array.prototype.find.call(el.classList, function (c) { return c.indexOf('ds-') === 0 }) || 'data-service'
      var hint = document.createElement('div')
      hint.className = 'sw-ds-hint'
      hint.textContent = '动态数据（' + cls.replace('ds-', '') + '）会在博客页面加载时获取，预览中不请求。'
      el.appendChild(hint)
    })
  }

  window.__swHydrate = hydrate
  if (document.readyState !== 'loading') hydrate(document)
  else document.addEventListener('DOMContentLoaded', function () { hydrate(document) })
})()
