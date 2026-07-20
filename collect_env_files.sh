#!/bin/sh

# This script collects the content of three specified files,
# appends them to each other, and writes the combined content to a new file.

# Define the input files
FILE1=".env.local"
FILE2="frontend/.env"
FILE3="backend/.env"

# Define the output file
OUTPUT_FILE=".env"

# Append the content of the three files to the output file
{
    printf     '# ========= Root ENV Vars...     ==================\n\n'
    cat "$FILE1"
    printf '\n\n# ========= Frontend ENV Vars... ==================\n\n'
    cat "$FILE2"
    printf '\n\n# ========= Backend ENV Vars...  ==================\n\n'
    cat "$FILE3"
} > "$OUTPUT_FILE"
echo "Content of '$FILE1', '$FILE2', and '$FILE3' has been combined into '$OUTPUT_FILE'."
