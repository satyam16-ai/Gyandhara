// Utility function to get the backend URL
export function getBackendUrl(): string {
  return process.env.BACKEND_URL || 
         process.env.NEXT_PUBLIC_BACKEND_URL || 
         'http://localhost:8080'
}

// Helper function to make API calls to backend
export async function fetchFromBackend(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getBackendUrl()
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
}