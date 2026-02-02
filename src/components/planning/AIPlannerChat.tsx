'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AIPlannerChatProps {
  projectName: string
  onPlanGenerated: (content: string) => void
}

export function AIPlannerChat({ projectName, onPlanGenerated }: AIPlannerChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [planReady, setPlanReady] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai/plan-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      
      // Check if AI indicates plan is ready
      if (data.planReady) {
        setPlanReady(true)
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I hit an error. Let's try again — what's your idea?" 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const generatePlan = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          conversation: messages,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate plan')

      const data = await res.json()
      onPlanGenerated(data.plan)
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Had trouble generating the plan. Let me try again..." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startOver = () => {
    setMessages([])
    setPlanReady(false)
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur border-b border-blue-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <span className="text-white text-sm">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Plan with AI</h3>
            <p className="text-xs text-gray-500">Let&apos;s figure out what to build</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={startOver}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            Start over
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-3xl">💡</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">What do you want to build?</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              Describe your idea and I&apos;ll ask questions to help shape the plan.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Plan Ready Button */}
      {planReady && !isLoading && (
        <div className="px-4 py-3 bg-green-50 border-t border-green-200">
          <button
            onClick={generatePlan}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 transition-all active:scale-[0.98]"
          >
            ✨ Generate Plan
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-100">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={messages.length === 0 ? "Describe your idea..." : "Reply..."}
            className="flex-1 px-4 py-2.5 text-sm text-gray-900 rounded-xl border border-gray-200 bg-white 
              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent 
              resize-none placeholder:text-gray-400"
            disabled={isLoading}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 
              text-white flex items-center justify-center shadow-md
              hover:from-blue-600 hover:to-indigo-700 transition-all
              disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
