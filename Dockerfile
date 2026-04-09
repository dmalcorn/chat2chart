FROM node:24-slim

WORKDIR /app

# Install dependencies first (cached unless package*.json changes)
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the project
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
