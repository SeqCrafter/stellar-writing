'use client'

import dynamic from 'next/dynamic'

// 编辑器依赖浏览器（CodeMirror、localStorage、iframe），只在客户端渲染
const Workspace = dynamic(() => import('./Workspace'), {
  ssr: false,
  loading: () => (
    <div className="app-loading">
      <span className="app-loading-mark" />
      <p>正在准备写字台</p>
    </div>
  ),
})

export function EditorApp() {
  return <Workspace />
}
