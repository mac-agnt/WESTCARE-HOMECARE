/* Recruitment: central recruitment in Cezanne HR through to the local office
   handoff, onboarding and ready-to-roster. Every number is derived from the
   shared model so the KPI, the chart and the table under it always agree.
   Agents organise, chase and summarise. People make every hiring decision. */
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  CANDIDATES, CANDIDATE_TREND, HANDOFFS, K, NEW_STARTERS_TREND, OFFICE_IDS, OPEN_ROLES, RECRUITMENT_EVENTS, SARAH, SOURCES_90,
  SOURCE_WEEK, STAGES, WEEKS, fmt, officeOf, pct,
  type Candidate, type Handoff, type OfficeFilter, type OfficeId, type Source, type Stage,
} from "../model";
import { useWc, wc } from "../store";
import {
  AgentNote, Bars, Btn, Chip, Filters, Funnel, GoLink, Grid, HumanGate, KpiStrip, Legend, ListRow, MONO, Page, Panel,
  RecLink, ScopeBar, SearchBox, Seg, Stack, Stat, TONE, Table, Timeline, Trend, byOffice, label, type Col, type Tone,
} from "../ui";

/* ------------------------------------------------------------------ */
/* Local derivations                                                   */
/* ------------------------------------------------------------------ */

type StageF = "All" | Stage;
type Flag = "All" | "Missing" | "Stalled";
type CandFilter = { stage: StageF; flag: Flag };

const goSub = (sub: string) => wc.setSub("Recruitment", sub);

/** Days a candidate can sit in a stage before the Recruitment Agent flags it. */
const STALL_LIMIT: Partial<Record<Stage, number>> = { "Review": 5, "Interview": 5, "Garda Vetting": 7, "Onboarding": 7 };
const isStalled = (c: Candidate) => { const t = STALL_LIMIT[c.stage]; return t !== undefined && c.daysInStage >= t; };
const overLimit = (c: Candidate) => c.daysInStage - (STALL_LIMIT[c.stage] ?? 99);
const awaitingFirstReview = (c: Candidate) => c.stage === "New" && c.daysInStage >= 3;

const inStage = (c: Candidate) => (c.hoursInStage ? c.hoursInStage + "h" : c.daysInStage + (c.daysInStage === 1 ? " day" : " days"));

function stageCounts(rows: Candidate[]): Record<Stage, number> {
  const out = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const c of rows) out[c.stage]++;
  return out;
}

const SOURCE_LABEL: Record<Source, string> = { "Indeed": "Indeed", "Referral": "Referrals", "Social": "Social", "Recruitment Event": "Recruitment events", "Westcare Website": "Westcare website" };
const SOURCE_COLOR = (s: Source) => (s === "Indeed" ? "var(--accent)" : s === "Westcare Website" ? "var(--bad)" : "var(--neutral)");
const STAGE_COLOR = (i: number) => "color-mix(in srgb, var(--accent) " + (22 + i * 12) + "%, var(--track))";

type HRow = Handoff & { office: OfficeId };
const H_ROWS: HRow[] = HANDOFFS.map((h) => ({ ...h, office: h.destination }));
const acceptedBy = (h: Handoff, acc: Record<string, string>) => acc[h.candidate.id] || h.acceptedBy;
const handoffOf = (c: Candidate) => HANDOFFS.find((h) => h.candidate.id === c.id);

function sortHandoffs(rows: HRow[], acc: Record<string, string>): HRow[] {
  return rows.slice().sort((a, b) => {
    const aa = acceptedBy(a, acc) ? 1 : 0, ba = acceptedBy(b, acc) ? 1 : 0;
    if (aa !== ba) return aa - ba;
    if (a.candidate === SARAH) return -1;
    if (b.candidate === SARAH) return 1;
    return b.waitingHours - a.waitingHours;
  });
}

function useHandoffs(office: OfficeFilter, acc: Record<string, string>) {
  const rows = sortHandoffs(byOffice(H_ROWS, office), acc);
  const waiting = rows.filter((h) => !acceptedBy(h, acc));
  const over12 = waiting.filter((h) => h.waitingHours > 12);
  return { rows, waiting, over12 };
}

/** Stage label as the rest of the app shows it (Sarah reads as delayed until accepted). */
const stageLabel = (c: Candidate, acc: Record<string, string>) => (c.story === "handoff" && !acc[c.id] ? "Handoff Delayed" : c.stage);

/** Short status for a pipeline card. */
function cardStatus(c: Candidate, acc: Record<string, string>): { text: string; tone: Tone } {
  if (c.stage === "Office Handoff") {
    const h = handoffOf(c);
    const by = h ? acceptedBy(h, acc) : null;
    if (by) return { text: "Accepted by " + by.split(" ")[0], tone: "ok" };
    return { text: "Awaiting office " + (h ? h.waitingHours + "h" : ""), tone: h && h.waitingHours > 12 ? "bad" : "warn" };
  }
  if (c.stage === "Garda Vetting") return { text: "Garda: " + (c.garda || "Link sent"), tone: "info" };
  if (c.stage === "Onboarding") return { text: "Onboarding " + (c.onboardingDone ?? 0) + " / 8", tone: "info" };
  if (c.stage === "Ready to Roster") return { text: "Compliance complete", tone: "ok" };
  if (c.stage === "Interview") return { text: c.lastContact.startsWith("Interview") ? c.lastContact : "Interview booked", tone: "info" };
  if (c.stage === "Review") return { text: "Recruiter review", tone: "warn" };
  return { text: "Application received", tone: "neutral" };
}

/** Funnel from ui.tsx, with a fallback when a small office has an empty stage. */
function SafeFunnel({ steps }: { steps: { label: string; value: number; onClick?: () => void }[] }) {
  if (steps.slice(0, -1).every((s) => s.value > 0)) return <Funnel steps={steps} />;
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {steps.map((s, i) => (
        <div key={s.label} onClick={s.onClick} className={s.onClick ? "wc-row" : undefined} style={{ display: "grid", gridTemplateColumns: "140px 1fr 70px", alignItems: "center", gap: 10, cursor: s.onClick ? "pointer" : "default", borderRadius: 8 }}>
          <div style={{ fontSize: 12.5, color: "var(--body)" }}>{s.label}</div>
          <div style={{ height: 24, display: "flex", alignItems: "center" }}>
            <div style={{ height: "100%", width: Math.max(3, (100 * s.value) / max) + "%", borderRadius: 6, background: i === 0 ? "var(--accent)" : STAGE_COLOR(6 - i), display: "flex", alignItems: "center", paddingLeft: 9, fontFamily: MONO, fontSize: 11.5, fontWeight: 600, color: i === 0 ? "var(--on-accent)" : "var(--ink)", whiteSpace: "nowrap" }}>{s.value}</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--faint)", textAlign: "right" }}>{i === 0 ? "" : steps[i - 1].value ? Math.round((100 * s.value) / steps[i - 1].value) + "% of prev" : "n/a"}</div>
        </div>
      ))}
    </div>
  );
}

const small: CSSProperties = { fontSize: 11.5, color: "var(--dim)", lineHeight: 1.45 };

/* ------------------------------------------------------------------ */
/* Module                                                              */
/* ------------------------------------------------------------------ */

