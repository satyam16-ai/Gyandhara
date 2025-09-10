import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params
    
    // Forward to backend API
    const backendResponse = await fetch(`http://localhost:8080/api/classrooms/teacher/${teacherId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, {
      status: backendResponse.status
    })
    
  } catch (error) {
    console.error('Error fetching teacher classrooms:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch classrooms' },
      { status: 500 }
    )
  }
}
