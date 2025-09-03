import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

// GET /api/room-classes/teacher/[teacherId]/upcoming - Get teacher's upcoming classes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params

    const response = await fetch(`${BACKEND_URL}/api/room-classes/teacher/${teacherId}/upcoming`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching teacher upcoming classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch upcoming classes' },
      { status: 500 }
    )
  }
}
