# WebMCP Lens

Chrome extension for inspecting WebMCP tools.

## Use

1. Enable `chrome://flags/#enable-webmcp-testing`.
2. Run:

```bash
npm install
npm run build
```

3. Load `.output/chrome-mv3` in `chrome://extensions`.

## Features

- Side panel inspector.
- DevTools panel: `WebMCP`.
- Run tools with JSON args.
- Local tool definition overrides per origin.

## Dev

```bash
npm run dev
npm run check
```
