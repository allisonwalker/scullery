import type { Metadata } from 'next'
import './globals.css'

// Force dynamic rendering for all pages — this is a private auth-gated app
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Scullery',
  description: 'Household meal planning',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
