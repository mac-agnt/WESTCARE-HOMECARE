# Westcare module build notes

Frontend-only demo. Pulse (Harbour design) re-skinned for **Westcare Homecare** (Irish non-medical home-care provider, offices Sligo, Monaghan, Cavan, Roscommon, Galway, Mayo). Main user: **Martin Murphy** (Leadership). Everyone else is fictional demo data.

## Files you may touch
Only your own page file in `src/westcare/pages/`. Do **not** edit `model.ts`, `store.ts`, `ui.tsx`, `EntityDrawer.tsx`, `src/logic/*`, `src/views/*` or CSS. If you need a helper, define it locally in your page file. If a model field is genuinely missing, derive it locally from existing model data (never invent a contradicting number).

## Architecture
- `src/westcare/model.ts` is the single source of truth. Every headline number is in `K` or derived from generated arrays (`CARERS` 227, `CANDIDATES` 190, `COMPLIANCE`, `EXPIRING` 46, `CRITICAL` 12, `EXPIRED` 5, `MISSING` 7, `AWAITING_VERIFY` 4, `AUDIT_ATTENTION` 12, `HSE_REQUESTS` 149 (`HSE_GAPS` 27 summing to 1,480h), `CLIENTS`, `VISITS` 1,028 today incl. 34 `Unfilled`, `DONE` 1,006 completed last 24h incl. `EXCEPTIONS` 43 (31 Duration Exception + 12 Missing Check-out, 127.5 scheduled hours), `CANCEL_*`, `HANDOFFS` 12 (7 waiting >12h), trends). **Read model.ts fully before writing.**
- `src/westcare/store.ts`: `useWc()` gives shared state (`office` filter, `sub` current subpage per module, `recon`, `aoifeExpired`, `rosterDecisions`, `handoffAccepted`, `reminded`, `log`, `selectedVisit`). `useLive()` gives numbers moved by session decisions (open exceptions, held hours, critical/expired/restricted counts, unfilled with Aoife scenario). Actions on `wc.*`: `go(page, sub)`, `open({kind,id})` drawer, `reconcile`, `decideRoster`, `acceptHandoff`, `remind`, `setAoifeExpired`, `selectVisit`, `setOffice`, `setSub`.
- Current subpage for your module: `const s = useWc(); const sub = s.sub["<Module>"]`. The header tab bar (already wired) switches it. Render one component per subpage.
- `src/westcare/ui.tsx`: `Page`, `ScopeBar` (title + sub + global office pills), `Panel`, `Grid`, `KpiStrip`, `Table` (paginated, sortable, `onRow`, `rowTone`, `selected`), `Chip` (auto tone from status text), `Bars`, `Columns`, `Trend`, `Stack`, `Funnel`, `Ring`, `ListRow`, `AgentNote` (agent name must be one of the 8 agents), `HumanGate`, `Timeline`, `Stat`, `Filters`, `Seg`, `SearchBox`, `Btn`, `RecLink` (opens shared record drawer: kinds carer/candidate/visit/client/hse/office), `GoLink` (jump to another module+subpage), `byOffice(rows, office)`, `Legend`, `Spark`, `label` style, `MONO`.
- Office filter: every operational screen must respect `s.office` ("All" or an OfficeId) via `byOffice` and KPIs recomputed from the filtered rows. When the filter is "All" the KPIs must equal the anchors.

## The 8 agents (exact names)
Briefing, Ops Watchdog, Compliance Agent, Roster Optimiser, Recruitment Agent, Visit Integrity Agent, Care Hours Agent, Reconciliation Agent.

## Six story threads (identical numbers everywhere)
1. **Aoife Byrne** (`AOIFE`, Galway HCA): Garda Vetting expires in 18 days; Patient Manual Handling expires in 6 days; 38 future visits in next 30 days; status Attention Required; Compliance Agent sent renewal reminder. If `aoifeExpired` is on, PMH is Expired, she is Restricted, 4 of today's visits need reassignment.
2. **HC-24817** (`HC24817`, Mayo, Castlebar North): 240h/week required, 176 allocated, 64 unfilled, Capacity Gap; Roster Optimiser prepared 4 coverage options (`HC24817_OPTIONS`, human approves via `wc.decideRoster`).
3. **VIS-10482** (`VIS10482`, Galway, client MM-1042, carer Róisín Tierney): scheduled 10:00–10:45 (45 min), actual 10:06–10:35 (29 min); Duration Exception; Billing Held; Payroll Held; owner Galway Coordinator (Niamh Kelly).
4. **Sarah O'Neill** (`SARAH`, Indeed via Cezanne, HCA, destination Galway): stage Office Handoff, waiting 19 hours, Garda Vetting started, Onboarding 3/8 tasks, status Handoff Delayed.
5. **Roscommon cancellation cluster** (`ROSCOMMON_CLUSTER`): 07:00–09:00, 11 cancellations, 6 recovered, 5 uncovered, 8.5 care hours at risk, Operations Attention.
6. **Liam Walsh** (`LIAM`, Sligo): Car Insurance expires in 6 days; NCT expires in 29 days; 42 visits next 30 days; Renewal Required.

## Hard rules
- **Human approval**: AI may detect, summarise, draft, remind, prepare, suggest, escalate. Never hire, rank candidates, auto-assign rosters, change pay/billing, verify compliance, or allocate care. No candidate "AI suitability score". Roster suggestions use only: compliance status, qualifications, availability, geographic area, existing roster, contracted hours, continuity. Never personal characteristics.
- No clinical detail about clients (no diagnoses). Clients are fictional IDs like MM-1042.
- Do not invent an accounting/CRM product name. Use "Current Care Management System" (`BRAND.careSystem`), "Payroll System", "Finance System", "Cezanne HR", "GSW Training".
- Copy: plain, specific, operational. No em dashes (—) or en dashes (–) in visible text; use hyphens, commas, colons. No exclamation marks. No lorem ipsum, no generic SaaS phrases ("seamless", "elevate", "unlock"). No emojis.
- Every table count must match the KPI above it for the current office filter. Paginate long tables with the `Table` component (its footer shows "Showing x to y of N").
- Each subpage must fill a desktop viewport with dense, purposeful content (KPI strip + 2 to 4 panels, varied layouts: split panels, queues, charts, kanban, timelines). No empty pages, no giant cards holding one number, no identical grid repeated on every subpage, no meaningless donuts.
- Styling: only theme tokens (var(--surface), var(--surface-2), var(--border), var(--ink), var(--body), var(--dim), var(--faint), var(--accent), var(--ok|warn|bad|info) and their -soft). Inline style objects like `ui.tsx`. No new dependencies. No hard-coded hex colours. Animate only transform/opacity.
- TypeScript must pass `npx tsc -b` (strict; `noImplicitAny` is off). Do not use `any` casts gratuitously.
- Cross-links: names/IDs should be `RecLink`s; related modules via `GoLink`. This interconnection is the point of the demo.
