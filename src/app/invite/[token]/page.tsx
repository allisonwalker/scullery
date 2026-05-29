import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChefHat, Users } from 'lucide-react'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const { data } = await supabase.rpc('get_invitation_details', {
    invite_token: token,
  })

  const invite = data?.[0] ?? null

  // ── Invalid or expired ────────────────────────────────────────────────────
  if (!invite || !invite.is_valid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex justify-center">
            <ChefHat size={32} className="text-brand-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Invite not found</h1>
          <p className="text-sm text-gray-500">
            This invite link has expired or already been used. Ask your household member to send a new one.
          </p>
          <Link href="/login" className="btn-secondary inline-flex">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  // ── Valid invite ──────────────────────────────────────────────────────────
  const expiryDays = Math.max(
    0,
    Math.ceil((new Date(invite.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <ChefHat size={22} className="text-brand-400" />
          <span className="font-serif italic font-semibold text-[26px] text-gray-800 tracking-tight leading-none">
            scullery
          </span>
        </div>

        <div className="card p-6 text-center space-y-5">
          {/* Household badge */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 rounded-full px-4 py-1.5">
              <Users size={14} />
              <span className="text-sm font-semibold">{invite.household_name}</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl font-semibold text-gray-800 leading-snug">
              You&apos;ve been invited to join a household
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Create your account to share meal plans, recipes, and grocery lists
              with <span className="font-medium text-gray-700">{invite.household_name}</span>.
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            <Link
              href={`/signup?invite=${token}`}
              className="btn-primary w-full justify-center"
            >
              Create your account
            </Link>
            <Link
              href={`/login`}
              className="btn-secondary w-full justify-center"
            >
              I already have an account — sign in
            </Link>
          </div>

          <p className="text-xs text-gray-400">
            This invite is valid for {expiryDays} more day{expiryDays !== 1 ? 's' : ''}.
            {invite.email && ` It was sent to ${invite.email}.`}
          </p>
        </div>
      </div>
    </div>
  )
}
