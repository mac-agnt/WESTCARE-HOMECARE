/* The shared record drawer. Any name, visit, client or package anywhere in
   the Westcare modules opens here, with its relationships across modules,
   so one record reads the same from Recruitment to Billing. */
import type { ReactNode } from "react";
import {
  AOIFE, CANDIDATES, CARERS, CLIENTS, COMPLIANCE, DONE, EXCEPTIONS, HANDOFFS, HC24817_OPTIONS, HSE_REQUESTS, LIAM,
  OFFICES, RESTRICTED_CARER_IDS, VISITS, BRAND, fmt, fmtH, hhmm, minsLabel, officeOf, type Carer,
} from "./model";
import { live, useWc, wc, type DrawerRef } from "./store";
import { AgentNote, Btn, Chip, GoLink, HumanGate, label, RecLink, Stat, Timeline, toneOf } from "./ui";

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ ...label, flex: 1 }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
function Facts({ items }: { items: [string, ReactNode, string?][] }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>{items.map(([k, v, s]) => <Stat key={k} k={k} v={v} tone={s ? toneOf(s) : undefined} />)}</div>;
}
function Rel({ items }: { items: { kind: string; node: ReactNode }[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 30, padding: "0 11px", background: "var(--chip)", border: "1px solid var(--chip-border)", borderRadius: "var(--r-sm,9px)", fontSize: 12 }}>
          <span style={{ ...label, fontSize: 8.5 }}>{it.kind}</span>{it.node}
        </span>
      ))}
    </div>
  );
}

function CarerBody({ c }: { c: Carer }) {
  const s = useWc();
  const items = COMPLIANCE.filter((i) => i.carerId === c.id);
  const aoifeHit = c.id === AOIFE.id && s.aoifeExpired;
  const restricted = RESTRICTED_CARER_IDS.has(c.id) || aoifeHit;
  const today = VISITS.filter((v) => v.carerId === c.id);
  const done = DONE.filter((v) => v.carer === c.name).slice(0, 4);
  return (
    <>
      <Facts items={[
        ["OFFICE", c.office + " · " + c.area], ["CONTRACTED", c.contracted + "h / week"], ["SCHEDULED", c.scheduledWeek + "h this week"],
        ["STATUS", restricted ? "Restricted" : items.some((i) => (i.daysRemaining ?? 99) <= 30) ? "Attention Required" : "Compliant", restricted ? "restricted" : items.length ? "attention" : "valid"],
        ["VISITS NEXT 30 DAYS", String(c.visitsNext30)], ["TODAY", c.rosteredToday ? today.length + " visits rostered" : c.availableToday ? "Available" : c.unavailableReason || "Unavailable"],
      ]} />
      {c.id === AOIFE.id && (
        <div style={{ marginTop: 14 }}>
          <AgentNote agent="Compliance Agent" state={aoifeHit ? "attention" : "working"}>
            {aoifeHit
              ? "Patient Manual Handling has expired. Aoife is restricted from manual-handling visits; 4 visits today and 38 in the next 30 days are flagged for the Galway coordinator."
              : "Renewal reminder sent for Patient Manual Handling (6 days left). Garda Vetting renewal started, 18 days left. 38 future visits depend on both."}
          </AgentNote>
        </div>
      )}
      {c.id === LIAM.id && (
        <div style={{ marginTop: 14 }}>
          <AgentNote agent="Compliance Agent">Car insurance expires in 6 days and NCT in 29. 42 visits in the next 30 days need a car. Renewed certificate requested; Emma Brennan verifies it.</AgentNote>
        </div>
      )}
      <Section title="Compliance requirements" action={<GoLink page="Compliance" sub="Expiries">Open Compliance</GoLink>}>
        {items.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Every requirement is valid for more than 30 days.</div>}
        {items.map((i) => {
          const status = aoifeHit && i.requirement === "Patient Manual Handling" ? "Expired" : i.status;
          return (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{i.requirement}</div>
                <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{i.expiry}{i.daysRemaining !== null && status !== "Expired" ? " · " + i.daysRemaining + " days" : ""} · {i.contact}</div>
              </div>
              <Chip status={status} />
            </div>
          );
        })}
      </Section>
      {today.length > 0 && (
        <Section title="Rostered today" action={<GoLink page="Care Delivery" sub="Visits">Care Delivery</GoLink>}>
          {today.slice(0, 6).map((v) => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 12.5 }}>
              <span style={{ fontFamily: "var(--mono)", color: "var(--faint)", width: 88 }}>{hhmm(v.start)}-{hhmm(v.start + v.mins)}</span>
              <RecLink to={{ kind: "visit", id: v.id }}>{v.id}</RecLink>
              <RecLink to={{ kind: "client", id: v.client }}>{v.client}</RecLink>
              <span style={{ flex: 1 }} />
              {aoifeHit && v.requiredSkill === "Manual Handling" ? <Chip tone="bad">Needs reassignment</Chip> : <Chip status={v.status} />}
            </div>
          ))}
        </Section>
      )}
      {done.length > 0 && (
        <Section title="Recent verified time">
          {done.map((v) => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 12.5 }}>
              <RecLink to={{ kind: "visit", id: v.id }}>{v.id}</RecLink>
              <span style={{ color: "var(--dim)" }}>{minsLabel(v.mins)} scheduled · {v.actualMins === null ? "no check-out" : minsLabel(v.actualMins) + " recorded"}</span>
              <span style={{ flex: 1 }} />
              <Chip status={v.status} />
            </div>
          ))}
        </Section>
      )}
      <Section title="Connected records">
        <Rel items={[
          { kind: "Office", node: <RecLink to={{ kind: "office", id: c.office }}>{c.office}</RecLink> },
          { kind: "Coordinator", node: officeOf(c.office).coordinator },
          { kind: "Training", node: "GSW Training" },
          { kind: "Source", node: "Cezanne HR" },
        ]} />
      </Section>
    </>
  );
}

