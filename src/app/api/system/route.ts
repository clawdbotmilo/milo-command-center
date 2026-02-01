import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EC2_API = 'http://18.222.108.56:3002'

export async function GET() {
  try {
    const response = await fetch(`${EC2_API}/api/system`, {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch from EC2')
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error('Failed to fetch system info:', e)
    return NextResponse.json({ error: 'Failed to fetch system info' }, { status: 500 })
  }
}
