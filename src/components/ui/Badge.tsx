import { cn } from '@/lib/utils'
import type { MealType } from '@/types'
import { MEAL_TYPE_COLORS, MEAL_TYPE_LABELS } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'library' | 'new' | 'locked'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const variantClass = {
    default: 'bg-gray-100 text-gray-600',
    library: 'bg-brand-100 text-brand-700',
    new:     'bg-purple-100 text-purple-700',
    locked:  'bg-amber-100 text-amber-700',
  }[variant]

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variantClass, className)}>
      {children}
    </span>
  )
}

export function MealTypeBadge({ type }: { type: MealType }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', MEAL_TYPE_COLORS[type])}>
      {MEAL_TYPE_LABELS[type]}
    </span>
  )
}