function VisitBody({ id }: { id: string }) {
  const s = useWc();
  const done = DONE.find((v) => v.id === id);
  const today = VISITS.find((v) => v.id === id);
  if (done) {
    const recon = s.recon[id];
    const held = done.status !== "Verified" && (!recon || recon.action === "Request Clarification");
    const carer = CARERS.find((c) => c.name === done.carer);
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: 14, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)" }}>
            <div style={label}>Scheduled</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 8, fontFamily: "var(--mono)" }}>{hhmm(done.start)}-{hhmm(done.start + done.mins)}</div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>{minsLabel(done.mins)}</div>
          </div>
          <div style={{ padding: 14, background: done.status === "Verified" ? "var(--surface-2)" : "var(--bad-soft)", border: "1px solid var(--border)", borderRadius: "var(--r-md,14px)" }}>
            <div style={label}>Actual</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginTop: 8, fontFamily: "var(--mono)" }}>{hhmm(done.actualIn)}-{done.actualOut === null ? "--:--" : hhmm(done.actualOut)}</div>
            <div style={{ fontSize: 12.5, color: done.status === "Verified" ? "var(--dim)" : "var(--bad)", marginTop: 4 }}>{done.actualMins === null ? "No check-out received" : minsLabel(done.actualMins)}</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <Facts items={[
            ["STATUS", recon && recon.action !== "Request Clarification" ? "Resolved" : done.status, recon && recon.action !== "Request Clarification" ? "approved" : done.status],
            ["BILLING", held ? "Held" : "Released", held ? "held" : "ready"], ["PAYROLL", held ? "Held" : "Released", held ? "held" : "ready"],
            ["OFFICE", done.office], ["OWNER", done.owner], ["LOCATION CHECK", done.gps],
          ]} />
        </div>
        {done.status !== "Verified" && (
          <div style={{ marginTop: 14 }}>
            <AgentNote agent="Visit Integrity Agent" state={held ? "attention" : "complete"}>
              {done.exception === "Missing check-out" ? "No check-out event arrived from the " + BRAND.careSystem + ". Billing and payroll held until a coordinator confirms the finish time." : "Recorded " + (done.actualMins ?? 0) + " of " + done.mins + " scheduled minutes. Held from billing and payroll for coordinator review. Nothing is adjusted automatically."}
            </AgentNote>
          </div>
        )}
        {recon && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--dim)" }}>{recon.by} chose <b style={{ color: "var(--ink)" }}>{recon.action}</b> at {recon.at}.</div>}
        <Section title="Timeline">
          <Timeline items={[
            { when: hhmm(done.start - 1440 + 1440), text: "Visit scheduled " + hhmm(done.start) + "-" + hhmm(done.start + done.mins) + " for " + done.client, tone: "neutral" },
            { when: hhmm(done.actualIn), text: "Check-in received from " + done.source, tone: "ok", who: done.carer },
            done.actualOut === null ? { when: "--:--", text: "Check-out not received", tone: "bad" } : { when: hhmm(done.actualOut), text: "Check-out received (" + minsLabel(done.actualMins ?? 0) + ")", tone: done.status === "Verified" ? "ok" : "warn", who: done.carer },
            ...(done.status !== "Verified" ? [{ when: "06:02", text: "Visit Integrity Agent flagged " + (done.exception || "exception").toLowerCase() + "; billing and payroll placed on hold", tone: "bad" as const }] : [{ when: "06:02", text: "Verified automatically; released to billing and payroll", tone: "ok" as const }]),
          ]} />
        </Section>
        <Section title="Connected records">
          <Rel items={[
            { kind: "Client", node: <RecLink to={{ kind: "client", id: done.client }}>{done.client}</RecLink> },
            { kind: "Carer", node: carer ? <RecLink to={{ kind: "carer", id: carer.id }}>{done.carer}</RecLink> : done.carer },
            { kind: "Office", node: done.office },
          ]} />
        </Section>
        {held && (
          <Section title="Coordinator decision">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Btn kind="primary" onClick={() => wc.reconcile(id, "Approve Recorded Time")}>Approve recorded time</Btn>
              <Btn onClick={() => wc.reconcile(id, "Approve Scheduled Time")}>Approve scheduled time</Btn>
              <Btn onClick={() => wc.reconcile(id, "Request Clarification")}>Request clarification</Btn>
              <Btn kind="danger" onClick={() => wc.reconcile(id, "Mark Cancelled")}>Mark cancelled</Btn>
            </div>
            <div style={{ marginTop: 10 }}><HumanGate>Pay and billing only change when a person decides. Mock action, frontend only.</HumanGate></div>
          </Section>
        )}
        <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
          <GoLink page="Care Delivery" sub="Time Verification">Time Verification</GoLink>
          <GoLink page="Billing & Payroll" sub="Reconciliation">Reconciliation</GoLink>
        </div>
      </>
    );
  }
  if (today) {
    const aoifeHit = s.aoifeExpired && today.carerId === AOIFE.id && today.requiredSkill === "Manual Handling";
    return (
      <>
        <Facts items={[
          ["SCHEDULED", hhmm(today.start) + "-" + hhmm(today.start + today.mins)], ["DURATION", minsLabel(today.mins)],
          ["STATUS", aoifeHit ? "Needs reassignment" : today.status, aoifeHit ? "blocked" : today.status],
          ["OFFICE", today.office], ["SERVICE", today.service], ["REQUIRES", today.requiredSkill],
        ]} />
        {today.status === "Unfilled" && (
          <div style={{ marginTop: 14 }}>
            <AgentNote agent="Roster Optimiser">
              {today.cancelledFrom ? "Part of the Roscommon 07:00-09:00 cancellation cluster. " : ""}Eligible cover found using compliance, availability, area and existing roster only. A coordinator confirms any assignment.
            </AgentNote>
          </div>
        )}
        {aoifeHit && <div style={{ marginTop: 14 }}><AgentNote agent="Compliance Agent" state="attention">Aoife Byrne's Patient Manual Handling has expired, so this manual-handling visit needs another carer.</AgentNote></div>}
        <Section title="Connected records">
          <Rel items={[
            { kind: "Client", node: <RecLink to={{ kind: "client", id: today.client }}>{today.client}</RecLink> },
            { kind: "Carer", node: today.carerId ? <RecLink to={{ kind: "carer", id: today.carerId }}>{today.carer}</RecLink> : "Unassigned" },
            { kind: "Office", node: today.office },
          ]} />
        </Section>
        <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
          <GoLink page="Rostering" sub="Unfilled Hours">Unfilled Hours</GoLink>
          <GoLink page="Care Delivery" sub="Today">Care Delivery today</GoLink>
        </div>
      </>
    );
  }
  return <div style={{ color: "var(--dim)" }}>Visit not found.</div>;
}

