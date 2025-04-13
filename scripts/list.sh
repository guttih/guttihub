#!/bin/bash

#Lists all files in the current directory and its subdirectories, excluding certain paths
CMD="find . -type f ! -path \"./node_modules/*\" ! -path \"./.next/*\" ! -path \"./.env.local\" ! -path \"./.vscode/*\" ! -path \"./.git/*\" ! -path \"./public/cache/*\" ! -path \"./html/*\" -print"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Execute the command and store the output in a variable
echo "cd $REPO_ROOT" && cd "$REPO_ROOT"

echo "$CMD"
OUTPUT=$(eval $CMD)
# Check if the command was successful
if [ $? -eq 0 ]; then
    # Print the output
    echo "$OUTPUT"
else
    # Print an error message if the command failed
    echo "Error: Failed to list files."
fi