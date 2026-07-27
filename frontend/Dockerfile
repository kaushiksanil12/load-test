# Build stage for tracing
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:1.25-alpine
COPY . /usr/share/nginx/html
# Override the generated tracing-bundle.js from the builder stage
COPY --from=builder /app/tracing-bundle.js /usr/share/nginx/html/tracing-bundle.js
# Inject environment variable at runtime
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-inject-env.sh && \
    echo 'sed -i "s|TEMPO_URL_PLACEHOLDER|${TEMPO_URL}|g" /usr/share/nginx/html/tracing-bundle.js' >> /docker-entrypoint.d/40-inject-env.sh && \
    chmod +x /docker-entrypoint.d/40-inject-env.sh
EXPOSE 80
