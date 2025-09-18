// Utility function to get the backend URL
export function getBackendUrl(): string {
  // Prefer localhost in development; otherwise use envs with production fallback
  const isDev = process.env.NODE_ENV !== 'production'
  const defaultUrl = isDev ? 'http://localhost:10000' : 'https://gyandhara-backend.onrender.com'
  // Priority order: NEXT_PUBLIC_BACKEND_URL (client-side) > BACKEND_URL (server-side) > default
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                    process.env.BACKEND_URL || 
                    defaultUrl
  
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