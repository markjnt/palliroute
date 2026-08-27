# syntax=docker/dockerfile:1.6
FROM node:22.13.1-alpine AS build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
COPY frontend/web/package.json web/
COPY frontend/pwa/package.json pwa/
COPY frontend/packages/shared/package.json packages/shared/
COPY frontend/packages/models/package.json packages/models/
COPY frontend/packages/api/package.json packages/api/
COPY frontend/packages/queries/package.json packages/queries/
COPY frontend/packages/stores/package.json packages/stores/
COPY frontend/packages/ui/package.json packages/ui/
COPY frontend/packages/auth/package.json packages/auth/

RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY frontend/ ./

WORKDIR /app/frontend/web

RUN npm run build

FROM nginx:alpine

# Bust this layer daily in CI/CD so apk security updates are not stuck behind BuildKit cache.
ARG OS_SEC_UPDATE=0
RUN echo "OS_SEC_UPDATE=${OS_SEC_UPDATE}" \
    && apk update && apk upgrade

COPY --from=build /app/frontend/web/dist /usr/share/nginx/html

# Official nginx image runs envsubst on /etc/nginx/templates/*.template
COPY docker/nginx_web.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
