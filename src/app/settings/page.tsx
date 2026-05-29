'use client'

import { useEffect, useState } from 'react'
import NavBar from '@/components/nav/NavBar'
import { createClient } from '@/lib/supabase/client'
import type { Household } from '@/types'
import { Copy, Check, X, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Invitation {
  id: string
  email: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export default function SettingsPage() {
  const [household, setHousehold] = useState<Household | null>(null)
  const [name, setName] = useState('')
  const [staples, setStaples] = useState('')
  const [prefs, setPrefs] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([])
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single()
      if (!profile?.household_id) return

      const [hhRes, invitesRes] = await Promise.all([
        supabase.from('households').select('*').eq('id', profile.household_id).single(),
        supabase
          .from('invitations')
          .select('*')
          .eq('household_id', profile.household_id)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ])

      if (hhRes.data) {
        setHousehold(hhRes.data as Household)
        setName(hhRes.data.name)
        setStaples(hhRes.data.pantry_staples.join(', '))
        setPrefs(hhRes.data.dietary_preferences.join(', '))
      }
      setPendingInvites((invitesRes.data ?? []) as Invitation[])
    }
    load()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!household) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('households')
      .update({
        name: name.trim(),
        pantry_staples: staples.split(',').map((s) => s.trim()).filter(Boolean),
        dietary_preferences: prefs.split(',').map((s) => s.trim()).filter(Boolean),
      })
      .eq('id', household.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function createInvite() {
    if (!household || !inviteEmail.trim() || !userId) return
    setInviting(true)
    setInviteError('')
    const supabase = createClient()

    const { data, error } = await supabase
      .from('invitations')
      .insert({
        household_id: household.id,
        email: inviteEmail.trim().toLowerCase(),
        invited_by: userId,
      })
      .select('*')
      .single()

    if (error) {
      setInviteError(error.message)
    } else {
      setPendingInvites((prev) => [data as Invitation, ...prev])
      setInviteEmail('')
      // Auto-copy the link
      copyInviteLink(data.token)
    }
    setInviting(false)
  }

  function inviteLink(token: string) {
    return `${window.location.origin}/invite/${token}`
  }

  function copyInviteLink(token: string) {
    navigator.clipboard.writeText(inviteLink(token))
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2500)
  }

  async function revokeInvite(id: string) {
    const supabase = createClient()
    await supabase.from('invitations').delete().eq('id', id)
    setPendingInvites((prev) => prev.filter((i) => i.id !== id))
  }

  function daysUntilExpiry(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-6 max-w-xl mx-auto w-full">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Settings</h1>

        {/* Household settings */}
        <form onSubmit={save} className="card p-5 space-y-4 mb-5">
          <h2 className="text-base font-semibold text-gray-800">Household</h2>

          <div>
            <label className="label">Household name</label>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="label">Pantry staples</label>
            <input
              type="text"
              className="input"
              placeholder="salt, pepper, olive oil, garlic…"
              value={staples}
              onChange={(e) => setStaples(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Comma-separated — excluded from grocery lists</p>
          </div>

          <div>
            <label className="label">Dietary preferences</label>
            <input
              type="text"
              className="input"
              placeholder="vegetarian, gluten-free, nut allergy…"
              value={prefs}
              onChange={(e) => setPrefs(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Used to guide AI recipe suggestions</p>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && <span className="text-sm text-brand-600">Saved!</span>}
          </div>
        </form>

        {/* Invite household member */}
        <div className="card p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Household members</h2>
            <p className="text-sm text-gray-500 mt-1">
              Invite someone to share your meal plans, recipes, and grocery list.
              They&apos;ll be automatically added to your household when they sign up.
            </p>
          </div>

          {/* Create invite */}
          <div className="flex gap-2">
            <input
              type="email"
              className="input flex-1"
              placeholder="their@email.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createInvite()}
            />
            <button
              onClick={createInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="btn-primary shrink-0 gap-1.5"
            >
              <UserPlus size={14} />
              {inviting ? 'Creating…' : 'Create invite'}
            </button>
          </div>
          {inviteError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{inviteError}</p>
          )}

          {/* Pending invites */}
          {pendingInvites.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Pending invitations
              </p>
              <div className="space-y-2">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{inv.email}</p>
                      <p className="text-xs text-gray-400">
                        Expires in {daysUntilExpiry(inv.expires_at)} day{daysUntilExpiry(inv.expires_at) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => copyInviteLink(inv.token)}
                      title="Copy invite link"
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors shrink-0',
                        copiedToken === inv.token
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600',
                      )}
                    >
                      {copiedToken === inv.token
                        ? <><Check size={12} /> Copied!</>
                        : <><Copy size={12} /> Copy link</>
                      }
                    </button>
                    <button
                      onClick={() => revokeInvite(inv.id)}
                      title="Revoke invitation"
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
