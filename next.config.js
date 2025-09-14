/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  
  // Build configuration
  serverExternalPackages: ['mongoose', 'bcryptjs'],
  
  // Image optimization
  images: {
    domains: ['localhost', 'your-domain.com'],
    unoptimized: process.env.NODE_ENV === 'development' ? true : false,
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'socket.io-client']
  },
  
  // Output configuration for Vercel
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  distDir: '.next',
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },
  
  // Redirects for production
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/login',
        permanent: false
      }
    ]
  },
  
  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer')
      }
    }
    
    // External dependencies
    config.externals = config.externals || []
    if (!isServer) {
      config.externals.push('node-opus')
    }
    
    // Production optimizations
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    }
    
    return config
  },
  
  // Environment variables
  env: {
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8080'
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false
  }
}

module.exports = nextConfig
