# Use Node.js 20 LTS (required for mediasoup 3.19.2)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for mediasoup
RUN apk add --no-cache \
    build-base \
    python3 \
    py3-pip \
    make \
    g++ \
    linux-headers \
    libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --verbose

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:10000/health || exit 1

# Start the application
CMD ["npm", "start"]