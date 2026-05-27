'use client'

import { useEffect, useState } from 'react'
import NavBar from '@/components/nav/NavBar'
import { createClient } from '@/lib/supabase/client'
import type { Household } from '@/types'

export default function SettingsPage() {
  const [household, setHousehold] = useState<Household | null>(null)
  const [name, setName] = useState('')
  const [staples, setStaples] = useState('')
  const [prefs, setPrefs] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function load() {
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
        .select('*')
        .eq('id', profile.household_id)
        .single()

      if (hh) {
        setHousehold(hh as Household)
        setName(hh.name)
        setStaples(hh.pantry_staples.join(', '))
        setPrefs(hh.dietary_preferences.join(', '))
      }
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

  function inviteUser() {
    if (!inviteEmail.trim()) return
    setInviteMsg(
      `Share your household ID with ${inviteEmail}: ${household?.id ?? '—'}. They'll need to sign up and then you can update their profile's household_id to match yours in Supabase.`,
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 p-6 max-w-xl mx-auto w-full">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

        <form onSubmit={save} className="card p-5 space-y-4 mb-6">
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

        {/* Second user */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Add household member</h2>
          <p className="text-sm text-gray-500">
            Scullery supports two users per household. The second user should sign up, then share
            their account with you so you can update their <code>household_id</code> to match yours.
          </p>

          {household && (
            <div>
              <label className="label">Your household ID</label>
              <code className="block text-xs bg-gray-100 rounded px-3 py-2 break-all">{household.id}</code>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="email"
              className="input"
              placeholder="partner@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <button type="button" onClick={inviteUser} className="btn-secondary shrink-0">Get invite info</button>
          </div>

          {inviteMsg && (
            <p className="text-xs text-gray-600 bg-gray-50 rounded p-3">{inviteMsg}</p>
          )}
        </div>
      </div>
    </div>
  )
}
