from _env_helper import DB_URI  # pyright: ignore[reportImplicitRelativeImport]
from langgraph.store.postgres import PoolConfig

print(DB_URI.split("@")[-1].split(":")[0])


# We will use a setup function to create the tables required by the Saver and Store.
def setup_database(db_uri: str):
    """Ensure the database tables are created for LangGraph."""
    from langgraph.checkpoint.postgres import PostgresSaver

    # from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    from langgraph.store.postgres import PostgresStore
    # from langgraph.store.postgres.aio import AsyncPostgresStore

    # NOTE: PostgresStore is currently being added to the ecosystem, but we can also use
    # the generic BaseStore or specific Postgres implementations depending on the version.
    # We'll use PostgresSaver which natively supports setting up its tables.
    try:
        with PostgresSaver.from_conn_string(db_uri) as saver:
            saver.setup()
        with PostgresStore.from_conn_string(
            db_uri, pool_config=PoolConfig(max_size=4, min_size=1)
        ) as store:
            store.setup()
        print(" ✅ Postgres checkpoint tables configured successfully.")
    except Exception as e:
        print(" ⚠️ Could not connect to Postgres at *****.")
        print(f"Error: {e}")
        print(
            "Please ensure your database is running to execute the following cells fully."
        )


# Run the setup
setup_database(DB_URI)