function ClientBody({ id }: { id: string }) {
  const c = CLIENTS.find((x) => x.id === id);
  if (!c) return <div style={{ color: "var(--dim)" }}>Client not found.</div>;
  const today = VISITS.filter((v) => v.client === id);
  const done = DONE.filter((v) => v.client === id);
  const pkg = HSE_REQUESTS.find((r) => r.id === c.packageId);
  return (
    <>
      <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.55 }}>Fictional client record. Operational details only; no clinical information is held in Pulse.</div>
      <div style={{ marginTop: 12 }}>
        <Facts items={[["OFFICE", c.office + " · " + c.area], ["SERVICE PACKAGE", c.service], ["ALLOCATED", fmtH(c.weeklyHours) + "h / week"], ["HSE PACKAGE", c.packageId], ["UPCOMING VISITS", String(c.upcoming)], ["CONTACT", c.contact]]} />
      </div>
      <Section title="Assigned carers">
        <Rel items={c.carers.map((n) => { const cr = CARERS.find((x) => x.name === n); return { kind: "Carer", node: cr ? <RecLink to={{ kind: "carer", id: cr.id }}>{n}</RecLink> : n }; })} />
      </Section>
      <Section title="Visits">
        {today.concat([]).slice(0, 4).map((v) => (
          <div key={v.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 12.5 }}>
            <span style={{ fontFamily: "var(--mono)", color: "var(--faint)" }}>Today {hhmm(v.start)}</span>
            <RecLink to={{ kind: "visit", id: v.id }}>{v.id}</RecLink><span style={{ flex: 1 }} /><Chip status={v.status} />
          </div>
        ))}
        {done.slice(0, 4).map((v) => (
          <div key={v.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 12.5 }}>
            <span style={{ fontFamily: "var(--mono)", color: "var(--faint)" }}>Yesterday {hhmm(v.start)}</span>
            <RecLink to={{ kind: "visit", id: v.id }}>{v.id}</RecLink><span style={{ flex: 1 }} /><Chip status={v.status} />
          </div>
        ))}
        {today.length + done.length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>No visits in the last or next 24 hours.</div>}
      </Section>
      {pkg && <Section title="HSE request"><Rel items={[{ kind: "Package", node: <RecLink to={{ kind: "hse", id: pkg.id }}>{pkg.id}</RecLink> }, { kind: "Weekly", node: fmt(pkg.weeklyHours) + "h" }, { kind: "Gap", node: pkg.gap + "h" }]} /></Section>}
    </>
  );
}

