#!/bin/sh
set -e

# Default to production if ENVIRONMENT is not set
ENVIRONMENT=${ENVIRONMENT:-production}
BACKEND_PORT=${BACKEND_PORT:-8090}


# If the user passed arguments (e.g. `docker run image sh`), execute those instead
if [ $# -gt 0 ]; then
    exec "$@"
fi

echo "Starting in $ENVIRONMENT mode on port $BACKEND_PORT..."

if [ "$ENVIRONMENT" = "development" ]; then
    exec uvicorn src.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload --reload-dir src
else
    exec uvicorn src.main:app --host 0.0.0.0 --port "$BACKEND_PORT"
fi
