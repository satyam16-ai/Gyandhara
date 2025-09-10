import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Forward to backend API
    const backendResponse = await fetch(`http://localhost:8080/api/classrooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, {
      status: backendResponse.status
    })
    
  } catch (error) {
    console.error('Error joining classroom:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to join classroom' },
      { status: 500 }
    )
  }
}
