#!/bin/bash
# Double-click this file in Finder (or run it) to pull in the latest zip
# Claude sent you, merge it into this project, and push it live on Railway.
#
# It finds the newest hq-app*.zip in your Downloads folder automatically —
# you don't need to know the exact filename, even if your browser saved it
# as "hq-app (1).zip" or similar.

set -e
cd "$(dirname "$0")/.."

echo "Protocol Lab — pulling in your latest update"
echo "--------------------------------------------"

ZIP=$(ls -t "$HOME/Downloads"/hq-app*.zip 2>/dev/null | head -n 1)
if [ -z "$ZIP" ]; then
  echo "Couldn't find an hq-app*.zip in your Downloads folder."
  echo "Make sure you've downloaded the file Claude sent before running this."
  read -p "Press Return to close..."
  exit 1
fi
echo "Using: $ZIP"

TMP=$(mktemp -d)
unzip -q -o "$ZIP" -d "$TMP"

if [ ! -d "$TMP/hq-app/src" ]; then
  echo "That zip didn't look like a project update (no src folder inside)."
  echo "If this keeps happening, tell Claude — the zip format may have changed."
  rm -rf "$TMP"
  read -p "Press Return to close..."
  exit 1
fi

cp -r "$TMP/hq-app/src" ./
cp -r "$TMP/hq-app/prisma" ./
[ -f "$TMP/hq-app/README.md" ] && cp "$TMP/hq-app/README.md" ./
rm -rf "$TMP"

if git diff --quiet && git diff --cached --quiet; then
  echo "Nothing changed — this update matches what's already live. Nothing to push."
  read -p "Press Return to close..."
  exit 0
fi

git add -A
git commit -m "Update from Claude ($(date '+%Y-%m-%d %H:%M'))" --quiet
echo "Pushing to GitHub..."
git push

echo ""
echo "Done. Railway will redeploy automatically — give it a couple of minutes,"
echo "then refresh your site."
read -p "Press Return to close..."
