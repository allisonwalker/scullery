import type { Metadata } from 'next'
import { Lora } from 'next/font/google'
import './globals.css'

// Force dynamic rendering for all pages — this is a private auth-gated app
export const dynamic = 'force-dynamic'

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  style: ['normal', 'italic'],
  weight: ['400', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Scullery',
  description: 'Household meal planning',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lora.variable}>
      <body>{children}</body>
    </html>
  )
}
