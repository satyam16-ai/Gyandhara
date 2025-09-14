import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../../utils/backend'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params
    const body = await request.json()
    
    const backendResponse = await fetchFromBackend(`/api/classrooms/${classroomId}/lectures`, {
      method: 'POST',
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
    
    const endpoint = `/api/classrooms/${classroomId}/lectures${status ? `?status=${status}` : ''}`
    
    const backendResponse = await fetchFromBackend(endpoint, {
      method: 'GET'
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
