#!/bin/sh
# Initialize local SQLite database using migration files

set -e

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 command not found" >&2
  exit 1
fi

DB_PATH="${1:-sqlite/db.sqlite}"
mkdir -p "$(dirname "$DB_PATH")"

for sql in sqlite/migrations/*.sql; do
  echo "Applying $sql"
  sqlite3 "$DB_PATH" < "$sql"
  if [ $? -ne 0 ]; then
    echo "Failed to apply $sql" >&2
    exit 1
  fi
done

echo "Database initialized at $DB_PATH"
