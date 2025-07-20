#!/bin/sh
# Create a SQL dump of the local SQLite database
DB_PATH="${1:-sqlite/blue-ocean.db}"
DUMP_FILE="${2:-dump.sql}"

mkdir -p "$(dirname "$DUMP_FILE")"

sqlite3 "$DB_PATH" .dump > "$DUMP_FILE"
if [ $? -ne 0 ]; then
  echo "Failed to backup database" >&2
  exit 1
fi

echo "Database dumped to $DUMP_FILE"
