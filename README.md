# QPet Games

QQ 宠物小游戏原件对照站：16 款经典原件与 3 款社区补档，通过 Ruffle 运行归档 SWF。独立 HTML / Canvas / JavaScript 复刻版在 [QPetGamesWeb](https://qpetlover.cn/QPetGamesWeb/)。

This repository is now focused on deployable mini games. The raw resource archive lives in [`QPetLover/awesome-qpet-games`](https://github.com/QPetLover/awesome-qpet-games), and QQ 宠物冒险岛 (Adventure) is deployed separately through [`QPetLover/qpet-adventure`](https://github.com/QPetLover/qpet-adventure).

## What Changed

- Rebuilt the old static pages into a modern static SPA.
- Added a redesigned home page, searchable game catalog, game detail page, Ruffle player page, and local SWF test lab.
- Kept original-game legacy URLs (`classical_games/`, `onegame.html`) as redirect/compatibility entries.
- Retired the 16 reskin entries and their public files. Historical copies remain in this repository and the upstream archive; they are excluded from the Pages artifact.
- Moved the Adventure Island game out of this repository entirely; it now lives in [`QPetLover/qpet-adventure`](https://github.com/QPetLover/qpet-adventure) and deploys to https://qpetlover.cn/qpet-adventure/ and publishes as the npm package `qpet-adventure`.
- Added `source/awesome-qpet-games` as a Git submodule so the deployment repo can track the canonical archive without copying every source file into the app layer.

## Repository Layout

```text
assets/
  css/site.css            # visual system and responsive layout
  data/games.json         # normalized game catalog used by the SPA
  js/app.js               # no-build static app and Ruffle integration
classical_games/          # legacy compatibility pages + covers
reskin_games/             # historical reskin archive; never deployed
source/awesome-qpet-games # submodule pointing to the source archive
QQPet13/                  # related web experience preserved from the old site
```

## Local Development

Build the allowlisted publication first, then serve that output. Serving the repository root would expose retired archive files:

```bash
python3 tools/build_static_site.py
python3 -m http.server 4173 --directory _site
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
git lfs pull
python3 tools/build_static_site.py
node tools/check_original_routes.mjs
python3 tools/check_original_artifact.py
```

The script checks all 19 original SWFs against the size and SHA-256 recorded in the catalog before and after copying. It rejects unresolved Git LFS pointers, missing covers, duplicate/unexpected game IDs, non-original classifications, reskin deployment paths, and missing/invalid Ruffle WebAssembly files. [tools/deploy-files.json](tools/deploy-files.json) explicitly lists pages, Ruffle runtime files and the preserved QQPet13 experience; only the 19 catalogued SWFs and their covers are added. The output is checked against that exact allowlist. Repository files outside the list, including `reskin_games/`, source archives and development files, are never copied. The Pages workflow checks out LFS files and uploads only `_site/`.

The published site is [qpetlover.cn/QPetGames](https://qpetlover.cn/QPetGames/). A direct comparison link uses the catalog's stable ID, for example [Q宠速配](https://qpetlover.cn/QPetGames/#/play/classic-014). Relative asset paths keep the same build usable under the GitHub Pages repository path and a local server.

## Resource Strategy

- Reskin resources remain archived under `reskin_games/` (Git LFS) for preservation, but are absent from the public catalog, SPA playback routes and deployment artifact. Former physical URLs under `/QPetGames/reskin_games/` retire with the next Pages deployment.
- Classic games use local SWF files in `classical_games/swf/` (Git LFS), recovered from the wzhecnu server web root and archived in the source repository.
- Three additional community backups (宠爱森林、宠爱QQ堂、地下城与勇士 · Q宠版) live in `community_games/`, with fixed hashes, provenance, and host initialization documented in [community_games/README.md](community_games/README.md). They are separate from the existing classic and reskin indexes.
- Ruffle v0.5.0 is self-hosted under `assets/vendor/ruffle/`; the old `cdn.wzhecnu.cn` endpoints are dead and no longer used.
- New source packages from ChatQPet can be wired into `assets/data/games.json` once that repository appears and publishes a usable release.

## Credits And Privacy

Thanks to the QQ 宠物 community, public web archives, Tieba posts, and preservation contributors. Private QQ community details are intentionally not published here.

## Safety Notice

SWF / Flash files are historical formats and may carry security risks. Prefer Ruffle, a virtual machine, or a sandboxed environment when testing unknown files.
