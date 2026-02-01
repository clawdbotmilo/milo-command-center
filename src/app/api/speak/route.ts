import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const EC2_API = 'http://18.222.108.56:3002'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${EC2_API}/api/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate speech')
    }
    
    const audioBuffer = await response.arrayBuffer()
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg'
      }
    })
  } catch (e) {
    console.error('TTS proxy error:', e)
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 })
  }
}
