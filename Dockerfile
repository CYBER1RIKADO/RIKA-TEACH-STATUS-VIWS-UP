FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm cache clean --force
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
