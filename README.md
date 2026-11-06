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

- General and role-specific resumes with stable public URLs and a Cloudflare Access-protected upload page. The `RESUMES` R2 binding stores replacements; the original SDE and AI PDFs remain the fallback until each is updated.
- Project screenshots, contribution links, institution logos, and contact links for email and LinkedIn.
- Three desk palettes, light/dark themes, reduced-motion support, draggable stickers, and optional sounds.
- An interactive portrait that follows the mouse or looks toward taps on touchscreens, with tap/keyboard reactions and visitor greetings. Tracking pauses offscreen, in hidden tabs, and with reduced motion. Approximate city greetings use Cloudflare metadata when available; local previews use a time-of-day fallback.
- Last.fm current/recent tracks and album covers. The API key stays in the Worker.
- A dinosaur runner integrated into the contact banner, with an expandable view and a shared leaderboard.
- Space, Up or tap to jump; Down or Ctrl to crouch. Restart is an explicit action after a crash.
- The highest unshared score survives replay and refresh in the same tab. Submitted scores and nicknames are public.

- Rendering is capped at 60Hz and pauses offscreen, on blur, or when the tab is hidden.

To update a resume, visit `/admin/resumes`, sign in through Cloudflare Access, select a PDF under 5 MB, and choose **Update resume**. Add other roles or company-specific versions with a name and unique link. Listed entries appear on `/resumes`; unlisted entries remain accessible to anyone with their link. Hiding the selector does not protect direct PDF links. The Worker verifies the Access assertion and authorized email before handling uploads. The configured Access issuer, audience, allowed email, R2 binding, and Access policy must be updated together if moving this deployment to another account.

## Personalized resume links and agent API

In `/admin/resumes`, sign in with Cloudflare Access to upload PDFs, create or reassign personalized links, and issue or revoke agent credentials. Each credential is shown only once. Give each agent its own credential and store it as a secret, never in a repository, URL, email, or browser-side code. An agent can manage assignments only; it cannot upload or delete PDFs, access the admin portal, or revoke credentials. The general variant becomes available when its PDF is uploaded. Newly added resumes become selectable automatically. Unlisted links are accessible to anyone who knows them and are not a security boundary.

The API root is `https://dhait.de/api/agent/v1`. Send `Authorization: Bearer <credential>` on every request; requests with bodies use `Content-Type: application/json`. Responses and errors are JSON and are not cached. Use the returned `url` in outreach.

| Method and path | Request | Response |
|---|---|---|
| `GET /variants` | None | `{ "variants": [{ "id": "sde", "title": "Software Engineering" }] }` |
| `POST /links` | `{ "slug": "example-company", "variant": "sde" }` | 201 and the link record |
| `GET /links/{slug}` | None | The link record |
| `PATCH /links/{slug}` | `{ "variant": "ai", "revision": 1 }` | The updated link record |

A link record contains `slug`, `variant`, `revision`, `url`, `createdAt`, and `updatedAt`. Slugs contain lowercase letters and numbers separated by single hyphens, with a maximum of 60 characters. Existing routes and resume-variant names are reserved. A new link returns 409 if its name is taken; the response includes `existing` when it is an assignment. On an uncertain create result, GET the slug before retrying. For reassignment, GET the current record and send its revision; a stale update returns 409 and the current record. Invalid inputs and unavailable variants return 400; missing links return 404; invalid credentials return 401. Temporary storage failures return 503. Never blindly retry a conflicting update. Agents cannot list or delete links; the owner can do both in the portal.

```sh
curl -H "Authorization: Bearer $RESUME_AGENT_TOKEN" https://dhait.de/api/agent/v1/variants
curl -X POST https://dhait.de/api/agent/v1/links \
  -H "Authorization: Bearer $RESUME_AGENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"slug":"example-company","variant":"sde"}'
curl -H "Authorization: Bearer $RESUME_AGENT_TOKEN" https://dhait.de/api/agent/v1/links/example-company
curl -X PATCH https://dhait.de/api/agent/v1/links/example-company \
  -H "Authorization: Bearer $RESUME_AGENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"variant":"ai","revision":1}'
```

The D1 migration creates the assignment and hashed credential tables. It must be applied before deploying this Worker. R2 continues to hold the PDFs. The Access policy must cover `/admin/resumes` and its subpaths, while `/resume/*` and `/api/agent/v1/*` must remain reachable without an Access login. Never expose the D1, R2, or Cloudflare account credentials to an agent.

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

Leaderboard reads are cached at the edge for 60 seconds. If D1 is unavailable, the board shows its last cached scores (up to a day old), or the initial challengers when no cache exists. The API reports `sharingAvailable: false`; the interface explains that updates are temporarily unavailable. Pending runs remain in the visitor’s tab for a later retry.

## APIs

| Route | Response |
|---|---|
| `GET /api/music/recent` | Current/latest track, recent tracks, artwork and Last.fm profile. |
| `GET /api/visitor` | Approximate visitor city, or an empty string when unavailable. Private, uncached response; no database or external lookup. |
| `GET /api/dino/leaderboard` | Top ten entries, ranked by score then submission time. |
| `POST /api/dino/scores` | Accepts `{ "nickname": "your name", "score": 123 }` and returns the updated leaderboard. |

## Content and licenses

Content snapshots are in `src/data`. Contribution links retain their upstream status, and concept project images are labeled. Brand assets are local snapshots; album artwork loads from Last.fm when its panel is open.

See [asset credits](ASSET_CREDITS.md), [brand sources](docs/BRAND_SOURCES.md), and [runner source notes](src/game/SOURCES.md). Required license files are included under `public/licenses` and the relevant asset directories.
