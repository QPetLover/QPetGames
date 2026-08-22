#!/usr/bin/env python3
"""Build the static QPet Games site for GitHub Pages."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
EXCLUDED_DIRS = {".git", ".github", "_site", "source", "tools", "node_modules"}
EXCLUDED_FILES = {".DS_Store"}
REQUIRED_FILES = [
    "index.html",
    "assets/css/site.css",
    "assets/js/app.js",
    "assets/data/games.json",
    "reskin_games/games.json",
    "classical_games/games.json",
]


def should_skip(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    return any(part in EXCLUDED_DIRS for part in rel.parts) or path.name in EXCLUDED_FILES


def copy_site() -> int:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    copied = 0
    for path in ROOT.rglob("*"):
        if should_skip(path) or path == OUT:
            continue
        target = OUT / path.relative_to(ROOT)
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        copied += 1
    return copied


def validate() -> tuple[int, int]:
    for rel in REQUIRED_FILES:
        if not (OUT / rel).exists():
            raise SystemExit(f"missing required file in build output: {rel}")

    data = json.loads((OUT / "assets/data/games.json").read_text(encoding="utf-8"))
    games = data.get("games", [])
    playable = [game for game in games if game.get("playable")]
    for game in playable:
        swf = OUT / game["swf"]
        if not swf.exists():
            raise SystemExit(f"playable game points to missing SWF: {game['id']} -> {game['swf']}")
    return len(games), len(playable)


def main() -> None:
    copied = copy_site()
    total, playable = validate()
    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    print(f"built _site with {copied} files; games={total}; playable={playable}")


if __name__ == "__main__":
    main()
