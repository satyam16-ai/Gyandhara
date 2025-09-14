import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../../utils/backend'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params

    const backendResponse = await fetchFromBackend(`/api/classrooms/student/${studentId}`, {
      method: 'GET'
    })

    const data = await backendResponse.json()

    return NextResponse.json(data, {
      status: backendResponse.status,
    })
  } catch (error) {
    console.error('Error fetching student classrooms:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student classrooms' },
      { status: 500 }
    )
  }
}
