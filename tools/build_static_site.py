#!/usr/bin/env python3
"""Publish only legacy redirects; original game sources remain in the archive."""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'_site'
FILES={'.nojekyll','index.html','classical_games/index.html','classical_games/pages.html','onegame.html'}
def main():
    if OUT.exists():shutil.rmtree(OUT)
    for name in sorted(FILES):
        src=ROOT/name
        assert src.is_file() and not src.is_symlink(),name
        dest=OUT/name
        dest.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(src,dest)
    print(f'built {len(FILES)} redirect files; game archive is preserved in Git')
if __name__=='__main__':main()
