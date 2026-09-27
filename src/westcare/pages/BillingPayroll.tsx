/* Billing & Payroll: verified care delivery flows into reconciliation.
   Nothing here is an accounting product. Clean visits carry their verified
   time to the Payroll System and Finance System exports; every exception is
   held automatically until a person decides what time to release. */
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  BRAND, CARERS, DONE, EXCEPTIONS, NOW_MINS, OFFICE_IDS, VIS10482, fmt, fmtH, hhmm, minsLabel, pct,
  type BillingIssue, type DoneVisit, type ExceptionType, type OfficeId,
} from "../model";
import { useLive, useWc, wc, type ReconAction } from "../store";
import {
  AgentNote, Btn, Chip, Columns, Filters, GoLink, Grid, HumanGate, KpiStrip, Legend, ListRow, MONO, Page, Panel,
  RecLink, ScopeBar, SearchBox, Stack, Stat, Table, Timeline, TONE, byOffice, label, type Col, type Tone,
} from "../ui";

const MOD = "Billing & Payroll";
type Decision = { action: ReconAction; by: string; at: string };
type ReconMap = Record<string, Decision>;

/* ------------------------------------------------------------------ */
/* Local helpers                                                        */
/* ------------------------------------------------------------------ */

const CARER_BY_NAME = new Map(CARERS.map((c) => [c.name, c]));
function CarerLink({ name }: { name: string }) {
  const c = CARER_BY_NAME.get(name);
  return c ? <RecLink to={{ kind: "carer", id: c.id }}>{name}</RecLink> : <>{name}</>;
}
const VisitLink = ({ id }: { id: string }) => <RecLink to={{ kind: "visit", id }} style={{ fontFamily: MONO, fontSize: 12 }}>{id}</RecLink>;
const ClientLink = ({ id }: { id: string }) => <RecLink to={{ kind: "client", id }}>{id}</RecLink>;

const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const hrs = (mins: number) => fmtH(mins / 60) + " h";

/* Reconciliation state of one visit, read from the shared store. */
type RState = "Verified" | "Held" | "Awaiting carer" | "Released" | "Cancelled";
function rstate(v: DoneVisit, recon: ReconMap): RState {
  if (v.status === "Verified") return "Verified";
  const d = recon[v.id];
  if (!d) return "Held";
  if (d.action === "Request Clarification") return "Awaiting carer";
  if (d.action === "Mark Cancelled") return "Cancelled";
  return "Released";
}
const isOpen = (v: DoneVisit, recon: ReconMap) => { const st = rstate(v, recon); return st === "Held" || st === "Awaiting carer"; };
const isResolved = (v: DoneVisit, recon: ReconMap) => v.status !== "Verified" && !isOpen(v, recon);
/** Minutes released to billing and payroll, or null while held. */
function releasedMins(v: DoneVisit, recon: ReconMap): number | null {
  if (v.status === "Verified") return v.verifiedMins ?? v.mins;
  const d = recon[v.id];
  if (!d || d.action === "Request Clarification") return null;
  if (d.action === "Mark Cancelled") return 0;
  if (d.action === "Approve Scheduled Time") return v.mins;
  return v.actualMins ?? 0;
}
const STATE_TONE: Record<RState, Tone> = { Verified: "ok", Held: "bad", "Awaiting carer": "warn", Released: "ok", Cancelled: "neutral" };
function stateText(v: DoneVisit, recon: ReconMap): string {
  const st = rstate(v, recon);
  if (st === "Released") return recon[v.id].action === "Approve Recorded Time" ? "Released, recorded time" : "Released, scheduled time";
  return st;
}
function StateChip({ v, recon }: { v: DoneVisit; recon: ReconMap }) {
  return <Chip tone={STATE_TONE[rstate(v, recon)]}>{stateText(v, recon)}</Chip>;
}
function billingStatus(v: DoneVisit, recon: ReconMap): string {
  const st = rstate(v, recon);
  return st === "Verified" ? "Billable" : st === "Released" ? "Released to Finance System" : st === "Cancelled" ? "Not billable" : "Billing Held";
}
function payrollStatus(v: DoneVisit, recon: ReconMap): string {
  const st = rstate(v, recon);
  return st === "Verified" ? "Payable" : st === "Released" ? "Released to Payroll System" : st === "Cancelled" ? "Not payable" : "Payroll Held";
}
const statusTone = (t: string): Tone => (/held/i.test(t) ? "bad" : /^not/i.test(t) ? "neutral" : "ok");

/* Difference between scheduled and recorded time that a wrong decision would bill or pay. */
const riskMins = (v: DoneVisit) => (v.actualMins === null ? v.mins : Math.abs(v.mins - v.actualMins));
const varianceMins = (v: DoneVisit) => (v.actualMins === null ? null : v.actualMins - v.mins);
type BillDir = "Over-invoice risk" | "Under-invoice risk" | "Duration unknown";
function billDir(v: DoneVisit): BillDir {
  if (v.billingIssue === "Missing check-out") return "Duration unknown";
  if (v.exception === "Long visit" && v.billingIssue !== "Duplicate event") return "Under-invoice risk";
  if (v.exception === "Manual correction requested") return "Under-invoice risk";
  return "Over-invoice risk";
}
type PayDir = "Underpay risk" | "Overpay risk";
function payDir(v: DoneVisit): PayDir {
  if (v.exception === "Long visit" && v.billingIssue !== "Duplicate event") return "Underpay risk";
  if (v.billingIssue === "Missing check-out") return "Underpay risk";
  if (v.exception === "Manual correction requested") return "Underpay risk";
  return "Overpay risk";
}

/* Last 24 hours: visits that started after 11:40 were yesterday (Sun 27 Sep).
   Pay runs one week in arrears; both systems export weekly on Friday at 17:00. */
const yesterday = (v: DoneVisit) => v.start > NOW_MINS;
const visitDay = (v: DoneVisit) => (yesterday(v) ? "27 Sep" : "28 Sep");
const PERIOD_A = "21 to 27 Sep";
const PERIOD_B = "28 Sep to 4 Oct";
const payPeriod = (v: DoneVisit) => (yesterday(v) ? PERIOD_A : PERIOD_B);
const NEXT_EXPORT = "Fri 2 Oct, 17:00";

const ISSUES: BillingIssue[] = ["Duration mismatch", "Missing check-out", "Manual adjustment", "Cancelled but marked complete", "Duplicate event"];
const ISSUE_NOTE: Record<BillingIssue, string> = {
  "Duration mismatch": "Recorded time differs from the scheduled call",
  "Missing check-out": "Check-in received, no check-out",
  "Manual adjustment": "Carer asked for a time correction",
  "Cancelled but marked complete": "Cancellation logged, visit closed as complete",
  "Duplicate event": "Two check-out events on one visit",
};
const TYPES: ExceptionType[] = ["Short visit", "Long visit", "Manual correction requested", "Missing check-out"];
const TYPE_COLOR: Record<ExceptionType, string> = { "Short visit": TONE.bad.ink, "Long visit": TONE.info.ink, "Manual correction requested": TONE.warn.ink, "Missing check-out": TONE.accent.ink };

const coordinatorLabel = (v: DoneVisit) => v.office + " Coordinator";

/* Everything a subpage needs, filtered by the global office pill. */
function useScope() {
  const s = useWc();
  const L = useLive();
  const done = useMemo(() => byOffice(DONE, s.office), [s.office]);
  const ex = useMemo(() => byOffice(EXCEPTIONS, s.office), [s.office]);
  const open = ex.filter((v) => isOpen(v, s.recon));
  const resolved = ex.filter((v) => isResolved(v, s.recon));
  const awaiting = ex.filter((v) => rstate(v, s.recon) === "Awaiting carer");
  const all = s.office === "All";
  const openCount = all ? L.openExceptions : open.length;
  const heldHours = all ? L.heldHours : total(open.map((v) => v.mins)) / 60;
  const clean = done.filter((v) => v.status === "Verified");
  const scheduledM = total(done.map((v) => v.mins));
  const deliveredM = total(done.map((v) => v.actualMins ?? 0));
  const verifiedM = total(clean.map((v) => v.verifiedMins ?? v.mins));
  const releasedM = total(resolved.map((v) => releasedMins(v, s.recon) ?? 0));
  return { s, L, done, ex, open, resolved, awaiting, clean, openCount, heldHours, scheduledM, deliveredM, verifiedM, releasedM };
}

