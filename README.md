# Ledgera

Ledgera is a full-stack real-estate transaction operations platform built for the technical case requirement: automate the post-agreement workflow, make every transaction traceable, and calculate commission distribution accurately for the agency and agents.

The product is not just a CRUD demo. It combines a NestJS business-logic backend, MongoDB Atlas persistence, and a Nuxt 3 role-aware frontend so reviewers can inspect the full lifecycle of a property transaction from agreement through completion.

## Live Demo

Use these links for the deployed review environment:

- Live Frontend: `https://ledgera-five.vercel.app`
- Live API: `https://ledgera-4ut6.onrender.com`
- API Health: `https://ledgera-4ut6.onrender.com/health`
- Swagger Docs: `https://ledgera-4ut6.onrender.com/docs`

If Render is sleeping, the first API request can take a short moment to wake the service.

## Evaluation Highlights

This project was built to address the evaluation criteria directly:

- Problem Analysis & Data Modeling: domain models separate users, agents, listings, transactions, workspace records, and assistant history while transaction documents preserve financial snapshots for auditability.
- System Design & Architecture: NestJS modules are domain-based, services own business rules, MongoDB/Mongoose repositories isolate persistence, and Nuxt pages/components/stores are separated by responsibility.
- Code Quality & Business Logic: commission distribution, stage transitions, financial lock behavior, authorization, and error handling are implemented in backend services instead of being left to the UI.
- Testing & Deployment: backend Jest tests cover the core financial and lifecycle rules, with deployment configured for MongoDB Atlas, Render, and Vercel.

## Reviewer Login Accounts

These accounts are provided so reviewers can test the role model immediately without creating users first.

| Role | Email | Password | What to Review |
|---|---|---|---|
| Admin | `admin@ledgera.app` | `demo123` | Full dashboard, user provisioning, agents, listings, transactions, financial overview |
| Operations | `operations@ledgera.app` | `demo123` | Transaction workflow, stage movement, operational visibility |
| Finance | `finance@ledgera.app` | `demo123` | Read-only financial breakdown and payout visibility |
| Agent | `gulcedurukoc@gmail.com` | `123456` | Agent-scoped listings, transactions, and portfolio visibility |

Admins can also create additional operations, finance, and agent accounts from inside the platform. Agent creation can create both the agent profile and the linked login account in one flow.

## Case Requirement Coverage

| Requirement | Implementation |
|---|---|
| Track transaction lifecycle | Transactions move through `agreement`, `earnest_money`, `title_deed`, and `completed` stages. |
| Allow stage transitions | Backend exposes transition endpoints and the frontend provides workflow controls. |
| Visual dashboard | Nuxt dashboard displays KPIs, stage distribution, transaction table, risk signals, and scheduled actions. |
| Prevent invalid transitions | Backend validates stage order and locks completed transactions. Rationale is documented in `DESIGN.md`. |
| Agency commission | 50% of the total service fee is assigned to the agency. |
| Agent commission pool | The remaining 50% is assigned to agents based on listing/selling responsibility. |
| Same listing and selling agent | That agent receives the full agent pool. |
| Different listing and selling agents | Listing and selling agents split the agent pool equally. |
| Financial breakdown | Each transaction stores and shows agency share, agent payouts, and payout reasons. |
| APIs exposed and consumed | NestJS REST APIs are consumed by the Nuxt frontend through a typed composable layer. |
| Backend tests | Jest covers commission rules, stage transitions, financial lock behavior, authorization, and core business logic. |
| MongoDB Atlas | Production deployment is designed for MongoDB Atlas through `MONGODB_URI`. |
| Frontend state management | Pinia stores manage auth, dashboard, workspace, and persisted collaboration state. |

## Tech Stack

Backend:

- Node.js LTS
- TypeScript
- NestJS
- MongoDB Atlas
- Mongoose
- Jest
- Swagger/OpenAPI

Frontend:

- Nuxt 3
- Vue 3
- Pinia
- Tailwind CSS
- Nuxt runtime config for deployment-safe API URLs

Storage and integrations:

