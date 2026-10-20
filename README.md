# Debaditya Hait’s portfolio

Personal website with open source contributions, selected projects, research experience, Last.fm listening history, and an interactive dinosaur runner.

**Live: [dhait.de](https://dhait.de)**

Built with React, Vite, Motion, Rough.js, Cloudflare Workers and D1.

## Local development

Requires Node.js 22.12 or newer.

```powershell
npm ci
Copy-Item .dev.vars.example .dev.vars
# Add a Last.fm API key to .dev.vars.
npm run db:local
npm run dev
```

The Vite plugin runs the client and Worker APIs together. Without a Last.fm key, the portfolio and game still work; the music panel displays an unavailable state.

```powershell
npm run build
npm run preview
```

Build output is written to `dist/client` and `dist/worker`. Keep `.dev.vars`, `.env` and build output out of version control.

## Features

- Project screenshots, contribution links, institution logos, and contact links for email and LinkedIn.
- Three desk palettes, light/dark themes, reduced-motion support, draggable stickers, and optional sounds.
- Last.fm current/recent tracks and album covers. The API key stays in the Worker.
- A dinosaur runner integrated into the contact banner, with an expandable view and a shared leaderboard.
- Space, Up or tap to jump; Down or Ctrl to crouch. Restart is an explicit action after a crash.
- The highest unshared score survives replay and refresh in the same tab. Submitted scores and nicknames are public.
- Rendering is capped at 60Hz and pauses offscreen, on blur, or when the tab is hidden.

## Cloudflare deployment

The included configuration serves `dhait.de` and `www.dhait.de`. For your own deployment, update the account, Worker name, domains and D1 database ID in `wrangler.json`.

```powershell
npx wrangler login
# For a new deployment: npx wrangler d1 create portfolio-dino
npm run db:remote
npx wrangler secret put LASTFM_API_KEY
npm run deploy
```

Set `LASTFM_USERNAME` in Wrangler vars. Local `.dev.vars` values are not uploaded automatically. [Create a Last.fm API key](https://www.last.fm/api/account/create).

`cloudflare/redirects.json` describes the zone redirect from HTTP and `www` to the HTTPS apex domain, preserving paths and query strings. Apply that rule in Cloudflare’s zone Redirect Rules; Wrangler’s Worker deployment does not manage zone rules.

D1 migrations create the leaderboard and add four initial challengers. Each browser guest has one best shared score. Submissions use same-origin validation, nickname/score checks and rate limiting. This casual client-scored game is not cheat-proof. IP addresses are not stored in D1.

## APIs

| Route | Response |
|---|---|
| `GET /api/music/recent` | Current/latest track, recent tracks, artwork and Last.fm profile. |
| `GET /api/dino/leaderboard` | Top ten entries, ranked by score then submission time. |
| `POST /api/dino/scores` | Accepts `{ "nickname": "your name", "score": 123 }` and returns the updated leaderboard. |

## Content and licenses

Content snapshots are in `src/data`. Contribution links retain their upstream status, and concept project images are labeled. Brand assets are local snapshots; album artwork loads from Last.fm when its panel is open.

See [asset credits](ASSET_CREDITS.md), [brand sources](docs/BRAND_SOURCES.md), and [runner source notes](src/game/SOURCES.md). Required license files are included under `public/licenses` and the relevant asset directories.
