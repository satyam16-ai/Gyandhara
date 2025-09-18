// Enhanced utility function to get the backend URL with better environment handling
export function getBackendUrl(): string {
  // Detect environment
  const isDev = process.env.NODE_ENV !== 'production'
  
  // Default URLs for different environments
  const defaultLocalUrl = 'http://localhost:8080' // Match server PORT in .env.local
  const defaultProdUrl = 'https://gyandhara-backend.onrender.com'
  const defaultUrl = isDev ? defaultLocalUrl : defaultProdUrl
  
  // Priority order: 
  // 1. NEXT_PUBLIC_BACKEND_URL (client-side)
  // 2. BACKEND_URL (server-side)
  // 3. Environment-specific default
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
                    process.env.BACKEND_URL || 
                    defaultUrl
  
  // Remove trailing slash if present
  const cleanUrl = backendUrl.replace(/\/$/, '')
  
  // Log the URL being used for debugging with environment context
  console.log(`🔧 Backend URL: ${cleanUrl} (${isDev ? 'development' : 'production'})`)
  
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