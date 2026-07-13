# Wising Backend Architecture Schema
> Event-Driven Layered Architecture with Hexagonal Output Ports
> Pass this document to your AI coding assistant (Cursor, Windsurf, Claude Code) to scaffold the full backend.

---

## Architecture Overview

```
User Auth
    │
    ▼
Layer 0: Routing Layer (Jurisdiction Detection)
    │  DB0: routing_store (Postgres)
    ▼
Layer 1: Data Collection (Form + Broker + Document Parsers)
    │  DB1: input_store (Postgres + Redis)
    ▼  [emits events to bus on submit, date change, broker sync]
Event Bus (Redis Pub/Sub)
    │
    ▼
Layer 2: DAG Computation Engine
    │  DB2: results_store (Postgres)
    ▼
Output Layer (Dashboard · AI Chat · MCP Server · Public API)
```

All layers communicate through the internal event bus only.
Each layer owns its database exclusively. Cross-layer reads go through internal service calls.
A future Layer N plugs in by subscribing to the event bus and registering its own DB. Zero changes to existing layers.

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 (TypeScript) | Ayush's backend, consistent with existing work |
| Framework | Fastify | Lower overhead than Express, schema validation built-in |
| ORM | Drizzle ORM | Type-safe, SQL-first, fast migrations |
| Database | PostgreSQL 16 | All three layer DBs |
| Event Bus | Redis 7 (pub/sub + streams) | In-process today, extractable later |
| Job Scheduler | BullMQ (on Redis) | Date counter crons, DAG job queue |
| LLM Calls | Vercel AI SDK | Abstraction over multiple LLM providers |
| Auth | Better Auth | Session + JWT, pluggable providers |
| File Storage | Supabase Storage or S3 | Document uploads for parsers |
| Validation | Zod | Runtime schema validation everywhere |
| Testing | Vitest | Fast, native TypeScript |
| Deployment | Docker Compose (dev) → Railway or Fly.io (prod) | |

---

## Directory Structure

```
wising-backend/
├── src/
│   ├── core/
│   │   ├── event-bus/
│   │   │   ├── index.ts          # EventBus class (Redis pub/sub wrapper)
│   │   │   └── events.ts         # All event type definitions (typed)
│   │   ├── internal-api/
│   │   │   └── index.ts          # Cross-layer read functions (not HTTP in v1)
│   │   └── shared/
│   │       ├── types.ts           # Shared TypeScript types
│   │       └── errors.ts          # AppError base class
│   │
│   ├── layer0/
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle schema for DB0
│   │   │   └── migrations/
│   │   ├── service/
│   │   │   └── routing.service.ts # Jurisdiction logic (19-path India + SPT)
│   │   ├── routes/
│   │   │   └── routing.routes.ts  # POST /onboarding/answers
│   │   └── index.ts
│   │
│   ├── layer1/
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle schema for DB1
│   │   │   └── migrations/
│   │   ├── service/
│   │   │   ├── form.service.ts    # Field activation, dependency graph
│   │   │   ├── broker.service.ts  # Broker API normalisation
│   │   │   ├── parser.service.ts  # LLM document parser dispatcher
│   │   │   └── date-counter.service.ts  # Day threshold checks
│   │   ├── parsers/
│   │   │   ├── base.parser.ts     # Abstract LLM parser class
│   │   │   ├── itr.parser.ts      # ITR document parser
│   │   │   ├── form16.parser.ts   # Form 16 parser
│   │   │   ├── w2.parser.ts       # W-2 parser
│   │   │   └── broker-statement.parser.ts
│   │   ├── brokers/
│   │   │   ├── base.broker.ts     # Abstract broker adapter
│   │   │   ├── zerodha.broker.ts
│   │   │   ├── angel-one.broker.ts
│   │   │   └── groww.broker.ts
│   │   ├── jobs/
│   │   │   └── date-counter.job.ts  # BullMQ daily cron
│   │   ├── routes/
│   │   │   ├── form.routes.ts     # GET/POST /layer1/form
│   │   │   └── broker.routes.ts   # POST /layer1/broker/connect
│   │   └── index.ts
│   │
│   ├── layer2/
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle schema for DB2
│   │   │   └── migrations/
│   │   ├── dag/
│   │   │   ├── engine.ts          # DAG runner (topological sort)
│   │   │   ├── nodes/             # One file per DAG node
│   │   │   │   ├── residency-classifier.node.ts
│   │   │   │   ├── india-income.node.ts
│   │   │   │   ├── us-income.node.ts
│   │   │   │   ├── dtaa-resolver.node.ts
│   │   │   │   ├── fema-checker.node.ts
│   │   │   │   └── ... (one per compliance domain)
│   │   │   └── dag.definition.ts  # Node dependency graph definition
│   │   ├── service/
│   │   │   ├── compute.service.ts  # Orchestrates DAG run
│   │   │   └── alert.service.ts    # Reads DB1 + DB2, fires alerts
│   │   ├── jobs/
│   │   │   └── dag.worker.ts       # BullMQ worker, subscribes to events
│   │   ├── routes/
│   │   │   └── results.routes.ts   # GET /layer2/results/:userId
│   │   └── index.ts
│   │
│   ├── outputs/
│   │   ├── dashboard/
│   │   │   └── dashboard.routes.ts  # GET /dashboard/:userId (reads DB2)
│   │   ├── ai-chat/
│   │   │   ├── chat.routes.ts       # POST /chat/message
│   │   │   └── context.builder.ts   # Assembles L0+L1+L2 context for LLM
│   │   ├── mcp/
│   │   │   ├── server.ts            # MCP server (Model Context Protocol)
│   │   │   └── tools/               # One file per MCP tool
│   │   └── api/
│   │       └── public.routes.ts     # GET /api/v1/* (public REST)
│   │
│   ├── auth/
│   │   ├── auth.config.ts           # Better Auth config
│   │   └── auth.routes.ts
│   │
│   └── app.ts                       # Fastify app setup, plugin registration
│
├── drizzle.config.ts
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Database Schemas

### DB0: routing_store

```sql
-- users table (shared across layers, owned by auth)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- onboarding_answers: raw L0 questionnaire responses
CREATE TABLE onboarding_answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  question_key TEXT NOT NULL,
  answer_value JSONB NOT NULL,
  answered_at  TIMESTAMPTZ DEFAULT NOW()
);

