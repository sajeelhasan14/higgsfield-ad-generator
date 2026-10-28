#!/usr/bin/env bash
# Nightly backup on the server: the database (ads, schedule, posts, products) and the ad images in storage/.
# Runs every night at 03:30 UTC via adstudio-backup.timer; its output is in: journalctl -u adstudio-backup
# Run by hand with: bash ~/adstudio/deploy/backup.sh
# Restore: gunzip -c db-<time>.sql.gz | psql "$DATABASE_URL"   and   tar xzf storage-<time>.tar.gz -C ~/adstudio
set -euo pipefail

APP_DIR=~/adstudio
BACKUP_DIR=~/backups
KEEP_DAYS=14

# The database password exists only in .env.local, so read the connection string from there.
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$APP_DIR/.env.local" | head -1 | cut -d= -f2- | tr -d '\r')
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL is missing from $APP_DIR/.env.local"; exit 1; }

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" # the dump holds the whole database, so only publisher may read it
STAMP=$(date -u +%Y-%m-%d_%H%M)

# Write to a .part file first, so a failed run never leaves a backup that looks complete.
pg_dump --no-owner "$DATABASE_URL" | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz.part"
mv "$BACKUP_DIR/db-$STAMP.sql.gz.part" "$BACKUP_DIR/db-$STAMP.sql.gz"

# The database only stores the images' file names; the pictures themselves are in storage/.
tar czf "$BACKUP_DIR/storage-$STAMP.tar.gz.part" -C "$APP_DIR" storage
mv "$BACKUP_DIR/storage-$STAMP.tar.gz.part" "$BACKUP_DIR/storage-$STAMP.tar.gz"

# Keep two weeks, so the disk never fills up.
find "$BACKUP_DIR" -name 'db-*' -mtime +$KEEP_DAYS -delete
find "$BACKUP_DIR" -name 'storage-*' -mtime +$KEEP_DAYS -delete

echo "$(date -u '+%F %T') backup done: db-$STAMP.sql.gz, storage-$STAMP.tar.gz"