const officeScopeLabel = (o: string) => (o === "All" ? "all six offices" : o);

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function BillingPayroll() {
  const s = useWc();
  const sub = s.sub[MOD];
  return (
    <Page>
      {sub === "Verified Hours" ? <VerifiedHours />
        : sub === "Billing Exceptions" ? <BillingExceptions />
        : sub === "Payroll Exceptions" ? <PayrollExceptions />
        : sub === "Reconciliation" ? <Reconciliation />
        : <Overview />}
    </Page>
  );
}

const openRecon = (id: string) => { wc.selectVisit(id); wc.setSub(MOD, "Reconciliation"); };

/* ------------------------------------------------------------------ */
/* Overview                                                             */
/* ------------------------------------------------------------------ */

function Overview() {
  const { s, done, ex, open, resolved, clean, openCount, heldHours, scheduledM, deliveredM, verifiedM, releasedM } = useScope();
  const dur = ex.filter((v) => v.status === "Duration Exception");
  const miss = ex.filter((v) => v.status === "Missing Check-out");
  const durOpen = dur.filter((v) => isOpen(v, s.recon)).length;
  const missOpen = miss.filter((v) => isOpen(v, s.recon)).length;
  const billableM = verifiedM + releasedM;
  const cancelledM = total(resolved.filter((v) => rstate(v, s.recon) === "Cancelled").map((v) => v.mins));
  const releasedSchedM = total(resolved.filter((v) => rstate(v, s.recon) === "Released").map((v) => v.mins));
  const story = s.office === "All" || s.office === "Galway" ? VIS10482 : ex.slice().sort((a, b) => b.mins - a.mins || a.id.localeCompare(b.id))[0];

  const stages: { name: string; m: number; note: ReactNode; tone?: Tone }[] = [
    { name: "Scheduled", m: scheduledM, note: fmt(done.length) + " completed visits" },
    { name: "Delivered", m: deliveredM, note: <>{fmt(done.length - miss.length)} with check-out, {miss.length} without</>, tone: miss.length ? "warn" : undefined },
    { name: "Verified", m: verifiedM, note: <>{fmt(clean.length)} clean, {ex.length} held for review</>, tone: "ok" },
    { name: "Billable", m: billableM, note: <>Finance System{releasedM ? ", +" + hrs(releasedM) + " released" : ""}</> },
    { name: "Payable", m: billableM, note: <>Payroll System{releasedM ? ", +" + hrs(releasedM) + " released" : ""}</> },
  ];

  const byOfficeRows = (s.office === "All" ? OFFICE_IDS : [s.office as OfficeId]);
  const heldByOffice = byOfficeRows.map((o) => {
    const rows = open.filter((v) => v.office === o);
    return { label: o, value: total(rows.map((v) => v.mins)) / 60, note: rows.length + " visits" };
  }).sort((a, b) => b.value - a.value);
  const services = ["Night Support", "Respite", "Personal Care", "Home Support"];
  const heldByService = services.map((sv) => {
    const rows = open.filter((v) => v.service === sv);
    return { label: sv, value: total(rows.map((v) => v.mins)) / 60, note: rows.length + " visits" };
  }).filter((r) => r.note !== "0 visits");

  return (
    <>
      <ScopeBar title="Billing & Payroll" sub="Verified care delivery flows into reconciliation. A visit whose time does not verify is held from invoicing and pay until a person decides what time to release." />
      <KpiStrip items={[
        { label: "Completed, last 24h", value: fmt(done.length), sub: "Visits with a check-in" },
        { label: "Cleanly verified", value: fmt(clean.length), sub: pct(clean.length, done.length) + " of completed", tone: "ok" },
        { label: "Duration exceptions", value: dur.length, sub: durOpen + " still open", tone: "bad", onClick: () => wc.setSub(MOD, "Billing Exceptions") },
        { label: "Missing check-out", value: miss.length, sub: missOpen + " still open", tone: "warn", onClick: () => wc.setSub(MOD, "Billing Exceptions") },
        { label: "Exception visits open", value: openCount, sub: "of " + ex.length + " held at sync", tone: openCount ? "bad" : "ok", onClick: () => wc.setSub(MOD, "Reconciliation") },
        { label: "Awaiting reconciliation", value: fmtH(heldHours), sub: "Care hours on held visits", tone: heldHours ? "warn" : "ok", onClick: () => wc.setSub(MOD, "Reconciliation") },
      ]} />

      <Grid cols="minmax(0,1.75fr) minmax(0,1fr)">
        <Panel title="Care hours, scheduled to payable" meta={"Last 24 hours, " + officeScopeLabel(s.office) + ". Hours only move right once they verify or a person releases them."}
          action={<GoLink page="Care Delivery" sub="Time Verification">Time Verification</GoLink>}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr)", alignItems: "stretch", gap: 6, marginTop: 4 }}>
            {stages.map((st, i) => (
              <FlowCell key={st.name} st={st} i={i} max={scheduledM} last={i === stages.length - 1} />
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
              <span style={{ ...label, flex: 1 }}>Where the scheduled hours sit now</span>
              <span style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--dim)" }}>{hrs(scheduledM)} scheduled</span>
            </div>
            <Stack height={14} parts={[
              { value: Math.round(verifiedM / 6) / 10, color: TONE.ok.ink, label: "Verified clean, hours" },
              { value: Math.round(releasedSchedM / 6) / 10, color: TONE.accent.ink, label: "Released by a person" },
              { value: Math.round(cancelledM / 6) / 10, color: "var(--neutral)", label: "Marked cancelled" },
              { value: Math.round(heldHours * 10) / 10, color: TONE.bad.ink, label: "Held for review" },
            ]} showLabels />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: "auto", paddingTop: 16 }}>
            <Stat k="Recorded short of schedule" v={hrs(total(ex.map((v) => { const d = varianceMins(v); return d !== null && d < 0 ? -d : 0; })))} tone="bad" />
            <Stat k="Recorded over schedule" v={hrs(total(ex.map((v) => { const d = varianceMins(v); return d !== null && d > 0 ? d : 0; })))} tone="warn" />
            <Stat k="Scheduled, no check-out" v={hrs(total(miss.map((v) => v.mins)))} tone="warn" />
            <Stat k="Released this session" v={hrs(releasedM)} tone={releasedM ? "ok" : undefined} />
          </div>
        </Panel>
        {story ? <StoryCard v={story} isStory={story.id === VIS10482.id} /> : <Panel title="Held visit"><div style={{ color: "var(--dim)", fontSize: 12.5 }}>No exceptions for this office.</div></Panel>}
      </Grid>

      <Grid cols="minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr)">
        <Panel title={s.office === "All" ? "Held hours by office" : "Held hours by service, " + s.office} meta="Scheduled hours on visits still held"
          action={<GoLink page={MOD} sub="Reconciliation">Review queue</GoLink>}>
          <BarsLite rows={s.office === "All" ? heldByOffice : heldByService} tone="bad" empty="Nothing held. Every exception has a decision." />
          <div style={{ marginTop: "auto", paddingTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Stat k="Held visits" v={openCount} tone={openCount ? "bad" : "ok"} />
            <Stat k="Decided this session" v={resolved.length} tone={resolved.length ? "ok" : undefined} />
          </div>
        </Panel>

        <Panel title="Exception mix" meta={ex.length + " exception visits in the last 24h"} action={<GoLink page={MOD} sub="Billing Exceptions">By billing issue</GoLink>}>
          <Stack height={12} parts={TYPES.map((t) => ({ value: ex.filter((v) => v.exception === t).length, color: TYPE_COLOR[t], label: t }))} />
          <div style={{ marginTop: 12 }}>
            {TYPES.map((t) => {
              const rows = ex.filter((v) => v.exception === t);
              const o = rows.filter((v) => isOpen(v, s.recon)).length;
              return (
                <ListRow key={t} left={<span style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLOR[t], flex: "none" }} />}
                  title={t} meta={hrs(total(rows.map((v) => v.mins))) + " scheduled" + (t === "Missing check-out" ? ", mostly night support" : "")}
                  right={<span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink)" }}>{o}<span style={{ color: "var(--faint)" }}> / {rows.length} open</span></span>} />
              );
            })}
          </div>
        </Panel>

        <Panel title="Weekly export status" meta={"Next export " + NEXT_EXPORT + ". Only verified or released hours leave Westcare."}>
          <ExportRow system="Payroll System" owner="Laura Martin, Payroll Administrator" ready={billableM} held={heldHours * 60} />
          <ExportRow system="Finance System" owner="Paul Geraghty, Billing Administrator" ready={billableM} held={heldHours * 60} />
          <div style={{ marginTop: 12 }}>
            <AgentNote agent="Reconciliation Agent">
              Prepared {openCount} reviews with the scheduled call, check-in, check-out and GPS events side by side. It never changes pay or billing: held visits stay out of the {NEXT_EXPORT} export until a coordinator decides.
            </AgentNote>
          </div>
          <div style={{ marginTop: 10 }}><HumanGate>Pay and billing change only on a person's decision.</HumanGate></div>
        </Panel>
      </Grid>
    </>
  );
}

