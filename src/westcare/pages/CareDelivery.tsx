/* Care Delivery: did the scheduled visit actually happen, and for about as
   long as planned. Visit events come from the Current Care Management
   System; Pulse compares them with the schedule and holds anything that does
   not line up until a coordinator decides. Snapshot: 11:40, Mon 28 Sep. */
import { useState, type ReactNode } from "react";
import {
  AOIFE, AOIFE_UPCOMING_VISITS, BRAND, CANCEL_DAILY, CANCEL_REASONS, CANCEL_RECOVERED, CANCEL_TODAY, CANCEL_WEEKLY, CARERS, CLIENTS, DONE,
  EXCEPTIONS, HSE_REQUESTS, K, NOW_MINS, OFFICES, ROSCOMMON_CLUSTER, SERVICE_TYPES, STAFF, TODAY_LABEL, VISITS, addDays, fmt, fmtH, hhmm,
  minsLabel, officeOf, pct,
  type Client, type DoneVisit, type OfficeFilter, type OfficeId, type Visit, type VisitStatus,
} from "../model";
import { useLive, useWc, wc, type ReconAction } from "../store";
import {
  AgentNote, Bars, Btn, Chip, Columns, Filters, GoLink, Grid, HumanGate, KpiStrip, Legend, ListRow, MONO, Page, Panel, RecLink, Ring,
  ScopeBar, SearchBox, Seg, Spark, Stack, Stat, TONE, Table, Timeline, byOffice, label, type Col, type Tone,
} from "../ui";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const MOD = "Care Delivery";
const CARER_BY_NAME = new Map(CARERS.map((c) => [c.name, c] as const));
const AOIFE_IDS = new Set(AOIFE_UPCOMING_VISITS.map((v) => v.id));
const reassign = (v: Visit, aoife: boolean) => aoife && AOIFE_IDS.has(v.id);
/** Today's status, including Aoife's 4 visits when her restriction is on. */
const statusOf = (v: Visit, aoife: boolean): VisitStatus => (reassign(v, aoife) ? "Unfilled" : v.status);
const win = (start: number, mins: number) => hhmm(start) + "-" + hhmm(start + mins);
const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const STATUS_ORDER: VisitStatus[] = ["Completed", "In progress", "Late", "Upcoming", "Unfilled"];
const STATUS_COLOR: Record<VisitStatus, string> = {
  "Completed": TONE.ok.ink, "In progress": TONE.info.ink, "Late": TONE.warn.ink, "Upcoming": "var(--neutral)", "Unfilled": TONE.bad.ink,
};

function CarerLink({ name, id }: { name: string | null; id?: string | null }) {
  if (!name) return <span style={{ color: "var(--faint)" }}>No carer</span>;
  const cid = id || CARER_BY_NAME.get(name)?.id;
  return cid ? <RecLink to={{ kind: "carer", id: cid }}>{name}</RecLink> : <>{name}</>;
}
const VisitLink = ({ id }: { id: string }) => <RecLink to={{ kind: "visit", id }} style={{ fontFamily: MONO, fontSize: 12 }}>{id}</RecLink>;
const ClientLink = ({ id }: { id: string }) => <RecLink to={{ kind: "client", id }} style={{ fontFamily: MONO, fontSize: 12 }}>{id}</RecLink>;

function ownerLabel(name: string) {
  const st = STAFF.find((x) => x.name === name);
  return st && /Operations Coordinator/.test(st.role) ? st.office + " Coordinator (" + name + ")" : name;
}

/** Place a last-24h visit on one minute axis where 0 is midnight today (negative = Sunday). */
function absTimes(d: DoneVisit) {
  const shift = d.start + d.mins > NOW_MINS ? -1440 : 0;
  return { start: d.start + shift, end: d.start + d.mins + shift, inAt: d.actualIn + shift, outAt: d.actualOut === null ? null : d.actualOut + shift };
}
const dayTag = (abs: number) => (abs < 0 ? "Sun " : "") + hhmm(abs);
const ageLabel = (m: number) => (m < 60 ? Math.max(0, m) + " min" : m < 24 * 60 ? minsLabel(m) : Math.floor(m / 1440) + "d " + Math.floor((m % 1440) / 60) + "h");

type Recon = ReturnType<typeof useWc>["recon"];
type Review = { open: boolean; held: boolean; state: string; tone: Tone; billing: string; billingTone: Tone };
function review(d: DoneVisit, recon: Recon): Review {
  if (d.status === "Verified") return { open: false, held: false, state: "Verified", tone: "ok", billing: "Ready", billingTone: "ok" };
  const r = recon[d.id];
  if (!r) return { open: true, held: true, state: "Awaiting review", tone: "warn", billing: "Held", billingTone: "bad" };
  if (r.action === "Request Clarification") return { open: true, held: true, state: "Clarification requested", tone: "warn", billing: "Held", billingTone: "bad" };
  if (r.action === "Mark Cancelled") return { open: false, held: false, state: "Marked cancelled", tone: "neutral", billing: "Not billed", billingTone: "neutral" };
  return { open: false, held: false, state: r.action === "Approve Recorded Time" ? "Recorded time approved" : "Scheduled time approved", tone: "ok", billing: "Released", billingTone: "ok" };
}
const officeWord = (o: OfficeFilter) => (o === "All" ? "all offices" : o);

/* ------------------------------------------------------------------ */
/* TODAY                                                               */
/* ------------------------------------------------------------------ */

function HourStrip({ rows, aoife }: { rows: Visit[]; aoife: boolean }) {
  const hours = Array.from({ length: 16 }, (_, i) => 7 + i);
  const data = hours.map((h) => {
    const inH = rows.filter((v) => Math.floor(v.start / 60) === h);
    return STATUS_ORDER.map((s) => inH.filter((v) => statusOf(v, aoife) === s).length);
  });
  const max = Math.max(1, ...data.map((d) => sumOf(d)));
  const [hover, setHover] = useState<number | null>(null);
  const GAP = 5;
  const frac = (NOW_MINS - 7 * 60) / (16 * 60);
  const nowLeft = "calc(" + frac + " * (100% - " + 15 * GAP + "px) + " + Math.floor((NOW_MINS - 7 * 60) / 60) * GAP + "px)";
  return (
    <div>
      <div style={{ position: "relative", height: 200, display: "flex", alignItems: "flex-end", gap: GAP, paddingTop: 22 }}>
        {data.map((d, i) => {
          const tot = sumOf(d);
          return (
            <div key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}
              style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative" }}>
              <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 10, color: hover === i ? "var(--ink)" : "var(--faint)", marginBottom: 4 }}>{tot || ""}</div>
              <div style={{ height: (100 * tot) / max + "%", display: "flex", flexDirection: "column-reverse", gap: 1, borderRadius: "5px 5px 2px 2px", overflow: "hidden", transformOrigin: "bottom", animation: "growBar .7s var(--ease) " + i * 30 + "ms both", opacity: hover === null || hover === i ? 1 : 0.45, transition: "opacity .2s var(--ease)" }}>
                {d.map((n, k) => (n > 0 ? <div key={k} style={{ flex: n + " 1 0px", background: STATUS_COLOR[STATUS_ORDER[k]] }} /> : null))}
              </div>
              {hover === i && (
                <div style={{ position: "absolute", bottom: "calc(100% - 18px)", left: "50%", transform: "translateX(-50%)", padding: "6px 9px", borderRadius: 8, background: "var(--tooltip)", color: "var(--tooltip-ink)", fontSize: 11, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 3 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, opacity: 0.7 }}>{hhmm(hours[i] * 60)}-{hhmm(hours[i] * 60 + 60)} · {tot} visits</div>
                  {STATUS_ORDER.map((s, k) => (d[k] ? <div key={s}>{s}: <b>{d[k]}</b></div> : null))}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ position: "absolute", top: 4, bottom: 0, left: nowLeft, borderLeft: "1.5px dashed var(--accent)", pointerEvents: "none" }}>
          <span style={{ position: "absolute", top: -2, left: 5, fontFamily: MONO, fontSize: 10, color: "var(--accent)", whiteSpace: "nowrap" }}>{hhmm(NOW_MINS)} now</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: GAP, marginTop: 6 }}>
        {hours.map((h) => <div key={h} style={{ flex: 1, minWidth: 0, textAlign: "center", fontFamily: MONO, fontSize: 9.5, color: "var(--faint)" }}>{String(h).padStart(2, "0")}</div>)}
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
        {STATUS_ORDER.map((s) => <Legend key={s} color={STATUS_COLOR[s]}>{s}</Legend>)}
      </div>
    </div>
  );
}

