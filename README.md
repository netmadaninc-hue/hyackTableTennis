# Hyack Table Tennis

A mobile-first table tennis tournament manager built with React, TypeScript, Vite, and GitHub Pages-ready routing.

## Features

- Live public dashboard for players and spectators
- Find-your-match page with local player selection
- Group standings and live rankings
- Knockout bracket overview
- Rules page
- Admin login UI and quick score entry
- Demo tournament generation and deterministic tournament logic
- GitHub Pages compatible hash routing

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## GitHub Pages deployment

1. Push this repository to GitHub.
2. In GitHub, enable GitHub Pages from the Actions workflow if needed.
3. The included workflow in `.github/workflows/deploy.yml` builds and deploys the Vite app automatically on pushes to `main`.
4. Ensure the repository is hosted at:
   `https://USERNAME.github.io/REPOSITORY_NAME/`

## Environment variables

Copy `.env.example` to `.env` and fill in your Supabase values:

```bash
cp .env.example .env
```

## Notes

This project includes a local demo mode and deterministic match logic. For full production use, connect Supabase Auth and RLS as described in the specification.
