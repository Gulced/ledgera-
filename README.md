# Ledgera

Ledgera is a role-aware real-estate operations platform built around listings, transaction workflow, payout visibility, and auditability.

Required stack used in the project:
- Backend: Node.js LTS, TypeScript, NestJS, MongoDB Atlas via Mongoose, Jest
- Frontend: Nuxt 3, Pinia, Tailwind CSS

Testing and styling notes:
- Backend tests are written with `Jest`
- Current backend test coverage focuses on:
  - commission rules
  - transaction stage transitions
  - financial lock behavior
  - authorization and core business logic
- Tailwind CSS is installed and available in the frontend
- The frontend now uses a Tailwind-first UI layer across the main workspace screens
- The existing custom design system in `main.css` remains in place as a supporting layer for shared tokens, legacy components, and visual continuity during the transition

The app includes:
- transaction lifecycle management
- transaction editing and safe deletion before financial lock
- listing inventory and status tracking
- agent directory with role-aware CRUD and portfolio context
- commission preview and payout breakdown
- role-based workspaces for `admin`, `operations`, `finance`, and `agent`
- global AI workspace assistant with page-aware prompts and context-aware fallback guidance
- follow-ups, notes, document placeholders, and activity history

## Quick Start

1. Create a MongoDB Atlas cluster and copy its connection string.
2. Run the backend with that Atlas URI.
3. Seed demo data.
4. Run the frontend.

Backend:

```bash
cd /Users/gulcekoc/ledgera/backend
npm install
cp .env.example .env
# paste your MongoDB Atlas URI into MONGODB_URI
npm run start:dev
```

Seed demo data:

```bash
cd /Users/gulcekoc/ledgera/backend
npm run seed
```

Frontend:

```bash
cd /Users/gulcekoc/ledgera/frontend
npm install
cp .env.example .env
npm run dev -- --port 3001
```

## Local URLs

- frontend: `http://localhost:3001`
- backend API: `http://localhost:3000`
- swagger: `http://localhost:3000/docs`

## Demo Access

These accounts are intended for test-case reviewers and local demo usage.

Default workspace accounts:

- `admin@ledgera.app` / `demo123`
- `operations@ledgera.app` / `demo123`
- `finance@ledgera.app` / `demo123`

Seeded agent account:

- `ayse@ledgera.com` / `demo123`

Notes:

- `admin`, `operations`, and `finance` are available once the backend starts.
- the seeded `agent` account is guaranteed after running `npm run seed`
- any user account created from the admin panel is now persisted in MongoDB

## Recommended Review Flow

1. Sign in as `admin`
2. Review dashboard, listings, agents, and transaction detail pages
3. Create an extra `operations`, `finance`, or `agent` account from the admin panel
4. Sign out and sign back in with the new account
5. Verify that each role lands in a different visibility model

## Recent Product Additions

- `Agents` workspace:
  - dedicated `/agents` page
  - agent create, edit, delete
  - role-aware visibility
  - selected agent portfolio context using listings and transactions
- `Transactions` management:
  - transaction update and delete endpoints
  - edit panel on transaction detail
  - deletion/editing blocked once financial lock is active
  - transaction update events recorded in audit log
- `AI assistant`:
  - floating assistant available across workspaces
  - page-aware prompts for dashboard, listings, agents, and transaction detail
  - agent workspace responses now use selected agent context
  - assistant prompts and fallback responses are in English

## Docs

- backend details: [/Users/gulcekoc/ledgera/backend/README.md](/Users/gulcekoc/ledgera/backend/README.md)
- frontend details: [/Users/gulcekoc/ledgera/frontend/README.md](/Users/gulcekoc/ledgera/frontend/README.md)
- design rationale: [/Users/gulcekoc/ledgera/DESIGN.md](/Users/gulcekoc/ledgera/DESIGN.md)

## Deployment

Recommended stack-aligned deployment:
- Database: `MongoDB Atlas`
- Backend: `Render` web service from the `backend/` folder
- Frontend: `Vercel` project from the `frontend/` folder

Backend deployment notes:
- a Render Blueprint file is included at [render.yaml](/Users/gulcekoc/ledgera/render.yaml)
- set `MONGODB_URI` to your Atlas SRV connection string
- set `CORS_ORIGINS` to your live Vercel frontend URL
- optional AI support requires `GEMINI_API_KEY`

Frontend deployment notes:
- deploy the `frontend/` directory as a Nuxt project on Vercel
- set `NUXT_PUBLIC_API_BASE` to your live Render backend URL

Important upload note:
- listing photo metadata is persisted in MongoDB with each listing record
- image files are Cloudinary-ready for production deployment through `CLOUDINARY_*` environment variables
- if Cloudinary is not configured, the backend falls back to local disk storage under `backend/uploads` for local development and basic demos
