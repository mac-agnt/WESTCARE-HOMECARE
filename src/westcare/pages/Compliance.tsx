/* Compliance: the proactive compliance engine. Every count on these screens
   is derived from COMPLIANCE / CARERS in model.ts, filtered by the global
   office pill and moved only by session decisions (the Aoife scenario,
   reminders). The Compliance Agent detects, reminds and escalates; a person
   always verifies the document. */
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  AOIFE, AOIFE_UPCOMING_VISITS, AUDIT_ATTENTION, CANDIDATES, CARERS, COMPLIANCE, COMPLIANCE_TREND, CRITICAL, DONE, EXPIRED,
  GARDA_STAGES, K, LIAM, OFFICE_IDS, REQUIREMENTS, RESTRICTED_CARER_IDS, SARAH, SYSTEMS, TRAINING, VISITS, WEEKS,
  complianceByOffice, fmt, hhmm, officeOf, pct,
  type Carer, type ComplianceItem, type OfficeId,
} from "../model";
import { useLive, useWc, wc } from "../store";
import {
  AgentNote, Bars, Btn, Chip, Filters, GoLink, Grid, HumanGate, KpiStrip, Legend, ListRow, MONO, Page, Panel, RecLink, Ring,
  ScopeBar, Stat, TONE, Table, Timeline, Trend, byOffice, label, type Col, type Kpi, type Tone,
} from "../ui";

/* ------------------------------------------------------------------ */
/* Derived data                                                        */
/* ------------------------------------------------------------------ */

const isAoifePMH = (i: ComplianceItem) => i.carerId === AOIFE.id && i.requirement === "Patient Manual Handling";
const AOIFE_PMH = COMPLIANCE.find(isAoifePMH)!;
const AOIFE_GARDA = COMPLIANCE.find((i) => i.carerId === AOIFE.id && i.requirement === "Garda Vetting")!;

/** COMPLIANCE with the Aoife scenario applied. */
function deriveItems(aoife: boolean): ComplianceItem[] {
  if (!aoife) return COMPLIANCE;
  return COMPLIANCE.map((i): ComplianceItem => (isAoifePMH(i)
    ? { ...i, status: "Expired", daysRemaining: -1, contact: "Escalated to coordinator", lastAction: "Restricted from manual-handling visits" }
    : i));
}
/** Valid but inside 30 days (same rule as EXPIRING in model.ts). */
const expiringOf = (list: ComplianceItem[]) => list.filter((i) => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 30 && i.status !== "Awaiting verification" && i.status !== "Expired");
const days = (i: ComplianceItem) => (i.daysRemaining === null ? 999 : i.daysRemaining);
const sumVisits = (list: ComplianceItem[]) => list.reduce((a, i) => a + i.futureVisits, 0);

function useScope() {
  const s = useWc();
  const L = useLive();
  const d = useMemo(() => {
    const items = deriveItems(s.aoifeExpired);
    const scoped = byOffice(items, s.office);
    const carers = byOffice(CARERS, s.office);
    const restrictedIds = new Set(RESTRICTED_CARER_IDS);
    if (s.aoifeExpired) restrictedIds.add(AOIFE.id);
    const restricted = carers.filter((c) => restrictedIds.has(c.id)).length;
    const expiring = expiringOf(scoped).sort((a, b) => days(a) - days(b));
    const critical = expiring.filter((i) => days(i) <= 7);
    const expired = scoped.filter((i) => i.status === "Expired").sort((a, b) => days(a) - days(b));
    const missing = scoped.filter((i) => i.status === "Missing");
    const awaiting = scoped.filter((i) => i.status === "Awaiting verification");
    return { items, scoped, carers, restrictedIds, restricted, expiring, critical, expired, missing, awaiting };
  }, [s.office, s.aoifeExpired]);
  /* At "All offices" the live anchors and the derived rows are the same numbers. */
  const all = s.office === "All";
  return {
    ...d, s, office: s.office,
    kCritical: all ? L.critical : d.critical.length,
    kExpired: all ? L.expired : d.expired.length,
    kRestricted: all ? L.restricted : d.restricted,
    kFully: all ? L.fullyCompliant : d.carers.length - d.restricted,
  };
}

const KIND_LABEL: Record<ComplianceItem["kind"], string> = { garda: "Garda", training: "Training", vehicle: "Vehicle", personnel: "Personnel" };
const scopeLabel = (o: string) => (o === "All" ? "All offices" : o);
const plural = (n: number, one: string, many = one + "s") => fmt(n) + " " + (n === 1 ? one : many);

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

const toneForDays = (d: number | null): Tone => (d === null || d < 0 ? "bad" : d <= 1 ? "bad" : d <= 7 ? "warn" : d <= 14 ? "accent" : "neutral");
const markOf = (d: number | null) => (d === null ? "Missing" : d < 0 ? "Expired" : d <= 1 ? "1d mark" : d <= 7 ? "7d mark" : d <= 14 ? "14d mark" : d <= 30 ? "30d mark" : null);
function daysText(i: ComplianceItem) {
  const d = i.daysRemaining;
  if (d === null) return "Not on file";
  if (d < 0) return Math.abs(d) + (d === -1 ? " day" : " days") + " overdue";
  if (d === 0) return "Today";
  return d + (d === 1 ? " day" : " days");
}

function DaysCell({ i }: { i: ComplianceItem }) {
  const t = TONE[toneForDays(i.daysRemaining)];
  const m = markOf(i.daysRemaining);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontFamily: MONO, color: t.ink }}>{daysText(i)}</span>
      {m && <span style={{ fontFamily: MONO, fontSize: 9.5, padding: "2px 5px", borderRadius: 4, background: t.soft, color: t.ink }}>{m}</span>}
    </span>
  );
}

function RemindBtn({ i }: { i: ComplianceItem }) {
  const s = useWc();
  const at = s.reminded[i.id];
  if (at) return <Chip tone="ok">Sent {at}</Chip>;
  return <Btn kind="ghost" style={{ height: 26, padding: "0 10px", fontSize: 11.5 }} onClick={() => wc.remind(i.id, i.carer, i.requirement)}>Send reminder</Btn>;
}

const carerLink = (i: { carerId: string; carer: string }) => <RecLink to={{ kind: "carer", id: i.carerId }}>{i.carer}</RecLink>;

function DayBadge({ i }: { i: ComplianceItem }) {
  const t = TONE[toneForDays(i.daysRemaining)];
  const d = i.daysRemaining;
  return (
    <div style={{ width: 42, height: 42, flex: "none", borderRadius: "var(--r-sm,10px)", background: t.soft, color: t.ink, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, lineHeight: 1 }}>{d === null ? "?" : d < 0 ? "0" : d}</div>
      <div style={{ fontSize: 8.5, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 3 }}>{d !== null && d < 0 ? "lapsed" : d === 1 ? "day" : "days"}</div>
    </div>
  );
}

function Toggle({ on, onChange, locked }: { on: boolean; onChange: () => void; locked?: boolean }) {
  return (
    <button role="switch" aria-checked={on} disabled={locked} onClick={locked ? undefined : onChange}
      style={{ position: "relative", width: 36, height: 20, flex: "none", borderRadius: 10, border: "1px solid var(--border)", padding: 0, cursor: locked ? "default" : "pointer", background: on ? "var(--accent)" : "var(--track)", opacity: locked ? 0.55 : 1 }}>
      <span style={{ position: "absolute", top: 2, left: 2, width: 14, height: 14, borderRadius: 7, background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transform: on ? "translateX(16px)" : "none", transition: "transform .2s var(--ease)" }} />
    </button>
  );
}

