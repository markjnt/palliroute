import os

from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))

# Local dev: backend/.env — Docker/Server: root .env via container env
load_dotenv(os.path.join(basedir, ".env"))


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


def _database_uri_from_env() -> str | None:
    url = os.environ.get("DATABASE_URL")
    if not url:
        return None
    return _normalize_database_url(url)


class Config:
    # Flask configuration
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key"

    # Database configuration
    # Using os.path.join ensures path separators are correct for the current OS
    data_dir = os.path.join(basedir, "data")
    os.makedirs(data_dir, exist_ok=True)
    SQLALCHEMY_DATABASE_URI = _database_uri_from_env()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # Google Maps configuration
    GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")

    # CORS configuration
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

    # Import configuration
    xlsx_base_path = os.environ.get("XLSX_IMPORT_PATH_DEV") or os.path.join(
        basedir, "data", "excel_import"
    )

    employees_dir = os.path.join(xlsx_base_path, "Mitarbeiterliste") if xlsx_base_path else None
    if employees_dir:
        os.makedirs(employees_dir, exist_ok=True)
    employees_filename = os.environ.get("EMPLOYEES_IMPORT_FILENAME", "Mitarbeiterliste.xlsx")
    EMPLOYEES_IMPORT_PATH = (
        os.path.join(employees_dir, employees_filename)
        if employees_dir and employees_filename
        else None
    )

    PATIENTS_IMPORT_PATH = (
        os.path.join(xlsx_base_path, "Export_PalliDoc") if xlsx_base_path else None
    )

    pflegeheime_dir = os.path.join(xlsx_base_path, "Pflegeheime") if xlsx_base_path else None
    if pflegeheime_dir:
        os.makedirs(pflegeheime_dir, exist_ok=True)
    pflegeheime_filename = os.environ.get("PFLEGEHEIME_IMPORT_FILENAME", "Pflegeheime.xlsx")
    PFLEGEHEIME_IMPORT_PATH = (
        os.path.join(pflegeheime_dir, pflegeheime_filename)
        if pflegeheime_dir and pflegeheime_filename
        else None
    )

    # Scheduler configuration
    AUTO_IMPORT_ENABLED = os.environ.get("AUTO_IMPORT_ENABLED", "true").lower() == "true"
    # Feste Importzeiten, kommasepariert im Format HH:MM, z.B. "08:00,12:30,16:00"
    AUTO_IMPORT_TIMES = os.environ.get("AUTO_IMPORT_TIMES", "")
    BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://backend-api:9000")

    # Aplano API configuration
    APLANO_API_KEY = os.environ.get("APLANO_API_KEY")
    APLANO_API_BASE_URL = "https://web.aplano.de/papi/v1"
    # If true, include detailed infeasibility diagnostics in API response/logs
    AUTO_PLAN_VERBOSE_INFEASIBLE = (
        os.environ.get("AUTO_PLAN_VERBOSE_INFEASIBLE", "false").lower() == "true"
    )

    # NRW public holidays (feiertage-api.de)
    HOLIDAY_API_BASE_URL = os.environ.get("HOLIDAY_API_BASE_URL", "https://feiertage-api.de/api/")
    HOLIDAY_STATE = os.environ.get("HOLIDAY_STATE", "NW")
