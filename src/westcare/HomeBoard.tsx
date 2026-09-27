/* Home: the state of Westcare at a glance, around the existing Helios chat. */
import { CANDIDATES, CARERS, CRITICAL, EXCEPTIONS, HANDOFFS, K, OFFICES, RESTRICTED_CARER_IDS, fmt, fmtH } from "./model";
import { useLive, useWc, wc } from "./store";
import { HOME_QUERIES } from "./answers";
import { AGENT_LOOK, Chip, label, MONO, TONE, type Tone } from "./ui";
import AgentFace from "../components/AgentFace";

export function HomeKpis() {
  const L = useLive();
  const items: { label: string; value: string; sub: string; tone?: Tone; go: () => void }[] = [
    { label: "Next 24h visits", value: fmt(K.visits24), sub: "six offices", go: () => wc.go("Care Delivery", "Today") },
    { label: "Rostered", value: fmt(L.covered), sub: "carer assigned", tone: "ok", go: () => wc.go("Care Delivery", "Visits") },
    { label: "Unfilled visits", value: String(L.unfilled), sub: "Mayo " + (11) + (L.aoifeExpired ? " · Galway +4" : ""), tone: "bad", go: () => wc.go("Rostering", "Unfilled Hours") },
    { label: "Weekly hours filled", value: K.coverage, sub: fmt(K.gapHours) + " h unfilled", go: () => wc.go("Rostering", "Overview") },
    { label: "Critical compliance", value: String(L.critical), sub: "inside 7 days", tone: "warn", go: () => wc.go("Compliance", "Expiries") },
    { label: "New candidates", value: String(K.newCandidates), sub: "this week", go: () => wc.go("Recruitment", "Overview") },
    { label: "Visit exceptions", value: String(L.openExceptions), sub: fmtH(L.heldHours) + " h held", tone: "bad", go: () => wc.go("Billing & Payroll", "Reconciliation") },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))", gap: 7, width: "100%", maxWidth: 1000, margin: "0 auto", animation: "rowIn .5s var(--ease) both" }}>
      {items.map((k, i) => (
        <button key={k.label} className="wc-kpi" onClick={k.go}
          style={{ textAlign: "left", font: "inherit", color: "inherit", padding: "10px 11px 9px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", cursor: "pointer", backdropFilter: "blur(18px)", animation: "springIn .5s var(--ease) " + i * 40 + "ms both", transition: "border-color .2s var(--ease),transform .2s var(--ease)", minWidth: 0 }}>
          <div style={{ ...label, fontSize: 8.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.label}</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.7px", marginTop: 6, lineHeight: 1, color: k.tone ? TONE[k.tone].ink : "var(--ink)" }}>{k.value}</div>
          <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.sub}</div>
        </button>
      ))}
    </div>
  );
}

