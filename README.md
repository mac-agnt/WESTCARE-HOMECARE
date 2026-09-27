# Pulse · Westcare Homecare

React build of the **Pulse v5 Harbour** design, configured as the operating system for **Westcare Homecare**: recruitment, compliance, rostering, care delivery, visit verification and billing and payroll reconciliation across the Sligo, Monaghan, Cavan, Roscommon, Galway and Mayo offices. Frontend only, mock data only.

Every page, theme and interaction from the design is here. Screens were checked against the original mockup and match pixel for pixel at 1440×900 and 1024×720.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

## What's in it

| Area | Where |
| --- | --- |
| Pages: Home (Helios chat), Agents, Work, Records, Activity, Settings | `src/views/pages/` |
| Westcare modules: Dashboard, Recruitment, Compliance, Rostering, Care Delivery, Billing & Payroll | `src/westcare/pages/` |
| Westcare data model (every headline number derives from it) | `src/westcare/model.ts` |
| Shared session state (office filter, decisions, scenario) | `src/westcare/store.ts` |
| Shared record drawer, Home board, ontology chains, Helios answers | `src/westcare/` |
| Overlays: ⌘K palette, agent studio, Helios mini chat, work viewer, new record, background gallery | `src/views/overlays/` |
| App frame: sidebar, top bar, notifications | `src/views/AppShell.tsx` |
| State and behaviour | `src/logic/PulseLogic.js` |
| Pulse demo data (agents, workflows, activity, settings) | `src/logic/data.js` |
| Agent avatar | `src/components/AgentFace.tsx` |
| Theme tokens (Harbour, light and 11 more), animations | `src/styles/pulse.css` |
| Westcare dark and light themes (brand browns and creams from the Westcare logo) | `src/styles/westcare.css` |

## How it fits together

- **`PulseLogic`** holds all state. Its `renderVals()` returns one flat object `v`.
- **Views** are plain React components that render from `v`.
- **`LogicHost`** (`src/runtime/logic.tsx`) mounts the logic and re-renders on `setState`.
- **Tweaks** from the design live in `src/App.tsx`:
  - `kpiBackdrop`: the colour of the Dashboard KPI background
  - `kpiBackdropOn`: whether that background shows

## Updating from Claude Design

Export the new version, replace the file in `design/`, then run:

```bash
npm run import-design
```

This regenerates:

- `src/views/`
- `src/styles/pulse.css`
- `src/styles/interactions.css`
- `src/logic/`

`AgentFace` is hand-written and left alone. Commit before running, because it overwrites hand edits to those files.

## Fixed from the mockup

In the mockup, the work viewer's wrapper `<div>` was never closed. As a result, the ⌘K palette, agent studio, new record dialog and background gallery could only appear while the work viewer was open. They now open on their own. The fix is applied in `tools/import-design.mjs`.

## Westcare demo notes

- All people other than Martin Murphy, and all clients, carers and candidates, are fictional demo data.
- Six story threads (Aoife Byrne, HC-24817, VIS-10482, Sarah O'Neill, the Roscommon cancellation cluster, Liam Walsh) use the same numbers on every screen.
- Compliance → Overview has a scenario control that expires Aoife Byrne's manual handling and ripples through every module.
- Agents detect, draft, remind and suggest. Hiring, rostering, compliance verification and pay or billing changes always need a person.
- `npm run import-design` would overwrite the Westcare changes in `src/views/` and `src/logic/`; do not run it without re-applying them.
