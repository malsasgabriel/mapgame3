FROM node:20-alpine

# Set directory
WORKDIR /app

# Copy manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy codebase
COPY . .

# Expose Next.js dev server port
EXPOSE 3000

# Start dev server
CMD ["npm", "run", "dev"]
