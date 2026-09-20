import os

from dotenv import load_dotenv

__dir = os.path.dirname(__file__)
_ = load_dotenv(__dir + "/../backend/.env")


POSTGRES_URI: str = os.getenv(
    "POSTGRES_URI", "postgres://postgres:postgres@localhost:5432/postgres"
)
DB_OPTIONS = os.getenv("DB_OPTIONS", "-c%20search_path%3Dlanggraph")
DB_OPTIONS_URI = POSTGRES_URI + "?options=" + DB_OPTIONS
