FROM node:20-alpine

# Set directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 8080

# Run development server by default
CMD ["npm", "run", "dev"]
