FROM node:24-slim AS base

# bcrypt requires python3, make, g++ to compile native bindings
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (cached unless package*.json changes)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the project
COPY . .

# Build the Next.js app
RUN npm run build

# Push DB schema, seed data, then start the production server
# Next.js reads PORT env var automatically; Railway sets it dynamically
CMD npx drizzle-kit push --force && npx tsx src/lib/db/seed.ts && npm start
