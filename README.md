# MW — MEASUREMENT WALLET
### COLLECT GROUP SIZES WITH CONFIDENCE.
A GEESKIT PRODUCT.

MW collects group sizes and measurements from multiple people and keeps responses organized for teams, businesses, events, families, and groups.

**Workflow:** CREATE → SHARE → COLLECT → REVIEW → EXPORT

## Current capabilities
- BUSINESS / FAMILY / TEAM / EVENT / OTHER contexts
- Custom collection fields: Shirt, Pants, Jacket, Shoe, Waist, Inseam, Full Name, Email, Notes, Custom
- Public participant link: `mw.geeskit.com/c/{token}`
- Participants do not need an account
- Mobile-first participant form
- OPEN / CLOSED campaigns
- Review and search submissions
- CSV export
- Cloudflare Worker API + Cloudflare D1 persistence
- Campaign-specific server-issued admin credentials stored locally in the organizer's browser
- Server-side validation that public submissions can only be made to existing OPEN campaigns
- No automatic demo data is seeded into production

## Architecture
```
GitHub
  ↓
Cloudflare Worker
  ↓
Cloudflare D1
  ↓
mw.geeskit.com
```

The frontend calls same-origin `/api/*` endpoints. Public participant access uses the campaign share token. Organizer operations use a campaign-specific admin token returned by the Worker when the campaign is created.

### API
- `GET /api/health` — database connectivity check
- `POST /api/campaigns` — create campaign; returns the admin token once
- `GET /api/campaigns/share/{token}` — public campaign lookup
- `POST /api/campaigns/share/{token}/submissions` — public submission; rejected when closed
- `GET /api/campaigns/{id}` — organizer-only campaign + submissions
- `PUT /api/campaigns/{id}` — organizer-only campaign update
- `DELETE /api/campaigns/{id}` — organizer-only campaign deletion

Organizer requests send `X-MW-Admin-Token`. The admin token is never exposed by the public share endpoint.

## Design source of truth
- Official logo: `src/assets/mw-logo.jpg`
- Reference visual: `src/assets/mw-reference.jpg`
- Colors: bg #060608, card #101012, border #222, orange #FF7A18 → #FF9A3C, silver #E8E8EA
- No purple gradients, no glassmorphism, faceted angular geometry

## Tech stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- Cloudflare Worker
- Cloudflare D1
- localStorage for the organizer's local ownership tokens and billing UI state
- Frontend billing remains a mock UI; no Stripe integration yet

## Data model
```ts
Campaign {
  id, name, organization, description, deadline,
  status: 'OPEN'|'CLOSED',
  fields, createdAt, shareToken, context,
  adminToken? // local organizer credential; never public
}
Field { id, label, type, required, options?, placeholder? }
Submission { id, campaignId, submittedAt, values: Record<fieldId,string> }
Billing { plan: 'FREE'|'PRO'|'BUSINESS', interval: 'monthly'|'yearly' }
```

## Install & run
```bash
npm install
npm run dev
# open http://localhost:5173
```

## Build
```bash
npm run build
npm run preview
```

## Deploy
Cloudflare Worker deployment uses the repository's `wrangler.jsonc` and serves the Vite build from `dist/`.

## License
Private - GEESKIT PRODUCT - All rights reserved.
