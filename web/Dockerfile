FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Accept build arg for API URL (Railway will pass this as env var)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application with API URL baked in
RUN npm run build

# Production stage
FROM nginx:alpine

# Install envsubst for templating nginx config
RUN apk add --no-cache gettext

# Static assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx templated config
RUN mkdir -p /etc/nginx/templates
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default port (Railway overrides this with its injected PORT)
ENV PORT=80
EXPOSE 80

# Render config with $PORT and start nginx
CMD ["/bin/sh", "-c", "envsubst < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
