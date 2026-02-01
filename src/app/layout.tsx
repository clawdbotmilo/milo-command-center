import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Milo Command Center 🌱',
  description: 'Personal AI Assistant Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-milo-dark text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
