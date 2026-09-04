#!/bin/bash
# External-ref audit for newly vendored games (offline-first check).
cd /home/leozhang/TestRepoGame/Games || exit 1
for d in CrushTheCastle HelixJump GeometryRash DrMario StreetFighter2 AdvanceWars MarioKartSuperCircuit MetroidFusion MegaManZero KirbyAmazingMirror SonicAdvance; do
  refs=$(grep -rohE "https?://[^\"') ]+" "$d" 2>/dev/null | grep -v "w3.org" | sort -u | head -2)
  if [ -z "$refs" ]; then
    echo "$d: clean"
  else
    echo "$d: $refs"
  fi
done
