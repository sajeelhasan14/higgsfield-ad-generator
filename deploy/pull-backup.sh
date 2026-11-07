#!/usr/bin/env bash
# Copies the newest server backup to this laptop, so one failed server disk can't lose everything.
# Run from the project folder in Git Bash: bash deploy/pull-backup.sh [folder]   (default: ~/adstudio-backups)
# The copy holds the whole database, so keep it somewhere private. Keeps the 8 newest of each kind.
set -euo pipefail

SERVER=publisher@50.6.203.155
KEY=~/.ssh/adstudio-vps
SSH="ssh -i $KEY -o IdentitiesOnly=yes"
TARGET=${1:-$HOME/adstudio-backups}

mkdir -p "$TARGET"
for kind in db storage; do
  NEWEST=$($SSH "$SERVER" "ls -1t ~/backups/$kind-* | grep -v '\.part$' | head -1")
  [ -n "$NEWEST" ] || { echo "No $kind backup on the server"; exit 1; }
  scp -i "$KEY" -o IdentitiesOnly=yes "$SERVER:$NEWEST" "$TARGET/"
  ls -1t "$TARGET"/$kind-* | tail -n +9 | xargs -r rm --
done
echo "Done: $(ls -1 "$TARGET" | wc -l) files in $TARGET"
