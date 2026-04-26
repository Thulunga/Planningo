import { redirect } from 'next/navigation'

export default function FeedbackEntryPage() {
  redirect('/settings?tab=feedback')
}
