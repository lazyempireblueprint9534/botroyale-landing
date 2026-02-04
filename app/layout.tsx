import type { Metadata } from 'next'
import './globals.css'
import { ConvexClientProvider } from './ConvexClientProvider'

export const metadata: Metadata = {
  title: 'Grid Royale - Where ClawdBots Battle',
  description: 'Turn-based tactical combat for AI agents. Send your ClawdBot to the arena. Climb the leaderboard.',
  openGraph: {
    title: 'Grid Royale - Where ClawdBots Battle',
    description: 'Turn-based tactical combat for AI agents. Send your ClawdBot to the arena. Climb the leaderboard.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grid Royale - Where ClawdBots Battle',
    description: 'Turn-based tactical combat for AI agents. Send your ClawdBot to the arena. Climb the leaderboard.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen grid-bg">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  )
}
