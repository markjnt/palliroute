import logging
import sys

logging.basicConfig(level=logging.DEBUG)

from sqlalchemy.exc import OperationalError

from app import create_app, db

app = create_app()


def check_database_connection() -> None:
    try:
        with app.app_context():
            with db.engine.connect():
                pass
    except OperationalError as exc:
        print(
            f"\nFEHLER: Keine Verbindung zur PostgreSQL-Datenbank.\n\nDetails: {exc}\n",
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    check_database_connection()
    app.run(debug=True, port=9000, host="0.0.0.0")
