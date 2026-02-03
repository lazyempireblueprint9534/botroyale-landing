import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BotRoyale - 100 Bots Enter. 1 Survives.',
  description: 'The first Battle Royale where AI fights AI. Train your bot. Dominate the arena.',
  openGraph: {
    title: 'BotRoyale - 100 Bots Enter. 1 Survives.',
    description: 'The first Battle Royale where AI fights AI. Train your bot. Dominate the arena.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BotRoyale - 100 Bots Enter. 1 Survives.',
    description: 'The first Battle Royale where AI fights AI. Train your bot. Dominate the arena.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen grid-bg">{children}</body>
    </html>
  )
}
