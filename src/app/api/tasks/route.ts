import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Task {
  name: string
  status: string
  description: string
}

export async function GET() {
  const notionKey = process.env.NOTION_API_KEY
  
  if (!notionKey) {
    return NextResponse.json({ tasks: [], error: 'Notion API key not configured' })
  }
  
  try {
    const response = await fetch(
      'https://api.notion.com/v1/data_sources/2fa57efe-1839-80b4-9edd-000b236269ce/query',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionKey}`,
          'Notion-Version': '2025-09-03',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: {
            property: 'Status',
            status: { does_not_equal: 'Done' }
          }
        }),
        cache: 'no-store'
      }
    )
    
    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`)
    }
    
    const data = await response.json()
    const tasks: Task[] = (data.results || []).map((page: any) => {
      const props = page.properties || {}
      return {
        name: props.Name?.title?.[0]?.plain_text || 'Untitled',
        status: props.Status?.status?.name || 'Not started',
        description: props.Description?.rich_text?.[0]?.plain_text || ''
      }
    })
    
    return NextResponse.json({ tasks })
  } catch (e) {
    console.error('Failed to fetch Notion tasks:', e)
    return NextResponse.json({ tasks: [], error: 'Failed to fetch tasks' })
  }
}