-- jurisdiction_assignments: output of L0 routing logic
CREATE TABLE jurisdiction_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) UNIQUE,
  jurisdiction     TEXT NOT NULL CHECK (jurisdiction IN ('india', 'us', 'dual')),
  india_residency  TEXT,          -- resident / nri / rnor
  us_residency     TEXT,          -- citizen / gc / h1b / f1 / none
  spf_days         INTEGER,       -- substantial presence test days
  assigned_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### DB1: input_store

```sql
-- form_submissions: one row per Layer 1 submit event
CREATE TABLE form_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  version      INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- form_fields: each individual field value (EAV pattern for jurisdiction flexibility)
CREATE TABLE form_fields (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES form_submissions(id),
  user_id         UUID NOT NULL,
  field_key       TEXT NOT NULL,
  field_value     JSONB NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('manual', 'document_parser', 'broker_api')),
  parser_model    TEXT,           -- which LLM model parsed this, if source=document_parser
  confidence      FLOAT,          -- parser confidence score
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, field_key)      -- latest value per field per user
);

-- date_fields: extracted separately for cron-based day counter monitoring
CREATE TABLE date_fields (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  field_key       TEXT NOT NULL,  -- e.g. 'india_arrival_date', 'us_visa_start_date'
  field_date      DATE NOT NULL,
  threshold_days  INTEGER,        -- trigger re-fill alert after N days
  last_checked    DATE,
  alert_fired     BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, field_key)
);

-- broker_connections: active broker OAuth / API key links
CREATE TABLE broker_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  broker_name   TEXT NOT NULL,   -- 'zerodha' | 'angel_one' | 'groww'
  access_token  TEXT,            -- encrypted
  refresh_token TEXT,            -- encrypted
  synced_at     TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'active'
);

-- normalised_holdings: broker data post-normalisation, written by broker.service
CREATE TABLE normalised_holdings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  broker_name     TEXT NOT NULL,
  isin            TEXT,
  ticker          TEXT,
  asset_class     TEXT NOT NULL,  -- 'equity' | 'mf' | 'fo' | 'crypto'
  quantity        NUMERIC,
  avg_cost        NUMERIC,
  currency        TEXT DEFAULT 'INR',
  as_of_date      DATE NOT NULL,
  raw_payload     JSONB           -- original broker response
);

-- document_parse_jobs: async queue status for LLM parsers
CREATE TABLE document_parse_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  field_key     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  parser_type   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | running | done | failed
  error_msg     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);
```

