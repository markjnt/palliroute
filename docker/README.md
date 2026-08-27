# Docker Build-Anleitung

## Backend API
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-backend-api \
  --build-arg OS_SEC_UPDATE=$(date -u +%Y%m%d) --target main -f docker/backend.Dockerfile --push .
```

## Backend Scheduler
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-backend-scheduler \
  --build-arg OS_SEC_UPDATE=$(date -u +%Y%m%d) --target scheduler-image -f docker/backend.Dockerfile --push .
```

OS package layers (`apk` / `apt`) accept `--build-arg OS_SEC_UPDATE=YYYYMMDD` so security
upgrades are not stuck behind BuildKit cache (CI/CD sets this to the UTC date).

## Frontend-Web
Build-Kontext ist das **Repository-Root** (wegen `docker/nginx_*.conf` und `frontend/`):

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-frontend-web \
  --build-arg OS_SEC_UPDATE=$(date -u +%Y%m%d) -f docker/frontend_web.Dockerfile --push .
```

## Frontend-PWA
Wie Web: Env-Variablen (`AZURE_TENANT_ID` / `AZURE_CLIENT_ID`) kommen per Compose in den
Container; das nginx-Image ersetzt sie in `nginx_pwa.conf.template` (→ `/config.js`).

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t markjnt/palliroute-frontend-pwa \
  --build-arg OS_SEC_UPDATE=$(date -u +%Y%m%d) -f docker/frontend_pwa.Dockerfile --push .
```

Lokale Frontend-Entwicklung (ohne Docker): `cd frontend && npm install`, dann `npm run dev:web` / `npm run dev:pwa`.
Auth lokal: `frontend/.env` nach `frontend/.env.example` (INTERNAL_API_KEY + VITE_AZURE_*).
