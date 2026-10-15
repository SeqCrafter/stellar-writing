// 统一画法：24 网格、1.6 描边、圆头端点。
const PATHS: Record<string, React.ReactNode> = {
  star: <path d="M12 3.5l2.3 5.6 5.7.4-4.4 3.7 1.4 5.8L12 15.9 7 19l1.4-5.8L4 9.5l5.7-.4z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  moon: <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </>
  ),
  dots: (
    <>
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  upload: <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15" />,
  download: <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M4.5 15v3.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V15" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  reset: <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.8h3.8" />,
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  blank: null,
  undo: <path d="M9 14L4.5 9.5 9 5M4.5 9.5h9.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <path d="M15 14l4.5-4.5L15 5M19.5 9.5H10a5.5 5.5 0 0 0 0 11h3" />,
  bold: <path d="M7 4.5h6a3.75 3.75 0 0 1 0 7.5H7zM7 12h7a3.75 3.75 0 0 1 0 7.5H7z" />,
  italic: <path d="M10 4.5h8M6 19.5h8M14.5 4.5l-5 15" />,
  strike: <path d="M4.5 12h15M16.5 7.5c-.6-1.8-2.4-3-4.5-3-2.6 0-4.5 1.5-4.5 3.5 0 1.3.8 2.3 2.2 3M7.5 16.5c.6 1.8 2.4 3 4.5 3 2.6 0 4.5-1.6 4.5-3.6 0-.6-.1-1.1-.4-1.6" />,
  underline: <path d="M7 4.5v6.5a5 5 0 0 0 10 0V4.5M5.5 20h13" />,
  link: <path d="M10 14a4 4 0 0 0 5.7.3l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2M14 10a4 4 0 0 0-5.7-.3l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" />,
  code: <path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5" />,
  codeblock: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9.5 10l-2 2 2 2M14.5 10l2 2-2 2" />
    </>
  ),
  quote: <path d="M5 7.5h5v5H7.5c0 2.2-1 3.5-2.5 4M14 7.5h5v5h-2.5c0 2.2-1 3.5-2.5 4" />,
  ul: (
    <>
      <path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10" />
      <circle cx="5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  ol: <path d="M10 6.5h9.5M10 12h9.5M10 17.5h9.5M4.5 5l1.5-.8V9M4.3 11.2c.3-.6 2.6-.9 2.4.6-.1.9-2.4 1.9-2.4 2.7h2.6M4.4 16c.6-.5 2.4-.5 2.3.6 0 .6-.8.8-1.3.8.6 0 1.5.2 1.4 1-.1 1-1.9 1.2-2.5.5" />,
  task: (
    <>
      <rect x="3.5" y="4.5" width="6" height="6" rx="1.5" />
      <path d="M4.8 15.8l1.6 1.6 2.8-3M13 7.5h7M13 16h7" />
    </>
  ),
  hr: <path d="M4 12h16M4 7h3M17 7h3M4 17h3M17 17h3" />,
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M20.5 15.5l-4.5-4.5-8.5 8.5" />
    </>
  ),
  table: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M3.5 14.5h17M10 9.5v10" />
    </>
  ),
  chevron: <path d="M7 10l5 5 5-5" />,
  tag: <path d="M8 7.5L3.5 12 8 16.5M16 7.5l4.5 4.5-4.5 4.5M13.5 5.5l-3 13" />,
  'view-edit': <path d="M5 5.5h14M5 10h14M5 14.5h9M5 19h6M16.5 19.5l3.5-3.5-1.5-1.5-3.5 3.5-.5 2z" />,
  'view-split': (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M12 4.5v15M6.5 9h3M6.5 12h3M14.5 9h3M14.5 12h3" />
    </>
  ),
  'view-preview': (
    <>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  markdown: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M6 15.5v-7l2.5 3 2.5-3v7M15.5 8.5v6.5M13.2 12.8l2.3 2.4 2.3-2.4" />
    </>
  ),
  warn: <path d="M12 4.5l8.5 15h-17zM12 10v4M12 16.8v.2" />,
}

export function Icon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name] ?? null}
    </svg>
  )
}
