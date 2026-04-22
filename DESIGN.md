# Ledgera Design Document

## 1. Product Understanding

Ledgera is designed for the point in a real-estate sale or rental process where manual tracking becomes risky: after an agreement is reached and the team must coordinate earnest money, title deed steps, payments, commission calculation, and final payout visibility.

The main engineering goal is to turn a manual, multi-tool workflow into a single traceable operating system.

The system therefore prioritizes:

- transaction lifecycle control
- explainable commission distribution
- role-aware visibility
- immutable financial records after completion
- dashboard-friendly APIs
- a frontend that lets reviewers and users understand the workflow quickly

The design intentionally treats the commission calculation as business-critical logic, not as a frontend convenience.

## 2. Architecture Overview

The application uses a full-stack architecture aligned with the required stack:

- Backend: Node.js LTS, TypeScript, NestJS, MongoDB Atlas, Mongoose, Jest
- Frontend: Nuxt 3, Pinia, Tailwind CSS
- Deployment: Render backend, Vercel frontend, MongoDB Atlas database

The backend exposes REST APIs and owns all core business decisions. The frontend consumes these APIs through a typed composable layer and presents a role-aware workspace experience.

High-level module split:

- `users`: authentication, demo/reviewer accounts, role identity
- `agents`: canonical agent profiles and active status
- `listings`: listing inventory, ownership, address, photos, map context
- `transactions`: lifecycle, commission calculation, financial lock, audit trail
- `workspace`: persisted notes, tasks, documents, and activity events
- `assistant`: global AI assistant, chat history, page-aware context, action suggestions

This structure separates stable business domains instead of grouping code by generic CRUD concerns.

## 3. Backend Module and Service Structure

NestJS modules are organized by domain.

Controllers:

- expose the REST contract
- read actor context headers
- validate DTO inputs through Nest pipes
- delegate business decisions to services

Services:

- enforce role authorization
- validate domain invariants
- calculate commission
- guard stage transitions
- maintain audit/history records
- repair agent-account links when possible

Repositories:

- abstract MongoDB access behind domain-specific interfaces
- make service logic easier to test and reason about
- keep Mongoose details out of business rules

This design keeps controllers thin and makes the service layer the source of truth for behavior.

## 4. Data Modeling

MongoDB Atlas is used as the production database, accessed through Mongoose schemas.

Primary collections:

- `users`
- `agents`
- `listings`
- `transactions`
- `workspace notes`
- `workspace tasks`
- `workspace documents`
- `workspace events`
- `assistant messages`

### Users and Agents

Users represent login accounts. Agents represent business profiles.

An agent user has:

- `role: agent`
- `linkedAgentId`

The linked agent profile is the canonical source for ownership in listings and transactions. This separation allows admins to manage profiles independently while still allowing agents to log in.

To make production demos resilient, the backend can repair an agent account link by matching the account email to an existing agent profile. This prevents a valid agent login from becoming unusable if the profile exists but the link is stale.

### Listings

Listings store:

- property reference
- title
- city
- full address
- asking price
- status
- listing agent snapshot
- photo metadata

Photo files are Cloudinary-ready for production storage. MongoDB stores metadata such as URL, file name, MIME type, size, storage provider, and cover flag.

### Transactions

Transactions store:

- stage
- listing agent snapshot
- selling agent snapshot
- commission breakdown
- history
- activity log
- financial integrity lock
- timestamps and creator context

The transaction document is intentionally self-contained for audit and dashboard performance.

## 5. Transaction Lifecycle

The required stages are implemented exactly:

```text
agreement -> earnest_money -> title_deed -> completed
```

Every transaction stores its current stage and stage history.

The backend allows valid forward transitions and rejects invalid transitions. The decision to prevent invalid transitions was intentional because this is a financial workflow where arbitrary movement between states can damage auditability.

Important lifecycle rules:

- users can move a transaction forward through the defined stages
- unsupported stage values are rejected by DTO/domain validation
- duplicate requests for the current stage are safe no-ops
- once a transaction reaches `completed`, financial lock is activated
- completed transactions cannot be modified in a way that changes financial output

This makes the lifecycle predictable and safe under repeated clicks or retries.

## 6. Commission Policy

The commission policy is implemented in backend business logic and covered by Jest tests.

Policy:

- 50% of total service fee belongs to the agency
- 50% belongs to the agent pool

Scenario 1:

- listing agent and selling agent are the same person
- that agent receives 100% of the agent pool
- effective payout: 50% of total service fee

Scenario 2:

- listing agent and selling agent are different people
- they split the agent pool equally
- effective payout: 25% each

The output includes not only amounts, but also the reason each party earned the amount:

- `listing`
- `selling`
- `listing_and_selling`

This explanation is important because the reviewer and future finance users need to understand why the payout was produced.

## 7. Financial Breakdown Storage Decision

Ledgera embeds the commission breakdown directly in the transaction document.

