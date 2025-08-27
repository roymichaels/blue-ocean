FROM node:18-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN yarn install --production
COPY src ./src
RUN yarn build
CMD ["node", "dist/server.js"]
