# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Same-origin /api when served behind the repo root gateway nginx
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

