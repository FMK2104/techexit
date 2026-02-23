FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=6000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY public ./public
COPY src ./src

EXPOSE 6000

CMD ["npm", "start"]
