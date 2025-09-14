import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../utils/backend'

// GET /api/student/attendance?userId=xyz - Get attendance data for a student
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const response = await fetchFromBackend(`/api/student/attendance/${userId}`, {
      method: 'GET'
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching attendance data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}
