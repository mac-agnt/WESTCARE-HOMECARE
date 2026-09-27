/* Helios answers for the Westcare demo. Each answer is read-only and built
   from the same model the modules render, so a number in chat always matches
   the screen it links to. "Open …" actions navigate to that screen. */
import {
  AOIFE, CANDIDATES, CANCEL_REASONS, CRITICAL, EXCEPTIONS, HANDOFFS, HC24817, HC24817_OPTIONS, K, LIAM, OFFICES,
  ROSCOMMON_CLUSTER, SARAH, SOURCE_WEEK, UNFILLED_TODAY, VIS10482, fmt, fmtH, hhmm, minsLabel, officeOf,
} from "./model";
import { live, wc } from "./store";

export type Answer = {
  tool: string; effect: "read" | "write"; text: string;
  cols?: string[]; rows?: string[][]; actions?: [string, number][];
  confirm?: boolean; confirmSummary?: string; nav?: [string, string?];
};

const NAV: [RegExp, string, string?][] = [
  [/unfilled hours/, "Rostering", "Unfilled Hours"],
  [/hse request|hc-24817/, "Rostering", "HSE Requests"],
  [/scheduler/, "Rostering", "Scheduler"],
  [/expiries|compliance expir/, "Compliance", "Expiries"],
  [/audit/, "Compliance", "Audit Readiness"],
  [/vehicle/, "Compliance", "Vehicle Documents"],
  [/handoff/, "Recruitment", "Handoffs"],
  [/pipeline/, "Recruitment", "Pipeline"],
  [/sources/, "Recruitment", "Sources"],
  [/reconciliation/, "Billing & Payroll", "Reconciliation"],
  [/time verification|vis-10482/, "Care Delivery", "Time Verification"],
  [/cancellation/, "Care Delivery", "Cancellations"],
  [/care delivery|today/, "Care Delivery", "Today"],
];

