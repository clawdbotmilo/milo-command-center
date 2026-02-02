import { NextRequest, NextResponse } from 'next/server'
import { formatCapabilitiesForAI } from '@/lib/capabilities'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Conversational planning assistant
export async function POST(request: NextRequest) {
  try {
    const { projectName, messages } = await request.json() as {
      projectName: string
      messages: Message[]
    }

    if (!projectName || !messages?.length) {
      return NextResponse.json(
        { error: 'Missing projectName or messages' },
        { status: 400 }
      )
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'AI not configured' },
        { status: 500 }
      )
    }

    const capabilitiesContext = formatCapabilitiesForAI()

    const systemPrompt = `You are a thoughtful technical planning assistant helping to scope a project called "${projectName}".

${capabilitiesContext}

Your job is to understand what the user wants to build by asking smart clarifying questions. You should:

1. **Understand the goal**: What problem does this solve? Who is it for?
2. **Clarify scope**: What's in vs out of scope? MVP vs nice-to-have?
3. **Technical details**: What tech stack? Any constraints or existing code to work with?
4. **Dependencies**: What needs to happen first? Any external services or APIs?
5. **Success criteria**: How will we know it's done and working?

When relevant, suggest which capabilities from the toolbox could be used for the project.

Guidelines:
- Ask 2-3 questions at a time, not a wall of questions
- Be conversational and friendly, not robotic
- Use your judgment - don't ask obvious questions if the user was already specific
- After 2-4 exchanges (when you have enough info), say "I think I have a good picture now!" and briefly summarize what you'll plan, then ask if they want to generate the plan
- Keep responses concise - this is mobile-first

When you have enough information to create a solid plan, end your message with exactly this marker on its own line:
[PLAN_READY]

This signals the UI to show the "Generate Plan" button.`

    // Build messages for Claude API
    const claudeMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: claudeMessages,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Claude API error:', errorText)
      return NextResponse.json(
        { error: 'AI request failed' },
        { status: 500 }
      )
    }

    const data = await response.json()
    let message = data.content?.[0]?.text || ''

    // Check if plan is ready
    const planReady = message.includes('[PLAN_READY]')
    message = message.replace('[PLAN_READY]', '').trim()

    return NextResponse.json({ 
      message,
      planReady,
    })

  } catch (error) {
    console.error('Plan chat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
