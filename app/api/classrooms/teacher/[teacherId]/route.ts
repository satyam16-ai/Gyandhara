import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../../utils/backend'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params
    
    const backendResponse = await fetchFromBackend(`/api/classrooms/teacher/${teacherId}`, {
      method: 'GET'
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