function OfficeBoard({ aoife, office }: { aoife: boolean; office: OfficeFilter }) {
  const rows = OFFICES.map((o) => {
    const vs = VISITS.filter((v) => v.office === o.id);
    const c = (s: VisitStatus) => vs.filter((v) => statusOf(v, aoife) === s).length;
    return { id: o.id, coord: o.coordinator, total: vs.length, done: c("Completed"), prog: c("In progress"), late: c("Late"), up: c("Upcoming"), unfilled: c("Unfilled") };
  });
  const tpl = "minmax(96px,1.1fr) minmax(90px,1.6fr) 52px 60px 52px 42px";
  const head = { ...label, fontSize: 8.5, textAlign: "right" as const };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: tpl, gap: 10, padding: "0 6px 7px" }}>
        <span style={{ ...label, fontSize: 8.5 }}>Office</span><span style={{ ...label, fontSize: 8.5 }}>Today by status</span>
        <span style={head}>Sched</span><span style={head}>Covered</span><span style={head}>Uncov</span><span style={head}>Late</span>
      </div>
      {rows.map((r) => {
        const on = office === r.id;
        return (
          <div key={r.id} className="wc-row" onClick={() => wc.setOffice(on ? "All" : r.id)} title={"Filter to " + r.id}
            style={{ display: "grid", gridTemplateColumns: tpl, gap: 10, alignItems: "center", padding: "9px 6px", borderTop: "1px solid var(--border)", cursor: "pointer", borderRadius: 6, background: on ? "var(--accent-faint)" : "none", boxShadow: on ? "inset 2px 0 0 var(--accent)" : "none", opacity: office === "All" || on ? 1 : 0.5 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "var(--ink)" }}>{r.id}</div>
              <div style={{ fontSize: 10.5, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.coord}</div>
            </div>
            <Stack height={8} parts={[
              { value: r.done, color: STATUS_COLOR["Completed"], label: "Completed" }, { value: r.prog, color: STATUS_COLOR["In progress"], label: "In progress" },
              { value: r.late, color: STATUS_COLOR["Late"], label: "Late" }, { value: r.up, color: STATUS_COLOR["Upcoming"], label: "Upcoming" },
              { value: r.unfilled, color: STATUS_COLOR["Unfilled"], label: "Unfilled" },
            ]} />
            <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right" }}>{r.total}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", color: "var(--ok)" }}>{r.total - r.unfilled}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", color: r.unfilled ? "var(--bad)" : "var(--dim)" }}>{r.unfilled}</span>
            <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", color: r.late ? "var(--warn)" : "var(--dim)" }}>{r.late}</span>
          </div>
        );
      })}
    </div>
  );
}

