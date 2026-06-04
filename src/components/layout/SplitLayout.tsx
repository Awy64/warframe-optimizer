import type { ReactNode } from 'react'

interface SplitLayoutProps {
  left: ReactNode
  right: ReactNode
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full shrink-0 border-b border-tenno-border bg-tenno-panel md:sticky md:top-0 md:h-screen md:w-[30%] md:border-b-0 md:border-r md:overflow-y-auto">
        <div className="p-4 md:p-6">{left}</div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-6">{right}</main>
    </div>
  )
}
