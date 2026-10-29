#!/bin/sh
set -e

# Graceful termination handler
cleanup() {
    echo ""
    echo "🛑 Shutting down local Supabase development containers..."
    npx --yes supabase stop
    echo "✅ Local Supabase development server stopped."
    exit 0
}

# Trap termination signals from Docker Compose lifecycle
trap cleanup INT TERM HUP EXIT

echo "🚀 Starting local Supabase development server..."
npx --yes supabase start

echo "✅ Local Supabase development server is running and ready."

# Keep container alive and wait for termination signal
while true; do
    sleep 2 &
    wait $!
done