function RoscommonCluster() {
  const rows = CANCEL_TODAY.filter((r) => r.office === "Roscommon");
  const lost = VISITS.filter((v) => v.cancelledFrom);
  const at = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return (
    <Panel title="Roscommon cluster" meta={ROSCOMMON_CLUSTER.period + " · 11 cancellations, carers called in sick"} tone="bad" action={<Chip tone="bad">Operations Attention</Chip>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
        <Stat k="Cancelled" v={ROSCOMMON_CLUSTER.cancellations} />
        <Stat k="Recovered" v={ROSCOMMON_CLUSTER.recovered} tone="ok" />
        <Stat k="Uncovered" v={ROSCOMMON_CLUSTER.uncovered} tone="bad" />
        <Stat k="Hours at risk" v={fmtH(ROSCOMMON_CLUSTER.hoursAtRisk) + "h"} tone="bad" />
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ position: "relative", height: 26, borderRadius: 6, background: "var(--track)" }}>
          {rows.map((r, i) => (
            <span key={i} title={r.time + " · " + r.reason + (r.recovered ? " · recovered" : " · not recovered")}
              style={{ position: "absolute", top: 5, bottom: 5, width: 5, borderRadius: 2, left: "calc(" + (100 * (at(r.time) - 420)) / 120 + "% - 2px)", background: r.recovered ? "var(--ok)" : "var(--bad)" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 9.5, color: "var(--faint)", marginTop: 4 }}>
          <span>07:00</span><span>08:00</span><span>09:00</span>
        </div>
      </div>
      <div style={{ ...label, marginTop: 12, marginBottom: 2 }}>Visits still without cover</div>
      {lost.map((v) => (
        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
          <span style={{ fontFamily: MONO, color: "var(--faint)", width: 84 }}>{win(v.start, v.mins)}</span>
          <VisitLink id={v.id} /><ClientLink id={v.client} />
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--bad)" }}>{fmtH(v.mins / 60)}h</span>
        </div>
      ))}
      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        <GoLink page={MOD} sub="Cancellations">Cancellations</GoLink>
        <GoLink page="Rostering" sub="Unfilled Hours">Find cover in Rostering</GoLink>
      </div>
    </Panel>
  );
}

function OfficeCancellations({ office }: { office: OfficeId }) {
  const rows = CANCEL_TODAY.filter((r) => r.office === office);
  return (
    <Panel title={"Cancellations today · " + office} meta={rows.length + " received since 07:00"}>
      {rows.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No cancellations received for {office} today.</div>}
      {rows.map((r, i) => (
        <ListRow key={i} tone={r.recovered ? "ok" : "bad"} title={<><span style={{ fontFamily: MONO, color: "var(--faint)", marginRight: 8 }}>{r.time}</span>{r.reason} · <ClientLink id={r.client} /></>}
          meta={<>Original carer <CarerLink name={r.carer} />{r.replacement ? <> · cover <CarerLink name={r.replacement} /></> : " · no cover found"}</>}
          right={<Chip tone={r.recovered ? "ok" : "bad"}>{r.recovered ? fmtH(r.hours) + "h recovered" : fmtH(r.hours) + "h lost"}</Chip>} />
      ))}
      <div style={{ marginTop: 10 }}><AgentNote agent="Ops Watchdog">The Roscommon 07:00-09:00 cluster is the network's open cancellation issue today: 5 visits and 8.5 care hours still uncovered.</AgentNote></div>
    </Panel>
  );
}

function Today() {
  const s = useWc();
  const L = useLive();
  const aoife = s.aoifeExpired;
  const rows = byOffice(VISITS, s.office);
  const count = (x: VisitStatus) => rows.filter((v) => statusOf(v, aoife) === x).length;
  const scheduled = rows.length;
  const unfilled = s.office === "All" ? L.unfilled : count("Unfilled");
  const covered = s.office === "All" ? L.covered : scheduled - unfilled;
  const late = count("Late"), inProg = count("In progress"), done = count("Completed");
  const cancelled = byOffice(CANCEL_TODAY, s.office).length;
  const attention = rows.filter((v) => { const x = statusOf(v, aoife); return x === "Late" || x === "Unfilled"; }).sort((a, b) => a.start - b.start);
  const lateRows = attention.filter((v) => statusOf(v, aoife) === "Late");
  const oldestLate = lateRows[0];
  const soon = attention.filter((v) => statusOf(v, aoife) === "Unfilled" && v.start - NOW_MINS <= 120).length;
  const officeUnfilled = OFFICES.map((o) => ({ id: o.id, n: VISITS.filter((v) => v.office === o.id && statusOf(v, aoife) === "Unfilled").length })).sort((a, b) => b.n - a.n);
  const showAoife = aoife && (s.office === "All" || s.office === "Galway");
  const showCluster = s.office === "All" || s.office === "Roscommon";

  return (
    <>
      <ScopeBar title={"Today · " + TODAY_LABEL} sub={"Live operations at " + hhmm(NOW_MINS) + ". Check-in and check-out events arrive from the " + BRAND.careSystem + "; Pulse compares them with the roster and raises what needs a person."} />
      <KpiStrip min={118} items={[
        { label: "Scheduled", value: fmt(scheduled), sub: "next 24 hours" },
        { label: "Covered", value: fmt(covered), sub: pct(covered, scheduled) + " with a carer", tone: "ok" },
        { label: "Uncovered", value: unfilled, sub: aoife && showAoife ? "incl. 4 from Aoife Byrne" : "no carer assigned", tone: "bad", onClick: () => wc.go("Rostering", "Unfilled Hours") },
        { label: "In progress", value: inProg, sub: "checked in now" },
        { label: "Completed", value: fmt(done), sub: "since 07:00" },
        { label: "Cancelled", value: cancelled, sub: "received today", tone: "warn", onClick: () => wc.setSub(MOD, "Cancellations") },
        { label: "Late", value: late, sub: "no check-in yet", tone: "warn" },
        { label: "Needs attention", value: late + unfilled, sub: "late + uncovered", tone: "bad" },
      ]} />

      {showAoife && (
        <Grid cols="minmax(0,1fr)">
          <Panel tone="bad" title={<>Compliance restriction: <RecLink to={{ kind: "carer", id: AOIFE.id }}>{AOIFE.name}</RecLink>, 4 visits today need cover</>}
            meta="Patient Manual Handling expired. Galway, manual-handling visits only." action={<GoLink page="Rostering" sub="Unfilled Hours">Review cover options</GoLink>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
              {AOIFE_UPCOMING_VISITS.map((v) => (
                <div key={v.id} style={{ padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", fontSize: 12 }}>
                  <div style={{ fontFamily: MONO, color: "var(--faint)", fontSize: 11 }}>{win(v.start, v.mins)}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 5 }}><VisitLink id={v.id} /><ClientLink id={v.client} /></div>
                  <div style={{ marginTop: 7 }}><Chip tone="bad">Needs reassignment</Chip></div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <AgentNote agent="Roster Optimiser" state="attention">Alternatives prepared for Niamh Kelly using compliance status, qualifications, availability, area and existing roster. Nothing is reassigned until she approves.</AgentNote>
            </div>
          </Panel>
        </Grid>
      )}

      <Grid cols="minmax(0,1.7fr) minmax(0,1fr)">
        <Panel title="Visits by start hour, 07:00 to 23:00" meta={fmt(scheduled) + " visits for " + officeWord(s.office) + ", stacked by live status"}>
          <HourStrip rows={rows} aoife={aoife} />
        </Panel>
        <Panel title="Needs attention now" meta={late + " late, " + unfilled + " uncovered · soonest first"} action={<Chip tone="bad">{late + unfilled}</Chip>}>
          <div style={{ maxHeight: 268, overflowY: "auto", marginTop: -4 }}>
            {attention.map((v) => {
              const st = statusOf(v, aoife);
              const isLate = st === "Late";
              return (
                <ListRow key={v.id} tone={isLate ? "warn" : "bad"}
                  title={<span style={{ display: "inline-flex", gap: 9, alignItems: "baseline", flexWrap: "wrap" }}><span style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--faint)" }}>{win(v.start, v.mins)}</span><VisitLink id={v.id} /><ClientLink id={v.client} /><span style={{ fontSize: 11.5, color: "var(--dim)" }}>{v.office}</span></span>}
                  meta={isLate ? <>Carer <CarerLink name={v.carer} id={v.carerId} /> · no check-in from source system</> : reassign(v, aoife) ? <>Was <CarerLink name={v.carer} id={v.carerId} /> · compliance restriction</> : v.cancelledFrom ? "Roscommon cluster · original carer called in sick" : "No carer assigned"}
                  right={isLate ? <Chip tone="warn">{NOW_MINS - v.start} min late</Chip> : <Chip tone="bad">{reassign(v, aoife) ? "Reassign" : "Starts in " + minsLabel(v.start - NOW_MINS)}</Chip>} />
              );
            })}
            {attention.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)", padding: "20px 0" }}>Nothing late or uncovered for this office.</div>}
          </div>
        </Panel>
      </Grid>

      <Grid cols="minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)">
        <Panel title="Office board" meta="Click an office to filter the page">
          <OfficeBoard aoife={aoife} office={s.office} />
        </Panel>
        {showCluster ? <RoscommonCluster /> : <OfficeCancellations office={s.office as OfficeId} />}
        <Panel title="Ops Watchdog" meta={"Watching " + officeWord(s.office) + " since 06:00"}>
          <AgentNote agent="Ops Watchdog" state={late + unfilled ? "attention" : "complete"}>
            {late} visit{late === 1 ? " has" : "s have"} no check-in yet{oldestLate ? ", the oldest " + (NOW_MINS - oldestLate.start) + " min past its start" : ""}. {unfilled} visit{unfilled === 1 ? " is" : "s are"} uncovered
            {s.office === "All" ? ", " + officeUnfilled[0].n + " of them in " + officeUnfilled[0].id : ""}. {showCluster ? "Roscommon's 07:00-09:00 cluster still leaves 5 visits and 8.5 care hours without cover. " : ""}Coordinators are alerted; nothing is reassigned automatically.
          </AgentNote>
          <div style={{ marginTop: 8 }}>
            <ListRow tone="bad" title={soon + " uncovered in the next 2 hours"} meta="Starting before 13:40" right={<GoLink page="Rostering" sub="Unfilled Hours">Cover</GoLink>} />
            <ListRow tone="warn" title={lateRows.filter((v) => NOW_MINS - v.start >= 15).length + " late by 15 min or more"} meta="Carer not yet checked in" right={<GoLink page={MOD} sub="Exceptions">Queue</GoLink>} />
            <ListRow tone="info" title={inProg + " visits in progress"} meta={"Checked in via the " + BRAND.careSystem} />
            <ListRow tone="ok" title={fmt(done) + " completed this morning"} meta="Durations checked by Visit Integrity Agent" right={<GoLink page={MOD} sub="Time Verification">Verify</GoLink>} />
          </div>
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* VISITS                                                              */
/* ------------------------------------------------------------------ */

type VRow = {
  id: string; client: string; carer: string | null; carerId: string | null; office: OfficeId; start: number; mins: number;
  actualIn: number | null; actualOut: number | null; status: string; statusTone?: Tone; verification: string; billing: string; billingTone: Tone;
};

function todayRow(v: Visit, aoife: boolean): VRow {
  const st = statusOf(v, aoife);
  const r = reassign(v, aoife);
  return {
    id: v.id, client: v.client, carer: v.carer, carerId: v.carerId, office: v.office, start: v.start, mins: v.mins,
    actualIn: v.actualIn ?? null, actualOut: v.actualOut ?? null, status: st, statusTone: r ? "bad" : undefined,
    verification: r ? "Needs reassignment" : v.verification, billing: v.billing, billingTone: v.billing === "Ready" ? "ok" : "warn",
  };
}
function doneRow(d: DoneVisit, recon: Recon): VRow {
  const rv = review(d, recon);
  return {
    id: d.id, client: d.client, carer: d.carer, carerId: null, office: d.office, start: d.start, mins: d.mins,
    actualIn: d.actualIn, actualOut: d.actualOut, status: d.status, verification: d.status === "Verified" ? "Verified" : rv.state === "Awaiting review" ? (d.exception || d.status) : rv.state,
    billing: rv.billing, billingTone: rv.billingTone,
  };
}

function Visits() {
  const s = useWc();
  const aoife = s.aoifeExpired;
  const [mode, setMode] = useState<"today" | "done">("today");
  const [st, setSt] = useState("All");
  const today = byOffice(VISITS, s.office).map((v) => todayRow(v, aoife));
  const done = byOffice(DONE, s.office).map((d) => doneRow(d, s.recon));
  const base = mode === "today" ? today : done;
  const statuses = mode === "today" ? (STATUS_ORDER as string[]) : ["Verified", "Duration Exception", "Missing Check-out"];
  const rows = st === "All" ? base : base.filter((r) => r.status === st);

  const liveRows = byOffice(VISITS, s.office).filter((v) => v.actualIn !== undefined);
  const offs = liveRows.map((v) => (v.actualIn as number) - v.start);
  const lateNoIn = byOffice(VISITS, s.office).filter((v) => v.status === "Late").length;
  const punct = [
    { label: "Early, 3 min or more", value: offs.filter((o) => o <= -3).length, color: TONE.info.ink },
    { label: "On time, within 2 min", value: offs.filter((o) => o > -3 && o <= 2).length, color: TONE.ok.ink },
    { label: "3 to 5 min late", value: offs.filter((o) => o > 2 && o <= 5).length, color: "var(--neutral)" },
    { label: "6 to 10 min late", value: offs.filter((o) => o > 5).length, color: TONE.warn.ink },
    { label: "No check-in yet", value: lateNoIn, color: TONE.bad.ink },
  ];
  const doneAll = byOffice(DONE, s.office);
  const dv = doneAll.filter((d) => d.status === "Verified").length;
  const dDur = doneAll.filter((d) => d.status === "Duration Exception").length;
  const dMiss = doneAll.filter((d) => d.status === "Missing Check-out").length;
  const cnt = (x: VisitStatus) => today.filter((r) => r.status === x).length;

  const cols: Col<VRow>[] = [
    { key: "id", label: "Visit ID", w: "96px", render: (r) => <VisitLink id={r.id} />, sort: (r) => r.id },
    { key: "client", label: "Client", w: "84px", render: (r) => <ClientLink id={r.client} />, sort: (r) => r.client },
    { key: "carer", label: "Carer", w: "1.3fr", render: (r) => <CarerLink name={r.carer} id={r.carerId} />, sort: (r) => r.carer || "" },
    { key: "office", label: "Office", w: "88px", sort: (r) => r.office },
    { key: "sched", label: "Scheduled", w: "104px", mono: true, render: (r) => win(r.start, r.mins), sort: (r) => r.start },
    { key: "actual", label: "Actual", w: "104px", mono: true, render: (r) => (r.actualIn === null ? <span style={{ color: "var(--faint)" }}>-</span> : hhmm(r.actualIn) + "-" + (r.actualOut === null ? "--:--" : hhmm(r.actualOut))) },
    { key: "dur", label: "Duration", w: "108px", render: (r) => {
        const act = r.actualIn !== null && r.actualOut !== null ? r.actualOut - r.actualIn : null;
        const off = act !== null && Math.abs(act - r.mins) > 5;
        return <span style={{ fontFamily: MONO, fontSize: 12 }}><span style={{ color: off ? "var(--bad)" : "var(--ink)" }}>{act === null ? "-" : act}</span><span style={{ color: "var(--faint)" }}> / {r.mins} min</span></span>;
      }, sort: (r) => r.mins },
    { key: "status", label: "Status", w: "1.1fr", render: (r) => <Chip tone={r.statusTone} status={r.status} />, sort: (r) => r.status },
    { key: "ver", label: "Verification", w: "1.2fr", render: (r) => <Chip status={r.verification} />, sort: (r) => r.verification },
    { key: "bill", label: "Billing Status", w: "104px", render: (r) => <Chip tone={r.billingTone}>{r.billing}</Chip>, sort: (r) => r.billing },
  ];

  return (
    <>
      <ScopeBar title="Visits" sub={"Every scheduled visit for " + officeWord(s.office) + ", with the check-in and check-out events received from the " + BRAND.careSystem + "."} />
      <KpiStrip min={140} items={[
        { label: "Scheduled today", value: fmt(today.length), sub: "next 24 hours" },
        { label: "Completed", value: fmt(cnt("Completed")), sub: "checked in and out" },
        { label: "In progress", value: cnt("In progress"), sub: "checked in" },
        { label: "Late", value: cnt("Late"), sub: "missing check-in", tone: "warn" },
        { label: "Uncovered", value: cnt("Unfilled"), sub: "no carer", tone: "bad" },
        { label: "Completed last 24h", value: fmt(doneAll.length), sub: fmt(dv) + " verified clean", onClick: () => { setMode("done"); setSt("All"); } },
        { label: "Verification exceptions", value: dDur + dMiss, sub: "held from billing and payroll", tone: "bad", onClick: () => wc.setSub(MOD, "Time Verification") },
      ]} />
      <Grid cols="minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr)">
        <Panel title="Check-in punctuality today" meta={liveRows.length + " check-ins received, compared with scheduled start"}>
          <Bars data={punct} />
        </Panel>
        <Panel title="Status mix now" meta={fmt(today.length) + " visits · " + hhmm(NOW_MINS)}>
          <Stack height={14} showLabels parts={STATUS_ORDER.map((x) => ({ value: cnt(x), color: STATUS_COLOR[x], label: x }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            <Stat k="Billing ready" v={fmt(today.filter((r) => r.billing === "Ready").length)} tone="ok" />
            <Stat k="Billing pending" v={fmt(today.filter((r) => r.billing !== "Ready").length)} />
          </div>
        </Panel>
        <Panel title="Last 24h verification" meta={fmt(doneAll.length) + " completed visits checked against schedule"} action={<GoLink page={MOD} sub="Time Verification">Review</GoLink>}>
          <Stack height={14} parts={[{ value: dv, color: TONE.ok.ink, label: "Verified" }, { value: dDur, color: TONE.warn.ink, label: "Duration Exception" }, { value: dMiss, color: TONE.bad.ink, label: "Missing Check-out" }]} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 14 }}>
            <Stat k="Verified" v={fmt(dv)} tone="ok" />
            <Stat k="Duration" v={dDur} tone="warn" />
            <Stat k="No check-out" v={dMiss} tone="bad" />
          </div>
        </Panel>
      </Grid>
      <Grid cols="minmax(0,1fr)">
        <Panel pad={false} title={mode === "today" ? "Today's visits" : "Completed last 24 hours"} meta={fmt(rows.length) + " of " + fmt(base.length) + " shown · click a row for the full record"}
          action={<Seg value={mode} options={[{ id: "today", label: "Today " + fmt(today.length) }, { id: "done", label: "Completed last 24h " + fmt(done.length) }]} onChange={(m) => { setMode(m); setSt("All"); }} />}>
          <div style={{ padding: "4px 18px 12px" }}>
            <Filters value={st} onChange={setSt} options={[{ id: "All", label: "All", count: base.length }, ...statuses.map((x) => ({ id: x, label: x, count: base.filter((r) => r.status === x).length }))]} />
          </div>
          <Table cols={cols} rows={rows} pageSize={14} dense rowKey={(r) => r.id} onRow={(r) => wc.open({ kind: "visit", id: r.id })}
            rowTone={(r) => (r.status === "Unfilled" || r.status === "Missing Check-out" ? "bad" : r.status === "Late" || r.status === "Duration Exception" ? "warn" : undefined)} />
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CLIENTS                                                             */
/* ------------------------------------------------------------------ */

function ClientPanel({ c }: { c: Client }) {
  const s = useWc();
  const today = VISITS.filter((v) => v.client === c.id).sort((a, b) => a.start - b.start);
  const done = DONE.filter((v) => v.client === c.id);
  const cancels = CANCEL_TODAY.filter((r) => r.client === c.id);
  const pkg = HSE_REQUESTS.find((r) => r.id === c.packageId);
  const exc = done.filter((d) => d.status !== "Verified");
  return (
    <Panel title={<span style={{ fontFamily: MONO }}>Client {c.id}</span>} meta={c.office + " · " + c.area + " · fictional record"} action={<RecLink to={{ kind: "client", id: c.id }} style={{ fontSize: 12 }}>Full record</RecLink>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        <Stat k="Service package" v={c.service} />
        <Stat k="Allocated hours" v={fmtH(c.weeklyHours) + "h / week"} />
        <Stat k="HSE package ID" v={pkg ? <RecLink to={{ kind: "hse", id: pkg.id }}>{pkg.id}</RecLink> : c.packageId} />
        <Stat k="Contact preference" v={c.contact} />
        <Stat k="Upcoming visits" v={c.upcoming + " next 30 days"} />
        <Stat k="Cancellations" v={c.cancellations30 + " in 30 days"} tone={c.cancellations30 >= 2 ? "warn" : undefined} />
      </div>
      <div style={{ ...label, marginTop: 14, marginBottom: 6 }}>Assigned carers</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {c.carers.map((n) => <span key={n} style={{ display: "inline-flex", alignItems: "center", height: 28, padding: "0 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,9px)", fontSize: 12 }}><CarerLink name={n} /></span>)}
      </div>
      <div style={{ ...label, marginTop: 14 }}>Visits, last and next 24 hours</div>
      {today.map((v) => (
        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
          <span style={{ fontFamily: MONO, color: "var(--faint)", width: 92 }}>Today {hhmm(v.start)}</span><VisitLink id={v.id} />
          <span style={{ flex: 1, minWidth: 0, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.carer || "No carer"}</span>
          <Chip status={statusOf(v, s.aoifeExpired)} />
        </div>
      ))}
      {done.map((d) => {
        const rv = review(d, s.recon);
        return (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
            <span style={{ fontFamily: MONO, color: "var(--faint)", width: 92 }}>{(absTimes(d).start < 0 ? "Sun " : "Today ") + hhmm(d.start)}</span><VisitLink id={d.id} />
            <span style={{ flex: 1, minWidth: 0, color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.actualMins === null ? "no check-out" : d.actualMins + " of " + d.mins + " min"}</span>
            <Chip tone={rv.tone === "ok" ? "ok" : d.status === "Verified" ? "ok" : rv.open ? "bad" : rv.tone}>{d.status === "Verified" ? "Verified" : rv.open ? d.status : rv.state}</Chip>
          </div>
        );
      })}
      {today.length + done.length === 0 && <div style={{ fontSize: 12, color: "var(--dim)", padding: "8px 0" }}>No visits in the last or next 24 hours.</div>}
      {cancels.length > 0 && <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 6 }}>{cancels.length} cancellation received today at {cancels.map((r) => r.time).join(", ")}.</div>}
      {exc.map((d) => {
        const rv = review(d, s.recon);
        return (
          <div key={d.id} style={{ marginTop: 10 }}>
            <AgentNote agent="Visit Integrity Agent" state={rv.open ? "attention" : "complete"}
              action={<Btn kind="ghost" style={{ height: 28 }} onClick={() => { wc.selectVisit(d.id); wc.setSub(MOD, "Time Verification"); }}>Review</Btn>}>
              {d.id}: scheduled {win(d.start, d.mins)}, recorded {d.actualOut === null ? "check-in only" : hhmm(d.actualIn) + "-" + hhmm(d.actualOut)}. {rv.open ? "Billing and payroll held for " + ownerLabel(d.owner) + "." : rv.state + "."}
            </AgentNote>
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 12, lineHeight: 1.5 }}>Operational details only. Pulse holds no clinical information about clients.</div>
    </Panel>
  );
}

function Clients() {
  const s = useWc();
  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("All");
  const [sel, setSel] = useState("MM-1042");
  const all = byOffice(CLIENTS, s.office);
  const services = Array.from(new Set(SERVICE_TYPES));
  const rows = all.filter((c) => (svc === "All" || c.service === svc) && (!q || (c.id + " " + c.carers.join(" ") + " " + c.area + " " + c.packageId).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (a.id === "MM-1042" ? -1 : b.id === "MM-1042" ? 1 : 0));
  const cur = all.find((c) => c.id === sel) || rows[0] || all[0];
  const excClients = new Set(byOffice(EXCEPTIONS, s.office).filter((d) => review(d, s.recon).open).map((d) => d.client));

  const cols: Col<Client>[] = [
    { key: "id", label: "Client", w: "118px", render: (c) => <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink)" }}>{c.id}</span>{c.id === "MM-1042" && <Chip tone="accent" style={{ height: 18, padding: "0 6px", fontSize: 10 }}>Pinned</Chip>}</span>, sort: (c) => c.id },
    { key: "office", label: "Office · area", w: "1.2fr", render: (c) => c.office + " · " + c.area, sort: (c) => c.office },
    { key: "service", label: "Service package", w: "1fr", sort: (c) => c.service },
    { key: "hours", label: "Hours / wk", w: "84px", align: "right", mono: true, render: (c) => fmtH(c.weeklyHours), sort: (c) => c.weeklyHours },
    { key: "carers", label: "Assigned carers", w: "1.5fr", render: (c) => c.carers.join(", ") },
    { key: "up", label: "Upcoming", w: "82px", align: "right", mono: true, render: (c) => String(c.upcoming), sort: (c) => c.upcoming },
    { key: "canc", label: "Cancels 30d", w: "90px", align: "right", mono: true, render: (c) => <span style={{ color: c.cancellations30 >= 2 ? "var(--warn)" : undefined }}>{c.cancellations30}</span>, sort: (c) => c.cancellations30 },
    { key: "contact", label: "Contact", w: "1fr" },
    { key: "pkg", label: "HSE package", w: "98px", render: (c) => <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ fontFamily: MONO, fontSize: 12 }}>{c.packageId}</span>{excClients.has(c.id) && <span title="Open verification exception" style={{ width: 6, height: 6, borderRadius: 2, background: "var(--bad)" }} />}</span>, sort: (c) => c.packageId },
  ];

  const svcData = services.map((x) => ({ label: x, value: all.filter((c) => c.service === x).length }));

  return (
    <>
      <ScopeBar title="Clients" sub="Fictional client records with operational details only: package, allocated hours, carers, visits and contact preference. No diagnoses or clinical notes are held in Pulse." />
      <KpiStrip min={150} items={[
        { label: "Active clients", value: fmt(all.length), sub: officeWord(s.office) },
        { label: "Allocated hours", value: fmt(Math.round(sumOf(all.map((c) => c.weeklyHours)))) + "h", sub: "per week across clients" },
        { label: "Visits today", value: fmt(byOffice(VISITS, s.office).length), sub: "scheduled for these clients" },
        { label: "Cancelled in 30 days", value: fmt(all.filter((c) => c.cancellations30 > 0).length), sub: "clients with 1 or more", tone: "warn" },
        { label: "Open time exceptions", value: excClients.size, sub: "clients with a held visit", tone: "bad", onClick: () => wc.setSub(MOD, "Time Verification") },
        { label: "Phone contact", value: pct(all.filter((c) => c.contact.startsWith("Phone")).length, all.length, 0), sub: "prefer a call" },
      ]} />
      <Grid cols="minmax(0,1fr) minmax(340px,400px)">
        <Panel pad={false} title="Client records" meta={fmt(rows.length) + " of " + fmt(all.length) + " · MM-1042 pinned"}
          action={<div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><SearchBox value={q} onChange={setQ} placeholder="Client, carer, area, package" /></div>}>
          <div style={{ padding: "4px 18px 12px" }}>
            <Filters value={svc} onChange={setSvc} options={[{ id: "All", label: "All services", count: all.length }, ...services.map((x) => ({ id: x, label: x, count: all.filter((c) => c.service === x).length }))]} />
          </div>
          <Table cols={cols} rows={rows} pageSize={15} dense rowKey={(c) => c.id} onRow={(c) => setSel(c.id)} selected={(c) => !!cur && c.id === cur.id}
            empty="No clients match this search." />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          {cur && <ClientPanel c={cur} />}
          <Panel title="Service mix" meta={fmt(all.length) + " clients by package type"}>
            <Bars data={svcData} highlight={cur ? services.indexOf(cur.service) : undefined} />
          </Panel>
        </div>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CANCELLATIONS                                                       */
/* ------------------------------------------------------------------ */

function HoursRecovered({ office }: { office: OfficeFilter }) {
  const rows = OFFICES.map((o) => {
    const t = CANCEL_TODAY.filter((r) => r.office === o.id);
    return { id: o.id, rec: sumOf(t.filter((r) => r.recovered).map((r) => r.hours)), lost: sumOf(t.filter((r) => !r.recovered).map((r) => r.hours)) };
  });
  const max = Math.max(1, ...rows.map((r) => Math.max(r.rec, r.lost)));
  const shown = office === "All" ? rows : rows.filter((r) => r.id === office);
  const rec = sumOf(shown.map((r) => r.rec)), lost = sumOf(shown.map((r) => r.lost));
  return (
    <Panel title="Recovered and lost care hours today" meta={"From " + byOffice(CANCEL_TODAY, office).length + " cancellations received since 07:00"}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Stat k="Hours recovered" v={fmtH(rec) + "h"} tone="ok" />
        <Stat k="Hours lost" v={fmtH(lost) + "h"} tone="bad" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 78px 1fr", gap: 8, marginTop: 14, ...label, fontSize: 8.5 }}>
        <span style={{ textAlign: "right" }}>Lost</span><span /><span>Recovered</span>
      </div>
      {rows.map((r, i) => {
        const dim = office !== "All" && office !== r.id;
        return (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 78px 1fr", gap: 8, alignItems: "center", padding: "6px 0", opacity: dim ? 0.35 : 1 }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
              {r.lost > 0 && <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--bad)" }}>{fmtH(r.lost)}h</span>}
              <div style={{ height: 10, width: (100 * r.lost) / max + "%", borderRadius: 3, background: "var(--bad)", transformOrigin: "right", animation: "sweep .8s var(--ease) " + i * 50 + "ms both" }} />
            </div>
            <div style={{ fontSize: 12, textAlign: "center", color: "var(--body)" }}>{r.id}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 10, width: (100 * r.rec) / max + "%", borderRadius: 3, background: "var(--ok)", transformOrigin: "left", animation: "sweep .8s var(--ease) " + i * 50 + "ms both" }} />
              {r.rec > 0 && <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--ok)" }}>{fmtH(r.rec)}h</span>}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 10 }}>
        <AgentNote agent="Ops Watchdog">Roscommon lost 8.5 care hours from the 07:00-09:00 cluster: 5 visits still have no replacement carer.</AgentNote>
      </div>
    </Panel>
  );
}

function Cancellations() {
  const s = useWc();
  const offices = byOffice(OFFICES.map((o) => ({ ...o, office: o.id })), s.office);
  const c30 = sumOf(offices.map((o) => o.cancellations30));
  const lostAll = K.cancellations30 - CANCEL_RECOVERED;
  const today = byOffice(CANCEL_TODAY, s.office);
  const recToday = today.filter((r) => r.recovered);
  const days = CANCEL_DAILY.map((_, i) => String(addDays(i - 30).getDate()));
  const avg = Math.round(K.cancellations30 / 30);

  type CRow = (typeof CANCEL_TODAY)[number];
  const cols: Col<CRow>[] = [
    { key: "time", label: "Time received", w: "100px", mono: true, sort: (r) => r.time },
    { key: "reason", label: "Reason", w: "1.3fr", sort: (r) => r.reason },
    { key: "office", label: "Office", w: "96px", sort: (r) => r.office },
    { key: "client", label: "Client", w: "86px", render: (r) => <ClientLink id={r.client} /> },
    { key: "carer", label: "Original carer", w: "1.3fr", render: (r) => <CarerLink name={r.carer} /> },
    { key: "rep", label: "Replacement found", w: "1.3fr", render: (r) => (r.replacement ? <CarerLink name={r.replacement} /> : <Chip tone="bad">Not found</Chip>) },
    { key: "hours", label: "Hours recovered", w: "118px", align: "right", render: (r) => <span style={{ fontFamily: MONO, fontSize: 12, color: r.recovered ? "var(--ok)" : "var(--bad)" }}>{r.recovered ? fmtH(r.hours) + "h" : "0h (" + fmtH(r.hours) + "h lost)"}</span>, sort: (r) => (r.recovered ? r.hours : -r.hours) },
  ];

  return (
    <>
      <ScopeBar title="Cancellations" sub="Why visits are cancelled, how many are recovered with a replacement carer, and the care hours lost when they are not." />
      <KpiStrip min={140} items={[
        { label: "Cancellations, 30 days", value: fmt(c30), sub: s.office === "All" ? "all offices" : pct(c30, K.cancellations30) + " of network" },
        { label: "Recovery rate", value: K.recoveryRate + "%", sub: fmt(CANCEL_RECOVERED) + " recovered, network", tone: "ok", spark: CANCEL_WEEKLY },
        { label: "Not recovered", value: fmt(lostAll), sub: "30 days, network", tone: "bad" },
        { label: "Cancelled today", value: today.length, sub: "received since 07:00", tone: "warn" },
        { label: "Recovered today", value: recToday.length, sub: pct(recToday.length, today.length || 1, 0) + " found cover", tone: "ok" },
        { label: "Hours lost today", value: fmtH(sumOf(today.filter((r) => !r.recovered).map((r) => r.hours))) + "h", sub: "no replacement carer", tone: "bad" },
      ]} />
      <Grid cols="minmax(0,1.55fr) minmax(0,1fr) minmax(0,.75fr)">
        <Panel title="Daily cancellations, last 30 days" meta={"All offices · " + fmt(K.cancellations30) + " total, " + avg + " a day on average"}>
          <Columns labels={days} series={[CANCEL_DAILY]} height={176} colors={["var(--accent)"]} />
        </Panel>
        <Panel title="Reasons, last 30 days" meta={fmt(K.cancellations30) + " cancellations · all offices"}>
          <Bars data={CANCEL_REASONS.map(([l, v], i) => ({ label: l, value: v, note: pct(v, K.cancellations30, 0), color: i === 0 ? "var(--accent)" : undefined }))} />
          <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 12, lineHeight: 1.5 }}>Carer unavailability is the largest single cause and the one Rostering can recover most often.</div>
        </Panel>
        <Panel title="Cancellation Recovery Rate" meta="Replacement carer found">
          <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 10px" }}>
            <Ring value={K.recoveryRate} size={128} stroke={11} tone="ok" label="recovered" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            <Stat k="Recovered" v={fmt(CANCEL_RECOVERED)} tone="ok" />
            <Stat k="Not recovered" v={fmt(lostAll)} tone="bad" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 11, color: "var(--faint)" }}>
            <Spark values={CANCEL_WEEKLY} w={70} h={20} /> weekly volume, 7 weeks
          </div>
        </Panel>
      </Grid>
      <Grid cols="minmax(0,1.6fr) minmax(0,1fr)">
        <Panel pad={false} title="Today's cancellations" meta={today.length + " received · " + recToday.length + " recovered · " + (today.length - recToday.length) + " without cover"}
          action={<GoLink page="Rostering" sub="Unfilled Hours">Unfilled Hours</GoLink>}>
          <Table cols={cols} rows={today} pageSize={11} dense rowKey={(r, i) => r.time + r.client + i}
            rowTone={(r) => (r.recovered ? undefined : "bad")} empty="No cancellations received for this office today." />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <HoursRecovered office={s.office} />
          <Panel title="By office, last 30 days" meta="Click to filter">
            <Bars highlight={s.office === "All" ? undefined : OFFICES.findIndex((o) => o.id === s.office)}
              data={OFFICES.map((o) => ({ label: o.id, value: o.cancellations30, note: pct(o.cancellations30, K.cancellations30, 0), onClick: () => wc.setOffice(s.office === o.id ? "All" : o.id), color: s.office === o.id ? "var(--accent)" : undefined }))} />
          </Panel>
        </div>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* TIME VERIFICATION                                                   */
/* ------------------------------------------------------------------ */

function TimeBar({ d }: { d: DoneVisit }) {
  const t = absTimes(d);
  const endAct = t.outAt ?? t.end + Math.min(60, Math.round(d.mins * 0.25));
  const lo = Math.floor((Math.min(t.start, t.inAt) - 10) / 15) * 15;
  const hi = Math.ceil((Math.max(t.end, endAct) + 10) / 15) * 15;
  const span = hi - lo;
  const step = span > 300 ? 60 : span > 150 ? 30 : 15;
  const ticks: number[] = [];
  for (let m = Math.ceil(lo / step) * step; m <= hi; m += step) ticks.push(m);
  const x = (m: number) => (100 * (m - lo)) / span;
  const exc = d.status !== "Verified";
  const lane = (lbl: string, from: number, to: number, color: string, open?: boolean, text?: ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", alignItems: "center", gap: 10, height: 38 }}>
      <span style={{ ...label, fontSize: 9 }}>{lbl}</span>
      <div style={{ position: "relative", height: 26, background: "var(--track)", borderRadius: 6 }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: x(from) + "%", width: x(to) - x(from) + "%", borderRadius: 6, background: open ? "repeating-linear-gradient(135deg," + color + " 0 6px, transparent 6px 11px)" : color, opacity: open ? 0.75 : 1, transformOrigin: "left", animation: "sweep .8s var(--ease) both", display: "flex", alignItems: "center", paddingLeft: 9, boxSizing: "border-box" }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: open ? "var(--ink)" : "var(--on-accent)", whiteSpace: "nowrap" }}>{text}</span>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        {lane("Scheduled", t.start, t.end, "var(--accent)", false, win(d.start, d.mins))}
        {lane("Actual", t.inAt, endAct, exc ? "var(--bad)" : "var(--ok)", t.outAt === null, t.outAt === null ? hhmm(d.actualIn) + "-?" : hhmm(d.actualIn) + "-" + hhmm(d.actualOut as number))}
        <div style={{ position: "absolute", left: 86, right: 0, top: 0, bottom: 0, pointerEvents: "none" }}>
          {[t.start, t.end].map((m, i) => <span key={i} style={{ position: "absolute", top: -4, bottom: -4, left: x(m) + "%", borderLeft: "1px dashed var(--border-strong)" }} />)}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 10, marginTop: 4 }}>
        <span />
        <div style={{ position: "relative", height: 16 }}>
          {ticks.map((m) => <span key={m} style={{ position: "absolute", left: x(m) + "%", transform: "translateX(-50%)", fontFamily: MONO, fontSize: 9.5, color: "var(--faint)" }}>{hhmm(m)}</span>)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8, fontSize: 11.5, color: "var(--dim)" }}>
        <span>Start offset <b style={{ fontFamily: MONO, color: Math.abs(t.inAt - t.start) > 5 ? "var(--warn)" : "var(--ink)" }}>{t.inAt - t.start >= 0 ? "+" : ""}{t.inAt - t.start} min</b></span>
        {t.outAt !== null ? <span>Finish offset <b style={{ fontFamily: MONO, color: Math.abs(t.outAt - t.end) > 5 ? "var(--warn)" : "var(--ink)" }}>{t.outAt - t.end >= 0 ? "+" : ""}{t.outAt - t.end} min</b></span> : <span style={{ color: "var(--bad)" }}>Finish not recorded</span>}
        <span style={{ flex: 1 }} />
        <Legend color="var(--accent)">Scheduled window</Legend>
        <Legend color={exc ? "var(--bad)" : "var(--ok)"}>Recorded by source system</Legend>
      </div>
    </div>
  );
}

const ACTIONS: { a: ReconAction; kind: "primary" | "ghost" | "danger"; what: (d: DoneVisit) => string }[] = [
  { a: "Approve Recorded Time", kind: "primary", what: (d) => d.actualMins === null ? "Not available: no check-out recorded" : "Bill and pay " + d.actualMins + " min as recorded" },
  { a: "Approve Scheduled Time", kind: "ghost", what: (d) => "Bill and pay the scheduled " + d.mins + " min" },
  { a: "Request Clarification", kind: "ghost", what: () => "Ask the carer and coordinator. Stays held" },
  { a: "Mark Cancelled", kind: "danger", what: () => "Not billed, not paid. Visit recorded as cancelled" },
];

function agentText(d: DoneVisit) {
  const t = absTimes(d);
  if (d.exception === "Missing check-out") return "Check-in received at " + hhmm(d.actualIn) + " but no check-out event arrived from the " + BRAND.careSystem + ". Recorded duration is unknown, so billing and payroll are held until the coordinator confirms the finish time with " + d.carer + ".";
  if (d.exception === "Manual correction requested") return "A manual correction was requested in the source system: " + d.actualMins + " of " + d.mins + " scheduled minutes recorded. Held until a coordinator confirms which time is right.";
  const ratio = Math.round((100 * (d.actualMins ?? 0)) / d.mins);
  const startOff = t.inAt - t.start;
  const endOff = t.outAt === null ? 0 : t.outAt - t.end;
  return "Recorded " + d.actualMins + " of " + d.mins + " scheduled minutes (" + ratio + "%). Check-in " + Math.abs(startOff) + " min " + (startOff >= 0 ? "after" : "before") + " scheduled start, check-out " + Math.abs(endOff) + " min " + (endOff < 0 ? "before" : "after") + " scheduled end. Location " + (d.gps === "Matched" ? "matched at both events" : "not available") + " in the source system. Held from billing and payroll; nothing is adjusted automatically. Suggest confirming with " + d.carer + " before approving.";
}

function TimeVerification() {
  const s = useWc();
  const [view, setView] = useState<"exc" | "ok">("exc");
  const excRows = byOffice(EXCEPTIONS, s.office);
  const okRows = byOffice(DONE, s.office).filter((d) => d.status === "Verified");
  const rows = view === "exc" ? excRows : okRows;
  const pool = byOffice(DONE, s.office);
  const d = pool.find((v) => v.id === s.selectedVisit) || excRows[0] || pool[0];
  const openExc = excRows.filter((v) => review(v, s.recon).open);
  const held = sumOf(openExc.map((v) => v.mins)) / 60;

  const cols: Col<DoneVisit>[] = [
    { key: "id", label: "Visit", w: "92px", render: (v) => <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink)" }}>{v.id}</span>, sort: (v) => v.id },
    { key: "office", label: "Office", w: "80px", sort: (v) => v.office },
    { key: "sched", label: "Scheduled", w: "100px", mono: true, render: (v) => win(v.start, v.mins), sort: (v) => absTimes(v).start },
    { key: "rec", label: "Recorded", w: "86px", mono: true, render: (v) => (v.actualMins === null ? <span style={{ color: "var(--bad)" }}>no out</span> : <span style={{ color: Math.abs(v.actualMins - v.mins) > 5 ? "var(--bad)" : undefined }}>{v.actualMins}/{v.mins}</span>), sort: (v) => (v.actualMins ?? -1) - v.mins },
    { key: "state", label: view === "exc" ? "Exception · state" : "Status", w: "minmax(150px,1.6fr)", render: (v) => { const rv = review(v, s.recon); return v.status === "Verified" ? <Chip tone="ok">Verified</Chip> : <Chip tone={rv.open ? (v.exception === "Missing check-out" ? "bad" : "warn") : rv.tone}>{rv.open ? (v.exception || v.status) + (rv.state === "Clarification requested" ? " · clarifying" : "") : rv.state}</Chip>; } },
  ];

  const rv = d ? review(d, s.recon) : null;
  const r = d ? s.recon[d.id] : undefined;
  const t = d ? absTimes(d) : null;

  return (
    <>
      <ScopeBar title="Time Verification" sub={"Did a scheduled visit happen, and for about as long as planned. Pulse compares check-in and check-out events from the " + BRAND.careSystem + " with the schedule and holds billing and payroll until a person decides."} />
      <KpiStrip min={140} items={[
        { label: "Completed last 24h", value: fmt(pool.length), sub: officeWord(s.office) },
        { label: "Verified clean", value: fmt(okRows.length), sub: pct(okRows.length, pool.length) + " within tolerance", tone: "ok" },
        { label: "Open exceptions", value: openExc.length, sub: "of " + excRows.length + " flagged", tone: "bad" },
        { label: "Hours held", value: fmtH(held) + "h", sub: "billing and payroll", tone: "bad" },
        { label: "Duration exceptions", value: excRows.filter((v) => v.status === "Duration Exception").length, sub: "short, long or corrected", tone: "warn" },
        { label: "Missing check-out", value: excRows.filter((v) => v.status === "Missing Check-out").length, sub: "no finish event", tone: "bad" },
      ]} />
      <Grid cols="minmax(0,1fr) minmax(0,1.35fr)">
        <Panel pad={false} title={view === "exc" ? "Visits awaiting review" : "Verified visits"} meta={view === "exc" ? openExc.length + " open · select a visit to compare" : fmt(okRows.length) + " verified automatically"}
          action={<Seg value={view} options={[{ id: "exc", label: "Exceptions " + excRows.length }, { id: "ok", label: "Verified " + fmt(okRows.length) }]} onChange={setView} />}>
          <Table cols={cols} rows={rows} pageSize={view === "exc" ? 15 : 15} dense rowKey={(v) => v.id} onRow={(v) => wc.selectVisit(v.id)} selected={(v) => !!d && v.id === d.id}
            rowTone={(v) => { if (v.status === "Verified") return undefined; const x = review(v, s.recon); return x.open ? (v.status === "Missing Check-out" ? "bad" : "warn") : "ok"; }} />
        </Panel>

        {d && rv && t ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <Panel title={<span style={{ display: "inline-flex", gap: 10, alignItems: "baseline" }}><span style={{ fontFamily: MONO }}>{d.id}</span><span style={{ fontSize: 12, fontWeight: 400, color: "var(--dim)" }}>{d.service} · {d.office}</span></span>}
              meta={<>Client <ClientLink id={d.client} /> · carer <CarerLink name={d.carer} /> · {t.start < 0 ? "Sun 27 Sep" : TODAY_LABEL}</>}
              action={<Chip tone={d.status === "Verified" ? "ok" : rv.open ? "bad" : rv.tone} style={{ height: 26, fontSize: 12 }}>{d.status === "Verified" ? "VERIFIED" : rv.open ? d.status.toUpperCase() : rv.state.toUpperCase()}</Chip>}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "stretch" }}>
                <div style={{ padding: "14px 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)" }}>
                  <div style={label}>Scheduled</div>
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, letterSpacing: "-1px", marginTop: 8 }}>{win(d.start, d.mins)}</div>
                  <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>{d.mins} minutes</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 70 }}>
                  <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: d.actualMins === null ? "var(--bad)" : Math.abs(d.actualMins - d.mins) > 5 ? "var(--bad)" : "var(--ok)" }}>
                    {d.actualMins === null ? "?" : (d.actualMins - d.mins >= 0 ? "+" : "") + (d.actualMins - d.mins)}
                  </span>
                  <span style={{ ...label, fontSize: 8.5 }}>{d.actualMins === null ? "unknown" : "min vs plan"}</span>
                </div>
                <div style={{ padding: "14px 16px", background: d.status === "Verified" ? "var(--surface-2)" : "var(--bad-soft)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)" }}>
                  <div style={label}>Actual</div>
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, letterSpacing: "-1px", marginTop: 8 }}>{hhmm(d.actualIn)}-{d.actualOut === null ? "--:--" : hhmm(d.actualOut)}</div>
                  <div style={{ fontSize: 13, color: d.status === "Verified" ? "var(--dim)" : "var(--bad)", marginTop: 4 }}>{d.actualMins === null ? "No check-out received" : d.actualMins + " minutes · " + Math.round((100 * d.actualMins) / d.mins) + "% of scheduled"}</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}><TimeBar d={d} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,.75fr) minmax(0,.75fr) minmax(0,1.9fr) minmax(0,.8fr)", gap: 7, marginTop: 14 }}>
                <Stat k="Status" v={d.status === "Verified" ? "Verified" : rv.open ? d.status : rv.state} tone={d.status === "Verified" || !rv.open ? "ok" : "bad"} />
                <Stat k="Billing" v={rv.held ? "Held" : rv.billing} tone={rv.held ? "bad" : rv.billingTone} />
                <Stat k="Payroll" v={rv.held ? "Held" : rv.billing === "Not billed" ? "Not paid" : rv.billing} tone={rv.held ? "bad" : rv.billingTone} />
                <Stat k="Owner" v={<span title={ownerLabel(d.owner)}>{ownerLabel(d.owner)}</span>} />
                <Stat k="Action" v={d.status === "Verified" ? "None" : rv.open ? (r ? "Awaiting clarification" : "Review") : "Done"} tone={rv.open ? "warn" : undefined} />
              </div>
            </Panel>

            <Grid cols="minmax(0,1fr) minmax(0,1.1fr)" style={{ marginTop: 0 }}>
              <Panel title="Evidence" meta={"All events from the " + BRAND.careSystem}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...label, fontSize: 8.5 }}>Location verification</div>
                    <div style={{ fontSize: 12.5, marginTop: 4 }}>{d.gps} <span style={{ color: "var(--faint)" }}>· from source system</span></div>
                  </div>
                  <Chip tone={d.gps === "Matched" ? "ok" : d.gps === "Not available" ? "neutral" : "bad"}>{d.gps}</Chip>
                </div>
                <div style={{ fontSize: 11, color: "var(--faint)", margin: "6px 2px 12px", lineHeight: 1.45 }}>Pulse does not track carers. It reads the location result the source system attaches to each event.</div>
                <Timeline items={[
                  { when: dayTag(t.start), text: "Scheduled start. Window " + win(d.start, d.mins) + ", " + d.mins + " min", tone: "neutral" },
                  { when: dayTag(t.inAt), text: "Check-in event received · location " + (d.gps === "Not available" ? "not available" : "matched"), tone: t.inAt - t.start > 5 ? "warn" : "ok", who: d.carer },
                  t.outAt === null
                    ? { when: dayTag(t.end), text: "Scheduled finish passed. No check-out event received", tone: "bad" as Tone }
                    : { when: dayTag(t.outAt), text: "Check-out event received · " + d.actualMins + " min recorded", tone: (d.status === "Verified" ? "ok" : "warn") as Tone, who: d.carer },
                  d.status === "Verified"
                    ? { when: dayTag((t.outAt ?? t.end) + 2), text: "Visit Integrity Agent: within tolerance. Released to billing and payroll", tone: "ok" as Tone }
                    : { when: dayTag((t.outAt ?? t.end + 30) + 2), text: "Visit Integrity Agent flagged " + (d.exception || d.status).toLowerCase() + ". Billing and payroll held. Assigned to " + ownerLabel(d.owner), tone: "bad" as Tone },
                  ...(r ? [{ when: r.at, text: r.by + " chose " + r.action + (r.action === "Request Clarification" ? ". Still held" : ". Released"), tone: (r.action === "Request Clarification" ? "warn" : "ok") as Tone, who: "Pulse" }] : []),
                ]} />
              </Panel>
              <Panel title="Coordinator review" meta={d.status === "Verified" ? "No review needed" : "A person decides billing and payroll"} tone={rv.open && d.status !== "Verified" ? "warn" : undefined}>
                {d.status !== "Verified" && <AgentNote agent="Visit Integrity Agent" state={rv.open ? "attention" : "complete"}>{agentText(d)}</AgentNote>}
                {d.status === "Verified" && <AgentNote agent="Visit Integrity Agent" state="complete">Recorded {d.actualMins} of {d.mins} scheduled minutes, within the 5-minute tolerance. Released to billing and payroll automatically.</AgentNote>}
                {r && (
                  <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: "var(--r-sm,10px)", background: r.action === "Request Clarification" ? "var(--warn-soft)" : "var(--ok-soft)", fontSize: 12.5 }}>
                    {r.by} chose <b>{r.action}</b> at {r.at}. {r.action === "Request Clarification" ? "Billing and payroll stay held." : "Released to billing and payroll."}
                  </div>
                )}
                {d.status !== "Verified" && rv.open && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                    {ACTIONS.map((x) => {
                      const disabled = (x.a === "Approve Recorded Time" && d.actualMins === null) || (r && r.action === x.a);
                      return (
                        <div key={x.a} style={{ padding: 9, border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", background: "var(--surface-2)", minWidth: 0 }}>
                          <Btn kind={x.kind} disabled={!!disabled} onClick={() => wc.reconcile(d.id, x.a)} style={{ width: "100%", justifyContent: "center" }}>{x.a}</Btn>
                          <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, lineHeight: 1.4 }}>{x.what(d)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: 12 }}><HumanGate>Billing and payroll change only when a person approves. Mock action, frontend only.</HumanGate></div>
                <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                  <GoLink page="Billing & Payroll" sub="Reconciliation">Billing & Payroll Reconciliation</GoLink>
                  <GoLink page={MOD} sub="Exceptions">Exceptions queue</GoLink>
                </div>
              </Panel>
            </Grid>
          </div>
        ) : (
          <Panel title="No visit selected"><div style={{ fontSize: 12.5, color: "var(--dim)" }}>No completed visits for this office in the last 24 hours.</div></Panel>
        )}
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* EXCEPTIONS                                                          */
/* ------------------------------------------------------------------ */

type QType = "Missing check-in" | "Missing check-out" | "Short visit" | "Long visit" | "Late visit" | "No-show" | "Manual correction requested";
const QTYPES: QType[] = ["Missing check-in", "Missing check-out", "Short visit", "Long visit", "Late visit", "No-show", "Manual correction requested"];
type QItem = {
  key: string; type: QType; visit: string; client: string; carer: string | null; carerId: string | null; office: OfficeId;
  window: string; detail: string; owner: string; age: number; state: string; stateTone: Tone; mins: number; live: boolean; open: boolean;
};

/* Today's late visits, oldest first. The two most overdue are treated as no-shows. */
const LATE_SORTED = VISITS.filter((v) => v.status === "Late").sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
const NO_SHOW_IDS = new Set(LATE_SORTED.slice(0, 2).map((v) => v.id));

function buildQueue(recon: Recon): QItem[] {
  const ver: QItem[] = EXCEPTIONS.map((d) => {
    const t = absTimes(d);
    const rv = review(d, recon);
    const type = (d.exception || "Missing check-out") as QType;
    const detail = type === "Missing check-out" ? "Checked in " + hhmm(d.actualIn) + ", no check-out" : type === "Manual correction requested" ? "Correction asked: " + d.actualMins + " of " + d.mins + " min" : d.actualMins + " of " + d.mins + " min recorded";
    return {
      key: d.id, type, visit: d.id, client: d.client, carer: d.carer, carerId: null, office: d.office, window: dayTag(t.start) + "-" + hhmm(t.end), detail,
      owner: ownerLabel(d.owner), age: NOW_MINS - (t.outAt ?? t.end), state: rv.state, stateTone: rv.open ? (rv.state === "Awaiting review" ? "bad" : "warn") : rv.tone,
      mins: d.mins, live: false, open: rv.open,
    };
  });
  const live: QItem[] = LATE_SORTED.map((v) => {
    const late = NOW_MINS - v.start;
    const type: QType = NO_SHOW_IDS.has(v.id) ? "No-show" : late >= 15 ? "Missing check-in" : "Late visit";
    return {
      key: v.id, type, visit: v.id, client: v.client, carer: v.carer, carerId: v.carerId, office: v.office, window: win(v.start, v.mins),
      detail: type === "No-show" ? "No check-in " + late + " min after start" : "No check-in, " + late + " min past start",
      owner: ownerLabel(officeOf(v.office).coordinator), age: late, state: type === "No-show" ? "Escalated to coordinator" : "Open", stateTone: type === "No-show" ? "bad" : "warn",
      mins: v.mins, live: true, open: true,
    };
  });
  return live.concat(ver);
}

function Exceptions() {
  const s = useWc();
  const [f, setF] = useState<"All" | QType>("All");
  const [showResolved, setShowResolved] = useState<"all" | "open">("all");
  const all = byOffice(buildQueue(s.recon), s.office);
  const base = showResolved === "open" ? all.filter((q) => q.open) : all;
  const rows = f === "All" ? base : base.filter((q) => q.type === f);
  const openVer = all.filter((q) => !q.live && q.open);
  const liveItems = all.filter((q) => q.live);
  const oldest = all.filter((q) => q.open).reduce((m, q) => Math.max(m, q.age), 0);
  const owners = Array.from(new Set(all.map((q) => q.owner))).map((o) => ({ o, open: all.filter((q) => q.owner === o && q.open).length, live: all.filter((q) => q.owner === o && q.live).length })).sort((a, b) => b.open - a.open);

  const cols: Col<QItem>[] = [
    { key: "type", label: "Exception", w: "1.35fr", render: (q) => <Chip tone={q.type === "No-show" || q.type === "Missing check-out" ? "bad" : q.type === "Late visit" || q.type === "Missing check-in" ? "warn" : q.type === "Long visit" || q.type === "Manual correction requested" ? "info" : "warn"}>{q.type}</Chip>, sort: (q) => q.type },
    { key: "visit", label: "Visit", w: "94px", render: (q) => <VisitLink id={q.visit} />, sort: (q) => q.visit },
    { key: "carer", label: "Carer", w: "1.2fr", render: (q) => <CarerLink name={q.carer} id={q.carerId} />, sort: (q) => q.carer || "" },
    { key: "office", label: "Office", w: "84px", sort: (q) => q.office },
    { key: "window", label: "Scheduled", w: "112px", mono: true, render: (q) => q.window },
    { key: "detail", label: "Detail", w: "1.6fr", render: (q) => <span style={{ color: "var(--dim)" }}>{q.detail}</span> },
    { key: "owner", label: "Owner", w: "1.1fr", render: (q) => <span title={q.owner}>{q.owner.replace(/^.* Coordinator \((.*)\)$/, "$1")}</span>, sort: (q) => q.owner },
    { key: "age", label: "Age", w: "70px", align: "right", mono: true, render: (q) => ageLabel(q.age), sort: (q) => q.age },
    { key: "state", label: "State", w: "1.3fr", render: (q) => <Chip tone={q.stateTone}>{q.state}</Chip>, sort: (q) => q.state },
  ];

  return (
    <>
      <ScopeBar title="Exceptions" sub={"One queue for visits that did not go to plan: " + EXCEPTIONS.length + " verification exceptions from the last 24 hours awaiting a person, plus today's live check-in issues from the " + BRAND.careSystem + "."} />
      <KpiStrip min={140} items={[
        { label: "In queue", value: all.length, sub: "verification + live" },
        { label: "Awaiting review", value: openVer.length, sub: "billing and payroll held", tone: "bad", onClick: () => wc.setSub(MOD, "Time Verification") },
        { label: "Live issues today", value: liveItems.length, sub: "late with no check-in", tone: "warn" },
        { label: "No-shows", value: liveItems.filter((q) => q.type === "No-show").length, sub: "escalated to coordinator", tone: "bad" },
        { label: "Hours held", value: fmtH(sumOf(openVer.map((q) => q.mins)) / 60) + "h", sub: "scheduled hours on hold", tone: "bad" },
        { label: "Oldest open", value: ageLabel(oldest), sub: "since the visit ended" },
      ]} />
      <Grid cols="minmax(0,1fr) minmax(270px,300px)">
        <Panel pad={false} title="Exception queue" meta="Verification items open in Time Verification; live items open the visit record"
          action={<Seg value={showResolved} options={[{ id: "all", label: "All states" }, { id: "open", label: "Open only" }]} onChange={setShowResolved} />}>
          <div style={{ padding: "4px 18px 12px" }}>
            <Filters value={f} onChange={setF} options={[{ id: "All" as const, label: "All", count: base.length }, ...QTYPES.map((x) => ({ id: x, label: x, count: base.filter((q) => q.type === x).length }))]} />
          </div>
          <Table cols={cols} rows={rows} pageSize={15} dense rowKey={(q) => q.key}
            onRow={(q) => { if (q.live) wc.open({ kind: "visit", id: q.visit }); else { wc.selectVisit(q.visit); wc.setSub(MOD, "Time Verification"); } }}
            rowTone={(q) => (!q.open ? "ok" : q.stateTone)} empty="No exceptions for this office." />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="By type" meta={base.length + " items"}>
            <Bars data={QTYPES.map((x) => ({ label: x, value: base.filter((q) => q.type === x).length, color: x === "No-show" || x === "Missing check-out" ? "var(--bad)" : x === "Short visit" || x === "Late visit" || x === "Missing check-in" ? "var(--warn)" : undefined, onClick: () => setF(x) }))} />
          </Panel>
          <Panel title="Owners" meta="Open items per coordinator">
            {owners.map((o) => (
              <ListRow key={o.o} title={o.o} meta={o.live ? o.live + " live today" : "Verification only"}
                right={<span style={{ fontFamily: MONO, fontSize: 13, color: o.open ? "var(--ink)" : "var(--faint)" }}>{o.open}</span>} />
            ))}
          </Panel>
          <AgentNote agent="Visit Integrity Agent" state={openVer.length ? "attention" : "complete"}>
            {openVer.length} completed visits do not match their schedule. Each is held from billing and payroll until the office coordinator picks a time. VIS-10482 in Galway is the oldest short visit on Niamh Kelly's list.
          </AgentNote>
          <AgentNote agent="Ops Watchdog" state={liveItems.length ? "attention" : "complete"}>
            {liveItems.length} visits have no check-in yet. The {liveItems.filter((q) => q.type === "No-show").length} most overdue are treated as no-shows and escalated; the coordinator decides whether to send cover.
          </AgentNote>
          <GoLink page="Billing & Payroll" sub="Reconciliation">Billing & Payroll Reconciliation</GoLink>
        </div>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function CareDelivery() {
  const s = useWc();
  const sub = s.sub["Care Delivery"];
  return (
    <Page>
      {sub === "Visits" ? <Visits /> : sub === "Clients" ? <Clients /> : sub === "Cancellations" ? <Cancellations />
        : sub === "Time Verification" ? <TimeVerification /> : sub === "Exceptions" ? <Exceptions /> : <Today />}
    </Page>
  );
}
