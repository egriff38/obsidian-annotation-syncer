# Annotation Syncer

An [Obsidian](https://obsidian.md) plugin that syncs YouTube video timestamps with markdown annotations. Open a YouTube video in Obsidian's built-in browser alongside a markdown note, and bookmark positions in both with a single command — the plugin keeps them in sync so you can jump between a passage in your notes and the exact moment in the video.

> **Status:** Early development / not yet listed in the Community Plugins directory.

## Features

- Insert a timestamp link into the active markdown file at the current YouTube playback position
- Jump from a timestamp link in your notes back to the corresponding video position
- Chapter-aware navigation
- Desktop-only (requires Electron WebView)

## Requirements

- [Obsidian](https://obsidian.md) ≥ 1.5.0 (desktop)
- [Node.js](https://nodejs.org) ≥ 20
- [pnpm](https://pnpm.io) ≥ 9 — install with `npm i -g pnpm`

## Development Setup

```bash
# 1. Clone the repo
git clone https://github.com/egriff38/obsidian-annotation-syncer.git
cd obsidian-annotation-syncer

# 2. Install dependencies
pnpm install

# 3. Build once
pnpm build

# 4. Watch for changes (rebuilds on save)
pnpm dev
```

### Scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `pnpm build`      | Production build → `dist/`                       |
| `pnpm dev`        | Development build with watch + hot-reload        |
| `pnpm test`       | Run the Vitest test suite                        |
| `pnpm typecheck`  | Type-check without emitting files                |

## Installing in Obsidian (Manual)

1. Run `pnpm build` to produce `dist/main.js` and `dist/manifest.json`.
2. In your vault, create the folder `.obsidian/plugins/annotation-syncer/`.
3. Copy `dist/main.js` and `dist/manifest.json` into that folder.
4. In Obsidian → **Settings → Community plugins**, toggle **Annotation Syncer** on.

For active development with hot-reload, install the [Hot Reload](https://github.com/pjeby/hot-reload) community plugin, then run `pnpm dev`. The plugin will reload automatically on each rebuild.

## Project Structure

```
src/
├── main.ts                     # Plugin entry point
├── core/                       # Domain model & sync abstractions
├── adapters/
│   ├── markdown/               # Obsidian editor adapter
│   └── youtube/                # Electron WebView adapter
├── obsidian/                   # Obsidian API wiring (commands, DI composition)
└── strategies/                 # Concrete sync strategy (YouTube ↔ Markdown)
__tests__/                      # Vitest tests mirroring src structure
```

## Tech Stack

- **[Effect](https://effect.website)** — typed functional effects, dependency injection, resource management
- **[esbuild](https://esbuild.github.io)** — fast bundler producing the CJS output Obsidian requires
- **[Vitest](https://vitest.dev)** — unit and integration tests

## License

MIT
