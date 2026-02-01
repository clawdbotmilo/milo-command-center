'use client'

import { useState, useEffect, ReactNode } from 'react'

interface ProjectLayoutProps {
  sidebar: ReactNode
  children: ReactNode
}

export function ProjectLayout({ sidebar, children }: ProjectLayoutProps) {
  // Start closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Check screen size on mount
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024
    setIsSidebarOpen(isDesktop)
  }, [])

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Mobile overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-20 lg:hidden
          transition-opacity duration-300 ease-in-out
          ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          transform transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full'}
          lg:translate-x-0 lg:flex-shrink-0
          pt-16 lg:pt-0
        `}
      >
        {sidebar}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Mobile header with toggle */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95"
            aria-label="Toggle sidebar"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isSidebarOpen ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isSidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
          <span className="font-medium text-gray-700">Projects</span>
        </div>

        {/* Content area with smooth fade-in */}
        <div className="flex-1 overflow-auto p-4 lg:p-6 animate-fadeIn">
          {children}
        </div>
      </main>
    </div>
  )
}

export default ProjectLayout
