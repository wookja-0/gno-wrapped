# Production image: next build (standalone) → minimal Node runtime.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Inlined into client code (share links), so it's a build arg.
ARG NEXT_PUBLIC_SHARE_BASE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SHARE_BASE_URL=$NEXT_PUBLIC_SHARE_BASE_URL NEXT_TELEMETRY_DISABLED=1
RUN npx next build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 WRAPPED_API_URL=http://api:8080
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
