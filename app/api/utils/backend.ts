// Utility function to get the backend URL
export function getBackendUrl(): string {
  const backendUrl = process.env.BACKEND_URL || 
                    process.env.NEXT_PUBLIC_BACKEND_URL || 
                    'https://gyandhara-backend.onrender.com'
  
  // Remove trailing slash if present
  return backendUrl.replace(/\/$/, '')
}

// Helper function to make API calls to backend
export async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getBackendUrl()
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${cleanEndpoint}`
  
  console.log(`🔗 API Call: ${options.method || 'GET'} ${url}`)
  
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
}