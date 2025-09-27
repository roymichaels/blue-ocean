# Use Node 20-slim as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package metadata first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the application source
COPY . .

# Expose Expo ports
EXPOSE 19000 19001 19002

# Default command runs the development server
CMD ["npm", "run", "dev"]