This was chosen over fully dynamic calculation because completed financial records must remain historically stable.

Benefits:

- transaction detail pages can show the breakdown without extra joins
- audit review can inspect a single document
- future commission rule changes will not rewrite old transaction results
- the explanation of the calculation is preserved with the transaction

The embedded snapshot includes:

- `agencyShare`
- `agentPool`
- individual agent payouts
- payout reasons
- explanation codes/messages

Dynamic recalculation is still used before lock when a mutable transaction is edited. After completion, the snapshot becomes the trusted record.

## 7.1 Core Rules Mapping

The case's core rules are intentionally mapped to explicit backend behavior:

| Case Rule | Design Decision |
|---|---|
| Track every transaction stage | `Transaction.stage` stores the current stage and `history` stores transitions. |
| Allow transitions | `PATCH /transactions/:id/stage` moves a transaction through the lifecycle. |
| Prevent invalid transitions | Services enforce the ordered lifecycle and reject invalid movement. |
| Show financial breakdown | `commission` is embedded as a transaction snapshot. |
| Agency earns 50% | Commission calculation always assigns half of the service fee to the agency. |
| Agent pool is 50% | The other half becomes the agent pool. |
| Same agent scenario | One agent receives the full agent pool with `listing_and_selling` reason. |
| Different agent scenario | Listing and selling agents split the agent pool equally. |
| Tests required | Jest tests cover commission rules, lifecycle transitions, financial lock, and authorization. |

This mapping keeps the case requirements visible in both code and documentation.

## 8. Financial Lock and Auditability

When a transaction reaches `completed`, the system marks its financial state as locked.

The lock prevents:

- stage rollback
- payout mutation
- unsafe transaction editing
- duplicate financial lock events

The activity log records:

- who performed the action
- the role of the actor
- timestamp
- previous values
- next values
- event type

This is designed like a lightweight ledger because commission output should not silently change after completion.

## 9. Authorization and Role Model

Implemented roles:

- `admin`
- `operations`
- `finance`
- `agent`

Role behavior:

- `admin`: full system visibility and management
- `operations`: workflow ownership and transaction progression
- `finance`: read-only financial visibility
- `agent`: scoped access to own profile, listings, and assigned transactions

Authorization lives in the service layer rather than only the controller layer. This is deliberate: even if a service is reused in another controller or background flow, the same business rules apply.

Agent visibility is strict:

- agents only see their own listings
- agents only see transactions where they are listing or selling agent
- agents cannot reassign listings to other agents

## 10. API Design

The API is REST-oriented and grouped by business resource.

Representative endpoints:

- `GET /health`
- `POST /auth/login`
- `GET /users`
- `POST /users`
- `GET /agents`
- `POST /agents`
- `PATCH /agents/:id`
- `DELETE /agents/:id`
- `GET /listings`
- `POST /listings`
- `GET /listings/:id`
- `PATCH /listings/:id`
- `DELETE /listings/:id`
- `POST /listings/:id/photos`
- `GET /transactions`
- `GET /transactions/summary`
- `POST /transactions`
- `PATCH /transactions/:id/stage`
- `POST /transactions/preview-commission`
- `GET /workspace/tasks`
- `POST /workspace/notes`
- `POST /assistant/chat`

Swagger is exposed at `/docs` for reviewer exploration.

Responses use a consistent envelope for normal API responses, while `/health` returns a plain `{ "status": "ok" }` response for deployment probes.

## 11. Error Handling and Validation

Validation is split into two layers:

- DTO validation at the API boundary
- domain validation inside services

DTO validation handles:

- required fields
- enum values
- supported currencies
- query shape
- password length
- actor context structure

Domain validation handles:

- active agent existence
- role-based access
- invalid stage transition
- financial lock violation
- ownership rules
- safe deletion/update constraints

Semantic error codes are used so the frontend can distinguish user/business errors from network errors.

Examples:

- `INVALID_STAGE_TRANSITION`
- `UNAUTHORIZED_TRANSACTION_ACCESS`
- `FINANCIAL_LOCK_VIOLATION`
- `AGENT_NOT_FOUND`
- `LISTING_NOT_FOUND`
- `INVALID_TRANSACTION_PAYLOAD`

The frontend also separates real network/CORS errors from backend business errors, so users do not see misleading "backend unreachable" messages for role-based or empty-data states.

## 12. Frontend Architecture

The frontend is built with Nuxt 3 and organized around workspace pages.

Main pages:

- `/auth`
- `/`
- `/listings`
- `/listings/:id`
- `/agents`
- `/transactions/:id`

The UI is role-aware. A user does not just log into the same dashboard with different labels; the available actions and visible records change based on role.

Examples:

- admin can manage agents and create accounts
- operations can move workflow stages
- finance can inspect financial breakdowns
- agents see only their own operational context

## 13. Pinia State Management

Pinia is used to keep state responsibilities explicit.

Main stores:

