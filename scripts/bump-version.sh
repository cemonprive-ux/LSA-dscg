#!/usr/bin/env bash
# Incrémente version.json (format AAAA-MM-JJ.N, N repart à 1 chaque jour).
# La bannière « Mise à jour disponible » de l'application s'affiche quand cette version change.
# Usage : scripts/bump-version.sh ["Message affiché aux utilisateurs"]
set -euo pipefail
cd "$(dirname "$0")/.."
today="$(TZ=Europe/Paris date +%F)"
note="${1:-Le contenu du site a été mis à jour.}"
current="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' version.json | head -1)"
n=1
if [[ "$current" == "$today."* ]]; then n=$(( ${current##*.} + 1 )); fi
python3 - "$today.$n" "$note" <<'PY'
import json, sys
with open("version.json", "w", encoding="utf-8") as f:
    json.dump({"version": sys.argv[1], "note": sys.argv[2]}, f, ensure_ascii=False, indent=1)
    f.write("\n")
PY
echo "version.json -> $today.$n"
