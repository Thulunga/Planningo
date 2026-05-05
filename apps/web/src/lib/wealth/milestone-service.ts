export interface CorpusMilestone {
  min: number
  label: string
  subtitle: string
  tier: 'starter' | 'freedom' | 'comfort' | 'luxury' | 'legacy'
}

const CORPUS_MILESTONES: CorpusMilestone[] = [
  {
    min: 0,
    label: 'Starter Safety Net',
    subtitle: 'Emergency buffer and basic investment stability',
    tier: 'starter',
  },
  {
    min: 10_000_000,
    label: 'Basic Financial Freedom',
    subtitle: '₹1Cr class: partial work-optional lifestyle',
    tier: 'freedom',
  },
  {
    min: 30_000_000,
    label: 'Comfortable Independence',
    subtitle: 'Strong retirement runway with inflation cushion',
    tier: 'comfort',
  },
  {
    min: 50_000_000,
    label: 'Luxury Retirement',
    subtitle: '₹5Cr class: high-comfort retirement with flexibility',
    tier: 'luxury',
  },
  {
    min: 100_000_000,
    label: 'Generational Wealth',
    subtitle: 'Long-horizon family wealth preservation and transfer',
    tier: 'legacy',
  },
]

export function getCorpusMilestone(targetCorpus: number): CorpusMilestone {
  let current = CORPUS_MILESTONES[0]

  for (const milestone of CORPUS_MILESTONES) {
    if (targetCorpus >= milestone.min) {
      current = milestone
    } else {
      break
    }
  }

  return current
}

export function getNextCorpusMilestone(targetCorpus: number): CorpusMilestone | null {
  for (const milestone of CORPUS_MILESTONES) {
    if (milestone.min > targetCorpus) return milestone
  }
  return null
}
