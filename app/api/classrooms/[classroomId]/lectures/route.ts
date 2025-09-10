import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params
    const body = await request.json()
    
    // Forward to backend API
    const backendResponse = await fetch(`http://localhost:8080/api/classrooms/${classroomId}/lectures`, {
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
    console.error('Error creating lecture:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create lecture' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    const url = `http://localhost:8080/api/classrooms/${classroomId}/lectures${status ? `?status=${status}` : ''}`
    
    // Forward to backend API
    const backendResponse = await fetch(url, {
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
    console.error('Error fetching lectures:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lectures' },
      { status: 500 }
    )
  }
}
