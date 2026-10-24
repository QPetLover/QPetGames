#!/usr/bin/env python3
"""Check the release boundary, including deliberate leakage rejection."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("site_builder", Path(__file__).with_name("build_static_site.py"))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)
expected = build.deployment_files(build.ROOT)
build.validate_output(expected)

catalog_text = (build.ROOT / "assets/data/games.json").read_text(encoding="utf-8")
catalog = json.loads(catalog_text)
loads = json.loads
invalid_catalogs = []
extra = copy.deepcopy(catalog)
extra["games"].append({"id": "reskin-001-01", "kind": "reskin", "playable": True})
invalid_catalogs.append(extra)
wrong_kind = copy.deepcopy(catalog)
wrong_kind["games"][0]["kind"] = "reskin"
invalid_catalogs.append(wrong_kind)
wrong_path = copy.deepcopy(catalog)
wrong_path["games"][0]["swf"] = "reskin_games/swf/game.swf"
invalid_catalogs.append(wrong_path)
for invalid in invalid_catalogs:
    with patch.object(build.json, "loads", lambda text: invalid if text == catalog_text else loads(text)):
        try:
            build.deployment_files(build.ROOT)
        except SystemExit:
            pass
        else:
            raise AssertionError("build accepted a reskin catalog entry/classification/path")

leak = build.OUT / "reskin_games" / "should-never-publish.swf"
leak.parent.mkdir(exist_ok=True)
leak.write_bytes(b"FWS\x06\x08\x00\x00\x00")
try:
    try:
        build.validate_output(expected)
    except SystemExit:
        pass
    else:
        raise AssertionError("artifact validation accepted a leaked reskin file")
finally:
    leak.unlink()
    leak.parent.rmdir()

for relative in ["reskin_games/index.html", "reskin_games/swf/game.swf", "../index.html", "/index.html"]:
    try:
        build.checked_path(build.ROOT, relative)
    except SystemExit:
        pass
    else:
        raise AssertionError(f"deployment accepted forbidden path {relative}")
build.validate_output(expected)
print(f"original-only artifact passed: files={len(expected)}; games=19; reskins=0; catalog and file leakage rejected")
