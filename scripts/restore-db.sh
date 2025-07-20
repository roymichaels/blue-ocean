#!/bin/sh
# Restore SQLite database from a SQL dump
DB_PATH="${1:-sqlite/blue-ocean.db}"
DUMP_FILE="${2:-dump.sql}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump file $DUMP_FILE does not exist" >&2
  exit 1
fi

sqlite3 "$DB_PATH" < "$DUMP_FILE"
if [ $? -ne 0 ]; then
  echo "Failed to restore database" >&2
  exit 1
fi

echo "Database restored from $DUMP_FILE to $DB_PATH"
