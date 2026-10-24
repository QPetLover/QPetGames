#!/usr/bin/env python3
"""Build the original-game comparison site from an explicit deployment allowlist."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "_site"
MANIFEST = ROOT / "tools/deploy-files.json"
ORIGINAL_IDS = {f"classic-{index:03d}" for index in range(1, 17)} | {
    "happy-forest", "happy-qqtang", "happy-dungeon"
}
REQUIRED_FILES = {
    ".nojekyll", "index.html", "assets/css/site.css", "assets/js/app.js",
    "assets/data/games.json", "classical_games/index.html", "classical_games/pages.html",
    "classical_games/games.json", "onegame.html",
}


def checked_path(root: Path, relative: str) -> Path:
    """Reject alternate roots, traversal and symlink escapes before reading/copying."""
    if not isinstance(relative, str) or "\\" in relative:
        raise SystemExit(f"invalid deploy path: {relative!r}")
    path = PurePosixPath(relative)
    if path.is_absolute() or not path.parts or path.as_posix() != relative or any(part in (".", "..") for part in path.parts):
        raise SystemExit(f"invalid deploy path: {relative!r}")
    if path.parts[0] == "reskin_games" or "reskin" in relative.lower():
        raise SystemExit(f"retired reskin file in deployment: {relative}")
    target = root / relative
    if not target.resolve().is_relative_to(root.resolve()) or any(
        item.is_symlink() for item in (target, *target.parents) if item != root
    ):
        raise SystemExit(f"symlink/escape in deployment: {relative}")
    if not target.is_file():
        raise SystemExit(f"missing site file: {relative}")
    return target


def deployment_files(root: Path) -> set[str]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    static = manifest.get("files", [])
    if manifest.get("schemaVersion") != 1 or len(static) != len(set(static)):
        raise SystemExit("invalid or duplicate deployment allowlist entry")
    files = set(static)
    if not REQUIRED_FILES <= files:
        raise SystemExit("required page missing from deployment allowlist")
    for relative in files:
        checked_path(root, relative)

    data = json.loads((root / "assets/data/games.json").read_text(encoding="utf-8"))
    games = data.get("games", [])
    ids = [game["id"] for game in games]
    if len(ids) != len(set(ids)) or set(ids) != ORIGINAL_IDS:
        raise SystemExit("catalog must contain exactly the 16 classic and 3 community original IDs")
    for game in games:
        classic = game["id"].startswith("classic-")
        expected_kind = "classic" if classic else "archive"
        prefix = "classical_games/" if classic else "community_games/"
        if game.get("kind") != expected_kind or game.get("playable") is not True:
            raise SystemExit(f"invalid original classification/status: {game['id']}")
        for key in ("swf", "cover", "originalCover"):
            relative = game.get(key)
            if not relative:
                if key != "originalCover":
                    raise SystemExit(f"missing {key}: {game['id']}")
                continue
            if not relative.startswith(prefix):
                raise SystemExit(f"unexpected original resource path: {game['id']} -> {relative}")
            checked_path(root, relative)
            files.add(relative)
        content = (root / game["swf"]).read_bytes()
        if content.startswith(b"version https://git-lfs.github.com/spec/v1"):
            raise SystemExit(f"Git LFS pointer instead of game: {game['swf']}; run git lfs pull")
        if len(content) < 8 or content[:3] not in (b"FWS", b"CWS", b"ZWS"):
            raise SystemExit(f"invalid SWF header: {game['swf']}")
        if len(content) != game.get("sizeBytes"):
            raise SystemExit(f"SWF size differs from catalog: {game['swf']}")
        if hashlib.sha256(content).hexdigest() != game.get("sha256"):
            raise SystemExit(f"SWF SHA-256 differs from catalog: {game['swf']}")

    for experience in data.get("experiences", []):
        if experience.get("cover"):
            relative = experience["cover"]
            if relative not in files:
                raise SystemExit(f"experience cover missing from deployment allowlist: {relative}")
            checked_path(root, relative)

    ruffle = data["ruffleSource"]
    if ruffle not in files:
        raise SystemExit("Ruffle entry missing from deployment allowlist")
    wasm_files = [relative for relative in files if relative.startswith("assets/vendor/ruffle/") and relative.endswith(".wasm")]
    if not wasm_files or any(checked_path(root, relative).read_bytes()[:4] != b"\0asm" for relative in wasm_files):
        raise SystemExit("Ruffle WebAssembly files are missing or invalid")
    return files


def validate_output(files: set[str]) -> None:
    actual = {str(path.relative_to(OUT)) for path in OUT.rglob("*") if path.is_file()}
    if actual != files:
        raise SystemExit(f"deployment file mismatch: extra={sorted(actual - files)}; missing={sorted(files - actual)}")
    if deployment_files(OUT) != files:
        raise SystemExit("deployed catalog differs from source allowlist")


def main() -> None:
    # Verify content before replacing an existing build. Do not copy the repo root:
    # historical resources remain archived without being publicly deployed.
    files = deployment_files(ROOT)
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    for relative in sorted(files):
        source = checked_path(ROOT, relative)
        target = OUT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    validate_output(files)
    print(f"built _site with {len(files)} allowlisted files; originals=19; reskins=0")


if __name__ == "__main__":
    main()
