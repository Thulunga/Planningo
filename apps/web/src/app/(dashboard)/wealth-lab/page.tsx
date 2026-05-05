import type { Metadata } from 'next'
import { WealthLabDashboard } from '@/components/wealth/wealth-lab-dashboard'

export const metadata: Metadata = {
  title: 'Wealth Lab - Planningo',
}

export default function WealthLabPage() {
  return <WealthLabDashboard />
}