function FlowCell({ st, i, max, last }: { st: { name: string; m: number; note: ReactNode; tone?: Tone }; i: number; max: number; last: boolean }) {
  const w = max ? (100 * st.m) / max : 0;
  return (
    <>
      <div style={{ minWidth: 0, padding: "12px 12px 11px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", display: "flex", flexDirection: "column", animation: "springIn .5s var(--ease) " + i * 60 + "ms both" }}>
        <div style={label}>{st.name}</div>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.8px", marginTop: 8, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: st.tone ? TONE[st.tone].ink : "var(--ink)" }}>
          {fmtH(st.m / 60)}<span style={{ fontSize: 13, color: "var(--faint)", marginLeft: 3, fontWeight: 500 }}>h</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6, lineHeight: 1.4, flex: 1 }}>{st.note}</div>
        <div style={{ height: 5, borderRadius: 3, background: "var(--track)", marginTop: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: w + "%", background: st.tone ? TONE[st.tone].ink : "var(--accent)", borderRadius: 3, transformOrigin: "left", animation: "sweep .8s var(--ease) " + i * 60 + "ms both" }} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--faint)", marginTop: 5 }}>{w.toFixed(1)}% of scheduled</div>
      </div>
      {!last && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--faint)" }} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </div>
      )}
    </>
  );
}

function BarsLite({ rows, tone, empty }: { rows: { label: string; value: number; note: string }[]; tone: Tone; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length || rows.every((r) => r.value === 0)) return <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "10px 0" }}>{empty}</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r, i) => (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: "92px 1fr 88px", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
          <div style={{ height: 10, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: Math.max(r.value ? 2 : 0, (100 * r.value) / max) + "%", background: TONE[tone].ink, opacity: 0.85, borderRadius: 4, transformOrigin: "left", animation: "sweep .8s var(--ease) " + i * 50 + "ms both" }} />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--ink)", textAlign: "right", whiteSpace: "nowrap" }}>{fmtH(r.value)} h<span style={{ color: "var(--faint)", marginLeft: 5 }}>{r.note.split(" ")[0]}</span></span>
        </div>
      ))}
    </div>
  );
}

function ExportRow({ system, owner, ready, held }: { system: string; owner: string; ready: number; held: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--ink)" }}>{system}</div>
        <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{owner}. Last export Fri 25 Sep, 17:00, complete.</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--ok)" }}>{hrs(ready)} ready</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: held ? "var(--bad)" : "var(--faint)", marginTop: 3 }}>{hrs(held)} held back</div>
      </div>
    </div>
  );
}

/** The story visit (or the largest held visit for an office without it). */
function StoryCard({ v, isStory }: { v: DoneVisit; isStory: boolean }) {
  const s = useWc();
  const variance = varianceMins(v);
  const bill = billingStatus(v, s.recon), pay = payrollStatus(v, s.recon);
  const box: CSSProperties = { padding: "11px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", minWidth: 0 };
  return (
    <Panel title={<>{isStory ? "Held visit to follow" : "Largest held visit"}: <span style={{ fontFamily: MONO }}>{v.id}</span></>} meta={<>{v.office}, client <ClientLink id={v.client} />, carer <CarerLink name={v.carer} /></>}
      tone={isOpen(v, s.recon) ? "bad" : undefined} action={<StateChip v={v} recon={s.recon} />}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={box}>
          <div style={label}>Scheduled</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6, letterSpacing: "-.5px" }}>{minsLabel(v.mins)}</div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{hhmm(v.start)}-{hhmm(v.start + v.mins)}</div>
        </div>
        <div style={{ ...box, background: "var(--bad-soft)" }}>
          <div style={label}>Recorded</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6, letterSpacing: "-.5px", color: "var(--bad)" }}>{v.actualMins === null ? "No check-out" : minsLabel(v.actualMins)}</div>
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{hhmm(v.actualIn)}-{v.actualOut === null ? "--:--" : hhmm(v.actualOut)}{variance !== null ? ", " + (variance > 0 ? "+" : "") + variance + " min" : ""}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <Stat k="Billing" v={bill} tone={statusTone(bill)} />
        <Stat k="Payroll" v={pay} tone={statusTone(pay)} />
        <Stat k={coordinatorLabel(v)} v={v.owner} />
        <Stat k="Exception" v={v.exception ?? v.status} tone="bad" />
      </div>
      <div style={{ ...label, marginTop: 14, marginBottom: 6 }}>Traced back to the visit</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
        <TracePill k="Care Delivery"><VisitLink id={v.id} /></TracePill>
        <Arrow />
        <TracePill k="Visit Integrity Agent">{v.status}</TracePill>
        <Arrow />
        <TracePill k="Held">Billing and Payroll</TracePill>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto", paddingTop: 14, flexWrap: "wrap" }}>
        <Btn kind="primary" onClick={() => openRecon(v.id)}>Review in Reconciliation</Btn>
        <GoLink page="Care Delivery" sub="Time Verification">Care Delivery Time Verification</GoLink>
      </div>
    </Panel>
  );
}
function TracePill({ k, children }: { k: string; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 28, padding: "0 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,9px)" }}>
      <span style={{ ...label, fontSize: 8.5 }}>{k}</span>{children}
    </span>
  );
}
const Arrow = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13 M13 6.5 18.5 12 13 17.5" /></svg>;

/* ------------------------------------------------------------------ */
/* Verified Hours                                                       */
/* ------------------------------------------------------------------ */

type VFilter = "all" | "verified" | "held" | "released" | "cancelled";

