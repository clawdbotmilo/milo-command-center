import { NextRequest, NextResponse } from 'next/server'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Generate a project plan from conversation or direct idea
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectName, idea, conversation } = body as {
      projectName: string
      idea?: string
      conversation?: Message[]
    }

    if (!projectName || (!idea && !conversation?.length)) {
      return NextResponse.json(
        { error: 'Missing projectName or idea/conversation' },
        { status: 400 }
      )
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'AI not configured - add ANTHROPIC_API_KEY to env' },
        { status: 500 }
      )
    }

    // Build context from conversation or single idea
    const context = conversation 
      ? conversation.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n\n')
      : idea

    const planPrompt = `You just had this planning conversation about a project called "${projectName}":

---
${context}
---

Now generate a structured project plan based on everything discussed. Use this exact format:

# Project: ${projectName}

## Overview
Brief description of what this project will accomplish based on the conversation.

## Tasks

### [T1] Task Name (sonnet)
- **Description:** What this task does
- **Files:** List of files to create/modify
- **Criteria:** How to know it's done

### [T2] Next Task (sonnet)
...continue for all tasks...

## Dependencies
- T2 depends on T1
- etc.

## Completion Criteria
- How to verify the entire project is complete

Guidelines:
- Use (sonnet) for most tasks, (opus) only for complex architectural decisions
- Keep tasks focused and achievable in one coding session
- Include clear file paths and completion criteria
- Be specific about what each task produces
- Order tasks logically based on dependencies discussed`

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: planPrompt }],
      }),
    })

    if (!claudeResponse.ok) {
      console.error('Claude API failed:', await claudeResponse.text())
      return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 })
    }

    const claudeData = await claudeResponse.json()
    const plan = claudeData.content?.[0]?.text || ''

    if (!plan) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 })
    }

    return NextResponse.json({ plan })

  } catch (error) {
    console.error('Plan generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
