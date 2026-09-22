# Frontend — Pharmacy Stock web client

React 19 + TypeScript + Vite, with Ant Design for the UI.

See the [root README](../../README.md) for setup, and
[`docs/`](../../docs/) for requirements and design.

## Commands

```bash
npm run dev      # dev server on http://localhost:5173
npm run build    # type-check and build to dist/
npm run lint     # oxlint
npm run preview  # serve the production build locally
```

## Configuration

Copy `.env.example` to `.env.local`. `VITE_API_BASE_URL` points at the backend
API and defaults to `http://localhost:3000/api`.

## Layout

```
src/api/      axios client and API calls
src/layouts/  shell layout and navigation
src/pages/    one page per use case group
```

All pages are placeholders at present; no use case is implemented yet.