function VerifiedHours() {
  const { s, done, clean, open, resolved, heldHours, scheduledM, deliveredM, verifiedM, releasedM } = useScope();
  const [f, setF] = useState<VFilter>("all");
  const [q, setQ] = useState("");
  const recon = s.recon;
  const released = resolved.filter((v) => rstate(v, recon) === "Released");
  const cancelled = resolved.filter((v) => rstate(v, recon) === "Cancelled");
  const byFilter = f === "verified" ? clean : f === "held" ? open : f === "released" ? released : f === "cancelled" ? cancelled : done;
  const needle = q.trim().toLowerCase();
  const rows = needle ? byFilter.filter((v) => (v.id + " " + v.carer + " " + v.client).toLowerCase().includes(needle)) : byFilter;

  const heldCell = <span style={{ color: "var(--bad)", fontWeight: 500 }}>Held</span>;
  const cols: Col<DoneVisit>[] = [
    { key: "id", label: "Visit", w: "96px", render: (v) => <VisitLink id={v.id} />, sort: (v) => v.id },
    { key: "when", label: "Started", w: "108px", mono: true, render: (v) => visitDay(v).split(" ")[0] + " Sep " + hhmm(v.start), sort: (v) => (yesterday(v) ? 0 : 1440) + v.start },
    { key: "carer", label: "Carer", w: "minmax(130px,1.2fr)", render: (v) => <CarerLink name={v.carer} />, sort: (v) => v.carer },
    { key: "client", label: "Client", w: "84px", render: (v) => <ClientLink id={v.client} /> },
    { key: "sched", label: "Scheduled", w: "84px", align: "right", mono: true, render: (v) => minsLabel(v.mins), sort: (v) => v.mins },
    { key: "actual", label: "Actual", w: "96px", align: "right", mono: true, render: (v) => v.actualMins === null ? <span style={{ color: "var(--bad)" }}>No check-out</span> : <span style={{ color: v.status === "Verified" ? undefined : "var(--bad)" }}>{minsLabel(v.actualMins)}</span>, sort: (v) => v.actualMins ?? -1 },
    { key: "ver", label: "Verified", w: "80px", align: "right", mono: true, render: (v) => { const m = releasedMins(v, recon); return m === null ? heldCell : minsLabel(m); } },
    { key: "bill", label: "Billing h", w: "74px", align: "right", mono: true, render: (v) => { const m = releasedMins(v, recon); return m === null ? heldCell : fmtH(m / 60); } },
    { key: "pay", label: "Payroll h", w: "74px", align: "right", mono: true, render: (v) => { const m = releasedMins(v, recon); return m === null ? heldCell : fmtH(m / 60); } },
    { key: "status", label: "Status", w: "170px", render: (v) => <StateChip v={v} recon={recon} />, sort: (v) => rstate(v, recon) },
    { key: "src", label: "Source", w: "minmax(150px,1.3fr)", render: (v) => <span style={{ color: "var(--dim)", fontSize: 12 }}>{v.source}</span> },
  ];

  /* Recorded minus scheduled, for every visit with a check-out. */
  const buckets: [string, (d: number) => boolean][] = [
    ["-20 or less", (d) => d <= -20], ["-19 to -10", (d) => d > -20 && d <= -10], ["-9 to -4", (d) => d > -10 && d <= -4], ["-3 to -1", (d) => d >= -3 && d <= -1],
    ["On time", (d) => d === 0], ["+1 to +3", (d) => d >= 1 && d <= 3], ["+4 to +19", (d) => d >= 4 && d < 20], ["+20 or more", (d) => d >= 20],
  ];
  const vars = done.map(varianceMins).filter((d): d is number => d !== null);
  const counts = buckets.map(([, fn]) => vars.filter(fn).length);
  const noOut = done.length - vars.length;
  const gpsMatched = done.filter((v) => v.gps === "Matched").length;

  return (
    <>
      <ScopeBar title="Verified Hours" sub={"Every completed visit in the last 24 hours with the time the " + BRAND.careSystem + " recorded, the time verified, and the hours each export will carry. Held visits carry nothing until a person decides."} />
      <KpiStrip items={[
        { label: "Scheduled hours", value: fmtH(scheduledM / 60), sub: fmt(done.length) + " completed visits" },
        { label: "Recorded hours", value: fmtH(deliveredM / 60), sub: "Check-in to check-out" },
        { label: "Verified hours", value: fmtH(verifiedM / 60), sub: fmt(clean.length) + " clean visits", tone: "ok" },
        { label: "Billing hours released", value: fmtH((verifiedM + releasedM) / 60), sub: releasedM ? "+" + hrs(releasedM) + " by decisions" : "Verified only so far" },
        { label: "Payroll hours released", value: fmtH((verifiedM + releasedM) / 60), sub: "Same verified basis as billing" },
        { label: "Held hours", value: fmtH(heldHours), sub: open.length + " visits held", tone: heldHours ? "bad" : "ok", onClick: () => setF("held") },
      ]} />

      <Grid cols="minmax(0,1.6fr) minmax(0,1fr)">
        <Panel title="Recorded against scheduled time" meta={"Minutes over or under the scheduled call, " + fmt(vars.length) + " visits with a check-out. " + noOut + " have no check-out."}>
          <Columns labels={buckets.map((b) => b[0])} series={[counts]} height={128} colors={["var(--accent)"]} />
          <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            <Legend color="var(--accent)">Visits per band</Legend>
            <span style={{ fontSize: 11.5, color: "var(--dim)" }}>Clean visits sit within 3 minutes of schedule. The outer bands are the duration exceptions.</span>
          </div>
        </Panel>
        <Panel title="Source integrity" meta={BRAND.careSystem + ", last sync 1 min ago"} action={<GoLink page="Care Delivery" sub="Time Verification">Time Verification</GoLink>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Stat k="Visit records" v={fmt(done.length)} />
            <Stat k="Check-ins received" v={fmt(done.length)} tone="ok" />
            <Stat k="Check-outs received" v={fmt(vars.length)} tone={noOut ? "warn" : "ok"} />
            <Stat k="GPS matched" v={pct(gpsMatched, done.length)} tone="ok" />
          </div>
          <div style={{ marginTop: 12 }}>
            <AgentNote agent="Care Hours Agent">Totals reconcile: {hrs(verifiedM)} verified plus {hrs(heldHours * 60)} held{releasedM ? " plus decided visits" : ""} accounts for every scheduled hour in {officeScopeLabel(s.office)}.</AgentNote>
          </div>
        </Panel>
      </Grid>

      <Panel title="Verified hours audit" meta="Held rows show Held in every hours column: they are excluded from both exports." style={{ marginTop: 12 }} pad={false}
        action={<div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><SearchBox value={q} onChange={setQ} placeholder="Visit, carer or client" /></div>}>
        <div style={{ padding: "0 18px 10px" }}>
          <Filters<VFilter> value={f} onChange={setF} options={[
            { id: "all", label: "All", count: done.length },
            { id: "verified", label: "Verified", count: clean.length },
            { id: "held", label: "Held", count: open.length },
            { id: "released", label: "Released by decision", count: released.length },
            { id: "cancelled", label: "Marked cancelled", count: cancelled.length },
          ]} />
        </div>
        <Table<DoneVisit> cols={cols} rows={rows} dense pageSize={14} rowKey={(v) => v.id}
          rowTone={(v) => (isOpen(v, recon) ? "bad" : undefined)}
          onRow={(v) => (v.status === "Verified" ? wc.open({ kind: "visit", id: v.id }) : openRecon(v.id))}
          empty={needle ? "No visit matches that search." : "No visits in this view for this office."} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Billing Exceptions                                                   */
/* ------------------------------------------------------------------ */

function BillingExceptions() {
  const { s, ex, open, resolved } = useScope();
  const recon = s.recon;
  const [issue, setIssue] = useState<BillingIssue | "All">("All");
  const rows = issue === "All" ? ex : ex.filter((v) => v.billingIssue === issue);
  const heldSched = total(open.map((v) => v.mins));
  const heldRec = total(open.map((v) => v.actualMins ?? 0));
  const atRisk = total(open.map(riskMins));
  const over = open.filter((v) => billDir(v) === "Over-invoice risk");

  const cols: Col<DoneVisit>[] = [
    { key: "id", label: "Visit", w: "96px", render: (v) => <VisitLink id={v.id} />, sort: (v) => v.id },
    { key: "client", label: "Client", w: "84px", render: (v) => <ClientLink id={v.client} /> },
    { key: "office", label: "Office", w: "90px", render: (v) => <RecLink to={{ kind: "office", id: v.office }}>{v.office}</RecLink>, sort: (v) => v.office },
    { key: "issue", label: "Billing issue", w: "minmax(150px,1.3fr)", render: (v) => v.billingIssue ?? "", sort: (v) => v.billingIssue ?? "" },
    { key: "sr", label: "Scheduled / recorded", w: "150px", align: "right", mono: true, render: (v) => <span>{minsLabel(v.mins)} / {v.actualMins === null ? <span style={{ color: "var(--bad)" }}>none</span> : minsLabel(v.actualMins)}</span>, sort: (v) => v.mins },
    { key: "risk", label: "Hours at risk", w: "96px", align: "right", mono: true, render: (v) => fmtH(riskMins(v) / 60), sort: (v) => riskMins(v) },
    { key: "dir", label: "Direction", w: "140px", render: (v) => <span style={{ color: billDir(v) === "Over-invoice risk" ? "var(--bad)" : "var(--warn)", fontSize: 12 }}>{billDir(v)}</span>, sort: (v) => billDir(v) },
    { key: "status", label: "Billing status", w: "190px", render: (v) => { const t = billingStatus(v, recon); return <Chip tone={statusTone(t)}>{t}</Chip>; }, sort: (v) => billingStatus(v, recon) },
  ];

  const labelsShort: Record<BillingIssue, string> = { "Duration mismatch": "Duration", "Missing check-out": "No check-out", "Manual adjustment": "Manual", "Cancelled but marked complete": "Cancelled", "Duplicate event": "Duplicate" };

  return (
    <>
      <ScopeBar title="Billing Exceptions" sub="Visits that must not reach the Finance System as they stand. Each is held automatically; Paul Geraghty, Billing Administrator, sees them released only after the office coordinator decides." />
      <KpiStrip items={[
        { label: "Billing exceptions", value: ex.length, sub: open.length + " still held", tone: open.length ? "bad" : "ok" },
        { label: "Billable hours held", value: fmtH(heldSched / 60), sub: "Scheduled time on held visits", tone: heldSched ? "warn" : "ok" },
        { label: "Recorded on held visits", value: fmtH(heldRec / 60), sub: "Check-in to check-out" },
        { label: "Hours at risk", value: fmtH(atRisk / 60), sub: "If invoiced on schedule as is", tone: atRisk ? "bad" : "ok" },
        { label: "Over-invoice risk", value: over.length, sub: "Visits shorter than billed" },
        { label: "Released this session", value: resolved.length, sub: "Released or cancelled", tone: resolved.length ? "ok" : undefined },
      ]} />

      <Grid cols="minmax(260px,320px) minmax(0,1fr)">
        <Panel title="Grouped by billing issue" meta="Click a group to filter the list">
          <IssueRow active={issue === "All"} onClick={() => setIssue("All")} name="All issues" note={"Across " + officeScopeLabel(s.office)} count={ex.length} open={open.length} sched={total(ex.map((v) => v.mins))} rec={total(ex.map((v) => v.actualMins ?? 0))} />
          {ISSUES.map((i) => {
            const g = ex.filter((v) => v.billingIssue === i);
            return <IssueRow key={i} active={issue === i} onClick={() => setIssue(i)} name={i} note={ISSUE_NOTE[i]} count={g.length} open={g.filter((v) => isOpen(v, recon)).length}
              sched={total(g.map((v) => v.mins))} rec={total(g.map((v) => v.actualMins ?? 0))} />;
          })}
        </Panel>
        <Panel title={issue === "All" ? "All billing exceptions" : issue} meta="Click a visit to review it in Reconciliation" pad={false}
          action={<GoLink page={MOD} sub="Payroll Exceptions">Same visits, payroll view</GoLink>}>
          <Table<DoneVisit> key={issue} cols={cols} rows={rows} dense pageSize={10} rowKey={(v) => v.id}
            rowTone={(v) => (isOpen(v, recon) ? "bad" : "ok")} onRow={(v) => openRecon(v.id)} />
        </Panel>
      </Grid>

      <Grid cols="minmax(0,1.4fr) minmax(0,1fr)">
        <Panel title="Scheduled against recorded hours, by issue" meta="All exception visits in scope. A missing check-out records no time.">
          <Columns labels={ISSUES.map((i) => labelsShort[i])} series={[
            ISSUES.map((i) => Math.round(total(ex.filter((v) => v.billingIssue === i).map((v) => v.mins)) / 6) / 10),
            ISSUES.map((i) => Math.round(total(ex.filter((v) => v.billingIssue === i).map((v) => v.actualMins ?? 0)) / 6) / 10),
          ]} height={120} fmtValue={(n) => fmtH(n) + " h"} colors={["var(--accent)", "var(--neutral)"]} />
          <div style={{ display: "flex", gap: 14, marginTop: 10 }}><Legend color="var(--accent)">Scheduled hours</Legend><Legend color="var(--neutral)">Recorded hours</Legend></div>
        </Panel>
        <Panel title="What the Finance System receives">
          <ListRow tone="ok" title="Verified visits" meta="Scheduled time, confirmed by check-in and check-out" right={<Chip tone="ok">Exported</Chip>} />
          <ListRow tone="ok" title="Released by a coordinator" meta="Recorded or scheduled time, whichever the coordinator approved" right={<Chip tone="ok">Exported</Chip>} />
          <ListRow tone="bad" title="Held or awaiting carer" meta={"Rolls to the next weekly export if still open at " + NEXT_EXPORT} right={<Chip tone="bad">Held back</Chip>} />
          <div style={{ marginTop: 10 }}>
            <AgentNote agent="Reconciliation Agent">{over.length} held visits recorded less time than scheduled. Invoicing them on schedule would bill clients for {hrs(total(over.map(riskMins)))} that was not recorded.</AgentNote>
          </div>
          <div style={{ marginTop: 10 }}><HumanGate>Billing changes only when a coordinator decides in Reconciliation.</HumanGate></div>
        </Panel>
      </Grid>
    </>
  );
}

function IssueRow({ active, onClick, name, note, count, open, sched, rec }: { active: boolean; onClick: () => void; name: string; note: string; count: number; open: number; sched: number; rec: number }) {
  const w = sched ? Math.min(100, (100 * rec) / sched) : 0;
  return (
    <button className={active ? undefined : "wc-row"} onClick={onClick}
      style={{ display: "block", width: "100%", textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer", padding: "10px 10px", marginTop: 4, borderRadius: "var(--r-sm,10px)", border: "1px solid " + (active ? "var(--accent-line)" : "transparent"), background: active ? "var(--accent-faint)" : "none" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ink)", fontWeight: active ? 600 : 500 }}>{name}</span>
        <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{count}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{note}</div>
      <div style={{ height: 5, borderRadius: 3, background: "var(--track)", marginTop: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: w + "%", background: "var(--neutral)", borderRadius: 3, transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontFamily: MONO, fontSize: 10.5, color: "var(--faint)" }}>
        <span>{fmtH(rec / 60)} of {fmtH(sched / 60)} h recorded</span>
        <span style={{ color: open ? "var(--bad)" : "var(--ok)" }}>{open} held</span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Payroll Exceptions                                                   */
/* ------------------------------------------------------------------ */

type PFilter = "all" | "Underpay risk" | "Overpay risk" | "held" | "decided";

function PayrollExceptions() {
  const { s, ex, open, resolved } = useScope();
  const recon = s.recon;
  const [f, setF] = useState<PFilter>("all");
  const under = open.filter((v) => payDir(v) === "Underpay risk");
  const over = open.filter((v) => payDir(v) === "Overpay risk");
  const carersAffected = new Set(open.map((v) => v.carer)).size;
  const rows = f === "all" ? ex : f === "held" ? open : f === "decided" ? resolved : ex.filter((v) => payDir(v) === f);

  /* Carer-level view of what is still held. */
  const carerRows = Array.from(new Set(open.map((v) => v.carer))).map((name) => {
    const vs = open.filter((v) => v.carer === name);
    return {
      name, visits: vs.length,
      under: total(vs.filter((v) => payDir(v) === "Underpay risk").map(riskMins)) / 60,
      over: total(vs.filter((v) => payDir(v) === "Overpay risk").map(riskMins)) / 60,
    };
  }).sort((a, b) => b.under + b.over - (a.under + a.over) || a.name.localeCompare(b.name));
  const maxRisk = Math.max(1, ...carerRows.map((r) => Math.max(r.under, r.over)));

  const periods = [PERIOD_A, PERIOD_B].map((p) => {
    const vs = ex.filter((v) => payPeriod(v) === p);
    const held = vs.filter((v) => isOpen(v, recon));
    return { p, visits: vs.length, held: held.length, heldH: total(held.map((v) => v.mins)) / 60, exportAt: p === PERIOD_A ? NEXT_EXPORT : "Fri 9 Oct, 17:00" };
  });

  const cols: Col<DoneVisit>[] = [
    { key: "carer", label: "Carer", w: "minmax(140px,1.3fr)", render: (v) => <CarerLink name={v.carer} />, sort: (v) => v.carer },
    { key: "id", label: "Visit", w: "96px", render: (v) => <VisitLink id={v.id} />, sort: (v) => v.id },
    { key: "period", label: "Pay period", w: "124px", render: (v) => payPeriod(v), sort: (v) => payPeriod(v) },
    { key: "sched", label: "Scheduled pay h", w: "124px", align: "right", mono: true, render: (v) => fmtH(v.mins / 60), sort: (v) => v.mins },
    { key: "rec", label: "Recorded pay h", w: "124px", align: "right", mono: true, render: (v) => v.actualMins === null ? <span style={{ color: "var(--bad)" }}>No check-out</span> : fmtH(v.actualMins / 60), sort: (v) => v.actualMins ?? -1 },
    { key: "diff", label: "Difference", w: "92px", align: "right", mono: true, render: (v) => { const d = varianceMins(v); return d === null ? "Unknown" : (d > 0 ? "+" : "") + d + " min"; }, sort: (v) => varianceMins(v) ?? -9999 },
    { key: "dir", label: "Risk", w: "124px", render: (v) => <span style={{ fontSize: 12, color: payDir(v) === "Underpay risk" ? TONE.info.ink : "var(--warn)" }}>{payDir(v)}</span>, sort: (v) => payDir(v) },
    { key: "status", label: "Payroll status", w: "190px", render: (v) => { const t = payrollStatus(v, recon); return <Chip tone={statusTone(t)}>{t}</Chip>; }, sort: (v) => payrollStatus(v, recon) },
    { key: "owner", label: "Coordinator", w: "minmax(120px,1fr)", render: (v) => <span style={{ color: "var(--dim)" }}>{v.owner}</span> },
  ];

  return (
    <>
      <ScopeBar title="Payroll Exceptions" sub="The same exception visits, read from the carer's side. Paying a held visit on its schedule could overpay; paying it on its record could underpay. Laura Martin, Payroll Administrator, owns the Payroll System export." />
      <KpiStrip items={[
        { label: "Carers affected", value: carersAffected, sub: "With at least one held visit", tone: carersAffected ? "warn" : "ok" },
        { label: "Pay hours held", value: fmtH(total(open.map((v) => v.mins)) / 60), sub: open.length + " visits, scheduled time", tone: open.length ? "bad" : "ok" },
        { label: "Underpay risk", value: under.length, sub: hrs(total(under.map(riskMins))) + " a carer could lose" },
        { label: "Overpay risk", value: over.length, sub: hrs(total(over.map(riskMins))) + " not recorded" },
        { label: "Released to payroll", value: resolved.length, sub: resolved.length ? hrs(total(resolved.map((v) => releasedMins(v, recon) ?? 0))) + " released" : "No decisions yet", tone: resolved.length ? "ok" : undefined },
        { label: "Next export", value: "Fri 17:00", sub: "Pay period " + PERIOD_A },
      ]} />

      <Grid cols="minmax(0,1.35fr) minmax(0,1fr)">
        <Panel title="Pay risk by carer" meta="Hours between scheduled and recorded time on held visits. Left: the carer could be underpaid. Right: pay would exceed recorded time.">
          <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,170px) 1fr 1fr 44px", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span />
            <span style={{ ...label, textAlign: "right" }}>Underpay risk</span>
            <span style={label}>Overpay risk</span>
            <span style={{ ...label, textAlign: "right" }}>Visits</span>
          </div>
          {carerRows.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "12px 0" }}>No carer has a held visit in this office.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {carerRows.slice(0, 11).map((r, i) => (
              <div key={r.name} style={{ display: "grid", gridTemplateColumns: "minmax(120px,170px) 1fr 1fr 44px", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><CarerLink name={r.name} /></span>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, height: 14, borderRight: "1px solid var(--border-strong)", paddingRight: 2 }}>
                  {r.under > 0 && <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--dim)" }}>{fmtH(r.under)}</span>}
                  <div style={{ height: 10, width: (100 * r.under) / maxRisk + "%", background: TONE.info.ink, borderRadius: "4px 1px 1px 4px", transformOrigin: "right", animation: "sweep .8s var(--ease) " + i * 40 + "ms both" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, height: 14 }}>
                  <div style={{ height: 10, width: (100 * r.over) / maxRisk + "%", background: TONE.warn.ink, borderRadius: "1px 4px 4px 1px", transformOrigin: "left", animation: "sweep .8s var(--ease) " + i * 40 + "ms both" }} />
                  {r.over > 0 && <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--dim)" }}>{fmtH(r.over)}</span>}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 11.5, textAlign: "right", color: "var(--ink)" }}>{r.visits}</span>
              </div>
            ))}
          </div>
          {carerRows.length > 11 && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 10 }}>{carerRows.length - 11} more carers in the table below.</div>}
          <div style={{ display: "flex", gap: 14, marginTop: "auto", paddingTop: 12, flexWrap: "wrap" }}>
            <Legend color={TONE.info.ink}>Underpay: longer visit, missing check-out or correction requested</Legend>
            <Legend color={TONE.warn.ink}>Overpay: shorter visit, duplicate or cancelled</Legend>
          </div>
        </Panel>

        <Panel title="Pay periods" meta="Pay runs one week in arrears. Held visits never export.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {periods.map((p) => (
              <div key={p.p} style={{ padding: "12px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", minWidth: 0 }}>
                <div style={label}>{p.p}</div>
                <div style={{ fontSize: 22, fontWeight: 600, marginTop: 8, letterSpacing: "-.6px", color: p.held ? "var(--bad)" : "var(--ok)" }}>{p.held}<span style={{ fontSize: 12, color: "var(--faint)", fontWeight: 500, marginLeft: 5 }}>of {p.visits} held</span></div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 5 }}>{fmtH(p.heldH)} h held. Exports {p.exportAt}.</div>
              </div>
            ))}
          </div>
          <div style={{ ...label, marginTop: 16, marginBottom: 4 }}>Payroll owner</div>
          <ListRow left={<span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flex: "none" }}>LM</span>}
            title="Laura Martin" meta="Payroll Administrator, Central. Receives released hours, never edits them." right={<Chip tone="info">Payroll System</Chip>} />
          <ListRow left={<span style={{ width: 30, height: 30, borderRadius: 9, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flex: "none" }}>OC</span>}
            title="Office coordinators" meta="Decide each held visit in Reconciliation: recorded time, scheduled time, clarification or cancelled." right={<GoLink page={MOD} sub="Reconciliation">Queue</GoLink>} />
          <div style={{ marginTop: 10 }}>
            <AgentNote agent="Reconciliation Agent">{under.length} held visits could leave a carer short if exported as they stand. Flagged to Laura Martin so none of them is paid on a zero or partial record by default.</AgentNote>
          </div>
          <div style={{ marginTop: 10 }}><HumanGate>No carer's pay changes without a person's decision.</HumanGate></div>
        </Panel>
      </Grid>

      <Panel title="Payroll exceptions by visit" meta="Same visit records as Billing Exceptions, shown with pay hours" style={{ marginTop: 12 }} pad={false}
        action={<GoLink page={MOD} sub="Billing Exceptions">Billing view</GoLink>}>
        <div style={{ padding: "0 18px 10px" }}>
          <Filters<PFilter> value={f} onChange={setF} options={[
            { id: "all", label: "All", count: ex.length },
            { id: "held", label: "Held", count: open.length },
            { id: "Underpay risk", label: "Underpay risk", count: ex.filter((v) => payDir(v) === "Underpay risk").length },
            { id: "Overpay risk", label: "Overpay risk", count: ex.filter((v) => payDir(v) === "Overpay risk").length },
            { id: "decided", label: "Decided", count: resolved.length },
          ]} />
        </div>
        <Table<DoneVisit> key={f} cols={cols} rows={rows} dense pageSize={10} rowKey={(v) => v.id}
          rowTone={(v) => (isOpen(v, recon) ? "bad" : "ok")} onRow={(v) => openRecon(v.id)} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reconciliation                                                       */
