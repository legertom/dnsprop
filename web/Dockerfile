FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
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

# Default port (overridden by Railway)
ENV PORT=8080
EXPOSE 8080

# Render config with $PORT and start nginx
CMD ["/bin/sh", "-c", "envsubst '$$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
