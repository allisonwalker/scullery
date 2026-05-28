'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, BookOpen,
  ShoppingCart, Calendar, Settings, LogOut, ChefHat, Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; icon: React.ReactNode; exact?: boolean }[] = [
  { href: '/',         label: 'Home',     icon: <LayoutDashboard size={13} />, exact: true },
  { href: '/planner',  label: 'Planner',  icon: <CalendarDays size={13} /> },
  { href: '/recipes',  label: 'Recipes',  icon: <BookOpen size={13} /> },
  { href: '/grocery',  label: 'Grocery',  icon: <ShoppingCart size={13} /> },
  { href: '/plans',    label: 'Plans',    icon: <Calendar size={13} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={13} /> },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [householdName, setHouseholdName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function loadHousehold() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single()
      if (!profile?.household_id) return
      const { data: hh } = await supabase
        .from('households')
        .select('name')
        .eq('id', profile.household_id)
        .single()
      if (hh?.name) setHouseholdName(hh.name)
    }
    loadHousehold()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-brand-900 px-5 h-14 flex items-center justify-between">

      <div className="flex items-center gap-3">
        {/* Logo */}
        <Link href="/planner" className="flex items-center gap-2 shrink-0">
          <ChefHat size={18} className="text-brand-400" />
          <span className="font-serif italic font-semibold text-[22px] text-brand-100 tracking-tight leading-none">
            scullery
          </span>
        </Link>

        {/* Household name — sits between logo and nav tabs */}
        {householdName && (
          <>
            <div className="w-px h-5 bg-brand-700" />
            <div className="flex items-center gap-1.5 bg-brand-800 rounded-lg px-2.5 py-1">
              <Users size={11} className="text-brand-500" />
              <span className="text-[11px] font-semibold text-brand-300 tracking-wide">
                {householdName}
              </span>
            </div>
          </>
        )}

        {/* Separator */}
        <div className="w-px h-5 bg-brand-700" />

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  active
                    ? 'bg-brand-700 text-white'
                    : 'text-brand-300 hover:text-white hover:bg-brand-800',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-white transition-colors"
      >
        <LogOut size={13} />
        Sign out
      </button>
    </nav>
  )
}
