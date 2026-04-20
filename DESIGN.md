# Ledgera Design Decisions

## Intent

Ledgera was designed as a workflow and financial integrity system for real estate transactions, not as a generic CRUD application. The core design goal is to make transaction progress, commission allocation, and financial ownership traceable, explainable, and safe under repeated operations.

## Architecture Overview

The backend is organized around two main domains:

- `agents`
- `transactions`

`transactions` is the operational domain. It owns workflow progression, commission calculation, auditability, dashboard summaries, and authorization-sensitive visibility.

`agents` is the identity/reference domain. It provides the canonical source for agent identity and active status. Transactions still keep agent snapshots (`listingAgent`, `sellingAgent`) for readability and historical stability, but those snapshots are created from a validated agent record.

This hybrid design gives us two benefits:

- We keep transaction reads simple and self-contained for dashboards and reporting.
- We still enforce a real reference model at write time so ownership and visibility are grounded in a canonical agent identity.

## Ownership Control

Ownership rules are central to the product because visibility depends on who is operationally involved in a deal.

Implemented role model:

- `admin`: full access
- `operations`: create transactions, move stages, view transactions, preview commissions, read summaries
- `finance`: read-only financial visibility, preview commissions, read summaries
- `agent`: can only read transactions where they are the listing or selling agent

Why this design:

- The product has two separate concerns: operational progression and financial visibility.
- `operations` should control workflow because they manage the process.
- `finance` should inspect and verify payouts, but should not mutate workflow state.
- `agent` access should be scoped strictly to ownership involvement to prevent accidental information leakage.

This is enforced both in service logic and tests. The decision was to make authorization part of domain behavior, not only controller behavior, so the rules still hold if the service is reused elsewhere.

## Financial Lock

Once a transaction reaches `completed`, its financial state becomes immutable.

Implemented behavior:

- stage rollback is rejected
- alternate stage mutation is rejected
- duplicate completion requests become safe no-ops
- financial lock events are not duplicated
- commission snapshot remains unchanged after lock

Why this design:

- In a commission system, the most dangerous bug is retroactive mutation of a completed payout record.
- The system must behave more like a lightweight ledger after completion.
- Recruiters evaluating this case will care about whether the backend thinks in terms of financial finality, not only workflow convenience.

This is why `financialIntegrity` is stored explicitly and tested after lock violations.

## Snapshot Metadata

Transactions keep embedded financial and identity snapshots:

- `commission`
- `history`
- `activityLog`
- `financialIntegrity`
- `listingAgent`
- `sellingAgent`

Why snapshot instead of fully dynamic calculation:

- Historical payout output must remain readable and stable even if future rules evolve.
- Dashboard and detail reads become simple and fast.
- Audit review can be done from a single transaction document.

This is especially important for `commission.explanation`, because the system should not only know the result but also preserve why that result was produced.

## Activity Log and Audit Trail

The activity log was intentionally upgraded into an audit-style structure:

- `type`
- `actorId`
- `actorRole`
- `actorName`
- `timestamp`
- `previousValue`
- `nextValue`

Why this design:

- A real audit trail must answer who changed what and when.
- Stage progression and financial lock are the highest-risk lifecycle events.
- This structure works for both operational debugging and future audit/reporting screens.

Keeping `previousValue` and `nextValue` also makes frontend timeline rendering easier because the UI can explain not just that an event happened, but what changed.

## Strict Validation

Validation is intentionally split into two layers:

1. DTO validation
2. Domain validation inside services

DTO validation handles:

- required fields
- supported currencies
- query parameter shape
- pagination and sorting constraints

Domain validation handles:

- active agent existence
- completion readiness
- financial breakdown completeness
- repeated action safety

Why both layers:

- DTO validation protects the API boundary.
- Domain validation protects business invariants even if the service is called outside the HTTP layer.

This is the safer choice for a system that contains financial rules.

## Summary Endpoint

A separate summary endpoint was added instead of forcing the frontend to derive KPIs from the list endpoint.

Implemented summary data:

- transaction totals
- completed counts
- total service fee
- agency and agent earnings
- `stageDistribution`
- `earningsBreakdown`
- currency breakdown

Why a separate endpoint:

