/* Westcare Dashboard: Executive, Workforce, Service Delivery, Finance.
   Every figure is read from model.ts (or moved by session decisions via
   useLive), scoped by the global office filter. With "All offices" each KPI
   equals the network anchors. Finance is an operational reconciliation view,
   not a P&L. */
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  AOIFE, AOIFE_UPCOMING_VISITS, ALLOCATED_TREND, CANCEL_DAILY, CANCEL_REASONS, CANCEL_RECOVERED, CANCEL_TODAY, CANCEL_WEEKLY,
  CANDIDATE_TREND, CANDIDATES, CARERS, COMPLIANCE_TREND, COVERAGE_TREND, CRITICAL, DONE, EXCEPTIONS, EXPIRED, HANDOFFS,
  HC24817, HC24817_OPTIONS, HSE_GAPS, K, LIAM, MISSING, AWAITING_VERIFY, NEW_STARTERS_TREND, OFFICES, REQUESTED_TREND,
  RESTRICTED_CARER_IDS, ROSCOMMON_CLUSTER, SARAH, STAGES, SYSTEMS, TODAY_LABEL, UNFILLED_TODAY, VISITS, WEEKS,
  BRAND, addDays, complianceByOffice, fmt, fmtH, hhmm, minsLabel, pct,
  type DoneVisit, type OfficeFilter, type OfficeId, type Visit,
} from "../model";
import { useLive, useWc, wc, type ModuleId } from "../store";
import {
  AgentNote, Bars, Btn, Chip, Columns, Filters, Funnel, GoLink, Grid, HumanGate, Legend, ListRow, MONO, OfficePills, Page,
  Panel, RecLink, Ring, Spark, Stack, Stat, Table, TONE, Trend, byOffice, label, type Col, type Tone,
} from "../ui";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const inScope = (o: OfficeFilter, id: OfficeId) => o === "All" || o === id;
const scopeName = (o: OfficeFilter) => (o === "All" ? "All offices" : o + " office");
const sumBy = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const CARER_ID = new Map(CARERS.map((c) => [c.name, c.id]));
const go = (page: ModuleId, sub?: string) => () => wc.go(page, sub);
const tab = (sub: string) => () => wc.setSub("Dashboard", sub);
const reduceMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const NETWORK_NOTE = "Network series; weekly history is not split by office";

type Recon = ReturnType<typeof useWc>["recon"];
const resolved = (recon: Recon, id: string) => !!recon[id] && recon[id].action !== "Request Clarification";
/** Hours a reconciliation decision released as verified. */
const releasedHours = (recon: Recon, v: DoneVisit) => {
  const r = recon[v.id];
  if (!r || r.action === "Request Clarification" || r.action === "Mark Cancelled") return 0;
  return (r.action === "Approve Recorded Time" ? v.actualMins ?? v.mins : v.mins) / 60;
};

function CarerLink({ name }: { name: string | null }) {
  if (!name) return <span style={{ color: "var(--faint)" }}>No carer</span>;
  const id = CARER_ID.get(name);
  return id ? <RecLink to={{ kind: "carer", id }}>{name}</RecLink> : <span>{name}</span>;
}

/** Compliance mix for one office, with the Aoife scenario applied. */
function compOf(id: OfficeId, aoifeExpired: boolean) {
  const c = complianceByOffice(id);
  if (aoifeExpired && id === "Galway") return { ...c, amber: c.amber - 1, red: c.red + 1 };
  return c;
}

/** Every scoped number the four tabs share. */
function useScope() {
  const s = useWc();
  const L = useLive();
  const o = s.office;
  const all = o === "All";
  const offices = OFFICES.filter((x) => inScope(o, x.id));
  const aoifeIn = s.aoifeExpired && inScope(o, "Galway");
  const carers = byOffice(CARERS, o);
  const done = byOffice(DONE, o);
  const exAll = byOffice(EXCEPTIONS, o);
  const exOpen = exAll.filter((v) => !resolved(s.recon, v.id));
  const exReleased = exAll.filter((v) => resolved(s.recon, v.id));
  const req = sumBy(offices, (x) => x.reqHours);
  const alloc = sumBy(offices, (x) => x.allocHours);
  const visits = sumBy(offices, (x) => x.visits24);
  const restricted = all ? L.restricted : carers.filter((c) => RESTRICTED_CARER_IDS.has(c.id)).length + (aoifeIn ? 1 : 0);
  const unfilledRows: Visit[] = byOffice(UNFILLED_TODAY, o).concat(aoifeIn ? AOIFE_UPCOMING_VISITS : []);
  return {
    s, L, o, all, offices, aoifeIn, carers, done, exAll, exOpen, exReleased,
    req, alloc, gap: req - alloc, visits,
    unfilled: all ? L.unfilled : unfilledRows.length, unfilledRows,
    active: carers.length,
    restricted,
    compliant: carers.length - restricted,
    critical: all ? L.critical : byOffice(CRITICAL, o).length - (aoifeIn ? 1 : 0),
    expired: all ? L.expired : byOffice(EXPIRED, o).length + (aoifeIn ? 1 : 0),
    missing: byOffice(MISSING, o).length,
    awaiting: byOffice(AWAITING_VERIFY, o).length,
    candidates: byOffice(CANDIDATES, o),
    cancel30: sumBy(offices, (x) => x.cancellations30),
    openEx: all ? L.openExceptions : exOpen.length,
    heldHours: all ? L.heldHours : sumBy(exOpen, (v) => v.mins) / 60,
  };
}
type ScopeData = ReturnType<typeof useScope>;

/* ------------------------------------------------------------------ */
/* Glass KPI band (theme tokens only, after the Pulse dashboard band)  */
/* ------------------------------------------------------------------ */

type BandKpi = { label: string; value: ReactNode; unit?: string; sub?: ReactNode; tone?: Tone; onClick?: () => void; spark?: number[] };

function Band({ eyebrow, title, sub, items, cols }: { eyebrow: string; title: ReactNode; sub?: ReactNode; items: BandKpi[]; cols: number }) {
  const still = reduceMotion();
  const blob = (st: CSSProperties, dur: number): CSSProperties => ({ position: "absolute", borderRadius: "50%", pointerEvents: "none", animation: still ? "none" : "drift " + dur + "s ease-in-out infinite", ...st });
  return (
    <section style={{ position: "relative", isolation: "isolate", overflow: "hidden", marginTop: 4, padding: "22px 22px 20px", borderRadius: "calc(var(--card-r,18px) + 6px)", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)", animation: "fadeUp .5s var(--ease) both" }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: -1, overflow: "hidden", pointerEvents: "none" }}>
        <div style={blob({ width: 620, height: 440, left: -160, top: -200, background: "radial-gradient(closest-side, var(--bloom-b), transparent)" }, 17)} />
        <div style={blob({ width: 680, height: 480, right: -180, bottom: -280, background: "radial-gradient(closest-side, var(--bloom-a), transparent)" }, 21)} />
        <div style={blob({ width: 460, height: 340, left: "40%", top: -220, background: "radial-gradient(closest-side, var(--bloom-c), transparent)" }, 25)} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, var(--glass-tint), transparent 72%)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
          <div style={label}>{eyebrow}</div>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.8px", marginTop: 7, color: "var(--ink)", lineHeight: 1.15 }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 6, maxWidth: "90ch", lineHeight: 1.5 }}>{sub}</div>}
        </div>
        <OfficePills />
      </div>
      <div className="wc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(" + cols + ",minmax(0,1fr))", gap: 12, marginTop: 18 }}>
        {items.map((k, i) => {
          const Tag = k.onClick ? "button" : "div";
          const valueInk = k.tone === "bad" || k.tone === "warn" ? TONE[k.tone].ink : "var(--ink)";
          return (
            <Tag key={k.label} className={k.onClick ? "wc-kpi" : undefined} onClick={k.onClick}
              style={{ position: "relative", textAlign: "left", font: "inherit", color: "inherit", minWidth: 0, padding: "17px 18px 15px", background: "linear-gradient(160deg, var(--glass-highlight), var(--glass-tint) 62%)", border: "1px solid var(--glass-border)", borderRadius: "var(--r-md,16px)", backdropFilter: "blur(22px) saturate(1.4)", WebkitBackdropFilter: "blur(22px) saturate(1.4)", boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 14px 30px -20px var(--glass-shadow)", cursor: k.onClick ? "pointer" : "default", overflow: "hidden", animation: still ? "none" : "fadeUp .5s var(--ease) " + i * 45 + "ms both", transition: "border-color .2s var(--ease),transform .2s var(--ease)" }}>
              <div style={{ ...label, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: k.spark ? 70 : 0 }}>{k.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", lineHeight: 1, color: valueInk, fontVariantNumeric: "tabular-nums" }}>{k.value}</span>
                {k.unit && <span style={{ fontSize: 12, color: "var(--dim)" }}>{k.unit}</span>}
              </div>
              {k.sub && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.sub}</div>}
              {k.spark && <Spark values={k.spark} tone={k.tone === "bad" || k.tone === "warn" ? k.tone : undefined} style={{ position: "absolute", right: 14, top: 14, opacity: 0.9 }} />}
            </Tag>
          );
        })}
      </div>
    </section>
  );
}

