#!/usr/bin/env python3
"""The archived site's Pages artifact is redirects only."""
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('builder',Path(__file__).with_name('build_static_site.py'))
build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)
actual={p.relative_to(build.OUT).as_posix() for p in build.OUT.rglob('*') if p.is_file()}
assert actual==build.FILES,(actual,build.FILES)
for name in actual-{'.nojekyll'}:
    html=(build.OUT/name).read_text()
    assert '<canvas' not in html and '<iframe' not in html,name
    assert 'QPetGamesWeb' in html,name
print('redirect artifact passed: one canonical game site, no SWF or player runtime')