/** 30 days to expiry, left to right, with the 14 / 7 / 1 day marks. */
function ThresholdTrack({ d }: { d: number | null }) {
  const x = (n: number) => 100 - (Math.max(0, Math.min(30, n)) / 30) * 100;
  const t = toneForDays(d);
  const pos = d === null || d < 0 ? 100 : x(d);
  return (
    <div style={{ position: "relative", height: 34, marginTop: 12 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 8, height: 6, borderRadius: 3, background: "var(--track)" }} />
      <div style={{ position: "absolute", left: 0, width: pos + "%", top: 8, height: 6, borderRadius: 3, background: TONE[t].ink, transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} />
      {[30, 14, 7, 1].map((m) => (
        <div key={m} style={{ position: "absolute", left: x(m) + "%", top: 3, height: 16, borderLeft: "1px solid var(--border-strong)" }}>
          <span style={{ position: "absolute", top: 18, left: 0, transform: m === 30 ? "none" : "translateX(-50%)", fontFamily: MONO, fontSize: 9.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{m}d</span>
        </div>
      ))}
      <span style={{ position: "absolute", right: 0, top: 21, fontFamily: MONO, fontSize: 9.5, color: "var(--faint)" }}>Expiry</span>
    </div>
  );
}

function Bar({ value, max, tone = "accent", h = 6 }: { value: number; max: number; tone?: Tone; h?: number }) {
  return (
    <div style={{ height: h, borderRadius: h / 2, background: "var(--track)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: Math.max(1.5, (100 * value) / Math.max(1, max)) + "%", background: TONE[tone].ink, borderRadius: h / 2, transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} />
    </div>
  );
}

const noteStyle: CSSProperties = { fontSize: 12, color: "var(--dim)", lineHeight: 1.55 };

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

const FLAGGED = new Set(COMPLIANCE.map((i) => i.carerId));
const cleanIn = (o: OfficeId, k: number): Carer => CARERS.filter((c) => c.office === o && !FLAGGED.has(c.id) && !c.story)[k];
const RESOLVED = [
  { c: cleanIn("Galway", 0), req: "Patient Manual Handling", by: "Niamh Kelly", when: "Today 09:40", note: "GSW Training certificate matched to the record" },
  { c: cleanIn("Sligo", 0), req: "Car Insurance", by: "Emma Brennan", when: "Today 09:12", note: "Renewed certificate checked, policy dates confirmed" },
  { c: cleanIn("Mayo", 0), req: "Garda Vetting", by: "Rachel Byrne", when: "Today 08:31", note: "Vetting disclosure received and filed" },
  { c: cleanIn("Roscommon", 0), req: "NCT", by: "Ciarán Moran", when: "Sun 27 Sep", note: "NCT certificate uploaded by the carer and checked" },
  { c: cleanIn("Cavan", 0), req: "Safeguarding Adults", by: "Gráinne Reilly", when: "Sat 26 Sep", note: "GSW completion certificate checked" },
  { c: cleanIn("Monaghan", 0), req: "Car Tax", by: "Declan McKenna", when: "Fri 25 Sep", note: "Motor tax record checked against the vehicle" },
  { c: cleanIn("Galway", 1), req: "International Garda Clearance", by: "Rachel Byrne", when: "Fri 25 Sep", note: "Police certificate from country of residence filed" },
  { c: cleanIn("Mayo", 1), req: "Fire Safety Awareness", by: "Sean Doyle", when: "Thu 24 Sep", note: "GSW Training completion matched" },
];

type Act = { at: string; office: OfficeId | "All"; who: string; tone: Tone; text: ReactNode };
function staticActivity(): Act[] {
  const out: Act[] = [];
  const todayItem = CRITICAL.find((i) => i.daysRemaining === 0);
  const uploaded = CRITICAL.find((i) => i.contact.startsWith("Document uploaded"));
  const vehRisk = CRITICAL.find((i) => i.kind === "vehicle" && i.carerId !== LIAM.id && i.status === "Expiring" && days(i) >= 4);
  const expGarda = EXPIRED.find((i) => i.requirement === "Garda Vetting");
  const sms = CRITICAL.find((i) => i.contact === "SMS delivered");
  out.push({ at: "08:12", office: "Galway", who: "Compliance Agent", tone: "accent", text: <>Reminded {carerLink(AOIFE_PMH)} to renew Patient Manual Handling. 6 days left, 38 future visits depend on it.</> });
  if (todayItem) {
    const co = officeOf(todayItem.office).coordinator;
    out.push({ at: "07:58", office: todayItem.office, who: co + ", " + todayItem.office + " Coordinator", tone: "bad", text: <>Escalated to Rachel Byrne: {carerLink(todayItem)}'s {todayItem.requirement} expires today. {todayItem.futureVisits} future visits.</> });
  }
  out.push({ at: "07:45", office: "Sligo", who: "Compliance Agent", tone: "accent", text: <>Reminded {carerLink({ carerId: LIAM.id, carer: LIAM.name })} to upload renewed car insurance. 6 days left, 42 visits in the next 30 days.</> });
  if (vehRisk) {
    const d = days(vehRisk);
    const n = Math.max(1, Math.round((vehRisk.futureVisits * (7 - d)) / 30));
    out.push({ at: "07:31", office: vehRisk.office, who: "Roster Optimiser", tone: "warn", text: <>{plural(n, "future visit")} for {carerLink(vehRisk)} may require reassignment if the {vehRisk.requirement} is not renewed within {d} days.</> });
  }
  if (uploaded) out.push({ at: "07:20", office: uploaded.office, who: "Compliance Agent", tone: "accent", text: <>{carerLink(uploaded)} uploaded a renewed {uploaded.requirement} document. Queued for {uploaded.owner} to verify.</> });
  if (sms) out.push({ at: "07:02", office: sms.office, who: "Compliance Agent", tone: "accent", text: <>Second reminder by SMS to {carerLink(sms)}: {sms.requirement} expires in {days(sms)} days.</> });
  out.push({ at: "06:15", office: "All", who: "Compliance Agent", tone: "neutral", text: <>Nightly check against GSW Training and Cezanne HR complete. {K.due30} items inside 30 days, reminders scheduled on the 30, 14, 7 and 1 day marks.</> });
  if (expGarda) out.push({ at: "Sun 17:10", office: expGarda.office, who: "Compliance Agent", tone: "bad", text: <>Escalated to {expGarda.office} Coordinator: {carerLink(expGarda)}'s Garda Vetting expired {Math.abs(days(expGarda))} days ago. Restricted from new visits.</> });
  return out;
}
const ACTIVITY = staticActivity();

function useOfficeMix() {
  const s = useWc();
  return OFFICE_IDS.map((o) => {
    const m = complianceByOffice(o);
    const adj = s.aoifeExpired && o === "Galway" ? { ...m, red: m.red + 1, amber: m.amber - 1 } : m;
    return { id: o, ...adj };
  });
}

function OfficeMix() {
  const s = useWc();
  const rows = useOfficeMix();
  const tot = rows.filter((r) => s.office === "All" || r.id === s.office).reduce((a, r) => ({ total: a.total + r.total, green: a.green + r.green, amber: a.amber + r.amber, red: a.red + r.red }), { total: 0, green: 0, amber: 0, red: 0 });
  const seg = (v: number, total: number, color: string, i: number) => v > 0 && <div style={{ width: (100 * v) / total + "%", background: color, transformOrigin: "left", animation: "sweep .8s var(--ease) " + i * 60 + "ms both" }} />;
  return (
    <Panel title="Compliance by office" meta="Share of active carers per office. Click an office to filter every screen."
      action={<div style={{ display: "flex", gap: 14 }}><Legend color="var(--ok)">Clear</Legend><Legend color="var(--warn)">Due within 30 days</Legend><Legend color="var(--bad)">Restricted</Legend></div>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 6 }}>
        {[
          { k: "Clear, nothing due in 30 days", v: tot.green, t: "ok" as Tone },
          { k: "Due within 30 days", v: tot.amber, t: "warn" as Tone },
          { k: "Restricted", v: tot.red, t: "bad" as Tone },
        ].map((x) => (
          <div key={x.k} style={{ padding: "10px 12px", borderRadius: "var(--r-sm,10px)", background: TONE[x.t].soft }}>
            <div style={{ ...label, color: TONE[x.t].ink }}>{x.k}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.6px", color: "var(--ink)" }}>{fmt(x.v)}</span>
              <span style={{ fontFamily: MONO, fontSize: 11.5, color: TONE[x.t].ink }}>{pct(x.v, tot.total)}</span>
            </div>
          </div>
        ))}
      </div>
      {rows.map((r) => {
        const dim = s.office !== "All" && s.office !== r.id;
        const on = s.office === r.id;
        return (
          <div key={r.id} className="wc-row" onClick={() => wc.setOffice(on ? "All" : r.id)}
            style={{ display: "grid", gridTemplateColumns: "150px 1fr 200px", gap: 16, alignItems: "center", padding: "11px 6px", borderTop: "1px solid var(--border)", cursor: "pointer", borderRadius: 6, opacity: dim ? 0.42 : 1, transition: "opacity .2s var(--ease)", boxShadow: on ? "inset 2px 0 0 var(--accent)" : "none" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.id}</div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{officeOf(r.id).coordinator} · {r.total} carers</div>
            </div>
            <div style={{ display: "flex", height: 20, borderRadius: 5, overflow: "hidden", gap: 2, background: "var(--track)" }}>
              {seg(r.green, r.total, "var(--ok)", 0)}{seg(r.amber, r.total, "var(--warn)", 1)}{seg(r.red, r.total, "var(--bad)", 2)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, fontFamily: MONO, fontSize: 12, textAlign: "right" }}>
              <span style={{ color: "var(--ok)" }}>{Math.round((100 * r.green) / r.total)}%</span>
              <span style={{ color: "var(--warn)" }}>{Math.round((100 * r.amber) / r.total)}%</span>
              <span style={{ color: "var(--bad)" }}>{Math.round((100 * r.red) / r.total)}%</span>
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

function ScenarioCard() {
  const s = useWc();
  const L = useLive();
  const on = s.aoifeExpired;
  const ripple: { where: string; what: ReactNode; link: ReactNode }[] = [
    { where: "Compliance", what: <>Critical {on ? 11 : 12}, expired {L.expired}, restrictions {L.restricted}</>, link: <GoLink page="Compliance" sub="Expiries">Expiries</GoLink> },
    { where: "Rostering", what: <>{AOIFE_UPCOMING_VISITS.length} of today's visits {on ? "need" : "would need"} cover, unfilled {L.unfilled}</>, link: <GoLink page="Rostering" sub="Unfilled Hours">Unfilled hours</GoLink> },
    { where: "Care Delivery", what: <>Aoife's manual-handling visits flagged today</>, link: <GoLink page="Care Delivery" sub="Today">Today</GoLink> },
    { where: "Home", what: <>Briefing and headline counts move</>, link: <GoLink page="Home">Home</GoLink> },
    { where: "Work", what: <>Cover approval task for Niamh Kelly</>, link: <GoLink page="Work">Work</GoLink> },
    { where: "Activity", what: <>GSW Training, agent and human entries logged</>, link: <GoLink page="Activity">Activity</GoLink> },
    { where: "Records", what: <>{carerLink({ carerId: AOIFE.id, carer: AOIFE.name })} shows {on ? "Restricted" : "Attention Required"}</>, link: null },
  ];
  return (
    <Panel title="Demo scenario" meta="One compliance change, every module" tone={on ? "bad" : "accent"}>
      <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.2px", lineHeight: 1.35 }}>Simulate: Aoife Byrne's Patient Manual Handling expires</div>
      <div style={{ ...noteStyle, marginTop: 6 }}>
        Moves the clock past {AOIFE_PMH.expiry} with no renewal record from GSW Training. Pulse restricts Aoife from manual-handling visits and every screen that depends on her updates at once.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <Btn kind={on ? "ghost" : "primary"} onClick={() => wc.setAoifeExpired(!on)}>{on ? "Reset: renewal verified by Rachel Byrne" : "Run scenario"}</Btn>
        <Chip tone={on ? "bad" : "warn"}>{on ? "Expired · Restricted" : "6 days left"}</Chip>
      </div>
      <div style={{ marginTop: 12 }}>
        {ripple.map((r) => (
          <div key={r.where} style={{ display: "grid", gridTemplateColumns: "96px 1fr auto", gap: 10, alignItems: "center", padding: "7px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
            <span style={{ ...label, fontSize: 9 }}>{r.where}</span>
            <span style={{ color: on ? "var(--ink)" : "var(--dim)", minWidth: 0 }}>{r.what}</span>
            {r.link}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Overview() {
  const sc = useScope();
  const { s } = sc;
  const drivers = sc.carers.filter((c) => c.drives).length;
  const renewals = sc.expiring.filter((i) => i.status === "Renewal started").length;
  const compLog = s.log.filter((e) => e.actor === "Compliance Agent" || /compliance|manual handling|garda|insurance|restrict|certificate|nct|renew/i.test(e.text));
  const acts = [
    ...compLog.map((e) => ({ when: e.at, who: e.actor, tone: (e.stream === "ai" ? "accent" : e.stream === "people" ? "ok" : "warn") as Tone, text: e.text as ReactNode })),
    ...ACTIVITY.filter((a) => sc.office === "All" || a.office === "All" || a.office === sc.office).map((a) => ({ when: a.at, who: a.who, tone: a.tone, text: a.text })),
  ].slice(0, 8);
  const resolved = RESOLVED.filter((r) => r.c && (sc.office === "All" || r.c.office === sc.office));
  const crit = sc.critical;
  return (
    <>
      <ScopeBar title="Compliance" sub={<>Every carer requirement tracked against its expiry. The Compliance Agent reminds and escalates on the 30, 14, 7 and 1 day marks; coordinators and Rachel Byrne verify every document. {scopeLabel(sc.office)}.</>} />
      <KpiStrip min={160} items={[
        { label: "Active carers", value: fmt(sc.carers.length), sub: fmt(drivers) + " drive for work" },
        { label: "Fully compliant", value: fmt(sc.kFully), sub: pct(sc.kFully, sc.carers.length) + " of active carers", tone: "ok", spark: COMPLIANCE_TREND },
        { label: "Compliance restrictions", value: fmt(sc.kRestricted), sub: sc.expired.length + " expired · " + sc.missing.length + " missing · " + sc.awaiting.length + " awaiting check", tone: "bad", onClick: () => wc.setSub("Compliance", "Audit Readiness") },
        { label: "Critical items <7 days", value: fmt(sc.kCritical), sub: fmt(sumVisits(crit)) + " future visits affected", tone: "warn", onClick: () => wc.setSub("Compliance", "Expiries") },
        { label: "Expired items", value: fmt(sc.kExpired), sub: "Restricted from new visits", tone: "bad", onClick: () => wc.setSub("Compliance", "Expiries") },
        { label: "Due within 30 days", value: fmt(sc.expiring.length), sub: renewals + " renewals already started", onClick: () => wc.setSub("Compliance", "Expiries") },
      ]} />
      <Grid cols="minmax(0,1.55fr) minmax(0,1fr)">
        <OfficeMix />
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <ScenarioCard />
          <Panel title="Compliance trend" meta="Fully compliant carers as a share of active, weekly">
            <Trend labels={WEEKS} series={[{ name: "Fully compliant", values: COMPLIANCE_TREND }]} height={96} fmtValue={(n) => n.toFixed(1) + "%"} />
          </Panel>
        </div>
      </Grid>
      <Grid cols="minmax(0,1.25fr) minmax(0,1fr) minmax(0,1fr)">
        <Panel title="Upcoming risk" meta={crit.length + " items inside 7 days · " + fmt(sumVisits(crit)) + " future visits affected"} action={<GoLink page="Compliance" sub="Expiries">All expiries</GoLink>}>
          {crit.length === 0 && <div style={noteStyle}>Nothing inside 7 days for {scopeLabel(sc.office)}.</div>}
          {crit.slice(0, 7).map((i) => (
            <ListRow key={i.id} left={<DayBadge i={i} />}
              title={<>{carerLink(i)} <span style={{ color: "var(--dim)" }}>· {i.requirement}</span></>}
              meta={<>{i.office} · {i.owner} · {i.contact}</>}
              right={<div style={{ textAlign: "right", flex: "none" }}><div style={{ fontFamily: MONO, fontSize: 12.5, color: "var(--ink)" }}>{i.futureVisits} visits</div><div style={{ marginTop: 4 }}><Chip status={i.status} /></div></div>} />
          ))}
          {crit.length > 7 && <div style={{ fontSize: 11.5, color: "var(--faint)", paddingTop: 8, borderTop: "1px solid var(--border)" }}>{crit.length - 7} more in the Expiries queue</div>}
        </Panel>
        <Panel title="Recently resolved" meta="Renewals verified by a person, last 5 days">
          {resolved.length === 0 && <div style={noteStyle}>No renewals verified in this office in the last 5 days.</div>}
          {resolved.map((r) => (
            <ListRow key={r.c.id + r.req} tone="ok"
              title={<>{carerLink({ carerId: r.c.id, carer: r.c.name })} <span style={{ color: "var(--dim)" }}>· {r.req}</span></>}
              meta={<>Verified by {r.by}. {r.note}.</>}
              right={<span style={{ fontFamily: MONO, fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>{r.when}</span>} />
          ))}
          <div style={{ marginTop: "auto", paddingTop: 10 }}><HumanGate>The agent collects documents. Only a person marks a requirement verified.</HumanGate></div>
        </Panel>
        <Panel title="Agent activity" meta="Compliance Agent reminders and escalations">
          <Timeline items={acts} />
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Expiries                                                            */
/* ------------------------------------------------------------------ */

const BANDS = ["Today", "Next 7 days", "Next 14 days", "Next 30 days", "Expired"] as const;
type Band = (typeof BANDS)[number];
const bandOf = (i: ComplianceItem): Band => {
  const d = days(i);
  return i.status === "Expired" || d < 0 ? "Expired" : d === 0 ? "Today" : d <= 7 ? "Next 7 days" : d <= 14 ? "Next 14 days" : "Next 30 days";
};
const BAND_TONE: Record<Band, Tone> = { "Today": "bad", "Next 7 days": "warn", "Next 14 days": "accent", "Next 30 days": "neutral", "Expired": "bad" };
const BAND_NOTE: Record<Band, string> = {
  "Today": "Expires today. Coordinator escalated, restriction starts tomorrow without a verified renewal.",
  "Next 7 days": "Past the 7-day mark. Coordinator escalation, future visits flagged to the Roster Optimiser.",
  "Next 14 days": "Past the 14-day mark. Second reminder by SMS and email.",
  "Next 30 days": "Past the 30-day mark. First reminder from the Compliance Agent.",
  "Expired": "Restricted from new visits until a person verifies the renewal.",
};

function expiryCols(): Col<ComplianceItem>[] {
  return [
    { key: "carer", label: "Carer", w: "1.25fr", render: carerLink, sort: (i) => i.carer },
    { key: "office", label: "Office", w: ".8fr", sort: (i) => i.office },
    { key: "requirement", label: "Requirement", w: "1.55fr", sort: (i) => i.requirement },
    { key: "expiry", label: "Expiry date", w: "1fr", mono: true, sort: days },
    { key: "days", label: "Days remaining", w: "1.25fr", render: (i) => <DaysCell i={i} />, sort: days },
    { key: "visits", label: "Future visits", w: ".8fr", align: "right", mono: true, render: (i) => fmt(i.futureVisits), sort: (i) => i.futureVisits },
    { key: "status", label: "Status", w: "1.2fr", render: (i) => <Chip status={i.status} />, sort: (i) => i.status },
    { key: "contact", label: "Contact status", w: "1.45fr", render: (i) => <span title={i.contact} style={{ color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis" }}>{i.contact}</span> },
    { key: "owner", label: "Owner", w: "1fr", sort: (i) => i.owner },
    { key: "act", label: "", w: "1.05fr", align: "right", render: (i) => <RemindBtn i={i} /> },
  ];
}

function Horizon({ items }: { items: ComplianceItem[] }) {
  const xOf = (d: number) => (d < 0 ? 1.5 + ((13 + Math.max(-13, d)) / 13) * 8 : 14 + (d / 30) * 84);
  const stack: Record<number, number> = {};
  const dots = items.slice().sort((a, b) => days(a) - days(b)).map((i) => {
    const d = days(i);
    const k = (stack[d] = (stack[d] ?? -1) + 1);
    return { i, left: xOf(d), bottom: 28 + k * 18, tone: BAND_TONE[bandOf(i)] };
  });
  const top = Math.max(...Object.values(stack), 3);
  const H = Math.max(200, 28 + (top + 1) * 18 + 34);
  return (
    <div style={{ position: "relative", height: H }}>
      <div style={{ position: "absolute", left: 0, width: "11.5%", top: 24, bottom: 20, borderRadius: 8, background: "var(--bad-soft)" }} />
      <div style={{ position: "absolute", left: "13%", right: 0, bottom: 20, borderTop: "1px solid var(--border-strong)" }} />
      {[{ d: 30, t: "30d · first reminder" }, { d: 14, t: "14d · SMS" }, { d: 7, t: "7d · escalate" }, { d: 1, t: "1d · final" }].map((m) => (
        <div key={m.d} style={{ position: "absolute", left: xOf(m.d) + "%", top: 16, bottom: 20, borderLeft: "1px dashed var(--border-strong)" }}>
          <span style={{ position: "absolute", top: -16, left: 0, transform: m.d === 30 ? "translateX(-100%)" : "translateX(-50%)", fontFamily: MONO, fontSize: 9.5, color: "var(--dim)", whiteSpace: "nowrap" }}>{m.t}</span>
        </div>
      ))}
      <span style={{ position: "absolute", top: 0, left: 6, fontFamily: MONO, fontSize: 9.5, color: "var(--bad)" }}>Expired</span>
      {dots.map((p) => (
        <button key={p.i.id} title={p.i.carer + " · " + p.i.requirement + " · " + daysText(p.i)} aria-label={p.i.carer + " " + p.i.requirement}
          onClick={() => wc.open({ kind: "carer", id: p.i.carerId })}
          style={{ position: "absolute", left: p.left + "%", bottom: p.bottom, width: 13, height: 13, padding: 0, border: 0, borderRadius: 3, cursor: "pointer", background: TONE[p.tone].ink, transform: "translateX(-50%)", boxShadow: p.i.carerId === AOIFE.id || p.i.carerId === LIAM.id ? "0 0 0 2px var(--surface), 0 0 0 3.5px " + TONE[p.tone].ink : "none" }} />
      ))}
      {[0, 7, 14, 21, 30].map((d) => (
        <span key={d} style={{ position: "absolute", bottom: 2, left: xOf(d) + "%", transform: "translateX(-50%)", fontFamily: MONO, fontSize: 9.5, color: "var(--faint)" }}>{d === 0 ? "Today" : d}</span>
      ))}
    </div>
  );
}

function Expiries() {
  const sc = useScope();
  const { s } = sc;
  const [band, setBand] = useState<Band | "All">("All");
  const rows = useMemo(() => sc.expiring.concat(sc.expired), [sc.expiring, sc.expired]);
  const groups = BANDS.map((b) => ({ b, list: rows.filter((i) => bandOf(i) === b).sort((x, y) => days(x) - days(y)) }));
  const count = (b: Band) => groups.find((g) => g.b === b)!.list.length;
  const contactGroups = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((i) => { const k = i.contact.replace(/\s\d{2}:\d{2}$/, "").split(" · ")[0]; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rows]);
  const sentHere = rows.filter((i) => s.reminded[i.id]).length;
  const cols = useMemo(expiryCols, []);
  const shown = groups.filter((g) => band === "All" || g.b === band);
  return (
    <>
      <ScopeBar title="Expiries" sub={<>{sc.expiring.length} items expire within 30 days and {sc.expired.length} have expired. Grouped by threshold so the team works the nearest first; reminders go out from here. {scopeLabel(sc.office)}.</>} />
      <KpiStrip min={150} items={[
        ...BANDS.map((b): Kpi => ({
          label: b, value: fmt(count(b)), tone: BAND_TONE[b] === "accent" || BAND_TONE[b] === "neutral" ? undefined : BAND_TONE[b],
          sub: fmt(sumVisits(groups.find((g) => g.b === b)!.list)) + " future visits", onClick: () => setBand(band === b ? "All" : b),
        })),
        { label: "Reminders sent today", value: fmt(sentHere + rows.filter((i) => /Reminder sent|SMS delivered/.test(i.contact)).length), sub: sentHere + " sent from this screen" },
      ]} />
      <Grid cols="minmax(0,1.7fr) minmax(0,1fr) minmax(0,.95fr)">
        <Panel title="Expiry horizon" meta={"Each mark is one requirement. " + rows.length + " items, next 30 days plus expired. Click to open the carer."}>
          <Horizon items={rows} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
            {BANDS.map((b) => <Legend key={b} color={TONE[BAND_TONE[b]].ink}>{b} <b style={{ color: "var(--ink)", fontWeight: 500 }}>{count(b)}</b></Legend>)}
          </div>
        </Panel>
        <Panel title="Follow-up cadence" meta="What the Compliance Agent does at each mark">
          <Timeline items={[
            { when: "30 days", who: count("Next 30 days") + " items", tone: "neutral", text: "Email to the carer with the renewal link or upload request." },
            { when: "14 days", who: count("Next 14 days") + " items", tone: "accent", text: "Second reminder by SMS and email. Carer confirms a booking date." },
            { when: "7 days", who: count("Next 7 days") + " items", tone: "warn", text: "Escalated to the office coordinator. Dependent visits listed for the Roster Optimiser." },
            { when: "1 day", who: count("Today") + " today", tone: "bad", text: "Final reminder. Coordinator told the restriction starts tomorrow." },
            { when: "Expired", who: count("Expired") + " items", tone: "bad", text: "Restricted from new visits. A person verifies the renewal before it lifts." },
          ]} />
        </Panel>
        <Panel title="Contact status" meta="Where each follow-up stands">
          <Bars data={contactGroups.map(([k, v]) => ({ label: k, value: v, color: /Escalated/.test(k) ? "var(--bad)" : /uploaded|confirmed/.test(k) ? "var(--ok)" : /Not yet/.test(k) ? "var(--warn)" : "var(--neutral)" }))} />
          <div style={{ marginTop: "auto", paddingTop: 12 }}>
            <AgentNote agent="Compliance Agent">Uploaded documents wait for a coordinator or Rachel Byrne to verify. I never mark a requirement valid.</AgentNote>
          </div>
        </Panel>
      </Grid>
      <Grid cols="1fr">
        <Panel pad={false} title="Expiry queue" meta={rows.length + " items · " + sc.expiring.length + " expiring + " + sc.expired.length + " expired · nearest first"}
          action={<Filters value={band} onChange={setBand} options={[{ id: "All" as const, label: "All", count: rows.length }, ...BANDS.map((b) => ({ id: b, label: b, count: count(b) }))]} />}>
          {shown.map((g) => (
            <div key={g.b}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 8px", flexWrap: "wrap" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: TONE[BAND_TONE[g.b]].ink }} />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{g.b}</span>
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--faint)" }}>{g.list.length}</span>
                <span style={{ fontSize: 12, color: "var(--dim)" }}>{BAND_NOTE[g.b]}</span>
              </div>
              <Table cols={cols} rows={g.list} dense pageSize={g.b === "Next 30 days" || g.b === "Next 14 days" ? 7 : 12} rowKey={(i) => i.id}
                rowTone={() => (BAND_TONE[g.b] === "neutral" || BAND_TONE[g.b] === "accent" ? undefined : BAND_TONE[g.b])}
                empty={"Nothing in " + g.b.toLowerCase() + " for " + scopeLabel(sc.office) + "."} />
            </div>
          ))}
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Garda Vetting                                                       */
/* ------------------------------------------------------------------ */

const STAGE_TONE: Record<string, Tone> = { "Link Required": "neutral", "Link Sent": "info", "Application Started": "warn", "Awaiting Result": "warn", "Complete": "ok", "Renewal Due": "warn", "Expired": "bad" };
const gardaStageOf = (i: ComplianceItem) =>
  i.status === "Missing" ? "Link Required" : i.status === "Expired" ? "Expired" : i.status === "Renewal started" ? "Application Started"
    : i.status === "Awaiting document" ? "Link Sent" : i.status === "Awaiting verification" ? "Awaiting Result" : "Renewal Due";

function GardaPipeline() {
  const lanes = [
    { name: "Initial Garda Vetting", key: "initial" as const },
    { name: "International Garda Clearance", key: "igc" as const },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "128px repeat(" + GARDA_STAGES.length + ", minmax(0,1fr))", gap: 6, minWidth: 600 }}>
        <div />
        {GARDA_STAGES.map((g) => <div key={g.stage} style={{ ...label, fontSize: 9, letterSpacing: ".06em", lineHeight: 1.3, padding: "0 2px 4px", alignSelf: "end" }}>{g.stage}</div>)}
        {lanes.map((lane) => {
          const open = GARDA_STAGES.filter((g) => g.stage !== "Complete").reduce((a, g) => a + g[lane.key], 0);
          const laneMax = Math.max(...GARDA_STAGES.filter((g) => g.stage !== "Complete").map((g) => g[lane.key]));
          return [
            <div key={lane.key} style={{ padding: "10px 4px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{lane.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 3 }}>{open} open · {GARDA_STAGES.find((g) => g.stage === "Complete")![lane.key]} complete</div>
            </div>,
            ...GARDA_STAGES.map((g) => {
              const v = g[lane.key];
              const t = TONE[STAGE_TONE[g.stage]];
              const complete = g.stage === "Complete";
              return (
                <div key={lane.key + g.stage} style={{ padding: "10px 9px", borderRadius: "var(--r-sm,10px)", background: complete ? "var(--ok-soft)" : "var(--surface-2)", border: "1px solid " + (complete ? "transparent" : "var(--border)"), minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px", color: v === 0 ? "var(--faint)" : complete ? "var(--ok)" : "var(--ink)" }}>{v}</div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--track)", marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: complete ? "100%" : Math.max(v ? 6 : 0, (100 * v) / laneMax) + "%", background: t.ink, transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} />
                  </div>
                </div>
              );
            }),
          ];
        })}
        <div style={{ ...label, padding: "8px 4px 0" }}>Total</div>
        {GARDA_STAGES.map((g) => <div key={g.stage} style={{ fontFamily: MONO, fontSize: 12, color: "var(--dim)", padding: "8px 11px 0" }}>{g.initial + g.igc}</div>)}
      </div>
    </div>
  );
}

function Garda() {
  const sc = useScope();
  const garda = sc.scoped.filter((i) => i.kind === "garda").sort((a, b) => days(a) - days(b));
  const gardaExp = expiringOf(garda);
  const cands = byOffice(CANDIDATES.filter((c) => c.stage === "Garda Vetting"), sc.office);
  const count = (st: string) => cands.filter((c) => c.garda === st).length;
  const hero = sc.office === "All" || sc.office === "Galway" ? AOIFE_GARDA : gardaExp[0];
  const heroCarer = hero ? CARERS.find((c) => c.id === hero.carerId)! : null;
  const cols: Col<ComplianceItem>[] = [
    { key: "carer", label: "Carer", w: "1.3fr", render: carerLink, sort: (i) => i.carer },
    { key: "office", label: "Office", w: ".8fr", sort: (i) => i.office },
    { key: "check", label: "Check", w: ".7fr", render: (i) => (i.requirement === "Garda Vetting" ? "Initial" : "International"), sort: (i) => i.requirement },
    { key: "stage", label: "Stage", w: "1.2fr", render: (i) => <Chip tone={STAGE_TONE[gardaStageOf(i)]}>{gardaStageOf(i)}</Chip>, sort: gardaStageOf },
    { key: "days", label: "Expiry", w: "1.25fr", render: (i) => <DaysCell i={i} />, sort: days },
    { key: "visits", label: "Visits", w: ".6fr", align: "right", mono: true, render: (i) => fmt(i.futureVisits), sort: (i) => i.futureVisits },
    { key: "owner", label: "Owner", w: "1fr" },
  ];
  type Cand = (typeof cands)[number];
  const ccols: Col<Cand>[] = [
    { key: "name", label: "Candidate", w: "1.3fr", render: (c) => <RecLink to={{ kind: "candidate", id: c.id }}>{c.name}</RecLink>, sort: (c) => c.name },
    { key: "office", label: "Destination", w: ".9fr", sort: (c) => c.office },
    { key: "garda", label: "Garda status", w: "1.2fr", render: (c) => <Chip status={c.garda || "Link required"} />, sort: (c) => c.garda || "" },
    { key: "days", label: "Days in stage", w: ".8fr", align: "right", mono: true, render: (c) => String(c.daysInStage), sort: (c) => c.daysInStage },
    { key: "recruiter", label: "Recruiter", w: "1fr", sort: (c) => c.recruiter },
  ];
  return (
    <>
      <ScopeBar title="Garda Vetting" sub={<>Initial Garda Vetting and International Garda Clearance for carers and candidates, stage by stage. Rachel Byrne records every outcome. {scopeLabel(sc.office)}.</>} />
      <KpiStrip items={[
        { label: "Carer checks due ≤30d", value: fmt(gardaExp.length), sub: fmt(sumVisits(gardaExp)) + " future visits depend on them", tone: "warn" },
        { label: "Renewals started", value: fmt(garda.filter((i) => i.status === "Renewal started").length), sub: "Application with the vetting bureau" },
        { label: "Garda restrictions", value: fmt(garda.filter((i) => i.status === "Expired" || i.status === "Missing").length), sub: "Expired or not on file", tone: "bad" },
        { label: "Candidates in vetting", value: fmt(cands.length), sub: "Recruitment stage: Garda Vetting", tone: "info" },
        { label: "Links sent", value: fmt(count("Link sent")), sub: "Waiting on the candidate" },
        { label: "Awaiting result", value: fmt(count("Awaiting result")), sub: count("Application started") + " applications started" },
      ]} />
      <Grid cols="minmax(0,2.1fr) minmax(300px,1fr)">
        <Panel title="Vetting pipeline" meta={"Network totals, all offices · " + (GARDA_STAGES.reduce((a, g) => a + g.initial + g.igc, 0)) + " vetting records"}>
          <GardaPipeline />
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <HumanGate>Pulse tracks each stage and chases links. Rachel Byrne records every vetting result; the agent never marks vetting complete.</HumanGate>
            <span style={{ flex: 1 }} />
            <GoLink page="Recruitment" sub="Pipeline">Recruitment pipeline</GoLink>
          </div>
        </Panel>
        {hero && heroCarer ? (
          <Panel title={<>{hero.carer}: {hero.requirement}</>} meta={hero.office + " · " + heroCarer.area + " · owner " + hero.owner} tone="warn"
            action={<RemindBtn i={hero} />}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              <Stat k="Stage" v={gardaStageOf(hero)} tone={STAGE_TONE[gardaStageOf(hero)]} />
              <Stat k="Days left" v={daysText(hero)} tone={toneForDays(hero.daysRemaining)} />
              <Stat k="Expires" v={hero.expiry} />
              <Stat k="Visits next 30 days" v={String(heroCarer.visitsNext30)} />
            </div>
            <ThresholdTrack d={hero.daysRemaining} />
            <div style={{ marginTop: 12 }}>
              <AgentNote agent="Compliance Agent">
                {hero.carerId === AOIFE.id
                  ? <>Renewal started 24 Sep, 18 days left. I check the vetting status daily and will escalate to Niamh Kelly at the 7-day mark. Her Patient Manual Handling is also due in {sc.s.aoifeExpired ? "0 days (expired)" : "6 days"}.</>
                  : <>{hero.lastAction || "Reminder scheduled"}. I will escalate to {officeOf(hero.office).coordinator} at the 7-day mark.</>}
              </AgentNote>
            </div>
            <div style={{ marginTop: "auto", paddingTop: 10, fontSize: 12.5 }}><RecLink to={{ kind: "carer", id: hero.carerId }}>Open {hero.carer}'s record</RecLink></div>
          </Panel>
        ) : (
          <Panel title="Next Garda renewal"><div style={noteStyle}>No Garda checks due in {scopeLabel(sc.office)} in the next 30 days.</div></Panel>
        )}
      </Grid>
      <Grid cols="minmax(0,1.45fr) minmax(0,1fr)">
        <Panel pad={false} title="Carers: renewals and gaps" meta={garda.length + " Garda items on carer files that need action"}>
          <Table cols={cols} rows={garda} dense pageSize={9} rowKey={(i) => i.id} onRow={(i) => wc.open({ kind: "carer", id: i.carerId })}
            rowTone={(i) => (i.status === "Expired" || i.status === "Missing" ? "bad" : undefined)} selected={(i) => i.carerId === AOIFE.id} />
        </Panel>
        <Panel pad={false} title="Candidates in Garda Vetting" meta={cands.length + " candidates · links chased by the Recruitment Agent"} action={<GoLink page="Recruitment" sub="Candidates">Candidates</GoLink>}>
          <Table cols={ccols} rows={cands} dense pageSize={9} rowKey={(c) => c.id} onRow={(c) => wc.open({ kind: "candidate", id: c.id })} />
          {(sc.office === "All" || sc.office === "Galway") && (
            <div style={{ padding: "0 14px 14px" }}>
              <AgentNote agent="Recruitment Agent" action={<GoLink page="Recruitment" sub="Handoffs">Handoffs</GoLink>}>
                <RecLink to={{ kind: "candidate", id: SARAH.id }}>Sarah O'Neill</RecLink> is already at Office Handoff for Galway with her Garda application started. She cannot be rostered until the result is recorded.
              </AgentNote>
            </div>
          )}
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Training                                                            */
/* ------------------------------------------------------------------ */

const lockedModule = (m: string) => !!REQUIREMENTS.find((r) => r.name === m && !r.configurable);

function Training() {
  const sc = useScope();
  const [mand, setMand] = useState<Record<string, boolean>>(() => Object.fromEntries(TRAINING.map((t) => [t.module, t.mandatory])));
  const training = sc.scoped.filter((i) => i.kind === "training").sort((a, b) => days(a) - days(b));
  const tExp = expiringOf(training);
  const mandatory = TRAINING.filter((t) => mand[t.module]);
  const avg = mandatory.length ? mandatory.reduce((a, t) => a + t.complete / K.activeCarers, 0) / mandatory.length : 0;
  const gaps = mandatory.reduce((a, t) => a + (K.activeCarers - t.complete), 0);
  const gsw = SYSTEMS.find((x) => x.name === "GSW Training");
  const byModule = useMemo(() => {
    const m: Record<string, number> = {};
    training.forEach((i) => { m[i.requirement] = (m[i.requirement] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [training]);
  const cols: Col<ComplianceItem>[] = [
    { key: "carer", label: "Carer", w: "1.25fr", render: carerLink, sort: (i) => i.carer },
    { key: "office", label: "Office", w: ".8fr", sort: (i) => i.office },
    { key: "requirement", label: "Module", w: "1.6fr", sort: (i) => i.requirement },
    { key: "status", label: "Status", w: "1.2fr", render: (i) => <Chip status={i.status} />, sort: (i) => i.status },
    { key: "days", label: "Expiry", w: "1.3fr", render: (i) => <DaysCell i={i} />, sort: days },
    { key: "visits", label: "Visits", w: ".6fr", align: "right", mono: true, render: (i) => fmt(i.futureVisits), sort: (i) => i.futureVisits },
    { key: "owner", label: "Owner", w: "1fr" },
    { key: "act", label: "", w: "1.05fr", align: "right", render: (i) => (i.status === "Awaiting verification" ? <Chip status="Awaiting verification">Needs check</Chip> : <RemindBtn i={i} />) },
  ];
  const showAoife = sc.office === "All" || sc.office === "Galway";
  return (
    <>
      <ScopeBar title="Training" sub={<>Mandatory and optional modules across {K.activeCarers} active carers, synced from GSW Training. Completion is network-wide; expiries below follow the office filter ({scopeLabel(sc.office)}).</>} />
      <KpiStrip items={[
        { label: "Mandatory modules", value: String(mandatory.length), sub: TRAINING.length - mandatory.length + " optional, tracked when completed" },
        { label: "Mandatory completion", value: (100 * avg).toFixed(1) + "%", sub: fmt(gaps) + " carer gaps, all offices", tone: "ok" },
        { label: "Training expiring ≤30d", value: fmt(tExp.length), sub: fmt(tExp.filter((i) => i.status === "Renewal started").length) + " already booked", tone: "warn" },
        { label: "Training expired", value: fmt(training.filter((i) => i.status === "Expired").length), sub: "Restricted from affected visits", tone: "bad" },
        { label: "QQI Level 5 missing", value: fmt(training.filter((i) => i.status === "Missing").length), sub: "Certificate not on file", tone: "bad" },
        { label: "Last GSW sync", value: gsw ? gsw.sync : "1 h ago", sub: gsw ? gsw.usage : "" },
      ]} />
      <Grid cols="minmax(0,1.75fr) minmax(300px,1fr)">
        <Panel title="Module completion" meta={"Completed against " + K.activeCarers + " active carers · providers as recorded by GSW Training"}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) 96px minmax(0,1.6fr) 48px", gap: 12, padding: "0 4px 8px", ...label }}>
            <span>Module</span><span>Provider</span><span>Renewal</span><span>Completion</span><span style={{ textAlign: "right" }}>Gap</span>
          </div>
          {TRAINING.map((t) => {
            const on = mand[t.module];
            const share = t.complete / K.activeCarers;
            const tone: Tone = !on ? "neutral" : share >= 0.97 ? "ok" : share >= 0.92 ? "warn" : "bad";
            return (
              <div key={t.module} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) 96px minmax(0,1.6fr) 48px", gap: 12, alignItems: "center", padding: "10px 4px", borderTop: "1px solid var(--border)", opacity: on ? 1 : 0.7 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={t.module}>{t.module}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, minWidth: 0 }}>
                    <Chip tone={on ? "accent" : "neutral"} style={{ height: 18, fontSize: 10.5 }}>{on ? "Mandatory" : "Optional"}</Chip>
                    {t.note && <span style={{ fontSize: 11, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.note}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={t.provider}>{t.provider.startsWith("GSW") ? "GSW Training" : t.provider}</div>
                <div style={{ fontSize: 12, color: "var(--dim)" }}>{t.renewalYears}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}><Bar value={t.complete} max={K.activeCarers} tone={tone} h={8} /></div>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--ink)", whiteSpace: "nowrap" }}>{t.complete}/{K.activeCarers}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", color: on && K.activeCarers - t.complete > 10 ? "var(--warn)" : "var(--dim)" }}>{K.activeCarers - t.complete}</div>
              </div>
            );
          })}
        </Panel>
        <Panel title="Requirement settings" meta="Which modules every carer must hold" action={<Chip tone="neutral">Demo, not saved</Chip>}>
          {TRAINING.map((t) => {
            const locked = lockedModule(t.module);
            return (
              <div key={t.module} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.module}</div>
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>
                    {locked ? "Required for the role, always on" : t.module === "Medication Management" ? "Applies where visits include medication prompts" : mand[t.module] ? "All carers · " + t.renewalYears.toLowerCase() : "Recorded when completed"}
                  </div>
                </div>
                <Toggle on={mand[t.module]} locked={locked} onChange={() => setMand((m) => ({ ...m, [t.module]: !m[t.module] }))} />
              </div>
            );
          })}
          <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={noteStyle}>Changing a module to mandatory adds it to every carer's requirement list and starts the 30, 14, 7 and 1 day reminders.</div>
            <HumanGate>Rachel Byrne signs off any change to mandatory training.</HumanGate>
          </div>
        </Panel>
      </Grid>
      <Grid cols="minmax(0,2.3fr) minmax(260px,.9fr)">
        <Panel pad={false} title="Training expiries and gaps" meta={training.length + " training items need action · " + scopeLabel(sc.office)}>
          <Table cols={cols} rows={training} dense pageSize={8} rowKey={(i) => i.id} rowTone={(i) => (i.status === "Expired" || i.status === "Missing" ? "bad" : days(i) <= 7 ? "warn" : undefined)} selected={(i) => isAoifePMH(i)} />
        </Panel>
        <Panel title="By module" meta="Open training items in this scope">
          <Bars data={byModule.map(([k, v]) => ({ label: k, value: v, color: k === "Patient Manual Handling" ? "var(--warn)" : undefined }))} />
          {showAoife && (
            <div style={{ marginTop: "auto", paddingTop: 14 }}>
              <AgentNote agent="Compliance Agent" state={sc.s.aoifeExpired ? "attention" : "working"}>
                {sc.s.aoifeExpired
                  ? <>{carerLink(AOIFE_PMH)}'s Patient Manual Handling has expired. She is restricted from manual-handling visits until a renewed certificate is verified.</>
                  : <>{carerLink(AOIFE_PMH)}'s Patient Manual Handling expires in 6 days. Renewal reminder sent 08:12; no renewal record from GSW Training yet. 38 future visits depend on it.</>}
              </AgentNote>
            </div>
          )}
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Vehicle Documents                                                   */
/* ------------------------------------------------------------------ */

const DOCS = [
  { id: "Car Insurance", short: "Insurance" },
  { id: "Car Tax", short: "Tax" },
  { id: "NCT", short: "NCT" },
  { id: "Driving Licence", short: "Driving Licence" },
] as const;
type DocId = (typeof DOCS)[number]["id"];

function Vehicle() {
  const sc = useScope();
  const [doc, setDoc] = useState<DocId | "All">("All");
  const drivers = sc.carers.filter((c) => c.drives);
  const veh = sc.scoped.filter((i) => i.kind === "vehicle").sort((a, b) => days(a) - days(b));
  const vExp = expiringOf(veh);
  const vExpired = veh.filter((i) => i.status === "Expired");
  const rows = doc === "All" ? veh : veh.filter((i) => i.requirement === doc);
  const heroCarer: Carer | null = sc.office === "All" || sc.office === "Sligo" ? LIAM : (() => {
    const first = vExp[0] || veh[0];
    return first ? CARERS.find((c) => c.id === first.carerId) || null : null;
  })();
  const heroItems = heroCarer ? sc.items.filter((i) => i.carerId === heroCarer.id && i.kind === "vehicle").sort((a, b) => days(a) - days(b)) : [];
  const heroVisits = heroCarer ? VISITS.filter((v) => v.carerId === heroCarer.id).sort((a, b) => a.start - b.start) : [];
  const isLiam = heroCarer?.id === LIAM.id;
  const cols: Col<ComplianceItem>[] = [
    { key: "carer", label: "Carer", w: "1.25fr", render: carerLink, sort: (i) => i.carer },
    { key: "office", label: "Office", w: ".8fr", sort: (i) => i.office },
    { key: "requirement", label: "Document", w: "1fr", sort: (i) => i.requirement },
    { key: "status", label: "Status", w: "1.25fr", render: (i) => <Chip status={i.status} />, sort: (i) => i.status },
    { key: "expiry", label: "Expiry date", w: "1fr", mono: true, sort: days },
    { key: "days", label: "Days", w: "1.25fr", render: (i) => <DaysCell i={i} />, sort: days },
    { key: "visits", label: "Visits affected", w: ".85fr", align: "right", mono: true, render: (i) => fmt(i.futureVisits), sort: (i) => i.futureVisits },
    { key: "contact", label: "Contact status", w: "1.4fr", render: (i) => <span style={{ color: "var(--dim)", overflow: "hidden", textOverflow: "ellipsis" }} title={i.contact}>{i.contact}</span> },
    { key: "owner", label: "Owner", w: "1fr" },
    { key: "act", label: "", w: "1.05fr", align: "right", render: (i) => (i.status === "Awaiting verification" ? <Chip status="Awaiting verification">Needs check</Chip> : <RemindBtn i={i} />) },
  ];
  return (
    <>
      <ScopeBar title="Vehicle Documents" sub={<>Insurance, motor tax, NCT and driving licence for every carer who drives for work. A lapsed document stops driving visits, so the dependent visits are counted on each item. {scopeLabel(sc.office)}.</>} />
      <KpiStrip items={[
        { label: "Carers who drive", value: fmt(drivers.length), sub: pct(drivers.length, sc.carers.length, 0) + " of active carers" },
        { label: "Vehicle items open", value: fmt(veh.length), sub: "Across " + new Set(veh.map((i) => i.carerId)).size + " drivers" },
        { label: "Expiring ≤30d", value: fmt(vExp.length), sub: vExp.filter((i) => days(i) <= 7).length + " inside 7 days", tone: "warn" },
        { label: "Expired", value: fmt(vExpired.length), sub: "Driving visits restricted", tone: "bad" },
        { label: "Awaiting verification", value: fmt(veh.filter((i) => i.status === "Awaiting verification").length), sub: "Uploaded, waiting for a person" },
        { label: "Visits affected", value: fmt(sumVisits(vExp.concat(vExpired))), sub: "Future scheduled visits", tone: "warn" },
      ]} />
      <Grid cols="minmax(0,1.6fr) minmax(300px,1fr)">
        {heroCarer ? (
          <Panel title={<>{heroCarer.name}: vehicle documents</>} meta={heroCarer.office + " · " + heroCarer.area + " · " + heroCarer.contracted + "h contract · " + heroCarer.visitsNext30 + " visits in the next 30 days"}
            tone={isLiam ? "warn" : undefined} action={<span style={{ fontSize: 12.5 }}><RecLink to={{ kind: "carer", id: heroCarer.id }}>Open record</RecLink></span>}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(" + Math.max(1, Math.min(2, heroItems.length)) + ",minmax(0,1fr)) minmax(0,1fr)", gap: 12 }}>
              {heroItems.slice(0, 2).map((i) => (
                <div key={i.id} style={{ padding: "14px 16px", borderRadius: "var(--r-md,14px)", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ ...label, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.requirement}</span>
                    <Chip status={i.status} />
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
                    <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-1.2px", lineHeight: 1, color: TONE[toneForDays(i.daysRemaining)].ink }}>{i.daysRemaining === null ? "0" : Math.max(0, i.daysRemaining)}</span>
                    <span style={{ fontSize: 12.5, color: "var(--dim)" }}>days left · expires {i.expiry}</span>
                  </div>
                  <ThresholdTrack d={i.daysRemaining} />
                  <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8 }}>{i.lastAction || i.contact}</div>
                  <div style={{ marginTop: 10 }}><RemindBtn i={i} /></div>
                </div>
              ))}
              <div style={{ padding: "14px 16px", borderRadius: "var(--r-md,14px)", border: "1px solid var(--border)", minWidth: 0 }}>
                <div style={label}>Rostered today</div>
                {heroVisits.length === 0 && <div style={{ ...noteStyle, marginTop: 8 }}>No visits today.</div>}
                {heroVisits.slice(0, 5).map((v) => (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
                    <span style={{ fontFamily: MONO, color: "var(--faint)" }}>{hhmm(v.start)}</span>
                    <RecLink to={{ kind: "visit", id: v.id }}>{v.id}</RecLink>
                    <span style={{ flex: 1 }} />
                    <RecLink to={{ kind: "client", id: v.client }} style={{ color: "var(--dim)" }}>{v.client}</RecLink>
                  </div>
                ))}
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 8 }}>{heroCarer.visitsNext30} visits in the next 30 days need a car.</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <AgentNote agent="Compliance Agent" action={<GoLink page="Rostering" sub="Availability">Rostering</GoLink>}>
                {isLiam
                  ? <>Car insurance expires in 6 days and NCT in 29. {LIAM.visitsNext30} visits in the next 30 days need a car. Renewed insurance certificate requested at 07:45; Emma Brennan verifies it before anything changes.</>
                  : <>{heroItems[0] ? heroItems[0].requirement + " " + daysText(heroItems[0]).toLowerCase() + ". " : ""}{heroCarer.visitsNext30} visits in the next 30 days need a car. {officeOf(heroCarer.office).coordinator} verifies the renewed document.</>}
              </AgentNote>
            </div>
            <div style={{ marginTop: 10 }}><HumanGate>If insurance lapses, the Roster Optimiser prepares cover for {heroCarer.name.split(" ")[0]}'s driving visits. A coordinator approves every change.</HumanGate></div>
          </Panel>
        ) : (
          <Panel title="Vehicle documents"><div style={noteStyle}>No vehicle documents need action in {scopeLabel(sc.office)}.</div></Panel>
        )}
        <Panel title="By document type" meta="Open items per document. Click to filter the table.">
          {DOCS.map((d) => {
            const list = veh.filter((i) => i.requirement === d.id);
            const exp = list.filter((i) => i.status === "Expired").length;
            const ver = list.filter((i) => i.status === "Awaiting verification").length;
            const due = list.length - exp - ver;
            const on = doc === d.id;
            return (
              <div key={d.id} className="wc-row" onClick={() => setDoc(on ? "All" : d.id)}
                style={{ padding: "11px 8px", borderTop: "1px solid var(--border)", cursor: "pointer", borderRadius: 6, boxShadow: on ? "inset 2px 0 0 var(--accent)" : "none", background: on ? "var(--accent-faint)" : "none" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{d.short}</span>
                  <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px" }}>{list.length}</span>
                </div>
                <div style={{ display: "flex", height: 8, borderRadius: 3, overflow: "hidden", gap: 2, background: "var(--track)", marginTop: 8 }}>
                  {due > 0 && <div style={{ width: (100 * due) / Math.max(1, list.length) + "%", background: "var(--warn)" }} />}
                  {exp > 0 && <div style={{ width: (100 * exp) / Math.max(1, list.length) + "%", background: "var(--bad)" }} />}
                  {ver > 0 && <div style={{ width: (100 * ver) / Math.max(1, list.length) + "%", background: "var(--info,var(--accent))" }} />}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6 }}>{due} due ≤30d · {exp} expired · {ver} awaiting check · {fmt(sumVisits(list))} visits</div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: "auto", paddingTop: 12 }}>
            <Legend color="var(--warn)">Due within 30 days</Legend><Legend color="var(--bad)">Expired</Legend><Legend color="var(--info,var(--accent))">Awaiting verification</Legend>
          </div>
        </Panel>
      </Grid>
      <Grid cols="1fr">
        <Panel pad={false} title="Vehicle document queue" meta={rows.length + " items · " + (doc === "All" ? "all document types" : doc) + " · " + scopeLabel(sc.office)}
          action={<Filters value={doc} onChange={setDoc} options={[{ id: "All" as const, label: "All", count: veh.length }, ...DOCS.map((d) => ({ id: d.id, label: d.short, count: veh.filter((i) => i.requirement === d.id).length }))]} />}>
          <Table cols={cols} rows={rows} dense pageSize={10} rowKey={(i) => i.id} selected={(i) => i.carerId === LIAM.id}
            rowTone={(i) => (i.status === "Expired" ? "bad" : days(i) <= 7 ? "warn" : undefined)} />
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Audit Readiness                                                     */
/* ------------------------------------------------------------------ */

type Cat = { id: string; group: "type" | "state"; base: number; note: string; match: (i: ComplianceItem) => boolean };
/* Network scores are fictional but tied to the 12 attention records: a
   category loses points in proportion to its share of them, scaled by office size. */
const CATS: Cat[] = [
  { id: "Garda Vetting", group: "type", base: 96, note: "Vetting and International Clearance", match: (i) => i.kind === "garda" },
  { id: "Training", group: "type", base: 93, note: "QQI and mandatory modules", match: (i) => i.kind === "training" },
  { id: "Personnel Documents", group: "type", base: 95, note: "Contract, references, right to work", match: (i) => i.kind === "personnel" },
  { id: "Vehicle Documents", group: "type", base: 97, note: "Insurance, tax, NCT, licence", match: (i) => i.kind === "vehicle" },
  { id: "Files", group: "state", base: 92, note: "Documents not on file", match: (i) => i.status === "Missing" },
  { id: "Outstanding Actions", group: "state", base: 91, note: "Expired, renewal overdue", match: (i) => i.status === "Expired" },
];
function catScore(c: Cat, n: number, carers: number) {
  const nAll = AUDIT_ATTENTION.filter(c.match).length;
  if (!nAll || !carers) return 100;
  return Math.max(0, Math.min(100, Math.round(100 - (100 - c.base) * (n / nAll) * (K.activeCarers / carers))));
}

function Audit() {
  const sc = useScope();
  const [cat, setCat] = useState<string>("All");
  const attention = sc.expired.concat(sc.missing);
  const scores = CATS.map((c) => { const n = attention.filter(c.match).length; return { c, n, score: catScore(c, n, sc.carers.length) }; });
  const ready = Math.round(scores.reduce((a, x) => a + x.score, 0) / scores.length);
  const cur = CATS.find((c) => c.id === cat);
  const rows = cur ? attention.filter(cur.match) : attention;
  const carersN = sc.carers.length;
  const drivers = sc.carers.filter((c) => c.drives).length;
  const distinct = (f: (i: ComplianceItem) => boolean) => new Set(attention.filter(f).map((i) => i.carerId)).size;
  const done = byOffice(DONE, sc.office);
  const doneOk = done.filter((v) => v.status === "Verified").length;
  const pack = [
    { k: "Garda disclosures on file", a: carersN - distinct((i) => i.kind === "garda"), b: carersN },
    { k: "QQI Level 5 certificates", a: carersN - distinct((i) => i.requirement.startsWith("QQI")), b: carersN },
    { k: "Mandatory training in date", a: carersN - distinct((i) => i.kind === "training"), b: carersN },
    { k: "Contracts, references, right to work", a: carersN - distinct((i) => i.kind === "personnel"), b: carersN },
    { k: "Vehicle documents, drivers", a: drivers - distinct((i) => i.kind === "vehicle"), b: drivers },
    { k: "Visit records verified, last 24h", a: doneOk, b: done.length },
  ];
  const cols: Col<ComplianceItem>[] = [
    { key: "carer", label: "Carer", w: "1.3fr", render: carerLink, sort: (i) => i.carer },
    { key: "office", label: "Office", w: ".8fr", sort: (i) => i.office },
    { key: "requirement", label: "Requirement", w: "1.7fr", sort: (i) => i.requirement },
    { key: "cat", label: "Category", w: "1.1fr", render: (i) => (CATS.find((c) => c.group === "type" && c.match(i))?.id ?? KIND_LABEL[i.kind]), sort: (i) => i.kind },
    { key: "status", label: "State", w: ".9fr", render: (i) => <Chip status={i.status} />, sort: (i) => i.status },
    { key: "days", label: "Expiry", w: "1.2fr", render: (i) => <DaysCell i={i} />, sort: days },
    { key: "visits", label: "Visits", w: ".6fr", align: "right", mono: true, render: (i) => fmt(i.futureVisits), sort: (i) => i.futureVisits },
    { key: "owner", label: "Owner", w: "1fr" },
  ];
  const ringTone: Tone = ready >= 95 ? "ok" : ready >= 90 ? "accent" : "warn";
  const tile = (x: (typeof scores)[number]) => {
    const on = cat === x.c.id;
    const t: Tone = x.n === 0 ? "ok" : x.score >= 95 ? "accent" : "warn";
    return (
      <button key={x.c.id} className="wc-kpi" onClick={() => setCat(on ? "All" : x.c.id)}
        style={{ textAlign: "left", font: "inherit", color: "inherit", padding: "13px 15px", minWidth: 0, cursor: "pointer", borderRadius: "var(--r-md,14px)", background: on ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), transition: "border-color .2s var(--ease),transform .2s var(--ease)" }}>
        <div style={{ ...label, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.c.id}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.8px", lineHeight: 1 }}>{x.score}%</span>
          <span style={{ fontSize: 12, color: x.n ? TONE.bad.ink : "var(--dim)" }}>{plural(x.n, "record")}</span>
        </div>
        <div style={{ marginTop: 10 }}><Bar value={x.score} max={100} tone={t} h={5} /></div>
        <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.c.note}</div>
      </button>
    );
  };
  return (
    <>
      <ScopeBar title="Audit Readiness" sub={<>If an inspector asked for carer files today, what would they find. Scores come from the same compliance records as every other screen. {scopeLabel(sc.office)}.</>} />
      <Grid cols="1fr" style={{ marginTop: 12 }}>
        <Panel>
          <div className="wc-grid" style={{ display: "grid", gridTemplateColumns: "minmax(260px,.9fr) minmax(0,2.4fr)", gap: 24, alignItems: "stretch" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, paddingRight: 20, borderRight: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <Ring value={ready} size={176} stroke={14} tone={ringTone} label="Audit ready" />
              </div>
              <div>
                <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-.4px", lineHeight: 1.3 }}>
                  {attention.length === 0 ? "No records need attention before an audit today." : plural(attention.length, "record") + (attention.length === 1 ? " needs" : " need") + " attention before an audit today."}
                </div>
                <div style={{ ...noteStyle, marginTop: 6 }}>
                  {sc.expired.length} expired · {sc.missing.length} missing. {sc.awaiting.length} more {sc.awaiting.length === 1 ? "upload is" : "uploads are"} waiting for a person to verify.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn kind={cat === "All" ? "primary" : "ghost"} onClick={() => setCat("All")}>Show all {attention.length}</Btn>
                <GoLink page="Compliance" sub="Expiries">Expiry queue</GoLink>
              </div>
            </div>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ ...label }}>By requirement type</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>{scores.filter((x) => x.c.group === "type").map(tile)}</div>
              <div style={{ ...label, marginTop: 4 }}>By record state</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
                {scores.filter((x) => x.c.group === "state").map(tile)}
                <div style={{ padding: "13px 15px", borderRadius: "var(--r-md,14px)", border: "1px dashed var(--border-strong)", minWidth: 0, gridColumn: "span 2", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                  <div style={{ fontSize: 12.5, color: "var(--body)", lineHeight: 1.5 }}>Every record falls in one requirement type and one state, so both rows add up to the same {attention.length}.</div>
                  <HumanGate>Clearing a record needs a person to verify the document.</HumanGate>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </Grid>
      <Grid cols="minmax(0,2.1fr) minmax(290px,.9fr)">
        <Panel pad={false} title={cur ? cur.id + ": records needing attention" : "Records needing attention"} meta={rows.length + " of " + attention.length + " · click a row to open the carer"}>
          <div style={{ padding: "2px 18px 12px" }}>
            <Filters value={cat} onChange={setCat} options={[{ id: "All", label: "All", count: attention.length }, ...scores.map((x) => ({ id: x.c.id, label: x.c.id, count: x.n }))]} />
          </div>
          <Table cols={cols} rows={rows} dense pageSize={12} rowKey={(i) => i.id} onRow={(i) => wc.open({ kind: "carer", id: i.carerId })} rowTone={() => "bad"}
            empty={"No " + (cur ? cur.id.toLowerCase() + " " : "") + "records need attention in " + scopeLabel(sc.office) + "."} />
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="Audit pack" meta="What an inspector would check first">
            {pack.map((p) => {
              const ok = p.a === p.b;
              return (
                <div key={p.k} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12.5, color: "var(--body)", minWidth: 0 }}>{p.k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink)" }}>{fmt(p.a)} / {fmt(p.b)}</span>
                  <Chip tone={ok ? "ok" : "warn"}>{ok ? "Ready" : fmt(p.b - p.a) + " gaps"}</Chip>
                </div>
              );
            })}
            <div style={{ paddingTop: 8 }}><GoLink page="Care Delivery" sub="Time Verification">Visit verification</GoLink></div>
          </Panel>
          <Panel title="Awaiting human verification" meta={sc.awaiting.length + " uploads, not counted in the " + attention.length + " above"}>
            {sc.awaiting.length === 0 && <div style={noteStyle}>Nothing waiting for verification in {scopeLabel(sc.office)}.</div>}
            {sc.awaiting.map((i) => (
              <ListRow key={i.id} tone="warn" onClick={() => wc.open({ kind: "carer", id: i.carerId })}
                title={<>{carerLink(i)} <span style={{ color: "var(--dim)" }}>· {i.requirement}</span></>}
                meta={<>{i.office} · {i.requirement === "Driving Licence" ? "licence" : "document"} expires {i.expiry} · verifier {i.owner}</>}
                right={<Chip status="Awaiting verification" />} />
            ))}
          </Panel>
        </div>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function Compliance() {
  const s = useWc();
  const sub = s.sub["Compliance"];
  return (
    <Page>
      {sub === "Expiries" ? <Expiries />
        : sub === "Garda Vetting" ? <Garda />
          : sub === "Training" ? <Training />
            : sub === "Vehicle Documents" ? <Vehicle />
              : sub === "Audit Readiness" ? <Audit />
                : <Overview />}
    </Page>
  );
}
