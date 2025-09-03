import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

// GET /api/rooms/student/available - Get all available rooms for students
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/rooms/student/available`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching available rooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available rooms' },
      { status: 500 }
    )
  }
}
