# Ledgera Frontend

Nuxt 3 frontend for Ledgera. This dashboard is designed to consume the NestJS backend and visualize transaction workflow, commission breakdown, pagination, filtering, and audit-oriented detail screens.

## Environment

Create a local `.env` file from `.env.example`.

```bash
cp .env.example .env
```

Example values:

```env
NUXT_PUBLIC_API_BASE=http://localhost:3000
NUXT_PUBLIC_HEALTH_URL=http://localhost:3000/health
PORT=3003
```

`NUXT_PUBLIC_API_BASE` should point to the backend API.
`NUXT_PUBLIC_HEALTH_URL` should point to the backend health endpoint used by the login screen.

## Setup

```bash
npm install
```

## Development

Run the frontend on port `3003` so it does not conflict with the backend.

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:3003
```

## Demo Access

Recommended demo accounts:

- `admin@ledgera.app` / `demo123`
- `operations@ledgera.app` / `demo123`
- `finance@ledgera.app` / `demo123`

Seeded agent account:

- `ayse@ledgera.com` / `demo123`

Notes:

- the first three accounts are available once the backend starts
- the agent account is guaranteed after running `npm run seed`
- admin-created accounts are persisted in MongoDB and can be used for later sign-ins

## Backend Pairing

Run the backend separately on port `3000`.

```bash
cd /Users/gulcekoc/ledgera/backend
npm run start:dev
```

Swagger:

```text
http://localhost:3000/docs
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

## Vercel Deployment

Recommended production deployment:

- Platform: `Vercel`
- Root directory: `frontend`
- Build command: `npm run build`
- Install command: `npm install`

Required environment variables:

```env
NUXT_PUBLIC_API_BASE=https://your-render-backend.onrender.com
NUXT_PUBLIC_HEALTH_URL=https://your-render-backend.onrender.com/health
```

Notes:

- the frontend is configured as a Nuxt 3 app and is ready for Vercel deployment
- the production frontend must point to the live Render backend through `NUXT_PUBLIC_API_BASE`