- Dashboard cards should not depend on client-side aggregation over paginated list data.
- This reduces frontend complexity and avoids mismatches between visible rows and KPI calculations.
- It also makes the backend look like a product-oriented API rather than a thin CRUD wrapper.

## Preview Endpoint

`preview-commission` is intentionally non-persistent.

Why this matters:

- Preview is a planning tool, not an event in the transaction lifecycle.
- It should not create audit noise.
- It should not mutate transaction state or generate snapshots.

This was explicitly tested because repeated preview usage is normal in real operational flows.

## Idempotency and Repeated Action Safety

Repeated requests are treated carefully:

- same stage request on the current stage is a no-op
- repeated `completed` requests do not duplicate lock events
- locked transactions reject new state-changing requests

Why this design:

- Real operational systems receive duplicate clicks, retries, and repeated requests.
- Safe no-op behavior is better than producing duplicate audit events or invalid state transitions.

This is important not only for correctness but also for trust in the system.

## Error Taxonomy

Errors use semantic codes such as:

- `INVALID_STAGE_TRANSITION`
- `UNAUTHORIZED_TRANSACTION_ACCESS`
- `FINANCIAL_LOCK_VIOLATION`
- `TRANSACTION_NOT_FOUND`
- `AGENT_NOT_FOUND`
- `INVALID_PREVIEW_PAYLOAD`
- `INVALID_TRANSACTION_PAYLOAD`

Why this design:

- Frontend can branch on `code` without parsing human-readable messages.
- Error handling becomes more product-like and integration-friendly.
- It also clarifies intent during testing and maintenance.

## Soft Delete Decision

Soft delete is intentionally not implemented in the current backend.

Why it was not added yet:

- The case requirements focus on workflow progression, financial distribution, and traceability.
- Introducing deletion semantics too early adds complexity around visibility, summaries, and audit interpretation.
- For a financial workflow system, deletion is usually a business event that needs its own policy, not a generic CRUD feature.

Recommended future approach:

- add `isArchived` or `deletedAt`
- exclude archived records from normal list and summary endpoints
- retain archived transactions for audit and reporting
- create a dedicated archive event in `activityLog`

So the omission is deliberate, not accidental.

## Why These Decisions Matter Together

These choices were made to make the backend behave like a small transactional operations platform:

- ownership is explicit
- workflow transitions are controlled
- completed financial state is immutable
- read models are dashboard-friendly
- audit data is meaningful
- repeated operations are safe
- error handling is integration-ready

The result is a backend that is intentionally optimized for operational trust and financial traceability rather than only endpoint completeness.

## Agent Workspace and AI Layer

The frontend now treats `agents` as a first-class workspace rather than a simple reference list.

Implemented additions:

- dedicated `Agents` workspace in the sidebar
- role-aware agent listing
- admin CRUD for agent profiles
- selected agent portfolio context using related listings and transactions
- global floating AI assistant that adapts prompts and context per page

Why this design:

- Agent identity is not only a backend reference concern; it is also an operational planning surface.
- The selected-agent context gives management and operations users a faster way to reason about workload and ownership without leaving the page.
- The AI layer is intentionally context-aware rather than generic chat, so it can speak to the currently visible workspace using real page data.

The assistant currently supports:

- dashboard context
- listings context
- listing detail context
- transaction detail context
- agent workspace context

The assistant is also designed with a dual-source response model:

- Gemini when available
- a structured fallback response when the model is unavailable or times out

This keeps the interface usable during local demos and failure cases, while still preserving a richer AI path when network/model access is healthy.

## Transaction Editing Policy

The transaction domain now supports controlled editing and deletion before completion lock.

Implemented behavior:

- `admin` and `operations` can update transactions before financial lock
- `admin` and `operations` can delete unlocked transactions
- updating a transaction recalculates commission snapshots
- update activity is written to the audit log as `transaction_updated`
- completed and locked transactions remain immutable

Why this design:

- Real operations teams need to correct transaction details while a deal is still in motion.
- That flexibility cannot be allowed after completion because payouts and audit state must remain stable.
- By allowing mutation only before lock, the system stays operationally practical without violating the ledger-like behavior expected after completion.

This keeps the product aligned with its core rule:

- active deals can be managed
- completed financial records must remain trustworthy