/** Small key figures under a chart. */
function Figures({ items }: { items: [string, ReactNode, Tone?][] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(" + items.length + ",minmax(0,1fr))", gap: 8, marginTop: 12 }}>
      {items.map(([k, v, t]) => <Stat key={k} k={k} v={v} tone={t} />)}
    </div>
  );
}

function PanelFoot({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: "auto", paddingTop: 12 }}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* EXECUTIVE                                                           */
/* ------------------------------------------------------------------ */

type OfficeRow = { id: string; coordinator: string; req: number; alloc: number; avail: number; alerts: number; cands: number; exc: number; total?: boolean };

function Executive({ d }: { d: ScopeData }) {
  const { s, L, o, all } = d;
  const newWeek = d.candidates.filter((c) => c.appliedThisWeek).length;
  const scheduled30 = d.visits * 30;
  const gapTrend = REQUESTED_TREND.map((r, i) => r - ALLOCATED_TREND[i]);

  const rows: OfficeRow[] = d.offices.map((x) => {
    const c = compOf(x.id, s.aoifeExpired);
    return {
      id: x.id, coordinator: x.coordinator, req: x.reqHours, alloc: x.allocHours,
      avail: CARERS.filter((k) => k.office === x.id && k.availableToday && !k.rosteredToday).length,
      alerts: c.amber + c.red,
      cands: CANDIDATES.filter((k) => k.office === x.id).length,
      exc: d.exOpen.filter((v) => v.office === x.id).length,
    };
  });
  const tableRows: OfficeRow[] = all
    ? rows.concat({ id: "Total", coordinator: "6 offices", total: true, req: sumBy(rows, (r) => r.req), alloc: sumBy(rows, (r) => r.alloc), avail: sumBy(rows, (r) => r.avail), alerts: sumBy(rows, (r) => r.alerts), cands: sumBy(rows, (r) => r.cands), exc: sumBy(rows, (r) => r.exc) })
    : rows;
  const strong = (r: OfficeRow, n: ReactNode) => <span style={{ fontWeight: r.total ? 600 : 400, color: r.total ? "var(--ink)" : undefined }}>{n}</span>;
  const cols: Col<OfficeRow>[] = [
    { key: "office", label: "Office", w: "1.5fr", render: (r) => r.total ? strong(r, "Total, 6 offices") : <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><RecLink to={{ kind: "office", id: r.id }}>{r.id}</RecLink><span style={{ fontSize: 11, color: "var(--faint)" }}>{r.coordinator}</span></span> },
    { key: "req", label: "Required Hours", align: "right", mono: true, render: (r) => strong(r, fmt(r.req)) },
    { key: "alloc", label: "Allocated Hours", align: "right", mono: true, render: (r) => strong(r, fmt(r.alloc)) },
    { key: "cov", label: "Coverage %", align: "right", mono: true, render: (r) => { const v = (100 * r.alloc) / r.req; return <span style={{ color: v < 95 ? "var(--warn)" : "var(--ok)", fontWeight: r.total ? 600 : 400 }}>{pct(r.alloc, r.req)}</span>; } },
    { key: "avail", label: "Available Carers", align: "right", mono: true, render: (r) => strong(r, r.avail) },
    { key: "alerts", label: "Compliance Alerts", align: "right", mono: true, render: (r) => strong(r, r.alerts) },
    { key: "cands", label: "Candidates", align: "right", mono: true, render: (r) => strong(r, r.cands) },
    { key: "exc", label: "Visit Exceptions", align: "right", mono: true, render: (r) => <span style={{ color: r.exc ? "var(--bad)" : "var(--dim)", fontWeight: r.total ? 600 : 400 }}>{r.exc}</span> },
  ];

  /* the office with the biggest weekly gap in scope */
  const worst = d.offices.slice().sort((a, b) => (b.reqHours - b.allocHours) - (a.reqHours - a.allocHours))[0];
  const handoffsWaiting = HANDOFFS.filter((h) => inScope(o, h.destination) && h.waitingHours > 12 && !s.handoffAccepted[h.candidate.id]).length;
  const stageAll = STAGES.map((st) => ({ label: st, value: d.candidates.filter((c) => c.stage === st).length, onClick: go("Recruitment", "Pipeline") }));
  /* the shared Funnel divides by the previous step, so empty stages are listed instead of drawn */
  const stageCounts = stageAll.filter((x) => x.value > 0);
  const emptyStages = stageAll.filter((x) => x.value === 0).map((x) => x.label);
  const gapsInScope = byOffice(HSE_GAPS, o);

  return (
    <>
      <Band cols={4} eyebrow={"Executive · " + scopeName(o) + " · " + TODAY_LABEL + ", 11:40"} title="Westcare at a glance"
        sub="Coverage, workforce, compliance, recruitment and visit quality in one view. Select any figure to open the module behind it."
        items={[
          { label: "Visits / day", value: fmt(d.visits), sub: fmt(d.visits - d.unfilled) + " covered, " + d.unfilled + " unfilled today", onClick: go("Care Delivery", "Today") },
          { label: "Roster fill", value: pct(d.alloc, d.req), sub: fmt(d.alloc) + " of " + fmt(d.req) + " HSE hours allocated", tone: (100 * d.alloc) / d.req < 95 ? "warn" : "ok", spark: all ? COVERAGE_TREND : undefined, onClick: go("Rostering", "Overview") },
          { label: "Unfilled hours", value: fmt(d.gap), unit: "h / week", sub: gapsInScope.length + " HSE packages with a gap", tone: "warn", spark: all ? gapTrend : undefined, onClick: go("Rostering", "Unfilled Hours") },
          { label: "Active carers", value: fmt(d.active), sub: d.restricted + " restricted from rostering", onClick: tab("Workforce") },
          { label: "Compliance", value: pct(d.compliant, d.active), sub: fmt(d.compliant) + " of " + fmt(d.active) + " carers fully compliant", tone: d.restricted ? "warn" : "ok", spark: all ? COMPLIANCE_TREND : undefined, onClick: go("Compliance", "Overview") },
          { label: "Recruitment pipeline", value: fmt(d.candidates.length), unit: "active", sub: newWeek + " new applications this week", spark: all ? CANDIDATE_TREND : undefined, onClick: go("Recruitment", "Pipeline") },
          { label: "Visit exception rate", value: pct(d.openEx, d.done.length), sub: d.openEx + " of " + fmt(d.done.length) + " completed visits, last 24h", tone: d.openEx ? "bad" : "ok", onClick: go("Care Delivery", "Exceptions") },
          { label: "Cancellation rate", value: pct(d.cancel30, scheduled30), sub: fmt(d.cancel30) + " of " + fmt(scheduled30) + " scheduled (" + fmt(d.visits) + "/day × 30)", tone: "warn", spark: all ? CANCEL_WEEKLY : undefined, onClick: go("Care Delivery", "Cancellations") },
        ]} />

      <Grid cols="1fr">
        <Panel pad={false} title="Office performance" meta={all ? "This week. Totals match the network anchors. Select an office for its record." : "This week, " + scopeName(o)}
          action={<GoLink page="Rostering" sub="HSE Requests">HSE requests</GoLink>}>
          <Table cols={cols} rows={tableRows} dense pageSize={8} rowKey={(r) => r.id}
            onRow={(r) => { if (!r.total) wc.open({ kind: "office", id: r.id }); }}
            rowTone={(r) => (r.total ? "accent" : (100 * r.alloc) / r.req < 95 ? "warn" : undefined)}
            footer={rows.length + (rows.length === 1 ? " office" : " offices") + ". Available carers are available today and not yet rostered. Compliance alerts count carers restricted or with a document due within 30 days."} />
        </Panel>
      </Grid>

      <Grid cols="1.1fr 1fr 1fr 1fr">
        <Panel title="Compliance risk" meta={fmt(d.compliant) + " of " + fmt(d.active) + " carers fully compliant"} action={<GoLink page="Compliance" sub="Expiries">Expiries</GoLink>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
            <Stat k="Critical, 7 days" v={d.critical} tone={d.critical ? "bad" : "ok"} />
            <Stat k="Expired" v={d.expired} tone={d.expired ? "bad" : "ok"} />
            <Stat k="Restricted" v={d.restricted} tone={d.restricted ? "warn" : "ok"} />
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            {d.offices.map((x) => {
              const c = compOf(x.id, s.aoifeExpired);
              return (
                <div key={x.id} className="wc-row" onClick={() => wc.open({ kind: "office", id: x.id })} style={{ display: "grid", gridTemplateColumns: "82px 1fr 64px", gap: 10, alignItems: "center", cursor: "pointer", borderRadius: 6, padding: "2px 0" }}>
                  <span style={{ fontSize: 12.5, color: "var(--body)" }}>{x.id}</span>
                  <Stack height={9} parts={[{ value: c.green, color: "var(--ok)", label: "Compliant" }, { value: c.amber, color: "var(--warn)", label: "Due in 30 days" }, { value: c.red, color: "var(--bad)", label: "Restricted" }]} />
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--dim)", textAlign: "right" }}>{c.amber}<span style={{ color: "var(--faint)" }}> / </span><span style={{ color: c.red ? "var(--bad)" : "var(--dim)" }}>{c.red}</span></span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
            <Legend color="var(--ok)">Compliant</Legend><Legend color="var(--warn)">Due in 30 days</Legend><Legend color="var(--bad)">Restricted</Legend>
          </div>
          <PanelFoot>
            {inScope(o, "Galway") && <span style={{ fontSize: 12, color: "var(--dim)" }}><RecLink to={{ kind: "carer", id: AOIFE.id }}>{AOIFE.name}</RecLink> {s.aoifeExpired ? "restricted" : "PMH in 6 days"}</span>}
            {inScope(o, "Sligo") && <span style={{ fontSize: 12, color: "var(--dim)" }}><RecLink to={{ kind: "carer", id: LIAM.id }}>{LIAM.name}</RecLink> insurance in 6 days</span>}
          </PanelFoot>
        </Panel>
        <Panel title="Weekly roster fill" meta={all ? "Allocated as % of HSE requested hours, 7 weeks" : NETWORK_NOTE} action={<GoLink page="Rostering" sub="Overview">Rostering</GoLink>}>
          <Trend labels={WEEKS} series={[{ name: "Roster fill", values: COVERAGE_TREND }]} fmtValue={(v) => v.toFixed(1) + "%"} height={140} />
          <Figures items={[["This week", COVERAGE_TREND[6].toFixed(1) + "%"], ["7 weeks ago", COVERAGE_TREND[0].toFixed(1) + "%"], ["Change", "+" + (COVERAGE_TREND[6] - COVERAGE_TREND[0]).toFixed(1) + " pts", "ok"]]} />
        </Panel>
        <Panel title="HSE hours: requested vs allocated" meta={all ? "Weekly hours, 7 weeks" : NETWORK_NOTE} action={<GoLink page="Rostering" sub="HSE Requests">Packages</GoLink>}>
          <Trend labels={WEEKS} series={[{ name: "Requested", values: REQUESTED_TREND, color: "var(--neutral)" }, { name: "Allocated", values: ALLOCATED_TREND, color: "var(--accent)" }]} area={false} fmtValue={(v) => fmt(v) + "h"} height={122} />
          <Figures items={[["Requested", fmt(d.req) + "h"], ["Allocated", fmt(d.alloc) + "h"], ["Gap", fmt(d.gap) + "h", "warn"]]} />
          {inScope(o, "Mayo") && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 10 }}><RecLink to={{ kind: "hse", id: HC24817.id }}>{HC24817.id}</RecLink> Castlebar North alone is {HC24817.gap}h short.</div>}
        </Panel>
        <Panel title="Cancellations per week" meta={all ? "Cancelled visits, 7 weeks" : NETWORK_NOTE} action={<GoLink page="Care Delivery" sub="Cancellations">Cancellations</GoLink>}>
          <Columns labels={WEEKS} series={[CANCEL_WEEKLY]} height={138} colors={["var(--neutral)"]} />
          <Figures items={[["30 days, " + (all ? "network" : o), fmt(d.cancel30)], ["Rate", pct(d.cancel30, d.visits * 30), "warn"], ["Recovered", K.recoveryRate + "%", "ok"]]} />
        </Panel>
      </Grid>

      <Grid cols="1fr 1.2fr">
        <Panel title="Recruitment funnel" meta={fmt(d.candidates.length) + " active candidates, " + newWeek + " applied this week"} action={<GoLink page="Recruitment" sub="Pipeline">Pipeline</GoLink>}>
          <Funnel steps={stageCounts} />
          {emptyStages.length > 0 && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 8 }}>No candidates at: {emptyStages.join(", ")}.</div>}
          <PanelFoot>
            <GoLink page="Recruitment" sub="Handoffs">{handoffsWaiting} handoffs waiting over 12h</GoLink>
            {inScope(o, "Galway") && <span style={{ fontSize: 12, color: "var(--dim)" }}><RecLink to={{ kind: "candidate", id: SARAH.id }}>{SARAH.name}</RecLink> {s.handoffAccepted[SARAH.id] ? "accepted by Galway" : "waiting 19 hours"}</span>}
          </PanelFoot>
        </Panel>
        <Panel title="Where to look first" meta={"Prepared by the Briefing agent for Martin Murphy, " + scopeName(o)}>
          <AgentNote agent="Briefing">
            {scopeName(o)} is at {pct(d.alloc, d.req)} roster fill with {fmt(d.gap)} hours a week unfilled. {d.openEx} visit exceptions hold {fmtH(d.heldHours)} hours from billing and payroll. Nothing below changes without a person approving it.
          </AgentNote>
          <div style={{ marginTop: 10 }}>
            {worst && (
              <ListRow tone="warn" title={worst.id + " carries the largest gap: " + fmt(worst.reqHours - worst.allocHours) + "h this week"}
                meta={worst.id === "Mayo" ? "HC-24817 needs 64h. Roster Optimiser prepared 4 coverage options, " + L.approvedOpts + " approved so far." : "Coordinator " + worst.coordinator + " owns the open packages."}
                right={<GoLink page="Rostering" sub="Unfilled Hours">Unfilled hours</GoLink>} />
            )}
            <ListRow tone={d.openEx ? "bad" : "ok"} title={d.openEx + " visit exceptions awaiting a decision"} meta={fmtH(d.heldHours) + " scheduled hours held from billing and payroll until reviewed."}
              right={<GoLink page="Billing & Payroll" sub="Reconciliation">Reconcile</GoLink>} />
            <ListRow tone={d.critical ? "bad" : "ok"} title={d.critical + " compliance documents expire within 7 days"} meta={d.expired + " expired, " + d.missing + " missing, " + d.awaiting + " awaiting verification."}
              right={<GoLink page="Compliance" sub="Expiries">Expiries</GoLink>} />
            {inScope(o, "Roscommon") && (
              <ListRow tone="warn" title={"Roscommon lost " + ROSCOMMON_CLUSTER.cancellations + " visits between " + ROSCOMMON_CLUSTER.period} meta={ROSCOMMON_CLUSTER.recovered + " recovered, " + ROSCOMMON_CLUSTER.uncovered + " still uncovered, " + ROSCOMMON_CLUSTER.hoursAtRisk + " care hours at risk."}
                right={<GoLink page="Care Delivery" sub="Cancellations">Cancellations</GoLink>} />
            )}
            <ListRow tone={handoffsWaiting ? "warn" : "ok"} title={handoffsWaiting + " recruitment handoffs waiting over 12 hours"} meta="Offices accept a handoff before onboarding tasks are created."
              right={<GoLink page="Recruitment" sub="Handoffs">Handoffs</GoLink>} />
          </div>
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* WORKFORCE                                                           */
/* ------------------------------------------------------------------ */

type CapRow = { id: string; name: string; office: OfficeId; area: string; contracted: number; scheduled: number; open: number; today: string; comp: string };

function Workforce({ d }: { d: ScopeData }) {
  const { s, L, o, all } = d;
  const rostered = d.carers.filter((c) => c.availableToday && c.rosteredToday);
  const available = d.carers.filter((c) => c.availableToday && !c.rosteredToday);
  const unavailable = d.carers.filter((c) => !c.availableToday);
  const avgSched = d.active ? sumBy(d.carers, (c) => c.scheduledWeek) / d.active : 0;
  const avgContract = d.active ? sumBy(d.carers, (c) => c.contracted) / d.active : 0;
  const isRestricted = (id: string) => RESTRICTED_CARER_IDS.has(id) || (s.aoifeExpired && id === AOIFE.id);
  const capRows: CapRow[] = d.carers
    .filter((c) => c.contracted > c.scheduledWeek)
    .map((c) => ({
      id: c.id, name: c.name, office: c.office, area: c.area, contracted: c.contracted, scheduled: c.scheduledWeek, open: c.contracted - c.scheduledWeek,
      today: !c.availableToday ? c.unavailableReason || "Unavailable" : c.rosteredToday ? "Rostered" : "Available",
      comp: isRestricted(c.id) ? "Restricted" : "Compliant",
    }))
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
  const openCap = sumBy(capRows, (r) => r.open);
  const starters = NEW_STARTERS_TREND[NEW_STARTERS_TREND.length - 1];
  const onboarding = d.candidates.filter((c) => c.stage === "Onboarding").length;
  const ready = d.candidates.filter((c) => c.stage === "Ready to Roster").length;
  const reasons = new Map<string, number>();
  unavailable.forEach((c) => reasons.set(c.unavailableReason || "Unavailable", (reasons.get(c.unavailableReason || "Unavailable") || 0) + 1));
  const reasonRows = [...reasons.entries()].sort((a, b) => b[1] - a[1]);
  const waiting = HANDOFFS.filter((h) => inScope(o, h.destination) && h.waitingHours > 0 && !s.handoffAccepted[h.candidate.id]).sort((a, b) => b.waitingHours - a.waitingHours);
  const topGap = byOffice(HSE_GAPS, o).slice().sort((a, b) => b.gap - a.gap)[0];

  const capCols: Col<CapRow>[] = [
    { key: "name", label: "Carer", w: "1.5fr", render: (r) => <RecLink to={{ kind: "carer", id: r.id }}>{r.name}</RecLink>, sort: (r) => r.name },
    { key: "office", label: "Office", w: ".9fr", render: (r) => <span>{r.office}<span style={{ color: "var(--faint)" }}> · {r.area}</span></span>, sort: (r) => r.office },
    { key: "contracted", label: "Contracted", align: "right", mono: true, w: ".8fr", render: (r) => r.contracted + "h", sort: (r) => r.contracted },
    { key: "scheduled", label: "Scheduled", align: "right", mono: true, w: ".8fr", render: (r) => r.scheduled + "h", sort: (r) => r.scheduled },
    { key: "open", label: "Open", align: "right", mono: true, w: ".6fr", render: (r) => <span style={{ color: "var(--ink)", fontWeight: 600 }}>{r.open}h</span>, sort: (r) => r.open },
    { key: "today", label: "Today", w: "1fr", render: (r) => <Chip status={r.today === "Available" ? "Ready" : r.today === "Rostered" ? "Scheduled" : "Pending"}>{r.today}</Chip> },
    { key: "comp", label: "Compliance", w: ".9fr", render: (r) => <Chip status={r.comp === "Restricted" ? "Restricted" : "Valid"}>{r.comp}</Chip> },
  ];

  return (
    <>
      <Band cols={4} eyebrow={"Workforce · " + scopeName(o) + " · " + TODAY_LABEL} title="Who is working, who can work"
        sub="Carer availability today, contracted capacity, and the compliance and recruitment flow that feeds the roster."
        items={[
          { label: "Active carers", value: fmt(d.active), sub: fmt(d.compliant) + " fully compliant", onClick: go("Rostering", "Availability") },
          { label: "Rostered today", value: fmt(rostered.length), sub: pct(rostered.length, d.active, 0) + " of active carers", onClick: go("Rostering", "Scheduler") },
          { label: "Available today", value: fmt(available.length), sub: "Available and not yet rostered", tone: "ok", onClick: go("Rostering", "Availability") },
          { label: "Unavailable", value: fmt(unavailable.length), sub: reasonRows[0] ? reasonRows[0][0] + " is the top reason" : "Nobody off today", onClick: go("Rostering", "Availability") },
          { label: "Compliance blocked", value: d.restricted, sub: d.expired + " expired, " + d.missing + " missing, " + d.awaiting + " awaiting check", tone: d.restricted ? "bad" : "ok", onClick: go("Compliance", "Audit Readiness") },
          { label: "Avg scheduled hours", value: fmtH(avgSched), unit: "h / week", sub: "vs " + fmtH(avgContract) + "h contracted on average" },
          { label: "Open capacity", value: fmt(openCap), unit: "h / week", sub: capRows.length + " carers below contracted hours", tone: "ok", onClick: go("Rostering", "Unfilled Hours") },
          { label: "New starters", value: starters, unit: "this week", sub: all ? "Up from " + NEW_STARTERS_TREND[0] + " seven weeks ago" : "Network figure; " + ready + " ready to roster here", spark: NEW_STARTERS_TREND, onClick: go("Recruitment", "Pipeline") },
        ]} />

      <Grid cols="1.45fr 1fr">
        <Panel title="Carer availability by office" meta="Today. Select an office for its record." action={<GoLink page="Rostering" sub="Availability">Availability</GoLink>}>
          <div style={{ display: "grid", gridTemplateColumns: "92px 1fr 150px", gap: 10, ...label, fontSize: 8.5, paddingBottom: 6 }}>
            <span>Office</span><span>Rostered / available / unavailable</span><span style={{ textAlign: "right" }}>R · A · U</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.offices.map((x) => {
              const list = CARERS.filter((c) => c.office === x.id);
              const r = list.filter((c) => c.availableToday && c.rosteredToday).length, a = list.filter((c) => c.availableToday && !c.rosteredToday).length, u = list.length - r - a;
              return (
                <div key={x.id} className="wc-row" onClick={() => wc.open({ kind: "office", id: x.id })} style={{ display: "grid", gridTemplateColumns: "92px 1fr 150px", gap: 10, alignItems: "center", cursor: "pointer", borderRadius: 6, padding: "5px 0" }}>
                  <span style={{ fontSize: 12.5, color: "var(--body)" }}>{x.id} <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--faint)" }}>{list.length}</span></span>
                  <Stack height={12} parts={[{ value: r, color: "var(--accent)", label: "Rostered" }, { value: a, color: "var(--ok)", label: "Available" }, { value: u, color: "var(--neutral)", label: "Unavailable" }]} />
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--dim)", textAlign: "right" }}>{r} · <span style={{ color: "var(--ok)" }}>{a}</span> · {u}</span>
                </div>
              );
            })}
          </div>
          <PanelFoot>
            <Legend color="var(--accent)">Rostered {rostered.length}</Legend><Legend color="var(--ok)">Available {available.length}</Legend><Legend color="var(--neutral)">Unavailable {unavailable.length}</Legend>
          </PanelFoot>
        </Panel>

        <Panel title="Why carers are off today" meta={unavailable.length + " unavailable, " + scopeName(o)}>
          {reasonRows.length ? <Bars data={reasonRows.map(([r, n]) => ({ label: r, value: n, color: r === "Compliance restriction" ? "var(--bad)" : undefined }))} /> : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Every carer in this office is available today.</div>}
          <div style={{ marginTop: 14 }}>
            {inScope(o, "Mayo") ? (
              <AgentNote agent="Roster Optimiser" action={<GoLink page="Rostering" sub="HSE Requests">Review</GoLink>}>
                <RecLink to={{ kind: "hse", id: HC24817.id }}>{HC24817.id}</RecLink> Castlebar North needs {HC24817.weeklyHours}h a week and has {HC24817.assigned}h allocated. {HC24817_OPTIONS.length} coverage options prepared from open capacity, adding up to {sumBy(HC24817_OPTIONS, (x) => x.hours)}h. {L.approvedOpts} approved.
              </AgentNote>
            ) : topGap ? (
              <AgentNote agent="Roster Optimiser" action={<GoLink page="Rostering" sub="HSE Requests">Review</GoLink>}>
                Largest open package here is <RecLink to={{ kind: "hse", id: topGap.id }}>{topGap.id}</RecLink> in {topGap.region}, {topGap.gap}h short. Open capacity in this office is {fmt(openCap)}h a week across {capRows.length} carers.
              </AgentNote>
            ) : null}
            <div style={{ marginTop: 10 }}><HumanGate>Options use compliance, qualifications, availability, area, existing roster, contracted hours and continuity only. A coordinator approves every change.</HumanGate></div>
          </div>
        </Panel>
      </Grid>

      <Grid cols="1fr 1fr 1fr">
        <Panel title="Scheduled vs contracted hours" meta="Per office, this week" action={<GoLink page="Rostering" sub="Scheduler">Scheduler</GoLink>}>
          <Columns labels={d.offices.map((x) => x.id)} series={[d.offices.map((x) => sumBy(CARERS.filter((c) => c.office === x.id), (c) => c.contracted)), d.offices.map((x) => sumBy(CARERS.filter((c) => c.office === x.id), (c) => c.scheduledWeek))]}
            colors={["var(--neutral)", "var(--accent)"]} fmtValue={(v) => fmt(v) + "h"} height={150} />
          <PanelFoot><Legend color="var(--neutral)">Contracted</Legend><Legend color="var(--accent)">Scheduled</Legend><span style={{ fontSize: 11.5, color: "var(--faint)" }}>{fmt(openCap)}h open</span></PanelFoot>
        </Panel>
        <Panel title="Compliance status by office" meta={d.restricted + " restricted, " + d.critical + " critical within 7 days"} action={<GoLink page="Compliance" sub="Overview">Compliance</GoLink>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {d.offices.map((x) => {
              const c = compOf(x.id, s.aoifeExpired);
              return (
                <div key={x.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                    <span style={{ color: "var(--body)" }}>{x.id}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--dim)" }}>{pct(c.total - c.red, c.total)} compliant</span>
                  </div>
                  <Stack height={8} parts={[{ value: c.green, color: "var(--ok)", label: "Compliant" }, { value: c.amber, color: "var(--warn)", label: "Due in 30 days" }, { value: c.red, color: "var(--bad)", label: "Restricted" }]} />
                </div>
              );
            })}
          </div>
          <PanelFoot><Legend color="var(--ok)">Compliant</Legend><Legend color="var(--warn)">Due in 30 days</Legend><Legend color="var(--bad)">Restricted</Legend></PanelFoot>
        </Panel>
        <Panel title="New starters per week" meta={all ? "Ready to roster, 7 weeks" : NETWORK_NOTE} action={<GoLink page="Recruitment" sub="Pipeline">Pipeline</GoLink>}>
          <Columns labels={WEEKS} series={[NEW_STARTERS_TREND]} height={120} />
          <Figures items={[["This week", starters, "ok"], ["Onboarding", onboarding], ["Ready to roster", ready]]} />
        </Panel>
      </Grid>

      <Grid cols="1.65fr 1fr">
        <Panel pad={false} title="Open capacity by carer" meta={capRows.length + " carers below contracted hours, " + fmt(openCap) + "h a week in total"} action={<GoLink page="Rostering" sub="Availability">Availability</GoLink>}>
          <Table cols={capCols} rows={capRows} dense pageSize={9} rowKey={(r) => r.id} onRow={(r) => wc.open({ kind: "carer", id: r.id })} rowTone={(r) => (r.comp === "Restricted" ? "bad" : undefined)} />
        </Panel>
        <Panel title="Recruitment handoffs waiting" meta={waiting.length + " not yet accepted by the destination office"} action={<GoLink page="Recruitment" sub="Handoffs">Handoffs</GoLink>}>
          {waiting.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Every handoff for this office has been accepted.</div>}
          {waiting.map((h) => (
            <ListRow key={h.candidate.id} onClick={() => wc.open({ kind: "candidate", id: h.candidate.id })}
              title={<RecLink to={{ kind: "candidate", id: h.candidate.id }}>{h.candidate.name}</RecLink>}
              meta={h.destination + " · sent by " + h.recruiter + " · Garda: " + (h.candidate.garda || "Not started")}
              right={<Chip status={h.waitingHours > 12 ? "Handoff Delayed" : "Awaiting acceptance"}>{h.waitingHours}h waiting</Chip>} />
          ))}
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* SERVICE DELIVERY                                                    */
/* ------------------------------------------------------------------ */

type CancelRow = (typeof CANCEL_TODAY)[number];

function ServiceDelivery({ d }: { d: ScopeData }) {
  const { s, o, all } = d;
  const [cf, setCf] = useState<"all" | "recovered" | "uncovered">("all");
  const today = byOffice(VISITS, o);
  const count = (st: Visit["status"]) => today.filter((v) => v.status === st).length;
  const completed = count("Completed"), inProgress = count("In progress");
  const cancels = byOffice(CANCEL_TODAY, o);
  const reassigned = cancels.filter((c) => c.recovered).length;
  const verified = d.done.length - d.openEx;
  const delivered = sumBy(d.done, (v) => v.actualMins ?? 0) / 60;
  const cancelShown = cf === "all" ? cancels : cancels.filter((c) => (cf === "recovered" ? c.recovered : !c.recovered));
  const days = CANCEL_DAILY.map((_, i) => String(addDays(i - 29).getDate()));
  const typeCount = (t: string) => d.exOpen.filter((v) => v.exception === t).length;

  const cancelCols: Col<CancelRow>[] = [
    { key: "time", label: "Time", w: ".6fr", mono: true, sort: (r) => r.time },
    { key: "office", label: "Office", w: ".8fr", sort: (r) => r.office },
    { key: "client", label: "Client", w: ".8fr", render: (r) => <RecLink to={{ kind: "client", id: r.client }}>{r.client}</RecLink> },
    { key: "reason", label: "Reason", w: "1.3fr", sort: (r) => r.reason },
    { key: "carer", label: "Original carer", w: "1.3fr", render: (r) => <CarerLink name={r.carer} /> },
    { key: "replacement", label: "Replacement", w: "1.3fr", render: (r) => (r.replacement ? <CarerLink name={r.replacement} /> : <span style={{ color: "var(--bad)" }}>Not covered</span>) },
    { key: "hours", label: "Hours", w: ".6fr", align: "right", mono: true, render: (r) => fmtH(r.hours) + "h", sort: (r) => r.hours },
    { key: "status", label: "Status", w: ".9fr", render: (r) => <Chip status={r.recovered ? "Recovered" : "Unfilled"}>{r.recovered ? "Recovered" : "Uncovered"}</Chip> },
  ];
  const unfilledCols: Col<Visit>[] = [
    { key: "id", label: "Visit", w: "1fr", render: (v) => <RecLink to={{ kind: "visit", id: v.id }}>{v.id}</RecLink> },
    { key: "office", label: "Office", w: ".8fr" },
    { key: "start", label: "Start", w: ".6fr", mono: true, render: (v) => hhmm(v.start), sort: (v) => v.start },
    { key: "mins", label: "Length", w: ".6fr", mono: true, render: (v) => minsLabel(v.mins) },
    { key: "status", label: "Status", w: "1fr", render: (v) => <Chip status={v.status === "Unfilled" ? "Unfilled" : "Reassigned"}>{v.status === "Unfilled" ? "Unfilled" : "Needs cover"}</Chip> },
  ];

  const statusParts = (id: OfficeId) => {
    const vs = VISITS.filter((v) => v.office === id);
    const c = (st: Visit["status"]) => vs.filter((v) => v.status === st).length;
    const shift = s.aoifeExpired && id === "Galway" ? 4 : 0;
    return [
      { value: c("Completed"), color: "var(--ok)", label: "Completed" },
      { value: c("In progress"), color: "var(--info)", label: "In progress" },
      { value: c("Late"), color: "var(--warn)", label: "Late" },
      { value: c("Upcoming") - shift, color: "var(--neutral)", label: "Upcoming" },
      { value: c("Unfilled") + shift, color: "var(--bad)", label: "Unfilled" },
    ];
  };

  return (
    <>
      <Band cols={4} eyebrow={"Service delivery · " + scopeName(o) + " · " + TODAY_LABEL + ", 11:40"} title="Visits, today and the last 24 hours"
        sub={"Today's roster from the " + BRAND.careSystem + ", verification of the last 24 hours, and 30 days of cancellations."}
        items={[
          { label: "Visits scheduled", value: fmt(d.visits), unit: "today", sub: count("Upcoming") + " still to start, " + count("Late") + " late", onClick: go("Care Delivery", "Today") },
          { label: "Visits delivered", value: fmt(completed + inProgress), unit: "today", sub: completed + " completed + " + inProgress + " in progress", tone: "ok", onClick: go("Care Delivery", "Visits") },
          { label: "Verified, last 24h", value: fmt(verified), sub: "of " + fmt(d.done.length) + " completed visits", tone: "ok", onClick: go("Care Delivery", "Time Verification") },
          { label: "Cancelled today", value: cancels.length, sub: reassigned + " covered, " + (cancels.length - reassigned) + " not covered", tone: "warn", onClick: go("Care Delivery", "Cancellations") },
          { label: "Reassigned", value: reassigned, sub: "Cancelled visits recovered with another carer", tone: "ok", onClick: go("Care Delivery", "Cancellations") },
          { label: "Unfilled", value: d.unfilled, unit: "visits", sub: d.aoifeIn ? "incl. 4 of Aoife Byrne's visits" : "No carer assigned yet today", tone: d.unfilled ? "bad" : "ok", onClick: go("Rostering", "Unfilled Hours") },
          { label: "Visit exceptions", value: d.openEx, sub: pct(d.openEx, d.done.length) + " of completed visits, last 24h", tone: d.openEx ? "bad" : "ok", onClick: go("Care Delivery", "Exceptions") },
          { label: "Care hours delivered", value: fmt(Math.round(delivered)), unit: "h", sub: "Recorded time, last 24h", onClick: go("Billing & Payroll", "Verified Hours") },
        ]} />

      <Grid cols="1.7fr 1fr">
        <Panel title={"Cancellations, last 30 days: " + fmt(all ? K.cancellations30 : d.cancel30)} meta={all ? "Daily cancelled visits, 29 Aug to 28 Sep. " + fmt(CANCEL_RECOVERED) + " recovered with another carer." : NETWORK_NOTE + ". " + o + " had " + fmt(d.cancel30) + " in 30 days."}
          action={<GoLink page="Care Delivery" sub="Cancellations">Cancellations</GoLink>}>
          <Columns labels={days} series={[CANCEL_DAILY]} height={168} colors={["var(--neutral)"]} fmtValue={(v) => v + " cancelled"} />
          <Figures items={[
            ["30 days", fmt(K.cancellations30)],
            ["Recovered", fmt(CANCEL_RECOVERED), "ok"],
            ["Not recovered", fmt(K.cancellations30 - CANCEL_RECOVERED), "bad"],
            ["Daily average", fmt(Math.round(K.cancellations30 / 30))],
            ["Rate vs scheduled", pct(d.cancel30, d.visits * 30), "warn"],
          ]} />
        </Panel>
        <Panel title="Why visits were cancelled" meta="Last 30 days, network">
          <Bars data={CANCEL_REASONS.map(([r, n], i) => ({ label: r, value: n, color: i === 0 ? "var(--accent)" : undefined }))} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <Ring value={K.recoveryRate} size={104} stroke={10} tone="ok" label="Recovery" />
            <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--body)" }}>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>Cancellation Recovery Rate</div>
              {fmt(CANCEL_RECOVERED)} of {fmt(K.cancellations30)} cancelled visits were covered by another carer. Carer unavailability drives {pct(CANCEL_REASONS[0][1], K.cancellations30, 0)} of cancellations.
            </div>
          </div>
        </Panel>
      </Grid>

      <Grid cols="1.15fr 1fr 1.15fr">
        <Panel title="Today's visits by office" meta={fmt(d.visits) + " scheduled across " + d.offices.length + (d.offices.length === 1 ? " office" : " offices")} action={<GoLink page="Care Delivery" sub="Today">Today</GoLink>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {d.offices.map((x) => (
              <div key={x.id} className="wc-row" onClick={() => wc.open({ kind: "office", id: x.id })} style={{ cursor: "pointer", borderRadius: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: "var(--body)" }}>{x.id}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--dim)" }}>{x.visits24}</span>
                </div>
                <Stack height={9} parts={statusParts(x.id)} />
              </div>
            ))}
          </div>
          <PanelFoot>
            <Legend color="var(--ok)">Completed</Legend><Legend color="var(--info)">In progress</Legend><Legend color="var(--warn)">Late</Legend><Legend color="var(--neutral)">Upcoming</Legend><Legend color="var(--bad)">Unfilled</Legend>
          </PanelFoot>
        </Panel>

        <Panel title="Time verification, last 24h" meta={fmt(d.done.length) + " completed visits checked against schedule"} action={<GoLink page="Care Delivery" sub="Time Verification">Verification</GoLink>}>
          <Stack height={14} parts={[
            { value: verified, color: "var(--ok)", label: "Verified" },
            { value: typeCount("Short visit") + typeCount("Long visit") + typeCount("Manual correction requested"), color: "var(--warn)", label: "Duration exception" },
            { value: typeCount("Missing check-out"), color: "var(--bad)", label: "Missing check-out" },
          ]} showLabels />
          <div style={{ marginTop: 14 }}>
            <Bars data={[
              { label: "Short visit", value: typeCount("Short visit"), color: "var(--warn)" },
              { label: "Missing check-out", value: typeCount("Missing check-out"), color: "var(--bad)" },
              { label: "Long visit", value: typeCount("Long visit"), color: "var(--warn)" },
              { label: "Manual correction", value: typeCount("Manual correction requested"), color: "var(--warn)" },
            ]} />
          </div>
          <PanelFoot>
            <span style={{ fontSize: 12, color: "var(--dim)" }}>Example: <RecLink to={{ kind: "visit", id: "VIS-10482" }}>VIS-10482</RecLink>, 29 of 45 min</span>
            <GoLink page="Care Delivery" sub="Exceptions">{d.openEx} exceptions</GoLink>
          </PanelFoot>
        </Panel>

        <Panel pad={false} title="Unfilled visits today" meta={d.unfilledRows.length + " visits with no carer" + (d.aoifeIn ? ", incl. 4 needing cover after Aoife Byrne's restriction" : "")} action={<GoLink page="Rostering" sub="Unfilled Hours">Rostering</GoLink>}>
          {inScope(o, "Roscommon") && (
            <div style={{ padding: "2px 18px 10px" }}>
              <AgentNote agent="Ops Watchdog" state="attention">
                Roscommon: {ROSCOMMON_CLUSTER.cancellations} cancellations between {ROSCOMMON_CLUSTER.period}. {ROSCOMMON_CLUSTER.recovered} recovered, {ROSCOMMON_CLUSTER.uncovered} uncovered, {ROSCOMMON_CLUSTER.hoursAtRisk} care hours at risk. Flagged to Ciarán Moran.
              </AgentNote>
            </div>
          )}
          <Table cols={unfilledCols} rows={d.unfilledRows.slice().sort((a, b) => a.start - b.start)} dense pageSize={inScope(o, "Roscommon") ? 5 : 8} rowKey={(v) => v.id}
            onRow={(v) => wc.open({ kind: "visit", id: v.id })} rowTone={(v) => (v.cancelledFrom ? "warn" : undefined)} empty="Every visit today has a carer." />
        </Panel>
      </Grid>

      <Grid cols="1fr">
        <Panel pad={false} title={"Cancellations today: " + cancels.length} meta={reassigned + " recovered with another carer, " + (cancels.length - reassigned) + " not covered. Roscommon rows come from the 07:00-09:00 cluster."}
          action={<Filters value={cf} onChange={setCf} options={[{ id: "all", label: "All", count: cancels.length }, { id: "recovered", label: "Recovered", count: reassigned }, { id: "uncovered", label: "Not covered", count: cancels.length - reassigned }]} />}>
          <Table cols={cancelCols} rows={cancelShown} dense pageSize={10} rowKey={(r, i) => r.time + r.client + i} rowTone={(r) => (r.recovered ? undefined : "bad")} empty="No cancellations today for this office." />
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* FINANCE (operational reconciliation, not a P&L)                     */
/* ------------------------------------------------------------------ */

function Finance({ d }: { d: ScopeData }) {
  const { s, o } = d;
  const clean = d.done.filter((v) => v.status === "Verified");
  const scheduledH = sumBy(d.done, (v) => v.mins) / 60;
  const deliveredH = sumBy(d.done, (v) => v.actualMins ?? 0) / 60;
  const verifiedH = sumBy(clean, (v) => (v.verifiedMins ?? 0) / 60) + sumBy(d.exReleased, (v) => releasedHours(s.recon, v));
  const reconciled = d.done.length - d.openEx;
  const clarifying = d.exOpen.filter((v) => s.recon[v.id]).length;
  const issues = new Map<string, { n: number; h: number }>();
  d.exOpen.forEach((v) => { const k = v.billingIssue || "Duration mismatch"; const e = issues.get(k) || { n: 0, h: 0 }; issues.set(k, { n: e.n + 1, h: e.h + v.mins / 60 }); });
  const issueRows = [...issues.entries()].sort((a, b) => b[1].h - a[1].h);
  const payroll = SYSTEMS.find((x) => x.name === "Payroll System");
  const finance = SYSTEMS.find((x) => x.name === "Finance System");

  const flow: { k: string; v: number; note: string; page: string; sub: string }[] = [
    { k: "Scheduled", v: scheduledH, note: fmt(d.done.length) + " completed visits, last 24h", page: "Care Delivery", sub: "Visits" },
    { k: "Delivered", v: deliveredH, note: "Recorded check-in to check-out", page: "Care Delivery", sub: "Time Verification" },
    { k: "Verified", v: verifiedH, note: fmt(clean.length) + " clean visits + " + d.exReleased.length + " released by a person", page: "Billing & Payroll", sub: "Verified Hours" },
    { k: "Billable", v: verifiedH, note: "Verified hours only, to Finance System", page: "Billing & Payroll", sub: "Billing Exceptions" },
    { k: "Payable", v: verifiedH, note: "Verified hours only, to Payroll System", page: "Billing & Payroll", sub: "Payroll Exceptions" },
  ];

  const exCols: Col<DoneVisit>[] = [
    { key: "id", label: "Visit", w: "1fr", render: (v) => <RecLink to={{ kind: "visit", id: v.id }}>{v.id}</RecLink>, sort: (v) => v.id },
    { key: "office", label: "Office", w: ".8fr", sort: (v) => v.office },
    { key: "client", label: "Client", w: ".8fr", render: (v) => <RecLink to={{ kind: "client", id: v.client }}>{v.client}</RecLink> },
    { key: "carer", label: "Carer", w: "1.3fr", render: (v) => <CarerLink name={v.carer} /> },
    { key: "sched", label: "Scheduled", w: "1fr", mono: true, render: (v) => hhmm(v.start) + " · " + minsLabel(v.mins), sort: (v) => v.start },
    { key: "actual", label: "Recorded", w: ".8fr", mono: true, render: (v) => (v.actualMins === null ? <span style={{ color: "var(--bad)" }}>No check-out</span> : minsLabel(v.actualMins)) },
    { key: "issue", label: "Billing issue", w: "1.3fr", render: (v) => v.billingIssue || "Duration mismatch", sort: (v) => v.billingIssue || "" },
    { key: "held", label: "Held", w: ".6fr", align: "right", mono: true, render: (v) => fmtH(v.mins / 60) + "h", sort: (v) => v.mins },
    { key: "status", label: "Status", w: "1.1fr", render: (v) => <Chip status={s.recon[v.id] ? "Clarification requested" : "Held"}>{s.recon[v.id] ? "Clarification requested" : "Billing + Payroll Held"}</Chip> },
  ];

  return (
    <>
      <Band cols={3} eyebrow={"Finance · operational reconciliation · " + scopeName(o)} title="Hours that can be billed and paid"
        sub="Care hours from visit to export. This is an operational reconciliation of hours, not a profit and loss view. Only verified hours reach the Finance System and Payroll System."
        items={[
          { label: "Verified care hours", value: fmtH(verifiedH), unit: "h", sub: "Last 24h, ready for billing and payroll", tone: "ok", onClick: go("Billing & Payroll", "Verified Hours") },
          { label: "Hours awaiting review", value: fmtH(d.heldHours), unit: "h", sub: "Scheduled hours on " + d.openEx + " held visits", tone: d.heldHours ? "warn" : "ok", onClick: go("Billing & Payroll", "Reconciliation") },
          { label: "Reconciliation complete", value: pct(reconciled, d.done.length), sub: fmt(reconciled) + " of " + fmt(d.done.length) + " visits reconciled", tone: d.openEx ? "warn" : "ok", onClick: go("Billing & Payroll", "Reconciliation") },
          { label: "Billing exceptions", value: d.openEx, unit: "live", sub: "Held from the Finance System export", tone: d.openEx ? "bad" : "ok", onClick: go("Billing & Payroll", "Billing Exceptions") },
          { label: "Payroll exceptions", value: d.openEx, unit: "live", sub: "Same " + d.openEx + " visits, held from Payroll System", tone: d.openEx ? "bad" : "ok", onClick: go("Billing & Payroll", "Payroll Exceptions") },
          { label: "Released this session", value: d.exReleased.length, unit: "visits", sub: clarifying ? clarifying + " awaiting clarification" : "Decisions made by Martin Murphy", onClick: go("Billing & Payroll", "Reconciliation") },
        ]} />

      <Grid cols="1fr">
        <Panel title="Hours flow, last 24h" meta="Scheduled → Delivered → Verified → Billable → Payable. Select a step to open it." action={<GoLink page="Billing & Payroll" sub="Overview">Billing & Payroll</GoLink>}>
          <div className="wc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 10 }}>
            {flow.map((f, i) => (
              <button key={f.k} className="wc-kpi" onClick={() => wc.go(f.page, f.sub)}
                style={{ position: "relative", textAlign: "left", font: "inherit", color: "inherit", padding: "14px 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", cursor: "pointer", minWidth: 0, transition: "border-color .2s var(--ease),transform .2s var(--ease)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--faint)" }}>{i + 1}</span>
                  <span style={label}>{f.k}</span>
                  {i < flow.length - 1 && <span style={{ marginLeft: "auto", color: "var(--faint)", fontSize: 13 }}>→</span>}
                </div>
                <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.7px", marginTop: 8, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>{fmtH(f.v)}<span style={{ fontSize: 12, color: "var(--dim)", marginLeft: 4, fontWeight: 400 }}>h</span></div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--track)", marginTop: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (scheduledH ? Math.min(100, (100 * f.v) / scheduledH) : 0) + "%", background: i < 2 ? "var(--neutral)" : "var(--ok)", borderRadius: 3, transformOrigin: "left", animation: "sweep .8s var(--ease) " + i * 60 + "ms both" }} />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.note}</div>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, padding: "10px 14px", borderRadius: "var(--r-sm,10px)", background: d.openEx ? "var(--warn-soft)" : "var(--ok-soft)", flexWrap: "wrap" }}>
            <Chip status={d.openEx ? "Held" : "Ready"}>{d.openEx ? "Held" : "Clear"}</Chip>
            <span style={{ flex: 1, minWidth: 220, fontSize: 12.5, color: "var(--body)" }}>
              {d.openEx ? fmtH(d.heldHours) + " scheduled hours on " + d.openEx + " visits sit outside the flow. They never export until a person approves recorded time, approves scheduled time or marks the visit cancelled." : "No visits are held for this scope. Every completed visit has reconciled."}
            </span>
            <GoLink page="Billing & Payroll" sub="Reconciliation">Open reconciliation</GoLink>
          </div>
        </Panel>
      </Grid>

      <Grid cols="1fr 1fr 1fr">
        <Panel title="Held hours by office" meta={fmtH(d.heldHours) + "h across " + d.openEx + " open exceptions"} action={<GoLink page="Billing & Payroll" sub="Billing Exceptions">Billing</GoLink>}>
          <Bars data={d.offices.map((x) => {
            const rows = d.exOpen.filter((v) => v.office === x.id);
            return { label: x.id, value: sumBy(rows, (v) => v.mins) / 60, note: rows.length + " visits", color: "var(--warn)", onClick: () => wc.open({ kind: "office", id: x.id }) };
          })} fmtValue={(n) => fmtH(n) + "h"} />
          <PanelFoot><span style={{ fontSize: 11.5, color: "var(--faint)" }}>Night support visits (10h each) carry most of the held hours.</span></PanelFoot>
        </Panel>
        <Panel title="Why hours are held" meta="Open exceptions by billing issue" action={<GoLink page="Billing & Payroll" sub="Payroll Exceptions">Payroll</GoLink>}>
          {issueRows.length ? <Bars data={issueRows.map(([k, e]) => ({ label: k, value: e.n, note: fmtH(e.h) + "h", color: k === "Missing check-out" || k === "Cancelled but marked complete" ? "var(--bad)" : "var(--warn)" }))} /> : <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No held hours for this scope.</div>}
          <div style={{ marginTop: 14 }}>
            <AgentNote agent="Care Hours Agent">
              {d.openEx} visits do not match their schedule. Each is held from billing and payroll with the recorded and scheduled times side by side for review. <RecLink to={{ kind: "visit", id: "VIS-10482" }}>VIS-10482</RecLink> recorded 29 of 45 minutes.
            </AgentNote>
          </div>
        </Panel>
        <Panel title="Export readiness" meta="Weekly exports, verified hours only" action={<GoLink page="Billing & Payroll" sub="Verified Hours">Verified hours</GoLink>}>
          <ListRow tone="ok" title="Finance System" meta={(finance ? finance.status + ", next " + finance.sync : "Export") + ". " + fmtH(verifiedH) + "h verified and billable."} right={<Chip status="Ready">Ready</Chip>} />
          <ListRow tone="ok" title="Payroll System" meta={(payroll ? payroll.status + ", next " + payroll.sync : "Export") + ". " + fmtH(verifiedH) + "h verified and payable."} right={<Chip status="Ready">Ready</Chip>} />
          <ListRow tone={d.openEx ? "warn" : "ok"} title="Held from both exports" meta={d.openEx + " visits, " + fmtH(d.heldHours) + " scheduled hours."} right={<Chip status={d.openEx ? "Held" : "Ready"}>{d.openEx ? "Held" : "None"}</Chip>} />
          <div style={{ marginTop: 12 }}>
            <AgentNote agent="Reconciliation Agent">
              Reconciliation is {pct(reconciled, d.done.length)} complete. I match visit records to billing and payroll lines and prepare each decision; a person approves every release.
            </AgentNote>
          </div>
        </Panel>
      </Grid>

      <Grid cols="1fr">
        <Panel pad={false} title={"Open exceptions: " + d.openEx} meta="The same records appear as billing exceptions and payroll exceptions. Select a visit to review it."
          action={<span style={{ display: "inline-flex", gap: 14 }}><GoLink page="Billing & Payroll" sub="Billing Exceptions">Billing exceptions</GoLink><GoLink page="Billing & Payroll" sub="Payroll Exceptions">Payroll exceptions</GoLink></span>}>
          <Table cols={exCols} rows={d.exOpen} dense pageSize={10} rowKey={(v) => v.id} onRow={(v) => wc.open({ kind: "visit", id: v.id })}
            rowTone={(v) => (v.story ? "accent" : v.status === "Missing Check-out" ? "bad" : "warn")} empty="Every exception for this office has been reconciled." />
        </Panel>
      </Grid>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <Btn kind="ghost" onClick={go("Billing & Payroll", "Reconciliation")}>Review held visits in Billing & Payroll</Btn>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function WcDashboard() {
  const d = useScope();
  const sub = d.s.sub["Dashboard"];
  return (
    <Page>
      <div key={sub + d.o}>
        {sub === "Workforce" ? <Workforce d={d} />
          : sub === "Service Delivery" ? <ServiceDelivery d={d} />
          : sub === "Finance" ? <Finance d={d} />
          : <Executive d={d} />}
      </div>
    </Page>
  );
}
