import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-outfit', display: 'swap' })

export const metadata: Metadata = {
  title: 'RoscaTV', description: 'Tu tracker personal de películas, series y anime.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'RoscaTV' },
  applicationName: 'RoscaTV',
  icons: { apple: '/icons/apple-touch-icon.png', icon: '/icon.png' },
}
export const viewport: Viewport = {
  viewportFit: 'cover', themeColor: '#0B0A17',
  width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={outfit.variable} style={{ colorScheme: 'dark', background: '#0B0A17' }}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RoscaTV" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
