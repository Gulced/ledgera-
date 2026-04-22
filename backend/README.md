# Ledgera Backend

NestJS backend for Ledgera, a transaction workflow platform for real estate agencies. The backend is designed around workflow control, financial traceability, and explainable commission distribution rather than basic CRUD.

## What is implemented

- Transaction lifecycle management: `agreement -> earnest_money -> title_deed -> completed`
- Role-aware access: `admin`, `operations`, `finance`, `agent`
- Explainable commission engine with payout reasons
- Activity log and stage history for auditability
- Financial lock after completion
- Commission preview endpoint before completion
- Search, filtering, and pagination for dashboard lists
- MongoDB persistence through Mongoose
- Standard API success/error envelope
- Unit and e2e test coverage for core flows

## Tech stack

- Node.js LTS
- NestJS
- TypeScript
- MongoDB Atlas / Mongoose
- class-validator / class-transformer
- Jest / Supertest

## Environment

Create a `.env` file from `.env.example`.

```bash
cp .env.example .env
```

Environment variables:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ledgera?retryWrites=true&w=majority&appName=Ledgera
MONGODB_DB=ledgera
CORS_ORIGINS=http://localhost:3003
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=ledgera/listings
```

`MONGODB_URI` should point to your MongoDB Atlas cluster for the mandatory stack requirement. The backend still accepts a local MongoDB URI for offline development, but Atlas is the intended submission target.
Listing photos persist their metadata in MongoDB. When `CLOUDINARY_*` variables are configured, the image files are uploaded to Cloudinary; otherwise the backend falls back to local disk storage for development.
`CORS_ORIGINS` accepts a comma-separated list of allowed frontend origins and should include your deployed Vercel URL in production.

The frontend is expected to run on:

```text
http://localhost:3001
```

## Install

```bash
npm install
```

## Run

```bash
npm run start:dev
```

API base URL:

```text
http://localhost:3000
```

Swagger UI:

```text
http://localhost:3000/docs
```

Recommended local pairing:

```text
backend  -> http://localhost:3000
frontend -> http://localhost:3001
```

Swagger test headers for protected endpoints:

```text
x-user-id: u-admin
x-user-name: Aylin Admin
x-user-role: admin
```

## Seed demo data

```bash
npm run seed
```

## Demo Access

Recommended review accounts:

- `admin@ledgera.app` / `demo123`
- `operations@ledgera.app` / `demo123`
- `finance@ledgera.app` / `demo123`

Seeded agent account:

- `ayse@ledgera.com` / `demo123`

Notes:

- `admin`, `operations`, and `finance` are available when the backend starts
- the seeded `agent` account is guaranteed after `npm run seed`
- accounts created from the admin panel are persisted in MongoDB through the `users` collection

## Test

```bash
npm test
npm run test:e2e
npm run build
```

## API overview

### `GET /`

Health check.

Swagger docs are available at `GET /docs`.

### `GET /transactions`

List transactions with optional query params:

- `stage`
- `currency`
- `agentId`
- `search`
- `page`
- `limit`

Headers:

- `x-user-id`
- `x-user-name`
- `x-user-role`

### `GET /transactions/:id`

Returns one transaction if the current role has access to it.

### `POST /transactions`

Creates a transaction.

### `PATCH /transactions/:id/stage`

Moves a transaction to the next valid stage only.

### `POST /transactions/preview-commission`

Returns a non-persistent commission preview.

## Response format

Successful responses:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

Failed responses:

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": ["propertyRef should not be empty"],
    "path": "/transactions"
  },
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

## Notes

- `completed` transactions are financially locked.
- Agent users can only view transactions they are part of.
- Commission explanation is stored with the transaction snapshot for traceability.
