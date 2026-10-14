import type { Metadata, Viewport } from 'next'
import './globals.css'
import { FONT_STYLESHEETS } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Stellar Writing',
  description: '为 Hexo Stellar 主题打造的实时预览博客编辑器：Markdown 与 Stellar 标签一边写一边看。',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#16181b' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 界面：霞鹭文楷屏幕阅读版；代码：Google Sans Code */}
        {FONT_STYLESHEETS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  )
}
