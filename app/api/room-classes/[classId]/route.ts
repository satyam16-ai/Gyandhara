import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../utils/backend'

// GET /api/room-classes/[classId] - Get a specific class
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params

    const authHeader = request.headers.get('authorization')
    const response = await fetchFromBackend(`/api/room-classes/${classId}`, {
      method: 'GET',
      headers: {
        ...(authHeader && { Authorization: authHeader })
      }
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching class:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class' },
      { status: 500 }
    )
  }
}

// PUT /api/room-classes/[classId] - Update class details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const body = await request.json()

    const authHeader = request.headers.get('authorization')
    const response = await fetchFromBackend(`/api/room-classes/${classId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader })
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error updating class:', error)
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    )
  }
}

// DELETE /api/room-classes/[classId] - Delete class
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params

    const authHeader = request.headers.get('authorization')
    const response = await fetchFromBackend(`/api/room-classes/${classId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader })
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error deleting class:', error)
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    )
  }
}
