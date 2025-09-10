import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

// POST /api/room-classes/[classId]/start - Start a live class
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    
    // Try to parse JSON body, but handle empty body gracefully
    let body = {}
    try {
      const text = await request.text()
      if (text && text.trim() !== '') {
        body = JSON.parse(text)
      }
    } catch (parseError) {
      console.log('No JSON body provided, using empty object')
    }

    const response = await fetch(`${BACKEND_URL}/api/room-classes/${classId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error starting class:', error)
    return NextResponse.json(
      { error: 'Failed to start class' },
      { status: 500 }
    )
  }
}