### DB2: results_store

```sql
-- dag_runs: one row per DAG execution
CREATE TABLE dag_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  trigger       TEXT NOT NULL,    -- 'l1.submitted' | 'l1.date_changed' | 'broker.sync_complete'
  status        TEXT NOT NULL DEFAULT 'running',
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  error_msg     TEXT
);

-- dag_node_outputs: output of each individual DAG node per run
CREATE TABLE dag_node_outputs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id    UUID NOT NULL REFERENCES dag_runs(id),
  user_id   UUID NOT NULL,
  node_id   TEXT NOT NULL,        -- e.g. 'india-income', 'dtaa-resolver'
  output    JSONB NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- compliance_results: final rolled-up output per user (dashboard reads this)
CREATE TABLE compliance_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL,
  run_id              UUID NOT NULL REFERENCES dag_runs(id),
  india_tax_liability NUMERIC,
  us_tax_liability    NUMERIC,
  dtaa_credit         NUMERIC,
  net_liability       NUMERIC,
  jurisdiction        TEXT,
  flags               JSONB,       -- array of compliance flags
  alerts              JSONB,       -- array of alerts for dashboard
  full_output         JSONB,       -- complete DAG output for AI context
  snapshot_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- alert_state: live alert tracking per user
CREATE TABLE alert_state (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  alert_type   TEXT NOT NULL,
  severity     TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message      TEXT NOT NULL,
  source       TEXT NOT NULL,     -- 'date_counter' | 'dag_flag' | 'broker_threshold'
  resolved     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);
```

---

## Event Bus Contract

All events are typed. Any layer can publish. Any layer can subscribe. Format: `layer.event_name`.

```typescript
// src/core/event-bus/events.ts

export type WisingEvent =
  // Layer 1 events
  | { type: 'l1.submitted';         userId: string; submissionId: string; }
  | { type: 'l1.date_changed';      userId: string; fieldKey: string; newDays: number; }
  | { type: 'l1.field_updated';     userId: string; fieldKey: string; source: string; }
  | { type: 'broker.sync_complete'; userId: string; brokerName: string; }
  | { type: 'parser.job_done';      userId: string; fieldKey: string; submissionId: string; }
  // Layer 2 events
  | { type: 'l2.run_complete';      userId: string; runId: string; }
  | { type: 'l2.alert_fired';       userId: string; alertType: string; severity: string; }
  // Future layers subscribe here without touching the above
  ;
```

DAG worker subscribes to: `l1.submitted`, `l1.date_changed`, `broker.sync_complete`, `parser.job_done`

---

## DAG Node Definition

```typescript
// src/layer2/dag/dag.definition.ts

export const DAG_NODES = [
  { id: 'residency-classifier',  deps: [] },
  { id: 'india-income',          deps: ['residency-classifier'] },
  { id: 'us-income',             deps: ['residency-classifier'] },
  { id: 'fo-income',             deps: ['india-income'] },
  { id: 'dtaa-resolver',         deps: ['india-income', 'us-income'] },
  { id: 'fema-checker',          deps: ['residency-classifier', 'india-income'] },
  { id: 'schedule-fa',           deps: ['residency-classifier'] },
  { id: 'pfic-checker',          deps: ['us-income', 'residency-classifier'] },
  { id: 'tds-reconciler',        deps: ['india-income'] },
  { id: 'advance-tax',           deps: ['india-income', 'dtaa-resolver'] },
  { id: 'state-tax-us',          deps: ['us-income'] },
  { id: 'alert-generator',       deps: ['dtaa-resolver', 'fema-checker', 'pfic-checker'] },
  { id: 'output-aggregator',     deps: ['advance-tax', 'state-tax-us', 'alert-generator', 'schedule-fa'] },
] as const;

// Engine runs nodes in topological order. Nodes with no unfulfilled deps run in parallel.
```

---

## Key Service Interfaces

```typescript
// src/core/internal-api/index.ts
// Cross-layer reads. In v1, these are direct function imports, not HTTP calls.
// In v2+, replace with HTTP client without changing callers.

export interface InternalAPI {
  getJurisdiction(userId: string): Promise<JurisdictionAssignment>
  getFormFields(userId: string): Promise<FormField[]>
  getNormalisedHoldings(userId: string): Promise<NormalisedHolding[]>
  getComplianceResult(userId: string): Promise<ComplianceResult | null>
  getAlerts(userId: string): Promise<AlertState[]>
}
```

