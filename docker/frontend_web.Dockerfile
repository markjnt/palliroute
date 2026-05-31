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

WORKDIR /app/frontend/web

RUN npm run build

FROM nginx:alpine

RUN apk update && apk upgrade

COPY --from=build /app/frontend/web/dist /usr/share/nginx/html

COPY docker/nginx_web.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