- `auth`: login, current user, session cookie, account refresh
- `dashboard`: agents, listings, transactions, summary data, mutations
- `workspace`: persisted notes, tasks, documents, events

The frontend uses a typed API composable (`useLedgeraApi`) as the boundary between UI state and backend calls.

This gives the frontend three clear layers:

- pages decide layout and route-level behavior
- components handle UI interaction
- stores coordinate API calls and shared state
- composables centralize HTTP details and error mapping

## 14. Tailwind CSS and UI Decisions

Tailwind CSS is installed and used as the main utility-first styling layer across core workspace screens.

The UI direction is intentionally calm and operational:

- large cards for fast scanning
- role-aware dashboard sections
- visible financial summaries
- clear stage controls
- airy spacing for readability
- persistent AI assistant access

The legacy/shared `main.css` remains as a supporting design layer for tokens, transitions, and reusable visual styles. This hybrid approach allowed the interface to become Tailwind-first without destabilizing the existing visual system late in development.

## 15. Dashboard Design

The dashboard is designed as a control center.

It includes:

- summary cards
- live transaction count
- stage distribution
- transaction list and filters
- listing map for admin overview
- notifications and risk signals
- upcoming scheduled actions
- activity feed
- commission preview

The dashboard consumes backend summary endpoints instead of deriving all KPIs from paginated rows. This prevents mismatches between visible table rows and actual business totals.

## 16. Workspace Persistence

Notes, tasks, document placeholders, and activity events are persisted in MongoDB.

This was added to avoid a demo-only localStorage feel.

Persisted workspace data supports:

- listing follow-ups
- transaction notes
- document status placeholders
- upcoming scheduled actions
- cross-page activity feed

This makes the app feel like a collaborative operations product rather than a temporary UI shell.

## 17. AI Assistant Layer

The AI assistant is an enhancement layer, not a dependency for core correctness.

It supports:

- page-aware prompts
- role-aware wording
- dashboard/listing/agent/transaction context
- persisted chat history
- Gemini responses when configured
- structured fallback responses if Gemini is unavailable
- AI action mode with user confirmation

The assistant never silently mutates business-critical records. Proposed actions are shown for confirmation before being applied.

This keeps the feature useful while preserving operational safety.

## 18. Testing Strategy

Backend tests use Jest.

The highest-value tests focus on the case's core business rules:

- agency receives 50%
- same-agent scenario gives full agent pool to one agent
- different-agent scenario splits agent pool equally
- valid stage transitions
- invalid stage transition rejection
- completion lock
- financial immutability after completion
- authorization and role-based access
- summary and core business output

The testing focus is intentional: commission and lifecycle behavior are the most important correctness risks in the problem statement.

## 19. Deployment Strategy

The deployment architecture is:

- MongoDB Atlas for persistence
- Render for the NestJS backend
- Vercel for the Nuxt frontend
- Cloudinary-ready image storage

Production-specific decisions:

- `/health` returns a plain response for uptime checks
- CORS is configured for the Vercel production domain and preview domains
- frontend API URLs are controlled through Nuxt runtime public env variables
- Cloudinary env variables can be enabled without changing the data model

## 20. Tradeoffs and Future Improvements

Current intentional tradeoffs:

- hard delete exists for some editable resources, but transaction financial lock protects completed records
- Cloudinary is supported, while local upload fallback remains useful for local demos
- AI is positioned as an enhancement, not a required path for transaction correctness
- commission rules are intentionally simple and explicit because the case defines a fixed company policy

## 20.1 Security and Demo Authentication Tradeoff

The current authentication layer is intentionally simplified for the technical case and live reviewer demo.

Implemented behavior:

- reviewers can log in quickly with predefined role accounts
- admins can provision demo accounts from the UI
- sessions are stored client-side for fast role switching during evaluation

Known production hardening steps:

- hash passwords with a dedicated password hashing strategy
- replace simplified demo sessions with hardened JWT or server-side sessions
- add refresh/session expiry policy
- add password reset and invite flows
- restrict account creation behind stronger admin controls

This is documented as a tradeoff rather than hidden because the case focuses on transaction lifecycle, commission business logic, data modeling, and full-stack architecture. The domain logic is structured so production-grade authentication can be added without changing the commission or transaction workflow design.

Future improvements:

- soft archive instead of hard delete for listings/agents
- richer document approval workflow
- CSV/PDF reporting for finance
- broader unit test coverage for workspace and listing photo workflows
- object-storage-only upload policy in production

## 21. Why This Design Fits the Case

The case asks for more than code. It asks for engineering judgment.

Ledgera demonstrates that through:

- domain-based NestJS structure
- explicit MongoDB data modeling
- backend-owned business rules
- immutable financial snapshots
- role-aware frontend state and UI
- traceable workflow history
- API documentation and deployment readiness
- Jest tests for the core rules

The result is a robust, scalable, and user-centric full-stack application that shows the synergy between a powerful backend and a modern frontend.