```typescript
// src/layer1/parsers/base.parser.ts
export abstract class BaseParser {
  abstract parserType: string
  abstract parse(fileUrl: string, userId: string): Promise<ParsedFields>
  // ParsedFields = Record<fieldKey, { value: unknown; confidence: number }>
}
```

```typescript
// src/layer1/brokers/base.broker.ts
export abstract class BaseBroker {
  abstract brokerName: string
  abstract fetchHoldings(connection: BrokerConnection): Promise<RawHolding[]>
  abstract normalise(raw: RawHolding[]): NormalisedHolding[]
}
```

---

## Dependencies

### Core Dependencies

```bash
npm install fastify @fastify/cors @fastify/helmet @fastify/jwt
npm install drizzle-orm postgres
npm install redis ioredis
npm install bullmq
npm install zod
npm install better-auth
npm install ai @ai-sdk/openai @ai-sdk/anthropic
npm install @modelcontextprotocol/sdk
npm install dotenv
```

### Dev Dependencies

```bash
npm install -D typescript tsx
npm install -D drizzle-kit
npm install -D vitest @vitest/coverage-v8
npm install -D @types/node
```

### Infrastructure (Docker Compose)

```yaml
# docker-compose.yml
services:
  db0:
    image: postgres:16
    environment:
      POSTGRES_DB: wising_routing
      POSTGRES_PASSWORD: dev
    ports: ["5432:5432"]

  db1:
    image: postgres:16
    environment:
      POSTGRES_DB: wising_input
      POSTGRES_PASSWORD: dev
    ports: ["5433:5432"]

  db2:
    image: postgres:16
    environment:
      POSTGRES_DB: wising_results
      POSTGRES_PASSWORD: dev
    ports: ["5434:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### Environment Variables

```env
# .env.example

# Auth
AUTH_SECRET=change_me_32_chars_minimum
JWT_EXPIRY=7d

# DB0
DB0_URL=postgresql://postgres:dev@localhost:5432/wising_routing

# DB1
DB1_URL=postgresql://postgres:dev@localhost:5433/wising_input

# DB2
DB2_URL=postgresql://postgres:dev@localhost:5434/wising_results

# Redis (event bus + BullMQ)
REDIS_URL=redis://localhost:6379

# LLM
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Broker APIs
ZERODHA_API_KEY=
ZERODHA_API_SECRET=
ANGEL_ONE_API_KEY=
GROWW_API_KEY=

# File storage
STORAGE_BUCKET=
STORAGE_ENDPOINT=

# App
PORT=3000
NODE_ENV=development
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
Goal: running server, auth, three DBs connected, event bus live, Layer 0 complete.

- [ ] Scaffold repo, TypeScript config, Fastify app
- [ ] Docker Compose with DB0, DB1, DB2, Redis
- [ ] Drizzle schemas for all three DBs, run migrations
- [ ] Auth with Better Auth (email+password, JWT)
- [ ] Event bus wrapper around Redis pub/sub with typed events
- [ ] Layer 0: onboarding questionnaire routes + jurisdiction routing logic (19-path India residency, US SPT)
- [ ] Layer 0: writes to `jurisdiction_assignments` in DB0, emits nothing (L0 does not trigger L2)
- [ ] Internal API module: stub all cross-layer read functions

Milestone: POST /onboarding/answers returns a jurisdiction and stores to DB0.

---

### Phase 2: Layer 1 Core (Week 3-4)
Goal: form data collection, field dependencies, submit event fires.

- [ ] Form field activation service: reads jurisdiction from internal API, returns activated field list
- [ ] POST /layer1/form: validates fields with Zod, writes to `form_fields` in DB1
- [ ] Date fields extraction: on every submit, write date fields to `date_fields` table
- [ ] On form submit: emit `l1.submitted` to event bus
- [ ] BullMQ daily cron job: check all users' `date_fields`, emit `l1.date_changed` if threshold crossed
- [ ] Alert engine stub: listens to `l1.date_changed`, writes to `alert_state` in DB2

Milestone: Form submit stores data to DB1, emits event, cron runs daily.

---

### Phase 3: Broker Integration + Document Parsers (Week 5-6)
Goal: real data flows in from external sources, normalised to DB1.

