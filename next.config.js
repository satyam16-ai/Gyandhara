/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'bcryptjs', 'nodemailer', 'twilio'],
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        os: false,
        path: false
      }
    }
    
    // Handle node-specific modules for client-side builds
    config.externals = config.externals || []
    if (!isServer) {
      config.externals.push('node-opus', 'bcryptjs', 'mongoose', 'nodemailer', 'twilio')
    }
    
    return config
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  }
}

module.exports = nextConfig
