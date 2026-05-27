import { redirect } from 'next/navigation'
import { getMondayOfWeek, formatWeekStart } from '@/lib/utils'

export default function PlannerIndexPage() {
  const monday = getMondayOfWeek(new Date())
  redirect(`/planner/${formatWeekStart(monday)}`)
}
