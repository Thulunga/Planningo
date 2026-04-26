import type { Metadata } from 'next'
import Link from 'next/link'
import { Gamepad2, Dice5, Trophy, Users, Sparkles, Clock3 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Games',
  description: 'Play casual games with friends inside Planningo.',
}

type GameCard = {
  name: string
  subtitle: string
  players: string
  duration: string
  status: 'Coming Soon' | 'In Design'
  icon: React.ComponentType<{ className?: string }>
  gradient: string
}

const games: GameCard[] = [
  {
    name: 'Ludo Arena',
    subtitle: 'Classic 4-player race with live rooms',
    players: '2-4 players',
    duration: '10-20 min',
    status: 'Coming Soon',
    icon: Dice5,
    gradient: 'from-emerald-500/25 via-cyan-500/15 to-transparent',
  },
  {
    name: 'UNO Clash',
    subtitle: 'Fast card battles with custom house rules',
    players: '2-6 players',
    duration: '8-15 min',
    status: 'Coming Soon',
    icon: Sparkles,
    gradient: 'from-rose-500/25 via-orange-500/15 to-transparent',
  },
  {
    name: 'Chess Duel',
    subtitle: 'Ranked and friendly real-time matches',
    players: '2 players',
    duration: '5-30 min',
    status: 'In Design',
    icon: Trophy,
    gradient: 'from-violet-500/25 via-indigo-500/15 to-transparent',
  },
  {
    name: 'Quiz Party',
    subtitle: 'Topic-based trivia with friend leaderboards',
    players: '2-8 players',
    duration: '5-10 min',
    status: 'In Design',
    icon: Users,
    gradient: 'from-sky-500/25 via-blue-500/15 to-transparent',
  },
]

export default function GamesPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_45%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Gamepad2 className="h-3.5 w-3.5" />
              Play Zone
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Games</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Multiplayer mini-games are on the way. Explore what is coming next and get ready to play with your friends.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-right">
            <p className="text-xs text-muted-foreground">Planned games</p>
            <p className="text-lg font-bold">{games.length}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => {
          const Icon = game.icon
          return (
            <article
              key={game.name}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 transition-opacity group-hover:opacity-100`} />

              <div className="relative">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/80">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      game.status === 'Coming Soon'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {game.status}
                  </span>
                </div>

                <h2 className="text-base font-semibold">{game.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{game.subtitle}</p>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-border/70 bg-background/70 px-2.5 py-2">
                    <p className="text-muted-foreground">Players</p>
                    <p className="mt-0.5 font-medium">{game.players}</p>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/70 px-2.5 py-2">
                    <p className="text-muted-foreground">Duration</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 font-medium">
                      <Clock3 className="h-3 w-3" />
                      {game.duration}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
        Want to suggest a game? Share ideas in
        {' '}
        <Link href="/feedback" className="font-medium text-primary hover:underline">
          Feedback
        </Link>
        {' '}
        and we can prioritize it.
      </section>
    </div>
  )
}
