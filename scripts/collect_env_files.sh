#!/bin/sh

# This script collects the content of three specified files,
# appends them to each other, and writes the combined content to a new file.

# Get the directory where the script is located, and the project root (one level up)
SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT="$SCRIPT_DIR/.."

# Define the input files
FILE1=".env.local"
FILE2="frontend/.env"
FILE3="backend/.env"

# Define the output file
OUTPUT_FILE=".env"

# Clear the output file to start fresh
> "$OUTPUT_FILE"

# Function to append a file's content with a header if it exists
append_file() {
    if [ -f "$1" ]; then
        {
            # Use double quotes to allow variable expansion for the file path
            printf '# ========= ENV Vars from %s =========\n\n' "$1"
            cat "$PROJECT_ROOT/$1"
            printf '\n\n'
        } >> "$PROJECT_ROOT/$OUTPUT_FILE"
    fi
}

append_file "$FILE1"
append_file "$FILE2"
append_file "$FILE3"

echo "Combined .env files into '$OUTPUT_FILE'."
