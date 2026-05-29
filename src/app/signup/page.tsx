'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChefHat, Users } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [householdName, setHouseholdName] = useState<string | null>(null)

  // If arriving from an invite link, load household context and pre-fill email
  useEffect(() => {
    if (!inviteToken) return
    const supabase = createClient()
    supabase
      .rpc('get_invitation_details', { invite_token: inviteToken })
      .then(({ data }) => {
        const invite = data?.[0]
        if (invite?.is_valid) {
          setHouseholdName(invite.household_name)
          if (invite.email) setEmail(invite.email)
        }
      })
  }, [inviteToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // The handle_new_user trigger automatically assigns the household
    // based on the invite matching this email address — no extra step needed.
    router.push('/planner')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <ChefHat size={20} className="text-brand-400" />
          <span className="font-serif italic font-semibold text-[24px] text-gray-800 tracking-tight leading-none">
            scullery
          </span>
        </div>

        <div className="mb-6 text-center">
          {householdName ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 rounded-full px-3 py-1">
                  <Users size={12} />
                  <span className="text-xs font-semibold">{householdName}</span>
                </div>
              </div>
              <h1 className="text-xl font-semibold text-gray-800">Create your account</h1>
              <p className="text-sm text-gray-500 mt-1">
                You&apos;ll be added to <span className="font-medium text-gray-700">{householdName}</span> automatically.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-800">Create your account</h1>
              <p className="text-sm text-gray-500 mt-1">Set up your household to get started</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
