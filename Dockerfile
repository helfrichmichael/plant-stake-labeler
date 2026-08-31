# ==========================================
# Stage 1: Build Angular Web Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy source and build production bundle
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Minimal Runtime Server (Python 3)
# ==========================================
FROM python:3.12-alpine AS runner

WORKDIR /app

# Copy built frontend assets
COPY --from=builder /app/dist/label-live-app/browser ./dist/label-live-app/browser

# Copy server script and configuration template
COPY server.py config.example.json ./

# Define persistent data directory for config.json and print_history.json
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 4200

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:4200/api/config')" || exit 1

ENTRYPOINT ["python3", "server.py", "4200"]