export function HomeQueries({ ask }: { ask: (q: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 7, marginTop: 12 }}>
      {HOME_QUERIES.map((q) => (
        <button key={q} className="wc-seg" onClick={() => ask(q)}
          style={{ height: 30, padding: "0 13px", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", background: "var(--surface-faint)", color: "var(--dim)", fontSize: 12, cursor: "pointer", backdropFilter: "blur(16px)" }}>
          {q}
        </button>
      ))}
    </div>
  );
}

const HOME_ORDER = ["Sligo", "Galway", "Mayo", "Roscommon", "Cavan", "Monaghan"];

export function HomeOffices() {
  const s = useWc();
  return (
    <div style={{ width: "100%", maxWidth: 1000, margin: "26px auto 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ ...label, flex: 1 }}>Today by office</span>
        <button className="wc-go" onClick={() => wc.go("Dashboard", "Executive")} style={{ background: "none", border: 0, color: "var(--accent)", fontSize: 12, cursor: "pointer" }}>Executive dashboard</button>
      </div>
      <div className="wc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
        {HOME_ORDER.map((id) => OFFICES.find((x) => x.id === id)!).map((o, i) => {
          const extra = s.aoifeExpired && o.id === "Galway" ? 4 : 0;
          const unfilled = o.unfilled24 + extra;
          const cov = (100 * (o.visits24 - unfilled)) / o.visits24;
          const avail = CARERS.filter((c) => c.office === o.id && c.availableToday && !c.rosteredToday).length;
          const crit = CRITICAL.filter((c) => c.office === o.id).length - (s.aoifeExpired && o.id === "Galway" ? 1 : 0);
          const pipe = CANDIDATES.filter((c) => c.office === o.id).length;
          const tone: Tone = unfilled >= 10 ? "bad" : unfilled >= 5 ? "warn" : "ok";
          return (
            <button key={o.id} className="wc-kpi" onClick={() => { wc.setOffice(o.id); wc.go("Care Delivery", "Today"); }}
              style={{ textAlign: "left", font: "inherit", color: "inherit", padding: "12px 13px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)", cursor: "pointer", animation: "springIn .5s var(--ease) " + (200 + i * 40) + "ms both", transition: "border-color .2s var(--ease),transform .2s var(--ease)", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{o.id}</span>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: TONE[tone].ink }} />
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--track)", marginTop: 9, overflow: "hidden" }}>
                <div style={{ height: "100%", width: cov + "%", background: TONE[tone].ink, borderRadius: 3 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px", marginTop: 9, fontSize: 11 }}>
                <Mini k="Visits" v={fmt(o.visits24)} />
                <Mini k="Coverage" v={cov.toFixed(1) + "%"} />
                <Mini k="Available" v={String(avail)} />
                <Mini k="Critical" v={String(crit)} warn={crit > 0} />
                <Mini k="Unfilled" v={String(unfilled)} warn={unfilled > 0} />
                <Mini k="Pipeline" v={String(pipe)} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
function Mini({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>{k}</div>
      <div style={{ fontSize: 12.5, color: warn ? "var(--warn)" : "var(--body)", marginTop: 1 }}>{v}</div>
    </div>
  );
}

function RailCard({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", backdropFilter: "blur(20px) saturate(1.3)", boxShadow: "var(--card-shadow)", padding: "16px 18px 12px", animation: "springIn .5s var(--ease) both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{title}</div>
        {meta && <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--faint)" }}>{meta}</span>}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

export function HomeRail() {
  const L = useLive();
  const s = useWc();
  const look = AGENT_LOOK["Briefing"];
  const attention: { n: string; text: string; tone: Tone; go: () => void }[] = [
    { n: String(L.unfilled), text: "uncovered visits", tone: "bad", go: () => wc.go("Rostering", "Unfilled Hours") },
    { n: String(L.critical), text: "critical compliance expiries", tone: "warn", go: () => wc.go("Compliance", "Expiries") },
    { n: String(L.handoffsWaiting), text: "recruitment handoffs waiting >12 hours", tone: "warn", go: () => wc.go("Recruitment", "Handoffs") },
    { n: String(L.openExceptions), text: "visit verification exceptions", tone: "bad", go: () => wc.go("Care Delivery", "Time Verification") },
    { n: fmtH(L.heldHours), text: "hours held from reconciliation", tone: "bad", go: () => wc.go("Billing & Payroll", "Reconciliation") },
  ];
  if (L.aoifeExpired) attention.unshift({ n: "1", text: "carer restricted: Aoife Byrne, 4 visits today", tone: "bad", go: () => wc.open({ kind: "carer", id: CARERS.find((c) => c.name === "Aoife Byrne")!.id }) });
  const recent = s.log.slice(0, 3);
  const handled: [string, string][] = [
    ["18", "compliance reminders sent"], ["7", "candidate follow-ups prepared"], ["6", "roster alternatives suggested"],
    ["31", "visits automatically verified"], ["4", "office handoffs escalated"],
  ];
  return (
    <>
      <RailCard title="Morning briefing" meta="07:02">
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          <AgentFace shape={look.shape} state="complete" tint={look.tint} size="28" />
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--body)" }}>
            <p style={{ margin: 0 }}>Westcare has <b style={{ color: "var(--ink)" }}>{L.unfilled} visits</b> still requiring cover in the next 24 hours. Mayo accounts for 11 of these.{L.aoifeExpired && " Galway added 4 after Aoife Byrne's manual handling expired."}</p>
            <p style={{ margin: "7px 0 0" }}><b style={{ color: "var(--ink)" }}>{L.critical} compliance items</b> become critical within seven days.</p>
            <p style={{ margin: "7px 0 0" }}>The Recruitment team received <b style={{ color: "var(--ink)" }}>{K.newCandidates} new candidates</b> this week.</p>
            <p style={{ margin: "7px 0 0" }}>There are <b style={{ color: "var(--ink)" }}>{L.openExceptions} visit-duration exceptions</b> awaiting review before billing and payroll.</p>
          </div>
        </div>
      </RailCard>
      <RailCard title="Attention required" meta={String(attention.length)}>
        {attention.map((a) => (
          <div key={a.text} className="wc-row" onClick={a.go} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderTop: "1px solid var(--border)", cursor: "pointer", borderRadius: 6 }}>
            <span style={{ minWidth: 40, fontFamily: MONO, fontSize: 13, fontWeight: 600, color: TONE[a.tone].ink }}>{a.n}</span>
            <span style={{ flex: 1, fontSize: 12.5, color: "var(--body)" }}>{a.text}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2.2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
          </div>
        ))}
      </RailCard>
      <RailCard title="AI handled" meta="since 06:00">
        {handled.map(([n, t]) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderTop: "1px solid var(--border)" }}>
            <span style={{ minWidth: 32, fontFamily: MONO, fontSize: 12.5, color: "var(--accent)" }}>{n}</span>
            <span style={{ fontSize: 12.5, color: "var(--body)" }}>{t}</span>
          </div>
        ))}
        {recent.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "7px 0", borderTop: "1px solid var(--border)", fontSize: 11.5, color: "var(--dim)", lineHeight: 1.45 }}>
            <span style={{ fontFamily: MONO, color: "var(--faint)" }}>{e.at}</span>
            <span><b style={{ color: "var(--body)", fontWeight: 500 }}>{e.actor}:</b> {e.text}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: 11, color: "var(--faint)" }}>Agents detect, draft and remind. People hire, roster, verify and pay.</div>
      </RailCard>
      <RailCard title="Story threads">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <StoryChip label="Aoife Byrne" status={L.aoifeExpired ? "Restricted" : "Attention Required"} go={() => wc.open({ kind: "carer", id: CARERS.find((c) => c.name === "Aoife Byrne")!.id })} />
          <StoryChip label="HC-24817" status="Capacity Gap" go={() => wc.open({ kind: "hse", id: "HC-24817" })} />
          <StoryChip label="VIS-10482" status={s.recon["VIS-10482"] && s.recon["VIS-10482"].action !== "Request Clarification" ? "Resolved" : "Duration Exception"} go={() => wc.open({ kind: "visit", id: "VIS-10482" })} />
          <StoryChip label="Sarah O'Neill" status={s.handoffAccepted[HANDOFFS[0].candidate.id] ? "Accepted" : "Handoff Delayed"} go={() => wc.open({ kind: "candidate", id: HANDOFFS[0].candidate.id })} />
          <StoryChip label="Roscommon cluster" status="Operations Attention" go={() => { wc.setOffice("Roscommon"); wc.go("Care Delivery", "Cancellations"); }} />
          <StoryChip label="Liam Walsh" status="Renewal Required" go={() => wc.open({ kind: "carer", id: CARERS.find((c) => c.name === "Liam Walsh")!.id })} />
        </div>
      </RailCard>
    </>
  );
}
function StoryChip({ label: l, status, go }: { label: string; status: string; go: () => void }) {
  return (
    <button className="wc-seg" onClick={go} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 30, padding: "0 6px 0 10px", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}>
      {l}<Chip status={status} style={{ height: 20, fontSize: 10 }} />
    </button>
  );
}

void EXCEPTIONS; void RESTRICTED_CARER_IDS;