function HseBody({ id }: { id: string }) {
  const s = useWc();
  const r = HSE_REQUESTS.find((x) => x.id === id);
  if (!r) return <div style={{ color: "var(--dim)" }}>Request not found.</div>;
  const story = r.id === "HC-24817";
  return (
    <>
      <Facts items={[["OFFICE", r.office], ["REGION", r.region], ["SERVICE", r.service], ["REQUIRED", fmt(r.weeklyHours) + "h / week"], ["ALLOCATED", fmt(r.assigned) + "h"], ["UNFILLED", r.gap + "h", r.gap ? "unfilled" : "covered"]]} />
      <div style={{ marginTop: 12, height: 10, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: (100 * r.assigned) / r.weeklyHours + "%", background: r.gap ? "var(--warn)" : "var(--ok)" }} />
      </div>
      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 6 }}>{((100 * r.assigned) / r.weeklyHours).toFixed(1)}% covered · client identifier {r.client}</div>
      {story && (
        <Section title="Roster Optimiser: coverage options">
          <AgentNote agent="Roster Optimiser">4 potential coverage options prepared for the 64-hour gap, using compliance, availability, area, existing roster and contracted hours only.</AgentNote>
          <div style={{ marginTop: 10 }}>
            {HC24817_OPTIONS.map((o) => {
              const d = s.rosterDecisions[o.id];
              return (
                <div key={o.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{o.title} <span style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>+{o.hours}h</span></div>
                    <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{o.detail}</div>
                  </div>
                  {d ? <Chip status={d === "approved" ? "Approved" : "Declined"} /> : (
                    <>
                      <Btn kind="primary" onClick={() => wc.decideRoster(o.id, "approved", o.title)} style={{ height: 28 }}>Approve</Btn>
                      <Btn kind="quiet" onClick={() => wc.decideRoster(o.id, "declined", o.title)} style={{ height: 28 }}>Decline</Btn>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8 }}><HumanGate>Sean Doyle, Mayo Coordinator, approves each option.</HumanGate></div>
        </Section>
      )}
      <div style={{ display: "flex", gap: 14, marginTop: 18 }}>
        <GoLink page="Rostering" sub="HSE Requests">HSE Requests</GoLink>
        <GoLink page="Rostering" sub="Scheduler">Scheduler</GoLink>
      </div>
    </>
  );
}

function CandidateBody({ id }: { id: string }) {
  const s = useWc();
  const c = CANDIDATES.find((x) => x.id === id);
  if (!c) return <div style={{ color: "var(--dim)" }}>Candidate not found.</div>;
  const h = HANDOFFS.find((x) => x.candidate.id === id);
  const accepted = s.handoffAccepted[id] || (h && h.acceptedBy);
  const steps = ["Application received", "Recruiter review", "Interview", "Garda Vetting link", "Local office handoff", "Onboarding", "Compliance complete", "Ready to roster"];
  const at = ["New", "Review", "Interview", "Garda Vetting", "Office Handoff", "Onboarding", "Ready to Roster"].indexOf(c.stage);
  const reached = c.stage === "Ready to Roster" ? 8 : at + 1;
  return (
    <>
      <Facts items={[
        ["ROLE", c.role], ["DESTINATION", c.office], ["SOURCE", c.sourceDetail],
        ["STAGE", c.stage, c.stage], ["IN STAGE", c.hoursInStage ? c.hoursInStage + " hours" : c.daysInStage + " days"], ["RECRUITER", c.recruiter],
      ]} />
      {c.story === "handoff" && (
        <div style={{ marginTop: 14 }}>
          <AgentNote agent="Recruitment Agent" state={accepted ? "complete" : "attention"}>
            {accepted ? "Galway accepted the handoff. Onboarding continues: 3 of 8 tasks done." : "Handoff sent to Galway 19 hours ago and not yet accepted. Garda Vetting application started. Onboarding 3 of 8 tasks complete. Handoff summary prepared for Niamh Kelly."}
          </AgentNote>
        </div>
      )}
      <Section title="Journey">
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((st, i) => (
            <div key={st} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <span style={{ width: 18, height: 18, borderRadius: 6, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: "var(--mono)", background: i < reached ? "var(--accent-fill,var(--accent))" : i === reached ? "var(--warn-soft)" : "var(--track)", color: i < reached ? "var(--on-accent)" : "var(--dim)" }}>{i + 1}</span>
              <span style={{ fontSize: 12.5, color: i <= reached ? "var(--ink)" : "var(--faint)" }}>{st}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Outstanding">
        {(h ? h.outstanding : c.missing).length === 0 && <div style={{ fontSize: 12.5, color: "var(--dim)" }}>Nothing outstanding.</div>}
        {(h ? h.outstanding : c.missing).map((m) => <div key={m} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid var(--border)", fontSize: 12.5 }}><span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--warn)" }} />{m}</div>)}
        {c.garda && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 8 }}>Garda Vetting: {c.garda}{c.onboardingDone !== undefined ? " · Onboarding " + c.onboardingDone + " / 8" : ""}</div>}
      </Section>
      {h && !accepted && (
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Btn kind="primary" onClick={() => wc.acceptHandoff(c.id, c.name, officeOf(c.office).coordinator)}>Accept handoff as {officeOf(c.office).coordinator}</Btn>
        </div>
      )}
      <div style={{ marginTop: 12 }}><HumanGate>Hiring decisions stay with people. Agents organise, chase and summarise only.</HumanGate></div>
      <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
        <GoLink page="Recruitment" sub="Pipeline">Pipeline</GoLink>
        <GoLink page="Recruitment" sub="Handoffs">Handoffs</GoLink>
      </div>
    </>
  );
}

function OfficeBody({ id }: { id: string }) {
  const o = OFFICES.find((x) => x.id === id);
  if (!o) return null;
  return (
    <>
      <Facts items={[
        ["VISITS NEXT 24H", fmt(o.visits24)], ["UNFILLED", String(o.unfilled24), o.unfilled24 > 6 ? "unfilled" : "attention"], ["COVERAGE", ((100 * o.allocHours) / o.reqHours).toFixed(1) + "%"],
        ["CARERS", String(o.carers)], ["CRITICAL COMPLIANCE", String(o.critical), o.critical ? "critical" : "valid"], ["VISIT EXCEPTIONS", String(o.exceptions), "held"],
      ]} />
      <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--dim)" }}>Coordinator {o.coordinator} · areas {o.areas.join(", ")}</div>
      <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
        <button className="wc-go" onClick={() => { wc.setOffice(o.id); wc.go("Rostering"); }} style={{ background: "none", border: 0, color: "var(--accent)", cursor: "pointer", fontSize: 12, padding: 0 }}>Filter every module to {o.id}</button>
      </div>
    </>
  );
}

