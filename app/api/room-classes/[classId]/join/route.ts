import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

// POST /api/room-classes/[classId]/join - Student joins a class
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    
    // Handle empty request body gracefully
    let body = {}
    try {
      const text = await request.text()
      if (text.trim()) {
        body = JSON.parse(text)
      }
    } catch (jsonError) {
      console.log('No JSON body provided, using empty object')
    }
    
    // Forward the Authorization header from the client
    const authHeader = request.headers.get('authorization')

    const response = await fetch(`${BACKEND_URL}/api/room-classes/${classId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader })
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error joining class:', error)
    return NextResponse.json(
      { error: 'Failed to join class' },
      { status: 500 }
    )
  }
}
