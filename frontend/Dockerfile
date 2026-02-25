FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image - just copy dist
FROM alpine:3.18
WORKDIR /app
COPY --from=builder /app/dist /app/dist
