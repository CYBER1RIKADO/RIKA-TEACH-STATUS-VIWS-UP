FROM node:18
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm cache clean --force
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
