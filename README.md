# <img src="frontend/public/favicon.ico" alt="PalliRoute Logo" width="32" height="32" style="vertical-align: middle;"> PalliRoute

PalliRoute ist ein Projekt zur automatischen Optimierung von Fahrtrouten im Gesundheitswesen.

## Installation und Start

Traefik läuft als **eigener Stack** (geteilt für Prod/Dev). Die App-Stacks (`docker-compose.yml`) enthalten nur Anwendung + Postgres.

### 1. Traefik (einmalig)

```bash
mkdir -p ~/traefik/letsencrypt
cp traefik/docker-compose.yml ~/traefik/
cp traefik/.env.example ~/traefik/.env
# ~/traefik/.env: LETSENCRYPT_EMAIL, DNS_CHALLENGE_PROVIDER, CF_DNS_API_TOKEN
docker network create traefik-public 2>/dev/null || true   # nur wenn noch nicht vorhanden
cd ~/traefik && docker compose up -d
```

Let’s Encrypt speichert Zertifikate unter `~/traefik/letsencrypt`. DNS der Domain muss beim Challenge-Anbieter liegen (z. B. Cloudflare).

### 2. App-Umgebung konfigurieren

```bash
cp .env.example .env
```

Bearbeiten Sie **`.env`** im App-Ordner (z. B. `~/palliroute`):

| Variable | Beschreibung |
|----------|--------------|
| **STAGE** | `prod` oder `dev` — Projektname, Container, Traefik-Router und Docker-Image-Tag (`…:prod` / `…:dev`). |
| **WEB_DOMAIN** | Domain für das Web-Frontend (z. B. `web.palliroute.de`). DNS A-Record muss auf den Server zeigen. |
| **PWA_DOMAIN** | Domain für die PWA (HTTPS über Traefik, wie Web). |
| **CORS_ORIGINS** | Erlaubte Ursprünge für CORS, kommagetrennt (Web-/PWA-Domains, localhost für lokale Dev). |
| **SECRET_KEY** | Geheimer Schlüssel für die Flask-Anwendung. |
| **GOOGLE_MAPS_API_KEY** | Google Maps API-Schlüssel für Geocoding und Routenplanung. |
| **APLANO_API_KEY** | API-Schlüssel für die Aplano-Integration. |
| **AUTO_IMPORT_ENABLED** | Automatischer Import (z. B. `true`). |
| **AUTO_IMPORT_TIMES** | Importzeiten im Format HH:MM, kommasepariert (z. B. `08:00,12:30,16:00`). |
| **EXCEL_IMPORT_PATH** | Pfad zum Ordner mit **Mitarbeiterliste** und **Pflegeheime** (absolut oder relativ zum Projektroot). |
| **EXPORT_PALLIDOC_PATH** | Pfad zum PalliDoc-Export-Ordner (absolut oder relativ zum Projektroot). |
| **POSTGRES_PASSWORD** | PostgreSQL-Passwort für den Docker-Service `postgres`. |

Dieselbe `docker-compose.yml` gilt für Prod und Dev — Unterschiede nur über die jeweilige `.env`.

**Ordnerstruktur für den Import:**

- Unter `EXCEL_IMPORT_PATH`: z. B. `Mitarbeiterliste/Mitarbeiterliste.xlsx`, `Pflegeheime/Pflegeheime.xlsx`.
- `EXPORT_PALLIDOC_PATH` kann an beliebiger Stelle liegen; im Container wird er unter `excel_import/Export_PalliDoc` eingehängt.

### 3. App-Container starten

Voraussetzung: Netz `traefik-public` existiert (wird vom Traefik-Stack angelegt).

```bash
docker compose up -d
```

### 4. Zugriff auf die Anwendung

- **Web-Frontend:** `https://<WEB_DOMAIN>` (z. B. `https://web.palliroute.de`). HTTP wird automatisch auf HTTPS umgeleitet.
- **PWA-Frontend:** `https://<PWA_DOMAIN>` (z. B. `https://pwa.palliroute.de`).
- **Backend-API:** Nur intern; Aufrufe erfolgen über die Frontends unter `/api`.
- **Traefik-Dashboard:** Nur lokal auf dem Server unter `http://localhost:8080` (nicht von außen erreichbar).

### 5. Container verwalten

```bash
# App-Stack
docker compose down

# Traefik (selten; betrifft alle Environments)
cd ~/traefik && docker compose down
```
## Lizenz

Dieses Projekt ist urheberrechtlich geschützt. Alle Rechte vorbehalten. Siehe [LICENSE](LICENSE) für Details.
