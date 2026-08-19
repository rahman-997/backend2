FROM node:24-alpine AS build
WORKDIR /app
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
COPY schema ./schema
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/schema ./schema
USER node
EXPOSE 3000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/server.js"]
