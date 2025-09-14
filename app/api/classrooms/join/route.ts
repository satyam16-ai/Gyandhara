import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../utils/backend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const backendResponse = await fetchFromBackend('/api/classrooms/join', {
      method: 'POST',
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