export default function EntityDrawer() {
  const s = useWc();
  const d = s.drawer;
  if (!d) return null;
  let kind = "", title = "", status = "";
  let body: ReactNode = null;
  const L = live(s);
  if (d.kind === "carer") {
    const c = CARERS.find((x) => x.id === d.id);
    if (c) {
      kind = "CARER · " + c.id; title = c.name;
      const restricted = RESTRICTED_CARER_IDS.has(c.id) || (c.id === AOIFE.id && L.aoifeExpired);
      status = restricted ? "Restricted" : COMPLIANCE.some((i) => i.carerId === c.id) ? "Attention Required" : "Compliant";
      body = <CarerBody c={c} />;
    }
  } else if (d.kind === "visit") {
    const v = DONE.find((x) => x.id === d.id) || VISITS.find((x) => x.id === d.id);
    kind = "VISIT"; title = d.id;
    status = v ? ("actualIn" in v && (v as any).status) || "" : "";
    const rec = s.recon[d.id];
    if (rec && rec.action !== "Request Clarification") status = "Resolved";
    body = <VisitBody id={d.id} />;
  } else if (d.kind === "client") { kind = "CLIENT · FICTIONAL"; title = "Client " + d.id; body = <ClientBody id={d.id} />; }
  else if (d.kind === "hse") { const r = HSE_REQUESTS.find((x) => x.id === d.id); kind = "HSE REQUEST"; title = d.id; status = r ? r.status : ""; body = <HseBody id={d.id} />; }
  else if (d.kind === "candidate") { const c = CANDIDATES.find((x) => x.id === d.id); kind = "CANDIDATE · " + d.id; title = c ? c.name : d.id; status = c ? (c.story === "handoff" && !s.handoffAccepted[c.id] ? "Handoff Delayed" : c.stage) : ""; body = <CandidateBody id={d.id} />; }
  else if (d.kind === "office") { kind = "OFFICE"; title = d.id; body = <OfficeBody id={d.id} />; }
  void EXCEPTIONS;
  return (
    <div onClick={wc.close} style={{ position: "fixed", inset: 0, zIndex: 66, background: "var(--scrim)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "flex-end", animation: "scrimIn .2s var(--ease) both" }}>
      <div role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} style={{ width: "min(580px,100%)", height: "100%", display: "flex", flexDirection: "column", background: "var(--overlay)", borderLeft: "1px solid var(--border)", backdropFilter: "blur(20px)", boxShadow: "-30px 0 80px rgba(0,0,0,.5)", animation: "slideInRight .3s var(--ease) both" }}>
        <div style={{ flex: "none", display: "flex", alignItems: "flex-start", gap: 12, padding: "22px 24px 18px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <span style={label}>{kind}</span>
              {status && <Chip status={status} />}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px", marginTop: 8 }}>{title}</div>
          </div>
          <button aria-label="Close" className="wc-btn" onClick={wc.close} style={{ flex: "none", width: 32, height: 32, border: "1px solid var(--border)", borderRadius: "var(--r-ctl,11px)", background: "none", color: "var(--dim)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12 M18 6 6 18" /></svg>
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 24px 32px" }}>{body}</div>
      </div>
    </div>
  );
}

export type { DrawerRef };
