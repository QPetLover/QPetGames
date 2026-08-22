# QPet Games

QQ 宠物小游戏展示与在线运行站。

This repository is now focused on deployable mini games. The raw resource archive lives in [`QPetLover/awesome-qpet-games`](https://github.com/QPetLover/awesome-qpet-games), and QQ 宠物冒险岛 is deployed separately through [`QPetLover/qqpet-adventure`](https://github.com/QPetLover/qqpet-adventure).

## What Changed

- Rebuilt the old static pages into a modern static SPA.
- Added a redesigned home page, searchable game catalog, game detail page, Ruffle player page, and local SWF test lab.
- Kept legacy URLs (`classical_games/`, `reskin_games/`, `onegame.html`) as redirect/compatibility entries.
- Moved the Adventure Island entry out of the mini-game catalog and redirected it to the independent deployment.
- Added `source/awesome-qpet-games` as a Git submodule so the deployment repo can track the canonical archive without copying every source file into the app layer.

## Repository Layout

```text
assets/
  css/site.css            # visual system and responsive layout
  data/games.json         # normalized game catalog used by the SPA
  js/app.js               # no-build static app and Ruffle integration
classical_games/          # legacy compatibility pages + covers
reskin_games/             # playable SWF resources and covers
source/awesome-qpet-games # submodule pointing to the source archive
QQPet13/                  # related web experience preserved from the old site
adventure/                # migration page only; real deployment is separate
```

## Local Development

Use any static file server. Python is enough:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

For a recursive clone with the source archive reference:

```bash
git clone --recurse-submodules https://github.com/QPetLover/QPetGames.git
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

## Build For GitHub Pages

The deployment workflow runs:

```bash
python3 tools/build_static_site.py
```

The script copies only deployable site files to `_site/` and excludes `.git`, `.github`, `source/`, and other development-only files. This keeps the large source archive out of the Pages artifact while still preserving the submodule relationship in Git.

## Resource Strategy

- Playable reskin games use local SWF files in `reskin_games/swf/`.
- Classic game entries keep the original CDN URLs and covers, but are marked as `待补档` until the SWF binaries are restored in the source archive or CDN.
- Ruffle is loaded from the existing CDN endpoint.
- New source packages from ChatQPet can be wired into `assets/data/games.json` once that repository appears and publishes a usable release.

## Credits And Privacy

Thanks to the QQ 宠物 community, public web archives, Tieba posts, and preservation contributors. Private QQ community details are intentionally not published here.

## Safety Notice

SWF / Flash files are historical formats and may carry security risks. Prefer Ruffle, a virtual machine, or a sandboxed environment when testing unknown files.
