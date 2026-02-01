'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="h-16 bg-milo-dark border-b border-milo-border sticky top-0 z-50">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-milo-green focus:ring-offset-2 focus:ring-offset-milo-dark rounded-lg px-2 py-1 transition-all duration-200"
        >
          <span className="text-2xl group-hover:animate-bounce transition-transform">🌱</span>
          <span className="font-semibold text-white text-lg hidden sm:block group-hover:text-milo-green transition-colors duration-200">
            Milo Command Center
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg
                  transition-all duration-200 ease-out
                  focus:outline-none focus:ring-2 focus:ring-milo-green focus:ring-offset-2 focus:ring-offset-milo-dark
                  ${
                    isActive
                      ? 'bg-milo-green/20 text-milo-green shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-milo-card hover:scale-105 active:scale-95'
                  }
                `}
              >
                <span className={isActive ? 'animate-pulse' : ''}>{item.icon}</span>
                <span className="font-medium hidden sm:block">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-green-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="font-medium text-sm hidden md:block">Online</span>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
