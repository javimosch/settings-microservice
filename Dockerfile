# syntax=docker/dockerfile:1
FROM node:20.17.0-alpine

ENV NODE_ENV=production
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with fallback
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application code
COPY . .

EXPOSE 3006
CMD ["node", "src/server.js"]