- MongoDB Atlas for users, agents, listings, transactions, workspace notes/tasks/documents/events, and assistant history
- Cloudinary-ready listing photo storage with MongoDB photo metadata
- Gemini-powered AI assistant when `GEMINI_API_KEY` is configured, with safe fallback responses

## Product Capabilities

Core workflow:

- Transaction lifecycle tracking from agreement to completion
- Controlled transaction stage transitions
- Commission calculation and explanation
- Financial lock after completion
- Transaction detail view with audit history and financial breakdown
- Dashboard summary cards, stage distribution, transaction list, and export support

Operations and portfolio management:

- Listing CRUD with full address, status, map preview, and photo gallery
- Agent workspace with profile CRUD and portfolio context
- Role-aware visibility for admin, operations, finance, and agent users
- Persistent notes, follow-up tasks, document placeholders, and activity events
- Notifications and risk signals surfaced on the dashboard
- Upcoming scheduled actions from persisted workspace tasks

AI and assistant layer:

- Floating workspace assistant across pages
- Page-aware suggested prompts
- Role-aware and context-aware responses
- AI action mode with confirmation for safe follow-up/task/note actions
- Gemini integration with graceful fallback behavior

## Repository Structure

```text
ledgera/
  backend/      NestJS API, business logic, MongoDB/Mongoose models, Jest tests
  frontend/     Nuxt 3 app, Pinia stores, Tailwind-first UI, deployed on Vercel
  DESIGN.md     Architecture, data model, business logic, and frontend state rationale
  README.md     Setup, deployment, demo accounts, and review guide
  render.yaml   Render deployment blueprint
```

## Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

Minimum backend `.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/ledgera?retryWrites=true&w=majority
MONGODB_DB=ledgera
CORS_ORIGINS=http://localhost:3003
GEMINI_API_KEY=optional_for_ai
GEMINI_MODEL=gemini-2.5-flash
```

Seed demo data when needed:

```bash
cd backend
npm run seed
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Minimum frontend `.env`:

```env
NUXT_PUBLIC_API_BASE=http://localhost:3000
NUXT_PUBLIC_HEALTH_URL=http://localhost:3000/health
```

Local URLs:

- Frontend: `http://127.0.0.1:3003`
- Backend API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

## Testing

Backend tests use Jest and focus on the core case rules rather than superficial endpoint checks.

```bash
cd backend
npm test
```

Covered areas include:

- Commission scenario 1: same listing and selling agent receives full agent pool
- Commission scenario 2: different listing and selling agents split the agent pool equally
- Agency always receives 50% of total service fee
- Valid transaction stage transitions
- Invalid transition rejection
- Completion lock and financial immutability
- Authorization and role-based business rules
- Core transaction summary and payout logic

Build checks:

```bash
cd backend
npm run build

cd ../frontend
npm run build
```

## Deployment

Recommended deployment architecture:

- Database: MongoDB Atlas
- Backend: Render
- Frontend: Vercel
- Image storage: Cloudinary for production uploads

### Render Backend

A Render blueprint is included in `render.yaml`.

