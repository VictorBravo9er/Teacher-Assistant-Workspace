import sys

from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.store.postgres import PoolConfig, PostgresStore


# We will use a setup function to create the tables required by the Saver and Store.
def setup_database(db_uri: str | None = None):
    """Ensure the database tables are created for LangGraph."""

    # from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    # from langgraph.store.postgres.aio import AsyncPostgresStore

    # NOTE: PostgresStore is currently being added to the ecosystem, but we can also use
    # the generic BaseStore or specific Postgres implementations depending on the version.
    # We'll use PostgresSaver which natively supports setting up its tables.
    try:
        if not db_uri:
            print(
                "Error: POSTGRES_URI environment variable is not set.",
                file=sys.stderr,
            )
            print(
                "Please set it. Example: export POSTGRES_URI='postgresql://postgres:password@host:5432/postgres'",
                file=sys.stderr,
            )
            raise ValueError("POSTGRES_URI environment variable is not set.")

        with PostgresSaver.from_conn_string(db_uri) as saver:
            print("▶️ Langgraph checkpoint tables configuring...")

            saver.setup()

        with PostgresStore.from_conn_string(
            db_uri, pool_config=PoolConfig(min_size=1, max_size=3)
        ) as store:
            print("▶️ Langgraph store tables configuring...")
            store.setup()

        print(
            " ✅ Postgres checkpoint and store tables for langgraph configured successfully."
        )

    except Exception as e:
        print(" ⚠️ Could not connect to Postgres at *****.", file=sys.stderr)
        print(f"Error: {e}", file=sys.stderr)
        print(
            "Please ensure your database is running to execute the following cells fully.",
            file=sys.stderr,
        )
        raise e


# Run the setup
def main():
    from _env_helper import (  # pyright: ignore[reportImplicitRelativeImport]
        DB_OPTIONS_URI,
    )

    setup_database(DB_OPTIONS_URI)


if __name__ == "__main__":
    main()