export default function Recruitment() {
  const s = useWc();
  const sub = s.sub["Recruitment"];
  const [filter, setFilter] = useState<CandFilter>({ stage: "All", flag: "All" });
  const toCandidates = (f: Partial<CandFilter>) => { setFilter({ stage: "All", flag: "All", ...f }); goSub("Candidates"); };
  return (
    <Page>
      {sub === "Pipeline" ? <PipelineView toCandidates={toCandidates} />
        : sub === "Sources" ? <SourcesView />
        : sub === "Candidates" ? <CandidatesView filter={filter} setFilter={setFilter} />
        : sub === "Handoffs" ? <HandoffsView />
        : sub === "Open Roles" ? <OpenRolesView toCandidates={toCandidates} />
        : sub === "Recruitment Events" ? <EventsView />
        : <OverviewView toCandidates={toCandidates} />}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewView({ toCandidates }: { toCandidates: (f: Partial<CandFilter>) => void }) {
  const s = useWc();
  const all = s.office === "All";
  const cands = byOffice(CANDIDATES, s.office);
  const cnt = stageCounts(cands);
  const week = cands.filter((c) => c.appliedThisWeek);
  const { over12 } = useHandoffs(s.office, s.handoffAccepted);
  const stalled = cands.filter(isStalled).sort((a, b) => overLimit(b) - overLimit(a) || (b.story ? 1 : 0) - (a.story ? 1 : 0));
  const firstReview = cands.filter(awaitingFirstReview).length;

  const kpis = [
    { label: "New Candidates", value: fmt(all ? K.newCandidates : week.length), sub: "Applied this week", spark: all ? CANDIDATE_TREND : undefined, onClick: () => toCandidates({}) },
    { label: "Recruiter Reviewed", value: all ? K.reviewed : cnt["Review"] + cnt["Interview"], sub: cnt["Review"] + " in review, " + cnt["Interview"] + " at interview", onClick: () => toCandidates({ stage: "Review" }) },
    { label: "Interviews Scheduled", value: all ? K.interviews : cnt["Interview"], sub: "Booked through Cezanne HR", onClick: () => toCandidates({ stage: "Interview" }) },
    { label: "Garda Links Issued", value: all ? K.gardaLinks : cnt["Garda Vetting"], sub: "Vetting in progress", onClick: () => toCandidates({ stage: "Garda Vetting" }) },
    { label: "Office Handoffs", value: all ? K.handoffs : cnt["Office Handoff"], sub: over12.length + " waiting over 12h", tone: over12.length ? ("bad" as Tone) : undefined, onClick: () => goSub("Handoffs") },
    { label: "Starting Onboarding", value: all ? K.onboarding : cnt["Onboarding"], sub: cnt["Ready to Roster"] + " ready to roster", onClick: () => toCandidates({ stage: "Onboarding" }) },
  ];

  const sourceRows = SOURCE_WEEK.map(([src]) => ({ src, n: week.filter((c) => c.source === src).length }));
  const web = sourceRows.find((r) => r.src === "Westcare Website")!;
  const webSrc = SOURCES_90.find((r) => r.source === "Westcare website")!;

  return (
    <>
      <ScopeBar title="Recruitment" sub="Healthcare assistant supply from every source, screened centrally in Cezanne HR and handed to local offices once Garda Vetting starts. Hiring decisions stay with people." />
      <KpiStrip items={kpis} />

      <FlowStrip cnt={cnt} weekCount={week.length} over12={over12.length} toCandidates={toCandidates} />

      <Grid cols="1.15fr 1fr 1fr">
        <Panel title="Recruitment funnel" meta={"This week's applications, then the live pipeline" + (all ? "" : " for " + s.office)}>
          <SafeFunnel steps={[
            { label: "New candidates", value: week.length, onClick: () => toCandidates({}) },
            { label: "Recruiter reviewed", value: cnt["Review"] + cnt["Interview"], onClick: () => toCandidates({ stage: "Review" }) },
            { label: "Interview scheduled", value: cnt["Interview"], onClick: () => toCandidates({ stage: "Interview" }) },
            { label: "Garda link issued", value: cnt["Garda Vetting"], onClick: () => toCandidates({ stage: "Garda Vetting" }) },
            { label: "Office handoff", value: cnt["Office Handoff"], onClick: () => goSub("Handoffs") },
            { label: "Onboarding", value: cnt["Onboarding"], onClick: () => toCandidates({ stage: "Onboarding" }) },
            { label: "Ready to roster", value: cnt["Ready to Roster"], onClick: () => toCandidates({ stage: "Ready to Roster" }) },
          ]} />
          <div style={{ marginTop: "auto", paddingTop: 12 }}><HumanGate>Stages move only when a recruiter or coordinator moves them.</HumanGate></div>
        </Panel>

        <Panel title="Where candidates came from" meta="Applications this week by source" action={<GoLink page="Recruitment" sub="Sources">Sources</GoLink>}>
          <Bars data={sourceRows.map((r) => ({ label: SOURCE_LABEL[r.src], value: r.n, color: SOURCE_COLOR(r.src), note: week.length ? pct(r.n, week.length, 0) : undefined }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            <Stat k="Website share this week" v={pct(web.n, week.length || 1)} tone="bad" />
            <Stat k="Website starters, 90 days" v={webSrc.starters + " of " + webSrc.applicants} tone="bad" />
          </div>
          <div style={{ marginTop: 10 }}>
            <AgentNote agent="Recruitment Agent" state="attention">
              The Westcare website brought {web.n} of {week.length} applications this week. It is the weakest channel on volume and on conversion to starters.
            </AgentNote>
          </div>
        </Panel>

        <Panel title="Weekly applications" meta={all ? "All offices, last 7 weeks" : "Company-wide series, not split by office"}>
          <Trend labels={WEEKS} series={[{ name: "Applications", values: CANDIDATE_TREND }]} height={128} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 14 }}>
            <Stat k="This week" v={fmt(CANDIDATE_TREND[6])} />
            <Stat k="Change on last week" v={"+" + (CANDIDATE_TREND[6] - CANDIDATE_TREND[5])} tone="ok" />
            <Stat k="7-week average" v={Math.round(CANDIDATE_TREND.reduce((a, b) => a + b, 0) / 7)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span style={{ ...label, flex: 1 }}>New starters per week</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--dim)" }}>{NEW_STARTERS_TREND.join("  ")}</span>
          </div>
        </Panel>
      </Grid>

      <Grid cols="1fr 1fr">
        <Panel title="Stalled applications" meta={stalled.length + " past their stage limit, " + firstReview + " new applications waiting 3 days for a first review"} action={<Btn kind="quiet" onClick={() => toCandidates({ flag: "Stalled" })} style={{ height: 26 }}>View all</Btn>}>
          <AgentNote agent="Recruitment Agent" state={stalled.length ? "attention" : "complete"}>
            {stalled.length
              ? "I found " + stalled.length + " candidates who have not moved in longer than the stage limit. Follow-up drafts are ready for each recruiter to review and send. No candidate is ranked or scored."
              : "Nothing is past its stage limit for this office."}
          </AgentNote>
          <div style={{ marginTop: 8 }}>
            {stalled.slice(0, 6).map((c) => (
              <ListRow key={c.id} tone="warn"
                title={<><RecLink to={{ kind: "candidate", id: c.id }}>{c.name}</RecLink> <Muted>{c.stage}, {inStage(c)} (limit {STALL_LIMIT[c.stage]} days)</Muted></>}
                meta={c.office + " · " + c.recruiter + (c.missing.length ? " · missing " + c.missing.join(", ") : "") + " · last contact: " + c.lastContact}
                right={<Chip tone="accent">Draft ready</Chip>} />
            ))}
          </div>
        </Panel>

        <Panel title="Handoffs at risk" meta="Sent to a local office and not accepted within 12 hours" tone={over12.length ? "bad" : undefined} action={<GoLink page="Recruitment" sub="Handoffs">Handoffs</GoLink>}>
          {over12.length === 0 && <div style={{ ...small, padding: "18px 0" }}>No handoffs over 12 hours for this office.</div>}
          {over12.map((h) => (
            <ListRow key={h.candidate.id} tone={h.waitingHours > 24 ? "bad" : "warn"}
              title={<><RecLink to={{ kind: "candidate", id: h.candidate.id }}>{h.candidate.name}</RecLink> <Muted>to {h.destination}</Muted></>}
              meta={"Sent by " + h.recruiter + " · waiting on " + officeOf(h.destination).coordinator + " · " + h.outstanding.length + " actions outstanding"}
              right={<Chip tone="bad">{h.waitingHours}h waiting</Chip>} />
          ))}
          {over12.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <AgentNote agent="Recruitment Agent" state="attention">
                Handoff summaries are prepared for each coordinator. {over12[0].candidate.name} has waited {over12[0].waitingHours} hours for {over12[0].destination}; acceptance is a coordinator decision.
              </AgentNote>
            </div>
          )}
        </Panel>
      </Grid>
    </>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span style={{ color: "var(--dim)", fontSize: 12 }}>{children}</span>;
}

/** Candidate source to ready-to-roster, split at the central-to-local boundary. */
function FlowStrip({ cnt, weekCount, over12, toCandidates }: { cnt: Record<Stage, number>; weekCount: number; over12: number; toCandidates: (f: Partial<CandFilter>) => void }) {
  const nodes: { k: string; v: ReactNode; sub: string; tone?: Tone; onClick: () => void; gate?: boolean }[] = [
    { k: "Candidate source", v: weekCount, sub: "5 channels this week", onClick: () => goSub("Sources") },
    { k: "Application received", v: cnt["New"], sub: "New in Cezanne HR", onClick: () => toCandidates({ stage: "New" }) },
    { k: "Recruiter review", v: cnt["Review"], sub: "Central recruiters", onClick: () => toCandidates({ stage: "Review" }) },
    { k: "Interview", v: cnt["Interview"], sub: "Scheduled", onClick: () => toCandidates({ stage: "Interview" }) },
    { k: "Garda Vetting link", v: cnt["Garda Vetting"], sub: "Link issued", onClick: () => toCandidates({ stage: "Garda Vetting" }) },
    { k: "Local office handoff", v: cnt["Office Handoff"], sub: over12 + " over 12h", tone: over12 ? "bad" : undefined, onClick: () => goSub("Handoffs") },
    { k: "Onboarding", v: cnt["Onboarding"], sub: "Office-led tasks", onClick: () => toCandidates({ stage: "Onboarding" }) },
    { k: "Compliance complete", v: "Gate", sub: "Verified by a person", gate: true, onClick: () => wc.go("Compliance", "Overview") },
    { k: "Ready to roster", v: cnt["Ready to Roster"], sub: "Released to Rostering", tone: "ok", onClick: () => toCandidates({ stage: "Ready to Roster" }) },
  ];
  return (
    <Panel title="Candidate journey" meta="Central recruitment owns the first five steps. Once Garda Vetting starts, the local office takes over onboarding and compliance." style={{ marginTop: 12 }}>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 1020, display: "grid", gridTemplateColumns: "repeat(9,minmax(0,1fr))", columnGap: 14, rowGap: 8 }}>
          <div style={{ gridColumn: "1 / span 5", ...label, padding: "0 2px 6px", borderBottom: "1px solid var(--accent-line)", color: "var(--accent)" }}>Central recruitment · Cezanne HR</div>
          <div style={{ gridColumn: "6 / span 4", ...label, padding: "0 2px 6px", borderBottom: "1px solid var(--border-strong)" }}>Local office · onboarding and compliance</div>
          {nodes.map((n, i) => {
            const t = n.tone ? TONE[n.tone] : null;
            return (
              <button key={n.k} className="wc-kpi" onClick={n.onClick}
                style={{ position: "relative", textAlign: "left", font: "inherit", color: "inherit", padding: "11px 12px", minWidth: 0, cursor: "pointer",
                  background: n.gate ? "none" : t ? t.soft : "var(--surface-2)", border: "1px " + (n.gate ? "dashed var(--border-strong)" : "solid " + (t ? t.soft : "var(--border)")), borderRadius: "var(--r-sm,10px)",
                  boxShadow: i === 5 ? "inset 3px 0 0 " + (t ? t.ink : "var(--accent)") : "none" }}>
                <div style={{ ...label, fontSize: 8.5, lineHeight: 1.35, minHeight: 23 }}>{n.k}</div>
                <div style={{ fontSize: n.gate ? 14 : 22, fontWeight: 600, letterSpacing: "-.6px", marginTop: 7, lineHeight: 1, color: t ? t.ink : n.gate ? "var(--dim)" : "var(--ink)", fontVariantNumeric: "tabular-nums", minHeight: 22, display: "flex", alignItems: "flex-end" }}>{n.v}</div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.sub}</div>
                {i < nodes.length - 1 && (
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style={{ position: "absolute", right: -13, top: "50%", marginTop: -6 }} fill="none" stroke={i === 4 ? "var(--warn)" : "var(--faint)"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 5l7 7-7 7" /></svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

const COLUMN_SHOW = 6;

function PipelineView({ toCandidates }: { toCandidates: (f: Partial<CandFilter>) => void }) {
  const s = useWc();
  const cands = byOffice(CANDIDATES, s.office);
  const cnt = stageCounts(cands);
  const { over12 } = useHandoffs(s.office, s.handoffAccepted);
  const stalled = cands.filter(isStalled).length;
  const missing = cands.filter((c) => c.missing.length > 0).length;

  return (
    <>
      <ScopeBar title="Pipeline" sub="Every active candidate by stage. Named cases first, then the longest in stage. Open a card for the full record." />
      <KpiStrip items={[
        { label: "Active candidates", value: cands.length, sub: "Across 7 stages", onClick: () => toCandidates({}) },
        { label: "Awaiting first review", value: cands.filter(awaitingFirstReview).length, sub: "New for 3 days or more", tone: "warn" },
        { label: "Stalled", value: stalled, sub: "Past the stage limit", tone: stalled ? "warn" : undefined, onClick: () => toCandidates({ flag: "Stalled" }) },
        { label: "Missing information", value: missing, sub: "Documents or forms outstanding", onClick: () => toCandidates({ flag: "Missing" }) },
        { label: "Handoffs over 12h", value: over12.length, sub: "Awaiting local office", tone: over12.length ? "bad" : undefined, onClick: () => goSub("Handoffs") },
        { label: "Ready to roster", value: cnt["Ready to Roster"], sub: "Compliance complete", tone: "ok" },
      ]} />

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(172px,1fr))", gap: 9, minWidth: 1260 }}>
          {STAGES.map((st, i) => {
            const col = cands.filter((c) => c.stage === st).sort((a, b) => (b.story ? 1 : 0) - (a.story ? 1 : 0) || (b.hoursInStage ? b.hoursInStage / 24 : b.daysInStage) - (a.hoursInStage ? a.hoursInStage / 24 : a.daysInStage) || b.missing.length - a.missing.length);
            const more = col.length - COLUMN_SHOW;
            return (
              <section key={st} style={{ minWidth: 0, display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", overflow: "hidden", animation: "springIn .5s var(--ease) " + i * 40 + "ms both" }}>
                <div style={{ height: 3, background: STAGE_COLOR(i) }} />
                <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 12px 9px" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink)", padding: "2px 7px", borderRadius: 6, background: "var(--surface-2)" }}>{cnt[st]}</span>
                </header>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "0 9px 10px", flex: 1 }}>
                  {col.length === 0 && <div style={{ ...small, padding: "14px 4px", textAlign: "center" }}>No candidates at this stage.</div>}
                  {col.slice(0, COLUMN_SHOW).map((c) => <CandCard key={c.id} c={c} />)}
                  {more > 0 && (
                    <button className="wc-seg" onClick={() => toCandidates({ stage: st })}
                      style={{ marginTop: "auto", height: 30, border: "1px dashed var(--border-strong)", borderRadius: "var(--r-sm,10px)", background: "none", color: "var(--dim)", fontSize: 12, cursor: "pointer" }}>
                      +{more} more in {st}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Grid cols="1.4fr 1fr">
        <AgentNote agent="Recruitment Agent" state="working">
          I keep the board in order, extract qualifications from submitted CVs, list missing documents and draft follow-ups. I do not rank or score candidates. Moving a candidate between stages is a recruiter or coordinator decision.
        </AgentNote>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "0 4px" }}>
          {STAGES.map((st, i) => <Legend key={st} color={STAGE_COLOR(i)}>{st}</Legend>)}
        </div>
      </Grid>
    </>
  );
}

function CandCard({ c }: { c: Candidate }) {
  const s = useWc();
  const st = cardStatus(c, s.handoffAccepted);
  const stalled = isStalled(c);
  return (
    <div className="wc-row" onClick={() => wc.open({ kind: "candidate", id: c.id })}
      style={{ padding: "9px 10px", background: "var(--surface-faint)", border: "1px solid " + (c.story ? "var(--accent-line)" : "var(--border)"), borderRadius: "var(--r-sm,10px)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <RecLink to={{ kind: "candidate", id: c.id }}>{c.name}</RecLink>
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: stalled || (c.hoursInStage ?? 0) > 12 ? "var(--warn)" : "var(--faint)", whiteSpace: "nowrap" }}>{inStage(c)}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.role} · {c.county}</div>
      <div style={{ fontSize: 11, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.sourceDetail} · for {c.office}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
        <Chip tone={st.tone} style={{ height: 20, fontSize: 10.5, padding: "0 7px", maxWidth: "100%", overflow: "hidden" }}>{st.text}</Chip>
        {c.missing.length > 0 && <Chip tone="bad" style={{ height: 20, fontSize: 10.5, padding: "0 7px", maxWidth: "100%", overflow: "hidden" }}>{c.missing.length > 1 ? c.missing.length + " items missing" : "Missing " + c.missing[0]}</Chip>}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Last contact: {c.lastContact}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

const S90 = SOURCES_90.map((r) => {
  const costNum = Number(r.cost.replace(/[^0-9]/g, ""));
  return { ...r, conv: r.starters / r.applicants, costNum, perStarter: r.starters ? costNum / r.starters : 0 };
});
type S90Row = (typeof S90)[number];

function SourcesView() {
  const s = useWc();
  const tot = S90.reduce((a, r) => ({ applicants: a.applicants + r.applicants, interviews: a.interviews + r.interviews, handoffs: a.handoffs + r.handoffs, starters: a.starters + r.starters }), { applicants: 0, interviews: 0, handoffs: 0, starters: 0 });
  const best = S90.slice().sort((a, b) => b.conv - a.conv)[0];
  const worst = S90.slice().sort((a, b) => a.conv - b.conv)[0];
  const indeed = S90.find((r) => r.source === "Indeed")!;
  const week = byOffice(CANDIDATES, s.office).filter((c) => c.appliedThisWeek);
  const weekMax = Math.max(1, ...SOURCE_WEEK.map(([src]) => week.filter((c) => c.source === src).length));

  const cols: Col<S90Row>[] = [
    { key: "source", label: "Source", w: "1.3fr", render: (r) => <span style={{ color: r === worst ? "var(--bad)" : r === best ? "var(--ok)" : "var(--ink)", fontWeight: 500 }}>{r.source}</span>, sort: (r) => r.source },
    { key: "applicants", label: "Applicants", w: ".85fr", align: "right", mono: true, render: (r) => fmt(r.applicants), sort: (r) => r.applicants },
    { key: "interviews", label: "Interviews", w: ".8fr", align: "right", mono: true, sort: (r) => r.interviews },
    { key: "handoffs", label: "Handoffs", w: ".7fr", align: "right", mono: true, sort: (r) => r.handoffs },
    { key: "starters", label: "Starters", w: ".7fr", align: "right", mono: true, sort: (r) => r.starters },
    { key: "conv", label: "Conversion", w: "1.2fr", sort: (r) => r.conv, render: (r) => (
      <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
        <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--track)", overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: (100 * r.conv / best.conv) + "%", background: r === worst ? "var(--bad)" : r === best ? "var(--ok)" : "var(--accent)", borderRadius: 3 }} />
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11.5, minWidth: 40, textAlign: "right" }}>{(100 * r.conv).toFixed(1)}%</span>
      </span>
    ) },
    { key: "cost", label: "Cost, per starter (mock)", w: "1.5fr", align: "right", mono: true, sort: (r) => r.perStarter,
      render: (r) => <span>{r.cost.replace(" (bonus)", "")}<span style={{ color: "var(--faint)" }}> · {r.costNum ? "€" + fmt(Math.round(r.perStarter)) : "€0"}</span></span> },
  ];

  return (
    <>
      <ScopeBar title="Sources" sub="Which channels bring healthcare assistants who actually start. 90-day figures come from the Cezanne HR source report and are company-wide. This week follows the office filter." />
      <KpiStrip items={[
        { label: "Applicants, 90 days", value: fmt(tot.applicants), sub: "7 sources" },
        { label: "Interviews, 90 days", value: fmt(tot.interviews), sub: pct(tot.interviews, tot.applicants) + " of applicants" },
        { label: "Starters, 90 days", value: tot.starters, sub: tot.handoffs + " office handoffs" },
        { label: "Overall conversion", value: pct(tot.starters, tot.applicants), sub: "Applicant to starter" },
        { label: "Best conversion", value: pct(best.starters, best.applicants), sub: best.source + ", " + best.starters + " from " + best.applicants, tone: "ok" },
        { label: "Weakest conversion", value: pct(worst.starters, worst.applicants), sub: worst.source + ", " + worst.starters + " from " + worst.applicants, tone: "bad" },
      ]} />

      <Grid cols="1.55fr 1fr">
        <Panel title="Source comparison, last 90 days" meta="Cost is mock data for the demo, not Westcare spend. Referral cost is bonuses paid." pad={false}>
          <Table cols={cols} rows={S90} pageSize={10} dense rowTone={(r) => (r === worst ? "bad" : r === best ? "ok" : undefined)} rowKey={(r) => r.source} />
        </Panel>
        <Panel title="Applicant to starter conversion" meta="Starters divided by applicants, last 90 days">
          <Bars data={S90.slice().sort((a, b) => b.conv - a.conv).map((r) => ({ label: r.source, value: +(100 * r.conv).toFixed(1), color: r === worst ? "var(--bad)" : r === best ? "var(--ok)" : "var(--neutral)", note: r.starters + " / " + fmt(r.applicants) }))} fmtValue={(n) => n.toFixed(1) + "%"} />
          <div style={{ marginTop: 14 }}>
            <AgentNote agent="Recruitment Agent" state="attention">
              The Westcare website converts weakest: {worst.starters} starters from {worst.applicants} applicants ({pct(worst.starters, worst.applicants)}). Referrals convert best: {best.starters} from {best.applicants} ({pct(best.starters, best.applicants)}). Indeed brings the volume, {fmt(indeed.applicants)} applicants for {indeed.starters} starters. Worth a recruiter review of the careers page application form.
            </AgentNote>
          </div>
        </Panel>
      </Grid>

      <Grid cols="1fr 1.2fr">
        <Panel title="This week by source" meta={week.length + " applications" + (s.office === "All" ? ", all offices" : " for " + s.office) + ", split by current stage"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SOURCE_WEEK.map(([src]) => {
              const rows = week.filter((c) => c.source === src);
              return (
                <div key={src} style={{ display: "grid", gridTemplateColumns: "130px 1fr 44px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: src === "Westcare Website" ? "var(--bad)" : "var(--body)" }}>{SOURCE_LABEL[src]}</span>
                  <div style={{ width: Math.max(4, (100 * rows.length) / weekMax) + "%" }}>
                    <Stack height={12} parts={(["New", "Review", "Interview"] as Stage[]).map((st, i) => ({ value: rows.filter((c) => c.stage === st).length, color: STAGE_COLOR(i * 2), label: st }))} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right" }}>{rows.length}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
            {(["New", "Review", "Interview"] as Stage[]).map((st, i) => <Legend key={st} color={STAGE_COLOR(i * 2)}>{st}</Legend>)}
          </div>
          <div style={{ marginTop: "auto", paddingTop: 12 }}><GoLink page="Recruitment" sub="Candidates">Open this week's candidates</GoLink></div>
        </Panel>

        <Panel title="Where each source drops out" meta="Stage-to-stage rates over 90 days. Darker cells convert better.">
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr repeat(3,1fr)", gap: 4 }}>
            {["Source", "Applicant to interview", "Interview to handoff", "Handoff to starter"].map((h) => <div key={h} style={{ ...label, fontSize: 8.5, padding: "0 6px 6px" }}>{h}</div>)}
            {S90.map((r) => {
              const rates = [r.interviews / r.applicants, r.handoffs / r.interviews, r.starters / r.handoffs];
              return [
                <div key={r.source} style={{ fontSize: 12.5, padding: "8px 6px", color: r === worst ? "var(--bad)" : "var(--body)" }}>{r.source}</div>,
                ...rates.map((x, k) => (
                  <div key={r.source + k} style={{ padding: "8px 8px", borderRadius: 6, fontFamily: MONO, fontSize: 12, textAlign: "right", color: "var(--ink)", background: "color-mix(in srgb, var(--accent) " + Math.round(4 + x * (k === 2 ? 26 : 50)) + "%, transparent)" }}>{(100 * x).toFixed(0)}%</div>
                )),
              ];
            })}
          </div>
          <div style={{ ...small, marginTop: 12 }}>
            The website loses most candidates before interview ({pct(worst.interviews, worst.applicants, 0)} reach one, against {pct(best.interviews, best.applicants, 0)} for referrals).
          </div>
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

const STAGE_ORDER = (st: Stage) => STAGES.indexOf(st);

function CandidatesView({ filter, setFilter }: { filter: CandFilter; setFilter: (f: CandFilter) => void }) {
  const s = useWc();
  const [q, setQ] = useState("");
  const base = byOffice(CANDIDATES, s.office);
  const cnt = stageCounts(base);
  const needle = q.trim().toLowerCase();
  const rows = base
    .filter((c) => filter.stage === "All" || c.stage === filter.stage)
    .filter((c) => filter.flag === "All" || (filter.flag === "Missing" ? c.missing.length > 0 : isStalled(c)))
    .filter((c) => !needle || (c.name + " " + c.id + " " + c.county + " " + c.sourceDetail + " " + c.recruiter).toLowerCase().includes(needle))
    .sort((a, b) => (b.story ? 1 : 0) - (a.story ? 1 : 0) || STAGE_ORDER(b.stage) - STAGE_ORDER(a.stage) || b.daysInStage - a.daysInStage);
  const stories = base.filter((c) => c.story);

  const cols: Col<Candidate>[] = [
    { key: "name", label: "Candidate", w: "1.35fr", render: (c) => <RecLink to={{ kind: "candidate", id: c.id }}>{c.name}</RecLink>, sort: (c) => c.name },
    { key: "role", label: "Role", w: "1.15fr" },
    { key: "county", label: "County", w: ".75fr", sort: (c) => c.county },
    { key: "source", label: "Source", w: "1.2fr", render: (c) => <span style={{ color: c.source === "Westcare Website" ? "var(--bad)" : undefined }}>{c.sourceDetail}</span>, sort: (c) => c.sourceDetail },
    { key: "office", label: "Office", w: ".75fr", sort: (c) => c.office },
    { key: "stage", label: "Stage", w: "1.1fr", render: (c) => <Chip status={stageLabel(c, s.handoffAccepted)} />, sort: (c) => STAGE_ORDER(c.stage) },
    { key: "days", label: "In stage", w: ".65fr", align: "right", mono: true, render: (c) => <span style={{ color: isStalled(c) ? "var(--warn)" : undefined }}>{inStage(c)}</span>, sort: (c) => (c.hoursInStage ? c.hoursInStage / 24 : c.daysInStage) },
    { key: "missing", label: "Missing items", w: "1.2fr", render: (c) => (c.missing.length ? <span style={{ color: "var(--bad)" }}>{c.missing.join(", ")}</span> : <span style={{ color: "var(--faint)" }}>None</span>), sort: (c) => c.missing.length },
    { key: "last", label: "Last contact", w: "1.25fr", render: (c) => c.lastContact },
    { key: "recruiter", label: "Recruiter", w: ".9fr", sort: (c) => c.recruiter },
  ];

  return (
    <>
      <ScopeBar title="Candidates" sub="All active candidates from Cezanne HR, with what is missing and who last spoke to them. Click a name for the full journey." />
      <KpiStrip items={[
        { label: "Active candidates", value: base.length, sub: "All stages" },
        { label: "Applied this week", value: base.filter((c) => c.appliedThisWeek).length, sub: "New, review or interview" },
        { label: "Missing information", value: base.filter((c) => c.missing.length > 0).length, sub: "Document requests drafted", tone: "warn", onClick: () => setFilter({ stage: "All", flag: "Missing" }) },
        { label: "Stalled", value: base.filter(isStalled).length, sub: "Past the stage limit", tone: "warn", onClick: () => setFilter({ stage: "All", flag: "Stalled" }) },
        { label: "Past Garda Vetting", value: cnt["Office Handoff"] + cnt["Onboarding"] + cnt["Ready to Roster"], sub: "With local offices" },
      ]} />

      {stories.length > 0 && (
        <Grid cols={"repeat(" + stories.length + ",minmax(0,1fr))"} gap={10}>
          {stories.map((c) => <StoryCard key={c.id} c={c} />)}
        </Grid>
      )}

      <Panel title="Candidate list" meta={rows.length === base.length ? "Every active candidate for this office filter" : rows.length + " of " + base.length + " match the current filters"} pad={false} style={{ marginTop: 12 }}
        action={<SearchBox value={q} onChange={setQ} placeholder="Search name, county, source, recruiter" />}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "4px 18px 12px" }}>
          <Filters<StageF> value={filter.stage} onChange={(v) => setFilter({ ...filter, stage: v })}
            options={[{ id: "All", label: "All stages", count: base.length }, ...STAGES.map((st) => ({ id: st as StageF, label: st, count: cnt[st] }))]} />
          <span style={{ flex: 1 }} />
          <Seg<Flag> value={filter.flag} onChange={(v) => setFilter({ ...filter, flag: v })} options={[{ id: "All", label: "Everyone" }, { id: "Missing", label: "Missing items" }, { id: "Stalled", label: "Stalled" }]} />
        </div>
        <Table key={filter.stage + filter.flag + needle + s.office} cols={cols} rows={rows} pageSize={14} dense onRow={(c) => wc.open({ kind: "candidate", id: c.id })}
          rowKey={(c) => c.id} rowTone={(c) => (c.story === "handoff" && !s.handoffAccepted[c.id] ? "bad" : isStalled(c) ? "warn" : undefined)}
          empty="No candidates match these filters." />
      </Panel>
    </>
  );
}

function StoryCard({ c }: { c: Candidate }) {
  const s = useWc();
  const acc = s.handoffAccepted;
  const lines: Record<string, { status: string; text: ReactNode; link?: ReactNode }> = {
    handoff: {
      status: acc[c.id] ? "Accepted" : "Handoff Delayed",
      text: acc[c.id] ? "Accepted by " + acc[c.id] + ". Onboarding " + c.onboardingDone + " of 8 tasks." : "Sent to " + c.office + " " + c.hoursInStage + " hours ago, not yet accepted. Garda Vetting application started.",
      link: <GoLink page="Recruitment" sub="Handoffs">Handoff summary</GoLink>,
    },
    onboarding: {
      status: "Onboarding",
      text: "Onboarding " + c.onboardingDone + " of 8, " + inStage(c) + " in stage. " + c.lastContact + ".",
      link: <RecLink to={{ kind: "hse", id: "HC-24817" }} style={{ fontSize: 12 }}>Linked to HC-24817 cover</RecLink>,
    },
    interview: { status: "Interview", text: "Met at the " + c.sourceDetail + ". " + c.lastContact + " with " + c.recruiter + "." },
    missing: { status: "Missing QQI", text: "QQI documentation not received. " + c.lastContact + " by " + c.recruiter + ", " + inStage(c) + " in review." },
  };
  const l = lines[c.story || ""];
  if (!l) return null;
  return (
    <div className="wc-row" onClick={() => wc.open({ kind: "candidate", id: c.id })} style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md,16px)", cursor: "pointer", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600 }}><RecLink to={{ kind: "candidate", id: c.id }}>{c.name}</RecLink></span>
        <Chip status={l.status} />
      </div>
      <div style={{ fontSize: 11.5, color: "var(--faint)" }}>{c.county} · {c.sourceDetail} · {c.stage}</div>
      <div style={{ ...small, color: "var(--body)" }}>{l.text}</div>
      {l.link && <div style={{ marginTop: "auto" }} onClick={(e) => e.stopPropagation()}>{l.link}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Handoffs                                                            */
/* ------------------------------------------------------------------ */

function HandoffsView() {
  const s = useWc();
  const acc = s.handoffAccepted;
  const { rows, waiting, over12 } = useHandoffs(s.office, acc);
  const longest = waiting.reduce((m, h) => Math.max(m, h.waitingHours), 0);
  const avg = waiting.length ? waiting.reduce((a, h) => a + h.waitingHours, 0) / waiting.length : 0;
  const focus = rows.find((h) => h.candidate === SARAH) || waiting[0] || rows[0];
  const accept = (h: Handoff) => wc.acceptHandoff(h.candidate.id, h.candidate.name, officeOf(h.destination).coordinator);

  const cols: Col<HRow>[] = [
    { key: "cand", label: "Candidate", w: "1.25fr", render: (h) => <RecLink to={{ kind: "candidate", id: h.candidate.id }}>{h.candidate.name}</RecLink>, sort: (h) => h.candidate.name },
    { key: "rec", label: "Recruiter", w: ".9fr", render: (h) => h.recruiter, sort: (h) => h.recruiter },
    { key: "dest", label: "Destination office", w: ".95fr", render: (h) => <RecLink to={{ kind: "office", id: h.destination }}>{h.destination}</RecLink>, sort: (h) => h.destination },
    { key: "stage", label: "Stage", w: "1.35fr", render: (h) => <Chip status={acceptedBy(h, acc) ? "Accepted · onboarding pack" : "Awaiting office acceptance"} /> },
    { key: "sent", label: "Handoff sent", w: ".9fr", mono: true, render: (h) => h.sent },
    { key: "by", label: "Accepted by", w: ".95fr", render: (h) => acceptedBy(h, acc) || <span style={{ color: "var(--faint)" }}>Not yet</span> },
    { key: "wait", label: "Time waiting", w: ".8fr", align: "right", sort: (h) => (acceptedBy(h, acc) ? -1 : h.waitingHours),
      render: (h) => (acceptedBy(h, acc) ? <span style={{ color: "var(--faint)" }}>Accepted</span> : <Chip tone={h.waitingHours > 12 ? "bad" : "warn"}>{h.waitingHours}h</Chip>) },
    { key: "out", label: "Outstanding actions", w: "1.5fr", render: (h) => {
      const list = h.outstanding.filter((o) => !(acc[h.candidate.id] && o === "Accept handoff"));
      return <span title={list.join(", ")}>{list.slice(0, 2).join(", ")}{list.length > 2 ? <span style={{ color: "var(--faint)" }}> +{list.length - 2}</span> : null}</span>;
    } },
    { key: "act", label: "", w: "1.1fr", align: "right", render: (h) => (acceptedBy(h, acc) ? null : (
      <span onClick={(e) => e.stopPropagation()}><Btn kind="primary" onClick={() => accept(h)} style={{ height: 26, padding: "0 10px", fontSize: 11.5 }}>Accept as {officeOf(h.destination).coordinator.split(" ")[0]}</Btn></span>
    )) },
  ];

  return (
    <>
      <ScopeBar title="Handoffs" sub="Central recruitment hands each candidate to the destination office once Garda Vetting starts. The office accepts, then owns onboarding and compliance. Target: accepted within 12 hours." />
      <KpiStrip items={[
        { label: "Office handoffs", value: rows.length, sub: "In the handoff stage" },
        { label: "Awaiting acceptance", value: waiting.length, sub: "Not yet accepted by an office", tone: waiting.length ? "warn" : "ok" },
        { label: "Over 12 hours", value: over12.length, sub: "Past the handoff target", tone: over12.length ? "bad" : "ok" },
        { label: "Accepted", value: rows.length - waiting.length, sub: "Onboarding pack issued", tone: "ok" },
        { label: "Longest wait", value: longest ? longest + "h" : "None", sub: "Unaccepted handoffs", tone: longest > 12 ? "bad" : undefined },
        { label: "Average wait", value: waiting.length ? avg.toFixed(1) + "h" : "None", sub: "Unaccepted handoffs" },
      ]} />

      <Grid cols="1.35fr 1fr">
        <Panel title="Central recruitment to local office" meta="Each line is one office. Label shows handoffs waiting and the longest wait.">
          <HandoffMap rows={rows} acc={acc} />
        </Panel>
        {focus ? <HandoffSummary h={focus} onAccept={() => accept(focus)} /> : (
          <Panel title="Handoff summary"><div style={small}>No handoffs for this office right now.</div></Panel>
        )}
      </Grid>

      {over12.length > 0 && (
        <Panel tone="bad" style={{ marginTop: 12 }} title={over12.length + " handoffs over 12 hours"} meta="Ops Watchdog escalates to the office coordinator at 24 hours">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {over12.map((h) => (
              <span key={h.candidate.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 30, padding: "0 11px", background: "var(--bad-soft)", borderRadius: "var(--r-sm,9px)", fontSize: 12 }}>
                <RecLink to={{ kind: "candidate", id: h.candidate.id }}>{h.candidate.name}</RecLink>
                <span style={{ color: "var(--dim)" }}>{h.destination}</span>
                <span style={{ fontFamily: MONO, color: "var(--bad)" }}>{h.waitingHours}h</span>
              </span>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Handoff register" meta="Accepting is a coordinator action. It creates the onboarding tasks in the office." pad={false} style={{ marginTop: 12 }}>
        <Table cols={cols} rows={rows} pageSize={12} dense onRow={(h) => wc.open({ kind: "candidate", id: h.candidate.id })} rowKey={(h) => h.candidate.id}
          rowTone={(h) => (acceptedBy(h, acc) ? undefined : h.waitingHours > 12 ? "bad" : "warn")} selected={(h) => h === focus} />
      </Panel>
    </>
  );
}

function HandoffMap({ rows, acc }: { rows: HRow[]; acc: Record<string, string> }) {
  const s = useWc();
  const offices = s.office === "All" ? OFFICE_IDS : OFFICE_IDS.filter((o) => o === s.office);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 170px", gridTemplateRows: "repeat(" + offices.length + ",auto)", columnGap: 0, rowGap: 8, alignItems: "center" }}>
      <div style={{ gridColumn: 1, gridRow: "1 / span " + offices.length, alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 14px", background: "var(--accent-faint)", border: "1px solid var(--accent-line)", borderRadius: "var(--r-md,14px)" }}>
        <div style={{ ...label, color: "var(--accent)" }}>Central recruitment</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>Cezanne HR</div>
        <div style={{ ...small, marginTop: 6 }}>Daniel Walsh, Orla Fahy, Kevin Brady</div>
        <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, marginTop: 10 }}>{rows.length}</div>
        <div style={small}>handoffs sent</div>
      </div>
      {offices.map((o, i) => {
        const hs = rows.filter((h) => h.destination === o);
        const w = hs.filter((h) => !acceptedBy(h, acc));
        const max = w.reduce((m, h) => Math.max(m, h.waitingHours), 0);
        const tone: Tone | null = !hs.length ? null : max > 12 ? "bad" : w.length ? "warn" : "ok";
        const ink = tone ? TONE[tone].ink : "var(--border-strong)";
        return [
          <div key={o + "l"} style={{ gridColumn: 2, gridRow: i + 1, position: "relative", height: 34, display: "flex", alignItems: "center" }}>
            <div style={{ position: "absolute", left: 0, right: 8, top: "50%", height: 2, marginTop: -1, background: ink, opacity: tone ? 0.8 : 0.5 }} />
            <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true" style={{ position: "absolute", right: 0, top: "50%", marginTop: -6 }}><path d="M0 0 L10 6 L0 12 Z" fill={ink} /></svg>
            <span style={{ position: "relative", margin: "0 auto", padding: "3px 9px", borderRadius: 7, background: "var(--surface)", border: "1px solid " + (tone ? TONE[tone].soft : "var(--border)"), fontFamily: MONO, fontSize: 10.5, color: tone ? TONE[tone].ink : "var(--faint)", whiteSpace: "nowrap" }}>
              {!hs.length ? "No handoffs" : w.length ? w.length + " waiting · max " + max + "h" : hs.length + " accepted"}
            </span>
          </div>,
          <div key={o + "r"} style={{ gridColumn: 3, gridRow: i + 1, padding: "7px 11px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}><RecLink to={{ kind: "office", id: o }}>{o}</RecLink></span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--dim)" }}>{hs.length - w.length}/{hs.length}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{officeOf(o).coordinator}</div>
          </div>,
        ];
      })}
    </div>
  );
}

function HandoffSummary({ h, onAccept }: { h: HRow; onAccept: () => void }) {
  const s = useWc();
  const c = h.candidate;
  const by = acceptedBy(h, s.handoffAccepted);
  const coord = officeOf(h.destination).coordinator;
  const outstanding = h.outstanding.filter((o) => !(s.handoffAccepted[c.id] && o === "Accept handoff"));
  return (
    <Panel title={"Handoff summary: " + c.name} meta={"Prepared by the Recruitment Agent for " + coord + ", " + h.destination} tone={by ? "ok" : h.waitingHours > 12 ? "bad" : "warn"}
      action={<Chip status={by ? "Accepted" : c.story === "handoff" ? "Handoff Delayed" : "Awaiting acceptance"} />}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        <Stat k="Source" v={c.sourceDetail} />
        <Stat k="Recruiter" v={h.recruiter} />
        <Stat k="Destination" v={h.destination + " · " + coord.split(" ")[0]} />
        <Stat k="Garda Vetting" v={c.garda || "Link sent"} tone="warn" />
        <Stat k="Onboarding" v={(c.onboardingDone ?? 0) + " / 8 tasks"} />
        <Stat k="Waiting" v={by ? "Accepted" : h.waitingHours + " hours"} tone={by ? "ok" : h.waitingHours > 12 ? "bad" : "warn"} />
      </div>
      <div style={{ marginTop: 12 }}>
        <AgentNote agent="Recruitment Agent" state={by ? "complete" : "attention"}>
          {by
            ? c.name + " was accepted by " + by + ". Onboarding tasks are now with the " + h.destination + " office."
            : c.name + " applied through " + c.sourceDetail + ", was screened and interviewed by " + h.recruiter + ", and has started Garda Vetting. The handoff pack went to " + h.destination + " " + h.waitingHours + " hours ago." + (c.missing.length ? " Still missing: " + c.missing.join(", ").toLowerCase() + "." : "")}
        </AgentNote>
      </div>
      <div style={{ ...label, marginTop: 14, marginBottom: 4 }}>Outstanding for the office</div>
      {outstanding.map((o) => (
        <div key={o} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: 12.5 }}>
          <span style={{ width: 13, height: 13, borderRadius: 4, border: "1.5px solid var(--border-strong)", flex: "none" }} />{o}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto", paddingTop: 12, flexWrap: "wrap" }}>
        {by ? <Chip tone="ok">Accepted by {by}</Chip> : <Btn kind="primary" onClick={onAccept}>Accept handoff as {coord}</Btn>}
        <span style={{ flex: 1 }} />
        <HumanGate>The office accepts. Agents only prepare the pack.</HumanGate>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Open roles                                                          */
/* ------------------------------------------------------------------ */

type RoleRow = (typeof OPEN_ROLES)[number];

function OpenRolesView({ toCandidates }: { toCandidates: (f: Partial<CandFilter>) => void }) {
  const s = useWc();
  const roles = byOffice(OPEN_ROLES, s.office);
  const cands = byOffice(CANDIDATES, s.office);
  const openings = roles.reduce((a, r) => a + r.openings, 0);
  const gap = roles.reduce((a, r) => a + r.hoursGap, 0);
  const biggest = roles.slice().sort((a, b) => b.hoursGap - a.hoursGap)[0];

  const cols: Col<RoleRow>[] = [
    { key: "title", label: "Role", w: "1.6fr", render: (r) => <span style={{ fontWeight: 500, color: "var(--ink)" }}>{r.title}</span>, sort: (r) => r.office },
    { key: "openings", label: "Openings", w: ".7fr", align: "right", mono: true, sort: (r) => r.openings },
    { key: "gap", label: "Unfilled hours / week", w: "1.1fr", align: "right", sort: (r) => r.hoursGap, render: (r) => <GoLink page="Rostering" sub="Unfilled Hours">{fmt(r.hoursGap)}h</GoLink> },
    { key: "per", label: "Hours per opening", w: ".9fr", align: "right", mono: true, sort: (r) => r.hoursGap / r.openings, render: (r) => Math.round(r.hoursGap / r.openings) + "h" },
    { key: "pipeline", label: "In pipeline", w: ".8fr", align: "right", mono: true, sort: (r) => r.pipeline },
    { key: "new", label: "New this week", w: ".85fr", align: "right", mono: true, sort: (r) => r.newThisWeek, render: (r) => r.newThisWeek },
    { key: "posted", label: "Posted on", w: "1.5fr", render: (r) => <span style={{ display: "flex", gap: 4 }}>{r.posted.map((p) => <Chip key={p} tone="neutral" style={{ height: 20, fontSize: 10.5, padding: "0 7px" }}>{p}</Chip>)}</span> },
    { key: "drive", label: "Driving", w: ".85fr", render: (r) => <Chip tone={r.drivingRequired ? "info" : "neutral"}>{r.drivingRequired ? "Required" : "Not required"}</Chip>, sort: (r) => (r.drivingRequired ? 1 : 0) },
    { key: "areas", label: "Areas", w: "1.6fr", render: (r) => <span style={{ color: "var(--dim)" }}>{r.areas}</span> },
  ];

  return (
    <>
      <ScopeBar title="Open Roles" sub="Healthcare assistant roles by office, set against the unfilled hours Rostering reports each week and the candidates already moving through." />
      <KpiStrip items={[
        { label: "Open roles", value: roles.length, sub: "Healthcare Assistant" },
        { label: "Openings", value: openings, sub: "Positions to fill" },
        { label: "Unfilled hours / week", value: fmt(gap) + "h", sub: "From HSE requested vs allocated", tone: "warn", onClick: () => wc.go("Rostering", "Unfilled Hours") },
        { label: "In pipeline", value: roles.reduce((a, r) => a + r.pipeline, 0), sub: "Active candidates", onClick: () => toCandidates({}) },
        { label: "New this week", value: roles.reduce((a, r) => a + r.newThisWeek, 0), sub: "Applications" },
        { label: "Driving required", value: roles.filter((r) => r.drivingRequired).length + " of " + roles.length, sub: "Rural runs need a car" },
      ]} />

      <Panel title="Open roles" meta="Unfilled hours link to Rostering. Postings go out through Cezanne HR." pad={false} style={{ marginTop: 12 }}>
        <Table cols={cols} rows={roles} pageSize={8} rowKey={(r) => r.office} rowTone={(r) => (r === biggest ? "warn" : undefined)} onRow={(r) => wc.open({ kind: "office", id: r.office })} />
      </Panel>

      <Grid cols="1.3fr 1fr">
        <Panel title="Pipeline by stage, per office" meta="Where each office's candidates sit today" action={<GoLink page="Recruitment" sub="Pipeline">Pipeline</GoLink>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {roles.map((r) => {
              const rows = cands.filter((c) => c.office === r.office);
              const cnt = stageCounts(rows);
              return (
                <div key={r.office} style={{ display: "grid", gridTemplateColumns: "92px 1fr 70px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5 }}>{r.office}</span>
                  <Stack height={12} parts={STAGES.map((st, i) => ({ value: cnt[st], color: STAGE_COLOR(i), label: st }))} />
                  <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--dim)", textAlign: "right" }}>{rows.length} for {r.openings}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
            {STAGES.map((st, i) => <Legend key={st} color={STAGE_COLOR(i)}>{st}</Legend>)}
          </div>
        </Panel>
        <Panel title="Unfilled hours by office" meta="Weekly hours requested by the HSE and not yet allocated" action={<GoLink page="Rostering" sub="Unfilled Hours">Rostering</GoLink>}>
          <Bars data={roles.slice().sort((a, b) => b.hoursGap - a.hoursGap).map((r) => ({ label: r.office, value: r.hoursGap, color: r === biggest ? "var(--warn)" : "var(--neutral)", note: r.openings + " roles" }))} fmtValue={(n) => fmt(n) + "h"} />
          {biggest && (
            <div style={{ marginTop: 14 }}>
              <AgentNote agent="Recruitment Agent" state="working">
                {biggest.office} has the largest gap at {fmt(biggest.hoursGap)}h a week with {biggest.openings} openings and {biggest.pipeline} candidates in the pipeline, {cands.filter((c) => c.office === biggest.office && (c.stage === "Onboarding" || c.stage === "Ready to Roster")).length} of them close to starting. I can draft an extra posting for review.
              </AgentNote>
            </div>
          )}
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Recruitment events                                                  */
/* ------------------------------------------------------------------ */

type Ev = (typeof RECRUITMENT_EVENTS)[number];
const EVENT_OFFICE: Record<string, OfficeFilter> = { "Mayo Open Day": "Mayo", "Galway Open Day": "Galway", "Sligo Jobs Fair": "Sligo", "Referral Campaign": "All", "Roscommon Open Day": "Roscommon" };
const evOffice = (e: Ev) => EVENT_OFFICE[e.name] || "All";

function EventsView() {
  const s = useWc();
  const events = RECRUITMENT_EVENTS.filter((e) => s.office === "All" || evOffice(e) === s.office || evOffice(e) === "All");
  const past = events.filter((e) => e.status !== "Upcoming");
  const upcoming = events.filter((e) => e.status === "Upcoming");
  const sumOf = (f: (e: Ev) => number) => events.reduce((a, e) => a + f(e), 0);
  const attended = sumOf((e) => e.attended);
  const fromAttend = past.filter((e) => e.attended > 0);
  const screenedFromAttend = fromAttend.reduce((a, e) => a + e.screening, 0);
  const galway = RECRUITMENT_EVENTS.find((e) => e.name === "Galway Open Day")!;
  const ciara = CANDIDATES.find((c) => c.story === "interview")!;

  const tl: { when: string; text: ReactNode; tone?: Tone; office: OfficeFilter }[] = [
    { when: "1 Sep", office: "All", tone: "ok", text: <>Referral Campaign launched across all offices. €250 bonus when the referred carer starts.</> },
    { when: "Sat 19 Sep", office: "Mayo", tone: "ok", text: <>Mayo Open Day, Castlebar. 42 RSVPs, 17 attended, 7 moved to recruiter screening, 3 Garda links issued.</> },
    { when: "Thu 24 Sep", office: "Sligo", tone: "info", text: <>Sligo Jobs Fair at Sligo IT. 64 stand conversations, leads imported to Cezanne HR. <RecLink to={{ kind: "candidate", id: ciara.id }}>{ciara.name}</RecLink> interviews Thu 10:30.</> },
    { when: "Sat 26 Sep", office: "Galway", tone: "warn", text: <>Galway Open Day. 51 RSVPs, 23 attended, 9 to screening, 2 Garda links so far.</> },
    { when: "Mon 28 Sep", office: "Galway", tone: "warn", text: <>Today. Recruitment Agent drafted follow-ups for the {galway.attended - galway.screening} Galway attendees not yet screened, waiting for a recruiter to send.</> },
    { when: "Sat 10 Oct", office: "Roscommon", tone: "info", text: <>Roscommon Open Day, Roscommon Town. 18 RSVPs so far.</> },
    { when: "31 Oct", office: "All", text: <>Referral Campaign closes.</> },
  ];
  const tlShown = tl.filter((t) => s.office === "All" || t.office === s.office || t.office === "All");

  return (
    <>
      <ScopeBar title="Recruitment Events" sub="Open days, jobs fairs and the referral campaign, followed from sign-up to Garda Vetting link." />
      <KpiStrip items={[
        { label: "Events", value: events.length, sub: past.length + " run, " + upcoming.length + " upcoming" },
        { label: "RSVPs", value: sumOf((e) => e.rsvps), sub: "Open days" },
        { label: "Attended", value: attended, sub: "Open days and fairs" },
        { label: "Moved to screening", value: sumOf((e) => e.screening), sub: "Recruiter screening" },
        { label: "Garda links from events", value: sumOf((e) => e.garda), sub: "Issued so far", tone: "ok" },
        { label: "Attended to screening", value: fromAttend.length ? pct(screenedFromAttend, fromAttend.reduce((a, e) => a + e.attended, 0), 0) : "None", sub: "In-person events" },
      ]} />

      <Grid cols="1.7fr 1fr">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 12, alignContent: "start" }}>
          {past.map((e) => <EventCard key={e.name} e={e} />)}
          {past.length === 0 && <Panel title="No completed events"><div style={small}>No events have run for this office yet.</div></Panel>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          {upcoming.map((e) => {
            const role = OPEN_ROLES.find((r) => r.office === evOffice(e));
            return (
              <Panel key={e.name} title={e.name} meta={e.where + " · " + e.when} action={<Chip status={e.status} />} tone="info">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                  <Stat k="RSVPs" v={e.rsvps} />
                  {role && <Stat k="Openings" v={role.openings} />}
                  {role && <Stat k="Hours gap / week" v={fmt(role.hoursGap) + "h"} tone="warn" />}
                </div>
                <div style={{ marginTop: 12 }}>
                  <AgentNote agent="Recruitment Agent" state="working">
                    RSVP reminder drafted for Thu 8 Oct. Daniel Walsh approves before it goes out. Walk-ins will be logged into Cezanne HR on the day.
                  </AgentNote>
                </div>
              </Panel>
            );
          })}
          <Panel title="Timeline" meta="Events and follow-up, most recent at the bottom">
            <Timeline items={tlShown.map((t) => ({ when: t.when, text: t.text, tone: t.tone }))} />
            <HumanGate>Agents draft follow-ups. Recruiters send them and decide who moves forward.</HumanGate>
          </Panel>
        </div>
      </Grid>
    </>
  );
}

function EventCard({ e }: { e: Ev }) {
  const steps = [
    e.rsvps ? { label: "RSVPs", value: e.rsvps } : null,
    e.attended ? { label: e.rsvps ? "Attended" : "Stand conversations", value: e.attended } : null,
    { label: e.attended || e.rsvps ? "Recruiter screening" : "Referred to screening", value: e.screening },
    { label: "Garda link issued", value: e.garda },
  ].filter((x): x is { label: string; value: number } => x !== null);
  const first = steps[0].value;
  const si = steps.findIndex((x) => x.label.includes("screening"));
  const screenBase = si > 0 ? steps[si - 1].value : 0;
  const note = e.name === "Mayo Open Day" ? "Complete. " + e.screening + " of " + e.attended + " attendees moved to screening and " + e.garda + " have Garda links."
    : e.name === "Galway Open Day" ? (e.attended - e.screening) + " attendees not yet screened. Follow-up drafts wait for a recruiter."
    : e.name === "Sligo Jobs Fair" ? "Busy stand, low conversion: " + pct(e.screening, e.attended, 0) + " moved to screening. Leads are in Cezanne HR."
    : "Referrals keep converting best: " + e.garda + " of " + e.screening + " referred candidates have Garda links.";
  return (
    <Panel title={e.name} meta={e.where + " · " + e.when} action={<Chip status={e.status} />}>
      <SafeFunnel steps={steps} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
        <Stat k="To screening" v={screenBase ? pct(e.screening, screenBase, 0) : "Direct referral"} />
        <Stat k="To Garda link" v={pct(e.garda, first, 0)} tone={e.garda ? "ok" : undefined} />
      </div>
      <div style={{ ...small, marginTop: 10 }}>{note}</div>
    </Panel>
  );
}
