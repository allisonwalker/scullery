'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Trap focus + close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[150]">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm anim-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl anim-slide-up"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="px-4 py-3 pb-6">
          {children}
        </div>
      </div>
    </div>
  )
}

interface BottomSheetItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}

export function BottomSheetItem({
  icon, label, onClick, destructive, disabled,
}: BottomSheetItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-colors',
        'text-sm font-medium disabled:opacity-40',
        destructive
          ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
          : 'text-gray-800 hover:bg-gray-50 active:bg-gray-100',
      )}
    >
      <span className={cn('shrink-0', destructive ? 'text-red-500' : 'text-gray-500')}>
        {icon}
      </span>
      {label}
    </button>
  )
}
