/* Records → Ontology: the two chains that explain why one connected record
   beats six separate dashboards, plus every Westcare entity with live counts. */
import { CANDIDATES, CARERS, CLIENTS, COMPLIANCE, DONE, EXCEPTIONS, HANDOFFS, HSE_REQUESTS, K, OFFICES, STAGE_COUNTS, VISITS, fmt } from "./model";
import { useLive, wc } from "./store";
import { label, MONO } from "./ui";

type Step = { name: string; count: string; note: string; go: () => void };

function Chain({ title, sub, steps }: { title: string; sub: string; steps: Step[] }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", padding: "16px 18px 18px", minWidth: 0, backdropFilter: "blur(20px)" }}>
      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>{sub}</div>
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginTop: 14, overflowX: "auto", paddingBottom: 4 }}>
        {steps.map((s, i) => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", flex: "1 0 auto" }}>
            <button className="wc-kpi" onClick={s.go} title={s.note}
              style={{ font: "inherit", color: "inherit", textAlign: "left", minWidth: 104, padding: "10px 11px", background: i === 0 || i === steps.length - 1 ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (i === 0 || i === steps.length - 1 ? "var(--accent-line)" : "var(--border)"), borderRadius: "var(--r-md,12px)", cursor: "pointer", animation: "springIn .5s var(--ease) " + i * 50 + "ms both", transition: "border-color .2s var(--ease),transform .2s var(--ease)" }}>
              <div style={{ ...label, fontSize: 8.5, whiteSpace: "nowrap" }}>{s.name}</div>
              <div style={{ fontSize: 17, fontWeight: 600, marginTop: 5, letterSpacing: "-.4px" }}>{s.count}</div>
              <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 3, whiteSpace: "nowrap" }}>{s.note}</div>
            </button>
            {i < steps.length - 1 && (
              <svg width="22" height="12" viewBox="0 0 22 12" style={{ flex: "none", margin: "0 2px" }} aria-hidden="true">
                <path d="M1 6h17 M14 2l4 4-4 4" fill="none" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OntologyChains() {
  const L = useLive();
  const care: Step[] = [
    { name: "HSE Request", count: String(HSE_REQUESTS.length), note: fmt(K.reqHours) + " h / week", go: () => wc.go("Rostering", "HSE Requests") },
    { name: "Care Package", count: fmt(K.allocHours) + "h", note: "allocated · " + K.coverage, go: () => wc.go("Rostering", "Overview") },
    { name: "Client", count: fmt(CLIENTS.length), note: "fictional IDs", go: () => wc.go("Care Delivery", "Clients") },
    { name: "Rostered Visit", count: fmt(L.covered), note: "of " + fmt(K.visits24) + " next 24h", go: () => wc.go("Care Delivery", "Visits") },
    { name: "Carer", count: String(CARERS.length), note: "six offices", go: () => wc.go("Rostering", "Availability") },
    { name: "Compliance", count: String(L.fullyCompliant), note: "fully compliant", go: () => wc.go("Compliance", "Overview") },
    { name: "Time Verification", count: fmt(K.cleanVerified), note: L.openExceptions + " held", go: () => wc.go("Care Delivery", "Time Verification") },
    { name: "Billing + Payroll", count: fmt(Math.round(K.completed24 - L.openExceptions)), note: "visits released", go: () => wc.go("Billing & Payroll", "Overview") },
  ];
  const people: Step[] = [
    { name: "Candidate", count: String(K.newCandidates), note: "this week", go: () => wc.go("Recruitment", "Overview") },
    { name: "Cezanne", count: String(STAGE_COUNTS["New"]), note: "new, unreviewed", go: () => wc.go("Recruitment", "Candidates") },
    { name: "Recruitment Team", count: String(STAGE_COUNTS["Review"] + STAGE_COUNTS["Interview"]), note: "review + interview", go: () => wc.go("Recruitment", "Pipeline") },
    { name: "Garda Vetting", count: String(STAGE_COUNTS["Garda Vetting"]), note: "links issued", go: () => wc.go("Compliance", "Garda Vetting") },
    { name: "Local Office", count: String(HANDOFFS.length), note: L.handoffsWaiting + " waiting >12h", go: () => wc.go("Recruitment", "Handoffs") },
    { name: "Onboarding", count: String(STAGE_COUNTS["Onboarding"]), note: "in progress", go: () => wc.go("Recruitment", "Pipeline") },
    { name: "Active Carer", count: String(CARERS.length), note: "rostered + available", go: () => wc.go("Dashboard", "Workforce") },
    { name: "Roster", count: fmt(VISITS.filter((v) => v.carer).length), note: "visits assigned", go: () => wc.go("Rostering", "Scheduler") },
  ];
  const entities: [string, string, () => void][] = [
    ["Office", String(OFFICES.length), () => wc.go("Dashboard", "Executive")],
    ["Carer", String(CARERS.length), () => wc.go("Rostering", "Availability")],
    ["Candidate", String(CANDIDATES.length), () => wc.go("Recruitment", "Candidates")],
    ["Client", fmt(CLIENTS.length), () => wc.go("Care Delivery", "Clients")],
    ["HSE Request", String(HSE_REQUESTS.length), () => wc.go("Rostering", "HSE Requests")],
    ["Care Package", String(HSE_REQUESTS.length), () => wc.go("Rostering", "HSE Requests")],
    ["Visit", fmt(VISITS.length + DONE.length), () => wc.go("Care Delivery", "Visits")],
    ["Roster", fmt(VISITS.filter((v) => v.carer).length), () => wc.go("Rostering", "Scheduler")],
    ["Compliance Requirement", "15", () => wc.go("Compliance", "Training")],
    ["Document", fmt(COMPLIANCE.length + 2980), () => wc.go("Compliance", "Audit Readiness")],
    ["Training Course", "8", () => wc.go("Compliance", "Training")],
    ["Recruitment Source", "7", () => wc.go("Recruitment", "Sources")],
    ["Task", "8", () => wc.go("Work")],
    ["Invoice Record", fmt(K.completed24), () => wc.go("Billing & Payroll", "Verified Hours")],
    ["Payroll Record", fmt(K.completed24), () => wc.go("Billing & Payroll", "Payroll Exceptions")],
    ["Agent", "8", () => wc.go("Agents")],
    ["System", "9", () => wc.go("Settings")],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14, animation: "pageIn .6s var(--ease) both" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap", padding: "4px 2px 0" }}>
        <div style={{ flex: "1 1 380px" }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px" }}>One record, from request to payslip</div>
          <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 5, maxWidth: "80ch", lineHeight: 1.5 }}>
            Every Westcare record is linked. A lapsed certificate reaches the roster, the visit, the timesheet and the invoice on its own, which separate dashboards never could.
          </div>
        </div>
      </div>
      <div className="wc-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <Chain title="Care delivery chain" sub="HSE request → care package → client → rostered visit → carer → compliance → time verification → billing and payroll" steps={care} />
        <Chain title="Workforce chain" sub="Candidate → Cezanne → recruitment team → Garda Vetting → local office → onboarding → active carer → roster" steps={people} />
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", padding: "14px 16px" }}>
        <div style={{ ...label, marginBottom: 10 }}>Entities · {entities.length}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {entities.map(([n, c, go]) => (
            <button key={n} className="wc-seg" onClick={go} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 30, padding: "0 11px", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,9px)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 12, cursor: "pointer" }}>
              {n}<span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--faint)" }}>{c}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

void EXCEPTIONS;