/* ------------------------------------------------------------------ */

type QFilter = "all" | "duration" | "missing" | "awaiting";

function Reconciliation() {
  const { s, ex, open, resolved, awaiting, openCount, heldHours, releasedM } = useScope();
  const recon = s.recon;
  const [f, setF] = useState<QFilter>("all");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const queue = open.slice().sort((a, b) => (a.id === VIS10482.id ? -1 : b.id === VIS10482.id ? 1 : 0) || b.mins - a.mins || a.id.localeCompare(b.id));
  const shown = f === "duration" ? queue.filter((v) => v.status === "Duration Exception")
    : f === "missing" ? queue.filter((v) => v.status === "Missing Check-out")
    : f === "awaiting" ? queue.filter((v) => rstate(v, recon) === "Awaiting carer") : queue;

  const selected = ex.find((v) => v.id === s.selectedVisit) ?? queue[0] ?? ex[0];
  const nextOpen = queue.find((v) => v.id !== selected?.id && rstate(v, recon) === "Held");

  const cols: Col<DoneVisit>[] = [
    { key: "id", label: "Visit", w: "96px", mono: true, render: (v) => v.id, sort: (v) => v.id },
    { key: "office", label: "Office", w: "88px", render: (v) => v.office, sort: (v) => v.office },
    { key: "carer", label: "Carer", w: "minmax(120px,1.2fr)", render: (v) => v.carer, sort: (v) => v.carer },
    { key: "type", label: "Exception", w: "minmax(120px,1fr)", render: (v) => v.exception ?? "", sort: (v) => v.exception ?? "" },
    { key: "time", label: "Sched / rec", w: "108px", align: "right", mono: true, render: (v) => v.mins + " / " + (v.actualMins === null ? "--" : v.actualMins) + " min", sort: (v) => v.mins },
    { key: "state", label: "Status", w: "130px", render: (v) => <StateChip v={v} recon={recon} />, sort: (v) => rstate(v, recon) },
  ];

  return (
    <>
      <ScopeBar title="Reconciliation" sub="Every held visit, with the evidence to decide it. The Reconciliation Agent prepares each review; the coordinator decides which time, if any, is released to billing and payroll."
        right={<Chip tone={openCount ? "bad" : "ok"} style={{ height: 30, fontSize: 12.5, padding: "0 12px" }}>{openCount} visits require review</Chip>} />
      <KpiStrip items={[
        { label: "Require review", value: openCount, sub: "of " + ex.length + " exception visits", tone: openCount ? "bad" : "ok" },
        { label: "Awaiting carer", value: awaiting.length, sub: "Clarification requested, still held", tone: awaiting.length ? "warn" : undefined, onClick: () => setF("awaiting") },
        { label: "Resolved this session", value: resolved.length, sub: resolved.length ? "Decisions by Martin Murphy" : "No decisions yet", tone: resolved.length ? "ok" : undefined },
        { label: "Hours released", value: fmtH(releasedM / 60), sub: "To Payroll System and Finance System" },
        { label: "Hours still held", value: fmtH(heldHours), sub: "Out of the " + NEXT_EXPORT + " export", tone: heldHours ? "warn" : "ok" },
      ]} />

      <Grid cols="minmax(0,1fr) minmax(380px,460px)" style={{ alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title={openCount + " visits require review"} meta="VIS-10482 first, then the longest calls. Select a visit to open its review." pad={false}>
            <div style={{ padding: "0 18px 10px" }}>
              <Filters<QFilter> value={f} onChange={setF} options={[
                { id: "all", label: "All open", count: queue.length },
                { id: "duration", label: "Duration exception", count: queue.filter((v) => v.status === "Duration Exception").length },
                { id: "missing", label: "Missing check-out", count: queue.filter((v) => v.status === "Missing Check-out").length },
                { id: "awaiting", label: "Awaiting carer", count: awaiting.length },
              ]} />
            </div>
            <Table<DoneVisit> key={f} cols={cols} rows={shown} dense pageSize={10} rowKey={(v) => v.id}
              selected={(v) => v.id === selected?.id} rowTone={(v) => (rstate(v, recon) === "Awaiting carer" ? "warn" : "bad")}
              onRow={(v) => wc.selectVisit(v.id)} empty={queue.length ? "No open visits match this filter." : "Queue clear. Every exception in this office has a decision."} />
          </Panel>
          <Panel title="Resolved this session" meta={resolved.length ? resolved.length + " visits left the queue" : "Decisions you make appear here and leave the open queue."}>
            {resolved.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "6px 0" }}>Nothing resolved yet. Start with <RecLink to={{ kind: "visit", id: VIS10482.id }}>{VIS10482.id}</RecLink>.</div>}
            {resolved.map((v) => {
              const d = recon[v.id];
              const m = releasedMins(v, recon) ?? 0;
              return (
                <ListRow key={v.id} onClick={() => wc.selectVisit(v.id)} tone={rstate(v, recon) === "Cancelled" ? "neutral" : "ok"}
                  title={<><span style={{ fontFamily: MONO, fontSize: 12 }}>{v.id}</span> <span style={{ color: "var(--dim)" }}>{v.office}, {v.carer}</span></>}
                  meta={d.action + " by " + d.by + " at " + d.at + ". " + (m ? hrs(m) + " released to billing and payroll." : "Nothing billed or paid.")}
                  right={<StateChip v={v} recon={recon} />} />
              );
            })}
          </Panel>
        </div>
        {selected ? (
          <ReviewPanel v={selected} note={notes[selected.id] ?? ""} onNote={(t) => setNotes((n) => ({ ...n, [selected.id]: t }))}
            onNext={nextOpen ? () => wc.selectVisit(nextOpen.id) : undefined} />
        ) : (
          <Panel title="Review"><div style={{ fontSize: 12.5, color: "var(--dim)" }}>No exception visits for this office.</div></Panel>
        )}
      </Grid>
    </>
  );
}

