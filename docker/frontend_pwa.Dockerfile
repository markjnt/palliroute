# syntax=docker/dockerfile:1.6
FROM node:22.13.1-alpine AS build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
COPY frontend/web/package.json web/
COPY frontend/pwa/package.json pwa/
COPY frontend/packages/shared/package.json packages/shared/

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY frontend/ ./

WORKDIR /app/frontend/pwa

RUN npm run build

FROM nginx:alpine

RUN apk update && apk upgrade

COPY --from=build /app/frontend/pwa/dist /usr/share/nginx/html

COPY docker/nginx_pwa.conf /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
