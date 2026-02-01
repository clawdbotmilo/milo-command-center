'use client'

import { useEffect, useState, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  audio?: string
}

export default function Conversation() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex
          const result = event.results[current]
          setTranscript(result[0].transcript)
          
          if (result.isFinal) {
            handleUserMessage(result[0].transcript)
          }
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setError(`Speech recognition error: ${event.error}`)
          setIsListening(false)
        }
      } else {
        setError('Speech recognition not supported in this browser. Try Chrome!')
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing && !isSpeaking) {
      setTranscript('')
      setError(null)
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return
    
    setIsListening(false)
    setIsProcessing(true)
    setTranscript('')

    // Add user message
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])

    try {
      // Get AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) throw new Error('Failed to get response')
      
      const data = await response.json()
      const assistantMessage: Message = { role: 'assistant', content: data.content }
      setMessages(prev => [...prev, assistantMessage])

      // Speak the response
      setIsSpeaking(true)
      const audioResponse = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.content })
      })

      if (audioResponse.ok) {
        const blob = await audioResponse.blob()
        const audio = new Audio(URL.createObjectURL(blob))
        audio.onended = () => setIsSpeaking(false)
        audio.play()
      } else {
        setIsSpeaking(false)
      }
    } catch (e) {
      console.error('Error:', e)
      setError('Failed to get response. Make sure the API is configured.')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusText = () => {
    if (isSpeaking) return '🔊 Speaking...'
    if (isProcessing) return '🤔 Thinking...'
    if (isListening) return '🎤 Listening...'
    return '🎙️ Click to speak'
  }

  const getStatusColor = () => {
    if (isSpeaking) return 'bg-green-600'
    if (isProcessing) return 'bg-yellow-600'
    if (isListening) return 'bg-red-600 animate-pulse'
    return 'bg-blue-600 hover:bg-blue-500'
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-400 hover:text-white">← Back</a>
            <span className="text-2xl">🌱</span>
            <div>
              <h1 className="text-xl font-bold">Talk to Milo</h1>
              <p className="text-sm text-gray-400">Voice conversation</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Voice: George 🇬🇧
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-4">🎙️</div>
              <p className="text-lg">Click the button below and start speaking!</p>
              <p className="text-sm mt-2">I'll listen, think, and respond with voice.</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {msg.role === 'assistant' && <span className="mr-2">🌱</span>}
                {msg.content}
              </div>
            </div>
          ))}
          
          {transcript && isListening && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-600/50 text-white/70 italic">
                {transcript}...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/50 border-t border-red-800 p-3 text-center text-red-300">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="border-t border-gray-800 p-6">
        <div className="container mx-auto max-w-2xl flex flex-col items-center gap-4">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing || isSpeaking}
            className={`w-24 h-24 rounded-full ${getStatusColor()} text-white text-4xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isListening ? '⏹️' : '🎤'}
          </button>
          <p className="text-gray-400">{getStatusText()}</p>
        </div>
      </div>
    </div>
  )
}
