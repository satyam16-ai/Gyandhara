import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../utils/backend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Auth login proxy - received request')
    console.log('Request body:', body)
    
    // Forward the request to the backend server using the utility
    const response = await fetchFromBackend('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    console.log('Backend login response status:', response.status)
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Login proxy error:', error)
    return NextResponse.json(
      { error: 'Network error. Please try again.' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