export function westcareAnswer(q: string): Answer {
  const s = q.toLowerCase();
  const L = live();

  if (/^open /.test(s)) {
    const hit = NAV.find(([re]) => re.test(s));
    if (hit) return { tool: "pulse_navigate", effect: "read", text: "Opening " + hit[1] + (hit[2] ? ", " + hit[2] : "") + ".", nav: [hit[1], hit[2]] };
  }

  if (/uncovered|unfilled|cover|34 visits|no carer/.test(s)) {
    const rows = OFFICES.slice().sort((a, b) => b.unfilled24 - a.unfilled24).map((o) => {
      const v = UNFILLED_TODAY.filter((x) => x.office === o.id);
      const cause = o.id === "Roscommon" ? "07:00-09:00 cancellation cluster" : o.id === "Mayo" ? "HC-24817 capacity gap" : v.length > 5 ? "Sick leave, no local cover" : "Evening calls, travel";
      return [o.id, String(o.unfilled24), cause, o.coordinator];
    });
    return {
      tool: "roster_unfilled_find", effect: "read",
      text: L.unfilled + " visits in the next 24 hours still have no carer. Mayo accounts for 11: the Castlebar North package HC-24817 is 64 hours a week short, so there is no slack when anyone is off. Roscommon has 5 left from this morning's cancellation cluster (11 cancellations between 07:00 and 09:00, 6 recovered, 8.5 care hours at risk). The rest are evening calls where travel rules out the nearest free carers." + (L.aoifeExpired ? " 4 more opened when Aoife Byrne's manual handling expired." : ""),
      cols: ["Office", "Unfilled", "Main cause", "Coordinator"], rows: rows.slice(0, 6),
      actions: [["Open unfilled hours", 1], ["Open HC-24817 options", 0]],
    };
  }

  if (/non-compliant|compliance|expir|critical|garda|manual handling|insurance/.test(s)) {
    const next = CRITICAL.slice().sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0));
    return {
      tool: "compliance_expiring_find", effect: "read",
      text: L.critical + " compliance requirements become critical in the next seven days and " + L.expired + " have already expired. Aoife Byrne (Galway) is the one with most at stake: Patient Manual Handling " + (L.aoifeExpired ? "has now expired" : "expires in 6 days") + " and 38 visits in the next 30 days depend on her. Liam Walsh (Sligo) needs renewed car insurance within 6 days for 42 visits. Reminders have gone out; a person verifies each document.",
      cols: ["Carer", "Requirement", "Days", "Visits at risk"],
      rows: next.slice(0, 6).map((i) => [i.carer + " · " + i.office, i.requirement, String(i.daysRemaining), String(i.futureVisits)]),
      actions: [["Open expiries", 1], ["Open audit readiness", 0]],
    };
  }

  if (/candidate|galway|recruit|handoff|applicant|hiring/.test(s)) {
    const office = OFFICES.find((o) => s.includes(o.id.toLowerCase()))?.id || "Galway";
    const list = CANDIDATES.filter((c) => c.office === office && ["Garda Vetting", "Office Handoff", "Onboarding"].includes(c.stage));
    const ordered = [SARAH, ...list.filter((c) => c !== SARAH)].filter((c) => c.office === office);
    const waiting = HANDOFFS.filter((h) => h.destination === office && !h.acceptedBy && !wcAccepted(h.candidate.id));
    return {
      tool: "recruitment_pipeline_find", effect: "read",
      text: ordered.length + " candidates are waiting on " + office + " between Garda Vetting and onboarding. " + (office === "Galway" ? "Sarah O'Neill has waited 19 hours for Galway to accept her handoff: Indeed via Cezanne, Garda Vetting started, onboarding 3 of 8 tasks. " : "") + waiting.length + " handoffs to " + office + " are not yet accepted. I can prepare summaries and chase; the office decides.",
      cols: ["Candidate", "Stage", "Waiting", "Source"],
      rows: ordered.slice(0, 6).map((c) => [c.name, c.stage, c.hoursInStage ? c.hoursInStage + "h" : c.daysInStage + "d", c.source]),
      actions: [["Open handoffs", 1], ["Open pipeline", 0]],
    };
  }

  if (/payroll|billing|blocking|held|reconcil|invoice|pay/.test(s)) {
    const ex = EXCEPTIONS.filter((v) => !(wcRecon(v.id))).slice().sort((a, b) => (a.id === VIS10482.id ? -1 : b.id === VIS10482.id ? 1 : b.mins - a.mins));
    return {
      tool: "reconciliation_holds_find", effect: "read",
      text: L.openExceptions + " completed visits are blocking payroll and billing, " + fmtH(L.heldHours) + " care hours in total: " + K.durationExceptions + " duration exceptions and " + K.missingCheckout + " missing check-outs from the last 24 hours. VIS-10482 in Galway is typical: 45 minutes scheduled, 29 recorded, so both billing and payroll are held until Niamh Kelly reviews it. Nothing is adjusted automatically.",
      cols: ["Visit", "Office", "Planned / recorded", "Issue"],
      rows: ex.slice(0, 6).map((v) => [v.id, v.office, minsLabel(v.mins) + " / " + (v.actualMins === null ? "no check-out" : minsLabel(v.actualMins)), v.exception || ""]),
      actions: [["Open reconciliation", 1], ["Open time verification", 0]],
    };
  }

  if (/mayo|capacity|hse|hours|requested/.test(s)) {
    return {
      tool: "care_hours_find", effect: "read",
      text: "This week " + fmt(K.reqHours) + " HSE hours are requested and " + fmt(K.allocHours) + " allocated, " + K.coverage + " coverage and " + fmt(K.gapHours) + " hours unfilled. Mayo has the biggest gap at 448 hours; HC-24817 alone is 64 (240 required, 176 allocated). The Roster Optimiser has " + HC24817_OPTIONS.length + " options ready and " + L.approvedOpts + " approved so far.",
      cols: ["Office", "Requested", "Allocated", "Gap"],
      rows: OFFICES.slice().sort((a, b) => (b.reqHours - b.allocHours) - (a.reqHours - a.allocHours)).map((o) => [o.id, fmt(o.reqHours), fmt(o.allocHours), String(o.reqHours - o.allocHours)]),
      actions: [["Open HC-24817 options", 1], ["Open HSE requests", 0]],
    };
  }

  if (/cancel|roscommon/.test(s)) {
    return {
      tool: "cancellations_find", effect: "read",
      text: fmt(K.cancellations30) + " cancellations in the last 30 days, 72% recovered. Today Roscommon had " + ROSCOMMON_CLUSTER.cancellations + " between 07:00 and 09:00: " + ROSCOMMON_CLUSTER.recovered + " recovered, " + ROSCOMMON_CLUSTER.uncovered + " still uncovered, " + ROSCOMMON_CLUSTER.hoursAtRisk + " care hours at risk.",
      cols: ["Reason", "30 days", "Share", ""],
      rows: CANCEL_REASONS.map(([r, n]) => [r, fmt(n), Math.round((100 * n) / K.cancellations30) + "%", ""]),
      actions: [["Open cancellations", 1]],
    };
  }

  if (/website|source|indeed|referral/.test(s)) {
    return {
      tool: "recruitment_sources", effect: "read",
      text: "146 candidates this week. Indeed brought 81 and referrals 22, while the Westcare website brought 9. Over 90 days the website converted 2 starters from 118 applicants; referrals converted 31 from 276.",
      cols: ["Source", "This week", "", ""],
      rows: SOURCE_WEEK.map(([n, v]) => [n, String(v), "", ""]),
      actions: [["Open sources", 1]],
    };
  }

  if (/aoife/.test(s)) return aboutCarer(AOIFE.name, "Patient Manual Handling " + (L.aoifeExpired ? "has expired" : "expires in 6 days") + " and Garda Vetting in 18. 38 visits in the next 30 days.");
  if (/liam/.test(s)) return aboutCarer(LIAM.name, "Car insurance expires in 6 days and NCT in 29. 42 visits in the next 30 days.");

  return {
    tool: "pulse_search", effect: "read",
    text: "I can answer from anything Westcare runs through Pulse: cover and rosters, compliance, recruitment, visit time and reconciliation. Right now the headline is " + L.unfilled + " visits needing cover, " + L.critical + " critical compliance items and " + L.openExceptions + " visits held before billing and payroll. Ask about any office, carer, candidate, visit or HSE package.",
    actions: [["Why are there still 34 visits uncovered?", 0]],
  };
}

function aboutCarer(name: string, line: string): Answer {
  return { tool: "carer_find", effect: "read", text: name + ": " + line + " Reminders have been sent; the office coordinator verifies the renewed documents.", actions: [["Open expiries", 1]] };
}
function wcRecon(id: string) { const r = wc.get().recon[id]; return !!r && r.action !== "Request Clarification"; }
function wcAccepted(id: string) { return !!wc.get().handoffAccepted[id]; }

export const HOME_QUERIES = [
  "Why are there still 34 visits uncovered?",
  "Which carers become non-compliant next week?",
  "Show me all candidates waiting for Galway.",
  "Which visits are currently blocking payroll?",
];

void hhmm; void officeOf; void HC24817;