- [ ] Broker adapter base class + Zerodha implementation (Kite Connect)
- [ ] Angel One adapter (SmartAPI, already integrated per existing work)
- [ ] POST /layer1/broker/connect: OAuth or API key store (encrypted in DB1)
- [ ] Broker normaliser: maps raw holdings to `normalised_holdings` schema
- [ ] On sync complete: emit `broker.sync_complete`
- [ ] Document parser base class + ITR parser (LLM via AI SDK)
- [ ] Form 16 parser, W-2 parser
- [ ] File upload endpoint → Supabase Storage → queue parse job → write to `form_fields` when done
- [ ] On parser complete: emit `parser.job_done`

Milestone: User connects Angel One, holdings appear in DB1 normalised. Upload ITR, fields auto-fill.

---

### Phase 4: Layer 2 DAG Engine (Week 7-8)
Goal: DAG computes on every L1 event, results in DB2.

- [ ] DAG engine: topological sort, parallel node execution, context passing between nodes
- [ ] Implement all 13 DAG nodes (one TypeScript file each, pure functions)
- [ ] BullMQ worker subscribes to `l1.submitted`, `l1.date_changed`, `broker.sync_complete`, `parser.job_done`
- [ ] On trigger: read from DB0 + DB1 via internal API, run DAG, write to DB2
- [ ] Idempotency: same input hash = skip re-run, return cached result
- [ ] Alert generator node: compares results against compliance thresholds, writes to `alert_state`
- [ ] Emit `l2.run_complete` on success

Milestone: Submit Layer 1 form → DAG runs within 2s → compliance result in DB2.

---

### Phase 5: Output Layer (Week 9-10)
Goal: dashboard, AI chat, MCP, public API all reading from DB2.

- [ ] Dashboard routes: GET /dashboard/:userId reads `compliance_results` + `alert_state` from DB2
- [ ] AI chat context builder: assembles L0 (jurisdiction) + L1 (form fields, holdings) + L2 (full_output) into LLM system prompt
- [ ] POST /chat/message: sends user message + context to chosen LLM, streams response
- [ ] MCP server: expose tools (get_compliance_summary, get_alerts, get_holdings, run_scenario)
- [ ] Public API: GET /api/v1/compliance, GET /api/v1/alerts, POST /api/v1/webhook/subscribe
- [ ] API gateway: unified auth middleware, rate limiting, route registration across all output consumers

Milestone: Full pipeline live end-to-end. User onboards → data in → DAG fires → dashboard shows output → AI chat answers questions.

---

### Phase 6: Hardening (Week 11-12)
Goal: production-ready.

- [ ] Full Zod validation on every route input and event payload
- [ ] Error handling: AppError class, structured error responses, dead letter queue for failed DAG jobs
- [ ] Observability: structured logging (pino), request tracing, BullMQ job monitoring
- [ ] Encryption: broker tokens AES-encrypted at rest, document files encrypted in storage
- [ ] Rate limiting on public API and AI chat
- [ ] Integration tests for full pipeline (Vitest)
- [ ] Load test DAG worker under concurrent submissions

---

## Extension Guide (How to Add a Future Layer)

To add Layer N (e.g. a pre-execution agent gating layer):

1. Create `src/layerN/` following the same structure as layer1/ or layer2/
2. Create `src/layerN/db/schema.ts` — its own Drizzle schema, its own DB connection
3. Add new event types to `src/core/event-bus/events.ts`
4. Subscribe to whichever existing events Layer N needs (e.g. `l2.run_complete`)
5. Register Layer N routes in `src/app.ts`
6. Add `dbN` to docker-compose.yml and `.env`
7. Add cross-layer read functions to `src/core/internal-api/index.ts` if needed

No existing layer file changes. No existing DB schema changes.

---

## Constraints and Decisions

- DB isolation is non-negotiable. Never write a query that JOINs across DB0, DB1, and DB2.
- Layer 2 DAG nodes are pure functions: `(input: DagContext) => DagNodeOutput`. No DB calls inside nodes. The engine handles all DB reads before running and all DB writes after.
- Event bus is eventually consistent for broker sync and document parsers. Dashboard may show "calculating" state while DAG is running.
- LLM document parsers are async. Never block form submission waiting for a parser result.
- The AI chat LLM is user-selectable. The context builder is LLM-agnostic. The AI SDK abstraction handles provider switching.
- All secrets are environment variables. No secrets in code or schema files.
