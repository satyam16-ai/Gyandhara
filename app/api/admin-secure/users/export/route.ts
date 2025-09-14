import { NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '../../../utils/backend'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    
    const response = await fetchFromBackend(`/api/admin-simple/users/export?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    if (format === 'csv') {
      const csvData = await response.text()
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=users.csv',
        },
      })
    }

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Export users proxy error:', error)
    return NextResponse.json(
      { error: 'Export failed', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
