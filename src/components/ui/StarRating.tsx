'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number | null
  onChange?: (rating: number) => void
  readonly?: boolean
}

export default function StarRating({ value, onChange, readonly = false }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value ?? 0

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(null)}
          className={cn(
            'text-lg leading-none transition-colors',
            display >= star ? 'text-amber-400' : 'text-gray-200',
            !readonly && 'cursor-pointer hover:text-amber-400',
          )}
        >
          ★
        </button>
      ))}
    </div>
  )
}
