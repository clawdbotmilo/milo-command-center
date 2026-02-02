import { NextResponse } from 'next/server'
import { capabilities, getCapabilitiesByCategory, getEnabledCapabilities } from '@/lib/capabilities'

export async function GET() {
  return NextResponse.json({
    capabilities,
    byCategory: getCapabilitiesByCategory(),
    enabled: getEnabledCapabilities(),
  })
}
