'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: '/', label: 'Home', exact: true },
  { href: '/planner', label: 'Planner' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/grocery', label: 'Grocery' },
  { href: '/plans', label: 'Plans' },
  { href: '/settings', label: 'Settings' },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 h-12 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/planner" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          Scullery
        </Link>
        <div className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-1 rounded-md text-sm transition-colors',
                (item.exact ? pathname === item.href : pathname.startsWith(item.href))
                  ? 'bg-brand-50 text-brand-700 font-medium'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
        Sign out
      </button>
    </nav>
  )
}
