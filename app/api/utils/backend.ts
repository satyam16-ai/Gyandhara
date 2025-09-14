// Utility function to get the backend URL
export function getBackendUrl(): string {
  // Priority order: NEXT_PUBLIC_BACKEND_URL (client-side) > BACKEND_URL (server-side) > fallback
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                    process.env.BACKEND_URL || 
                    'https://gyandhara-backend.onrender.com'
  
  // Remove trailing slash if present
  const cleanUrl = backendUrl.replace(/\/$/, '')
  
  // Log the URL being used for debugging
  console.log(`🔧 Backend URL: ${cleanUrl}`)
  
  return cleanUrl
}

// Helper function to make API calls to backend
export async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getBackendUrl()
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${cleanEndpoint}`
  
  console.log(`🔗 API Call: ${options.method || 'GET'} ${url}`)
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
    
    console.log(`📡 Response: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`)
    }
    
    return response
  } catch (error) {
    console.error(`💥 Network Error:`, error)
    throw error
  }
}