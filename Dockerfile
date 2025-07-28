# Use Node 20-slim as the base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock first to leverage Docker cache
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application source
COPY . .

# Expose Expo ports
EXPOSE 19000 19001 19002

# Default command runs the development server
CMD ["yarn", "dev"]