Required Render environment variables:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB=ledgera
CORS_ORIGINS=https://ledgera-five.vercel.app
GEMINI_API_KEY=optional_but_recommended
GEMINI_MODEL=gemini-2.5-flash
CLOUDINARY_CLOUD_NAME=optional_for_photo_uploads
CLOUDINARY_API_KEY=optional_for_photo_uploads
CLOUDINARY_API_SECRET=optional_for_photo_uploads
CLOUDINARY_FOLDER=ledgera/listings
NODE_VERSION=22
```

Backend health check:

```text
GET /health -> { "status": "ok" }
```

### Vercel Frontend

Deploy the `frontend/` directory as the Vercel project root.

Required Vercel environment variables:

```env
NUXT_PUBLIC_API_BASE=https://ledgera-4ut6.onrender.com
NUXT_PUBLIC_HEALTH_URL=https://ledgera-4ut6.onrender.com/health
```

After changing environment variables, redeploy Vercel and hard refresh the browser.

## Smoke Test Checklist

Use this quick checklist after deployment:

- Open `GET /health` and confirm it returns `{ "status": "ok" }`.
- Open Swagger at `/docs`.
- Sign in as admin and confirm dashboard KPIs load.
- Open a transaction detail page and verify stage history plus commission breakdown.
- Move a transaction stage as operations.
- Sign in as finance and verify read-only financial visibility.
- Sign in as the agent account and verify agent-scoped listings/transactions.
- Create a listing with full address and confirm listing detail opens.
- Upload a listing photo if Cloudinary env variables are configured.
- Ask the floating AI assistant a page-aware question.

## API Examples

Health check:

```bash
curl https://ledgera-4ut6.onrender.com/health
```

Login:

```bash
curl -X POST https://ledgera-4ut6.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ledgera.app","password":"demo123"}'
```

Commission preview:

```bash
curl -X POST https://ledgera-4ut6.onrender.com/transactions/preview-commission \
  -H "Content-Type: application/json" \
  -H "x-user-id: adm_demo" \
  -H "x-user-name: Aylin Admin" \
  -H "x-user-role: admin" \
  -d '{
    "propertyRef": "Demo property",
    "totalServiceFee": 100000,
    "currency": "EUR",
    "listingAgent": { "id": "agt_demo", "name": "Listing Agent" },
    "sellingAgent": { "id": "agt_demo", "name": "Listing Agent" }
  }'
```

## Known Limitations

- Authentication is intentionally simplified for the technical case demo. Production hardening would add password hashing, JWT or server-side sessions, expiration, and invite/reset flows.
- Render free-tier deployments can cold start, so the first request may take longer.
- Cloudinary is supported for production listing photos, but local fallback remains available for development.
- The AI assistant is an enhancement layer; transaction lifecycle and commission correctness do not depend on Gemini availability.
- Soft archive is listed as a future improvement. Completed transactions are protected by financial lock, but some editable resources still use delete flows.

## Submission Checklist

- Public Git repository contains both `backend/` and `frontend/`.
- Backend uses Node.js, TypeScript, NestJS, MongoDB Atlas, Mongoose, and Jest.
- Frontend uses Nuxt 3, Pinia, and Tailwind CSS.
- Transaction stages are implemented: `agreement`, `earnest_money`, `title_deed`, `completed`.
- Stage transitions and invalid transition protection are implemented.
- Commission rules are implemented and tested.
- Financial breakdown is visible per transaction.
- Backend APIs are exposed and consumed by the frontend.
- `DESIGN.md` explains architecture, data models, business logic, and frontend state management.
- `README.md` includes installation, run instructions, demo credentials, tests, deployment, and live URLs.
- Live API URL and live frontend URL are included.
- Production database strategy uses MongoDB Atlas.

## Review Flow

Suggested evaluator path:

1. Sign in as `admin@ledgera.app` / `demo123`.
2. Review dashboard KPIs, transaction table, stage distribution, listing map, alerts, and scheduled actions.
3. Open a transaction detail page and inspect stage history, commission breakdown, payout reasons, and audit events.
4. Create or edit a listing, add full address, upload photos, and inspect listing detail.
5. Open the Agents workspace and review role-aware portfolio visibility.
6. Create an agent with a login password from the admin UI, then sign in as that agent.
7. Sign in as finance to confirm read-only financial visibility.
8. Sign in as operations to move transaction stages.
9. Use the floating AI assistant to ask context-aware questions on dashboard/listing/agent/transaction pages.

## Important Design Notes

- Commission breakdown is embedded in the transaction document as a snapshot to preserve historical payout explanation.
- Completed transactions become financially locked to prevent accidental payout mutation.
- Authorization is enforced inside domain services, not only controllers.
- Frontend state is separated by responsibility: auth, dashboard, workspace, and page-local state.
- Tailwind CSS is used as the primary UI utility layer on the main workspace screens, with `main.css` retaining shared visual tokens and continuity.
- Listing image files should use Cloudinary in production; MongoDB stores image metadata and listing references.

For deeper architecture decisions, see `DESIGN.md`.
