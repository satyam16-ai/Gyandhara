import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../../utils/backend'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params
    
    const backendResponse = await fetchFromBackend(`/api/classrooms/${classroomId}/details`, {
      method: 'GET'
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, {
      status: backendResponse.status
    })
    
  } catch (error) {
    console.error('Error fetching classroom details:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch classroom details' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
) {
  try {
    const { classroomId } = await params
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')
    
    const backendResponse = await fetchFromBackend(`/api/classrooms/${classroomId}?teacherId=${teacherId}`, {
      method: 'DELETE'
    })

    const data = await backendResponse.json()
    
    return NextResponse.json(data, {
      status: backendResponse.status
    })
    
  } catch (error) {
    console.error('Error deleting classroom:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete classroom' },
      { status: 500 }
    )
  }
}
