import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../../../utils/backend'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const response = await fetchFromBackend(`/api/admin-simple/users/${userId}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get user profile proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
