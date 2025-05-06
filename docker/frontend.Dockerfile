
# build the frontend
FROM node:20.19.0-alpine3.21 AS frontendbuilder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY frontend/package.json frontend/yarn.lock* frontend/package-lock.json* frontend/pnpm-lock.yaml* ./

RUN ls

RUN corepack enable pnpm && pnpm i --frozen-lockfile --no-optional; 

# The actual app code
COPY frontend/ ./
RUN corepack enable pnpm && pnpm run build --outDir /pb/pb_public;
