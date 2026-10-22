#!/usr/bin/env python3
"""Build the static QPet Games site for GitHub Pages."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
EXCLUDED_DIRS = {".git", ".github", "_site", "source", "tools", "node_modules", "__pycache__"}
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


def validate(root: Path) -> tuple[int, int]:
    for rel in REQUIRED_FILES:
        if not (root / rel).is_file():
            raise SystemExit(f"missing required site file: {rel}")

    data = json.loads((root / "assets/data/games.json").read_text(encoding="utf-8"))
    games = data.get("games", [])
    ids = [game["id"] for game in games]
    if len(set(ids)) != len(ids):
        raise SystemExit("duplicate game id: each #/play/<id> must identify one game")
    for game in games:
        for key in ("cover", "originalCover"):
            if game.get(key) and not (root / game[key]).is_file():
                raise SystemExit(f"missing {key}: {game['id']} -> {game[key]}")
    playable = [game for game in games if game.get("playable")]
    for game in playable:
        swf = root / game["swf"]
        if not swf.is_file():
            raise SystemExit(f"playable game points to missing SWF: {game['id']} -> {game['swf']}")
        content = swf.read_bytes()
        if content.startswith(b"version https://git-lfs.github.com/spec/v1"):
            raise SystemExit(f"Git LFS pointer instead of game: {game['swf']}; run git lfs pull before building")
        if len(content) < 8 or content[:3] not in (b"FWS", b"CWS", b"ZWS"):
            raise SystemExit(f"invalid SWF header: {game['swf']}")
        if len(content) != game.get("sizeBytes"):
            raise SystemExit(f"SWF size differs from source catalog: {game['swf']}")
        if hashlib.sha256(content).hexdigest() != game.get("sha256"):
            raise SystemExit(f"SWF SHA-256 differs from source catalog: {game['swf']}")

    ruffle_path = root / data["ruffleSource"]
    if not ruffle_path.is_file():
        raise SystemExit(f"missing Ruffle entry point: {data['ruffleSource']}")
    wasm_files = list(ruffle_path.parent.glob("*.wasm"))
    if not wasm_files or any(path.read_bytes()[:4] != b"\0asm" for path in wasm_files):
        raise SystemExit("Ruffle WebAssembly files are missing or invalid")
    return len(games), len(playable)


def main() -> None:
    # Fail before replacing a good build if Git LFS has not hydrated the checkout.
    validate(ROOT)
    copied = copy_site()
    total, playable = validate(OUT)
    (OUT / ".nojekyll").write_text("", encoding="utf-8")
    print(f"built _site with {copied} files; games={total}; playable={playable}")


if __name__ == "__main__":
    main()
