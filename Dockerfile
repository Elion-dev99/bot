FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATA_DIR=/app/data

CMD ["node", "src/index.js"]
