# <img src="frontend/public/favicon.ico" alt="PalliRoute Logo" width="32" height="32" style="vertical-align: middle;"> PalliRoute

PalliRoute ist ein Projekt zur automatischen Optimierung von Fahrtrouten im Gesundheitswesen.

## Installation und Start

Die Konfiguration erfolgt **ausschließlich über die Datei `.env`**. Die Datei `docker-compose.yml` wird nicht angepasst.

### 1. Umgebung konfigurieren

Kopieren Sie die Beispieldatei für Umgebungsvariablen und passen Sie die Werte an:

```bash
cp .env.example .env
```

Bearbeiten Sie die Datei **`.env`** (im gleichen Ordner wie `docker-compose.yml`). Alle Einstellungen werden dort vorgenommen:

| Variable | Beschreibung |
|----------|--------------|
| **WEB_DOMAIN** | Domain für das Web-Frontend (z. B. `web.palliroute.de`). DNS A-Record muss auf den Server zeigen. |
| **PWA_DOMAIN** | Domain für das PWA-Frontend (z. B. `pwa.palliroute.de`). Wird für die spätere Umstellung auf Traefik/Domain vorgehalten; PWA ist aktuell weiter über Port 3001 erreichbar. |
| **LETSENCRYPT_EMAIL** | E-Mail für Let’s Encrypt (z. B. Ablaufwarnungen). |
| **DNS_CHALLENGE_PROVIDER** | DNS-Anbieter für die Let’s-Encrypt-DNS-Challenge (z. B. `cloudflare`), wenn der Server nicht von außen erreichbar ist (nur VPN). |
| **CF_DNS_API_TOKEN** | Bei Cloudflare: API-Token mit Berechtigung „Zone – DNS – Edit“. Nur nötig, wenn `DNS_CHALLENGE_PROVIDER=cloudflare` gesetzt ist. |
| **CORS_ORIGINS** | Erlaubte Ursprünge für CORS, kommagetrennt (Web-/PWA-Domain; bei PWA über IP zusätzlich `http://<Server-IP>:3001`; localhost). |
| **SECRET_KEY** | Geheimer Schlüssel für die Flask-Anwendung. |
| **GOOGLE_MAPS_API_KEY** | Google Maps API-Schlüssel für Geocoding und Routenplanung. |
| **APLANO_API_KEY** | API-Schlüssel für die Aplano-Integration. |
| **AUTO_IMPORT_ENABLED** | Automatischer Import (z. B. `true`). |
| **AUTO_IMPORT_TIMES** | Importzeiten im Format HH:MM, kommasepariert (z. B. `08:00,12:30,16:00`). |
| **EXCEL_IMPORT_PATH** | Pfad zum Ordner mit **Mitarbeiterliste** und **Pflegeheime** (absolut oder relativ zum Projektroot). |
| **EXPORT_PALLIDOC_PATH** | Pfad zum PalliDoc-Export-Ordner (absolut oder relativ zum Projektroot). |

**Ordnerstruktur für den Import:**

- Unter `EXCEL_IMPORT_PATH`: z. B. `Mitarbeiterliste/Mitarbeiterliste.xlsx`, `Pflegeheime/Pflegeheime.xlsx`.
- `EXPORT_PALLIDOC_PATH` kann an beliebiger Stelle liegen; im Container wird er unter `excel_import/Export_PalliDoc` eingehängt.

### 2. SSL-Zertifikate (Let’s Encrypt/DNS-Challenge)

- **Web-Frontend (über Domain):** Traefik holt und verlängert Let’s-Encrypt-Zertifikate automatisch per **DNS-Challenge**.
  - In `.env` `DNS_CHALLENGE_PROVIDER` (z. B. `cloudflare`) und den passenden API-Token (z. B. `CF_DNS_API_TOKEN`) setzen.
  - DNS der Domain (z. B. `palliroute.de`) muss beim gewählten Anbieter liegen (Nameserver entsprechend umstellen).

### 3. Ordner für Let’s Encrypt anlegen

Vor dem ersten Start im Projektordner ausführen (Traefik speichert dort die Zertifikate):

```bash
mkdir -p letsencrypt
```

### 4. Container starten

```bash
docker compose up -d
```

### 5. Zugriff auf die Anwendung

- **Web-Frontend:** `https://<WEB_DOMAIN>` (z. B. `https://web.palliroute.de`). HTTP wird automatisch auf HTTPS umgeleitet.
- **PWA-Frontend:** aktuell `http://<Server-IP>:3001`.
- **Backend-API:** Nur intern; Aufrufe erfolgen über die Frontends unter `/api`.
- **Traefik-Dashboard:** Nur lokal auf dem Server unter `http://localhost:8080` (nicht von außen erreichbar).

### 6. Container verwalten

```bash
docker compose down
```

## CI/CD

GitHub Actions prüft jeden Push und Pull Request auf `main`. Nach erfolgreicher CI auf `main` startet automatisch das Deployment.

| Workflow | Trigger | Inhalt |
|----------|---------|--------|
| **CI** | PR + Push `main` | Ruff, ESLint, Prettier, Typecheck, Build, Audits, Docker-Verify, Gitleaks |
| **CodeQL** | PR + Push `main` | Statische Code-Analyse (Python + TypeScript) |
| **CD** | CI erfolgreich auf `main` | Image-Build, Trivy Image-Scan, SBOM, Push, Deploy (Self-Hosted) |

**Lokal ausführen:**

```bash
# Backend
pip install ruff pytest pip-audit
ruff check backend && ruff format --check backend

# Frontend
cd frontend
npm ci
npm run lint && npm run format:check && npm run typecheck && npm run build
```

**GitHub-Einrichtung nach dem Merge:**

1. Repository Secrets: `DOCKER_USERNAME`, `DOCKER_PASSWORD`
2. Self-Hosted Runner online (Label für Deploy-Job)
3. Branch Protection für `main`: Required status checks **CI** (alle Jobs) — optional
4. **CodeQL aktivieren** (siehe unten)

GitHub Environments sind **nicht** erforderlich; Deploy läuft direkt auf dem Self-Hosted Runner.

### CodeQL aktivieren

Der Workflow [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml) ist bereits im Repo. So schaltest du die Auswertung ein:

1. **Repository → Settings → Code security and analysis**
2. Unter **Code scanning** → **Set up** bzw. **Enable** (GitHub erkennt oft automatisch den Workflow)
3. Alternativ: **Actions** → Workflow **CodeQL** → **Run workflow** (manueller erster Lauf)
4. Ergebnisse: **Security** → **Code scanning alerts**

**Hinweis:** Bei **öffentlichen** Repos ist CodeQL kostenlos. Bei **privaten** Repos brauchst du [GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security) (Lizenz/Organisation) — der Workflow läuft trotzdem, SARIF-Upload kann ohne GHAS eingeschränkt sein.

Dependabot erstellt wöchentlich Update-PRs für npm, pip und GitHub Actions.

## Lizenz

Dieses Projekt ist urheberrechtlich geschützt. Alle Rechte vorbehalten. Siehe [LICENSE](LICENSE) für Details.
