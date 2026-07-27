#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting deployment process..."

# 1. Build the frontend
echo "Building the frontend..."
cd ../frontend
npm install
npm run build

# Navigate back to the project root
cd ..

# 2. Prepare the backend workdir
echo "Preparing backend working directory..."
WORKDIR="backend/workdir"
mkdir -p "$WORKDIR"

# Remove the existing dist folder if it exists
if [ -d "$WORKDIR/dist" ]; then
    echo "Removing old dist directory..."
    rm -rf "$WORKDIR/dist"
fi

# 3. Move the compiled frontend to the backend workdir
echo "Moving dist directory to backend workdir..."
mv frontend/dist "$WORKDIR/dist"

echo "Success! The frontend has been built and moved to $WORKDIR/dist."
echo "You can now run the backend application to serve the frontend."
