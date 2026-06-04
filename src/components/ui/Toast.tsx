'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToastStore, type Toast } from '@/store/toastStore'
import { cn } from '@/lib/utils'

// ── Single toast ─────────────────────────────────────────────────────────────

const ICONS = {
  success: <CheckCircle size={15} className="shrink-0 text-green-500" />,
  error:   <AlertCircle  size={15} className="shrink-0 text-red-500" />,
  info:    <Info         size={15} className="shrink-0 text-brand-500" />,
}

const BORDER = {
  success: 'border-green-200 bg-white',
  error:   'border-red-200 bg-white',
  info:    'border-brand-200 bg-white',
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const [visible, setVisible] = useState(false)

  // Trigger enter animation on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm',
        'transition-all duration-300 motion-reduce:transition-none',
        BORDER[toast.type],
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2',
      )}
    >
      {ICONS[toast.type]}
      <p className="text-sm text-gray-800 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors -mt-0.5"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ── Container rendered once in the layout ────────────────────────────────────

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