const ACTIONS: { a: ReconAction; kind: "primary" | "ghost" | "danger"; hint: string }[] = [
  { a: "Approve Recorded Time", kind: "primary", hint: "Bill and pay the time the carer checked in and out" },
  { a: "Approve Scheduled Time", kind: "ghost", hint: "Bill and pay the scheduled call" },
  { a: "Request Clarification", kind: "ghost", hint: "Ask the carer; stays held" },
  { a: "Mark Cancelled", kind: "danger", hint: "Nothing billed or paid" },
];

function ReviewPanel({ v, note, onNote, onNext }: { v: DoneVisit; note: string; onNote: (t: string) => void; onNext?: () => void }) {
  const s = useWc();
  const d = s.recon[v.id];
  const st = rstate(v, s.recon);
  const variance = varianceMins(v);
  const bill = billingStatus(v, s.recon), pay = payrollStatus(v, s.recon);
  const flagAt = (v.actualOut ?? v.start + v.mins) + 2;

  const story: { when: ReactNode; text: ReactNode; tone?: Tone; who?: ReactNode }[] = [
    { when: visitDay(v) + " " + hhmm(v.start), who: BRAND.careSystem, text: <>Scheduled {v.service.toLowerCase()} call, {minsLabel(v.mins)}, {hhmm(v.start)}-{hhmm(v.start + v.mins)}, <CarerLink name={v.carer} /> with <ClientLink id={v.client} />.</> },
    { when: hhmm(v.actualIn), who: "Check-in", tone: "ok", text: <>Checked in {v.actualIn - v.start === 0 ? "on time" : (v.actualIn - v.start > 0 ? v.actualIn - v.start + " min late" : v.start - v.actualIn + " min early")}. GPS {v.gps === "Check-out not received" ? "matched at check-in" : v.gps.toLowerCase()}.</> },
    v.actualOut === null
      ? { when: hhmm(v.start + v.mins), who: "Check-out", tone: "bad", text: "No check-out received by the scheduled end." }
      : { when: hhmm(v.actualOut), who: "Check-out", tone: v.exception === "Long visit" ? "warn" : "bad", text: <>Checked out after {minsLabel(v.actualMins ?? 0)}, {variance !== null && variance < 0 ? -variance + " min short of" : variance + " min over"} the scheduled call.</> },
    { when: hhmm(flagAt), who: "Visit Integrity Agent", tone: "bad", text: <>Flagged {v.status}{v.billingIssue && v.billingIssue !== "Duration mismatch" ? " (" + v.billingIssue.toLowerCase() + ")" : ""}. Billing held and payroll held automatically.</> },
    { when: hhmm(flagAt + 1), who: "Reconciliation Agent", tone: "info", text: <>Prepared this review for {coordinatorLabel(v)}, {v.owner}.</> },
  ];
  if (d) story.push({ when: d.at, who: d.by, tone: d.action === "Request Clarification" ? "warn" : "ok", text: d.action + ". " + (d.action === "Request Clarification" ? "Billing and payroll stay held until the carer replies." : "Held flags cleared.") });

  const events: [string, string][] = [
    [hhmm(v.start), "VISIT_SCHEDULED " + v.mins + "m"],
    [hhmm(v.actualIn), "CHECK_IN gps=" + (v.gps === "Not available" ? "unavailable" : "matched")],
    ...(v.actualOut !== null ? [[hhmm(v.actualOut), "CHECK_OUT recorded=" + v.actualMins + "m"] as [string, string]] : []),
    ...(v.billingIssue === "Duplicate event" && v.actualOut !== null ? [[hhmm(v.actualOut + 1), "CHECK_OUT duplicate event"] as [string, string]] : []),
    ...(v.billingIssue === "Cancelled but marked complete" ? [[hhmm(v.start - 45), "VISIT_CANCELLED by office"] as [string, string], [hhmm(v.start + v.mins), "VISIT_COMPLETED status set"] as [string, string]] : []),
    ...(v.exception === "Manual correction requested" ? [[hhmm((v.actualOut ?? v.start) + 5), "CORRECTION_REQUEST from carer app"] as [string, string]] : []),
    [hhmm(flagAt), "HOLD billing, HOLD payroll"],
  ];

  const box: CSSProperties = { padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", minWidth: 0 };
  return (
    <Panel key={v.id} title={<span style={{ fontFamily: MONO }}>{v.id}</span>} meta={<>{v.office}, {v.service}, owner {coordinatorLabel(v)} ({v.owner})</>}
      action={<StateChip v={v} recon={s.recon} />} tone={st === "Held" ? "bad" : st === "Awaiting carer" ? "warn" : "ok"}
      style={{ position: "sticky", top: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <div style={box}>
          <div style={label}>Scheduled visit</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 6 }}>{minsLabel(v.mins)}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--dim)", marginTop: 3 }}>{hhmm(v.start)}-{hhmm(v.start + v.mins)}</div>
        </div>
        <div style={box}>
          <div style={label}>Check-in</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: MONO }}>{hhmm(v.actualIn)}</div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>GPS {v.gps === "Check-out not received" ? "matched" : v.gps.toLowerCase()}</div>
        </div>
        <div style={{ ...box, background: v.actualOut === null || (variance ?? 0) < 0 ? "var(--bad-soft)" : "var(--warn-soft)" }}>
          <div style={label}>Check-out</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 6, fontFamily: MONO, color: v.actualOut === null ? "var(--bad)" : "var(--ink)" }}>{v.actualOut === null ? "--:--" : hhmm(v.actualOut)}</div>
          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 3 }}>{v.actualMins === null ? "Not received" : minsLabel(v.actualMins) + " recorded"}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        <Stat k="Billing status" v={bill} tone={statusTone(bill)} />
        <Stat k="Payroll status" v={pay} tone={statusTone(pay)} />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap", fontSize: 12 }}>
        <RecLink to={{ kind: "visit", id: v.id }}>Open visit record</RecLink>
        <GoLink page="Care Delivery" sub="Time Verification">Care Delivery Time Verification</GoLink>
      </div>

      <div style={{ ...label, marginTop: 16, marginBottom: 8 }}>Timeline</div>
      <Timeline items={story} />

      <div style={{ ...label, marginTop: 4, marginBottom: 6 }}>System events</div>
      <div style={{ padding: "8px 10px", background: "var(--surface-faint)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", fontFamily: MONO, fontSize: 11, lineHeight: 1.75, color: "var(--dim)" }}>
        {events.map(([t, e], i) => <div key={i}><span style={{ color: "var(--faint)" }}>{t}</span>  {e}</div>)}
      </div>

      <div style={{ ...label, marginTop: 14, marginBottom: 6 }}>Coordinator notes</div>
      <textarea value={note} onChange={(e) => onNote(e.target.value)} rows={3} aria-label="Coordinator notes"
        placeholder={"Notes for " + v.owner + ". Kept on this screen only."}
        style={{ width: "100%", boxSizing: "border-box", resize: "vertical", padding: "9px 11px", font: "inherit", fontSize: 12.5, lineHeight: 1.5, color: "var(--ink)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", outline: "none" }} />

      <div style={{ ...label, marginTop: 14, marginBottom: 8 }}>Decision</div>
      {d && d.action !== "Request Clarification" ? (
        <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>
          {d.action} by {d.by} at {d.at}. {(releasedMins(v, s.recon) ?? 0) ? hrs(releasedMins(v, s.recon) ?? 0) + " released to the Payroll System and Finance System exports." : "Nothing will be billed or paid for this visit."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ACTIONS.map(({ a, kind, hint }) => {
            const disabled = (a === "Approve Recorded Time" && v.actualMins === null) || (a === "Request Clarification" && st === "Awaiting carer");
            return (
              <Btn key={a} kind={kind} disabled={disabled} onClick={() => wc.reconcile(v.id, a)} title={disabled ? (a === "Request Clarification" ? "Already requested" : "No check-out, so there is no recorded time to approve") : hint}
                style={{ justifyContent: "center", width: "100%" }}>{a}</Btn>
            );
          })}
        </div>
      )}
      {st === "Awaiting carer" && <div style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 8 }}>Clarification requested from {v.carer}. The visit stays in the queue and out of both exports.</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}><HumanGate>Pay and billing change only on this decision. Frontend demo, nothing is sent.</HumanGate></div>
        {onNext && <Btn kind="quiet" onClick={onNext}>Next held visit</Btn>}
      </div>
    </Panel>
  );
}
