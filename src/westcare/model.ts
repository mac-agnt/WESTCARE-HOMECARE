/* Westcare Homecare: the single mock-data model behind every screen.
   Every headline number is either a constant here or derived from the
   generated records, so a KPI and the table under it can never disagree.
   All people, clients and records are fictional demo data. */

/* ------------------------------------------------------------------ */
/* Deterministic helpers                                               */
/* ------------------------------------------------------------------ */

function mulberry(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry(20260928);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rng() * list.length)];
const between = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
function shuffle<T>(list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Split `total` into `n` positive integer parts, deterministically. */
function splitInt(total: number, n: number, min = 1): number[] {
  const w = Array.from({ length: n }, () => 0.4 + rng());
  const sum = w.reduce((a, b) => a + b, 0);
  const parts = w.map((x) => Math.max(min, Math.floor((x / sum) * total)));
  let diff = total - parts.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff !== 0) { const k = i % n; if (diff > 0) { parts[k]++; diff--; } else if (parts[k] > min) { parts[k]--; diff++; } i++; }
  return parts;
}

export const fmt = (n: number) => n.toLocaleString("en-IE");
export const fmtH = (h: number) => (Math.round(h * 10) / 10).toLocaleString("en-IE", { minimumFractionDigits: h % 1 ? 1 : 0, maximumFractionDigits: 1 });
export const pct = (a: number, b: number, dp = 1) => (b ? (100 * a / b).toFixed(dp) : "0") + "%";
export const minsLabel = (m: number) => (m >= 60 ? Math.floor(m / 60) + "h" + (m % 60 ? " " + (m % 60) + "m" : "") : m + " min");
export const hhmm = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};

/* The demo runs on a fixed morning so every relative date reads the same. */
export const TODAY = new Date(2026, 8, 28); // Monday 28 September 2026
export const NOW_MINS = 11 * 60 + 40;       // 11:40
export const TODAY_LABEL = "Mon 28 Sep";
export const addDays = (d: number) => { const x = new Date(TODAY); x.setDate(x.getDate() + d); return x; };
export const dateLabel = (d: number) => addDays(d).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
export const shortDate = (d: number) => addDays(d).toLocaleDateString("en-IE", { day: "numeric", month: "short" });

/* ------------------------------------------------------------------ */
/* Brand + people                                                      */
/* ------------------------------------------------------------------ */

export const BRAND = {
  company: "Westcare Homecare",
  short: "Westcare",
  user: "Martin Murphy",
  userFirst: "Martin",
  userInitials: "MM",
  userRole: "Leadership",
  /* From the live Westcare logo SVG and site theme. */
  colours: { brown: "#594A42", logoBrown: "#583F35", cream: "#F1EAE0", sand: "#E8DCCC", paper: "#F4EEE6" },
  careSystem: "Current Care Management System",
};

/* Fictional demo staff. Only Martin Murphy is a real stakeholder. */
export const STAFF = [
  { name: "Martin Murphy", role: "Leadership", office: "All offices", email: "martin@westcarehomecare.ie", real: true },
  { name: "Emma Brennan", role: "Sligo Operations Coordinator", office: "Sligo", email: "emma.brennan@demo.westcare" },
  { name: "Niamh Kelly", role: "Galway Operations Coordinator", office: "Galway", email: "niamh.kelly@demo.westcare" },
  { name: "Sean Doyle", role: "Mayo Operations Coordinator", office: "Mayo", email: "sean.doyle@demo.westcare" },
  { name: "Ciarán Moran", role: "Roscommon Operations Coordinator", office: "Roscommon", email: "ciaran.moran@demo.westcare" },
  { name: "Gráinne Reilly", role: "Cavan Operations Coordinator", office: "Cavan", email: "grainne.reilly@demo.westcare" },
  { name: "Declan McKenna", role: "Monaghan Operations Coordinator", office: "Monaghan", email: "declan.mckenna@demo.westcare" },
  { name: "Rachel Byrne", role: "Compliance Manager", office: "Central", email: "rachel.byrne@demo.westcare" },
  { name: "Daniel Walsh", role: "Recruitment Lead", office: "Central", email: "daniel.walsh@demo.westcare" },
  { name: "Orla Fahy", role: "Recruiter", office: "Central", email: "orla.fahy@demo.westcare" },
  { name: "Kevin Brady", role: "Recruiter", office: "Central", email: "kevin.brady@demo.westcare" },
  { name: "Laura Martin", role: "Payroll Administrator", office: "Central", email: "laura.martin@demo.westcare" },
  { name: "Paul Geraghty", role: "Billing Administrator", office: "Central", email: "paul.geraghty@demo.westcare" },
];

/* ------------------------------------------------------------------ */
/* Offices                                                             */
/* ------------------------------------------------------------------ */

export type OfficeId = "Sligo" | "Galway" | "Mayo" | "Roscommon" | "Cavan" | "Monaghan";
export const OFFICE_IDS: OfficeId[] = ["Sligo", "Monaghan", "Cavan", "Roscommon", "Galway", "Mayo"];
export type OfficeFilter = "All" | OfficeId;

export type Office = {
  id: OfficeId; coordinator: string; region: string;
  carers: number; visits24: number; unfilled24: number;
  reqHours: number; allocHours: number;
  critical: number; exceptions: number; cancellations30: number;
  areas: string[];
};

export const OFFICES: Office[] = [
  { id: "Sligo", coordinator: "Emma Brennan", region: "North West", carers: 42, visits24: 190, unfilled24: 5, reqHours: 7120, allocHours: 6905, critical: 3, exceptions: 8, cancellations30: 418, areas: ["Sligo Town", "Tubbercurry", "Ballymote", "Enniscrone", "Grange"] },
  { id: "Monaghan", coordinator: "Declan McKenna", region: "North East", carers: 27, visits24: 114, unfilled24: 3, reqHours: 4210, allocHours: 4080, critical: 1, exceptions: 4, cancellations30: 262, areas: ["Monaghan Town", "Carrickmacross", "Castleblayney", "Clones"] },
  { id: "Cavan", coordinator: "Gráinne Reilly", region: "North East", carers: 29, visits24: 124, unfilled24: 3, reqHours: 4620, allocHours: 4468, critical: 1, exceptions: 4, cancellations30: 281, areas: ["Cavan Town", "Bailieborough", "Cootehill", "Virginia"] },
  { id: "Roscommon", coordinator: "Ciarán Moran", region: "West", carers: 32, visits24: 140, unfilled24: 5, reqHours: 5210, allocHours: 5003, critical: 2, exceptions: 6, cancellations30: 336, areas: ["Roscommon Town", "Boyle", "Castlerea", "Ballaghaderreen"] },
  { id: "Galway", coordinator: "Niamh Kelly", region: "West", carers: 56, visits24: 262, unfilled24: 7, reqHours: 9840, allocHours: 9512, critical: 3, exceptions: 12, cancellations30: 548, areas: ["Galway City", "Tuam", "Loughrea", "Ballinasloe", "Oranmore", "Athenry"] },
  { id: "Mayo", coordinator: "Sean Doyle", region: "West", carers: 41, visits24: 198, unfilled24: 11, reqHours: 7460, allocHours: 7012, critical: 2, exceptions: 9, cancellations30: 539, areas: ["Castlebar", "Westport", "Ballina", "Claremorris", "Ballinrobe"] },
];
export const officeOf = (id: OfficeId) => OFFICES.find((o) => o.id === id)!;

/* ------------------------------------------------------------------ */
/* Headline anchors (the numbers every screen must agree on)          */
/* ------------------------------------------------------------------ */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const K = {
  visits24: sum(OFFICES.map((o) => o.visits24)),          // 1,028
  unfilled24: sum(OFFICES.map((o) => o.unfilled24)),      // 34
  get covered24() { return this.visits24 - this.unfilled24; }, // 994
  reqHours: sum(OFFICES.map((o) => o.reqHours)),          // 38,460
  allocHours: sum(OFFICES.map((o) => o.allocHours)),      // 36,980
  get gapHours() { return this.reqHours - this.allocHours; },  // 1,480
  get coverage() { return (100 * this.allocHours / this.reqHours).toFixed(1) + "%"; }, // 96.2%
  activeCarers: sum(OFFICES.map((o) => o.carers)),        // 227
  fullyCompliant: 211,
  restricted: 16,
  critical7: 12,
  expired: 5,
  due30: 46,
  newCandidates: 146,
  reviewed: 58,
  interviews: 31,
  gardaLinks: 18,
  handoffs: 12,
  onboarding: 9,
  handoffsOver12h: 7,
  completed24: 1006,
  cleanVerified: 963,
  durationExceptions: 31,
  missingCheckout: 12,
  exceptions: 43,
  heldHours: 127.5,
  cancellations30: 2384,
  recoveryRate: 72,
  auditReady: 94,
  auditAttention: 12,
};

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

const FIRST = ["Aisling", "Siobhán", "Ciara", "Gráinne", "Sinéad", "Máire", "Clodagh", "Deirdre", "Eimear", "Orla", "Róisín", "Nuala", "Fiona", "Bríd", "Caoimhe", "Laura", "Emer", "Tara", "Megan", "Chloe", "Sarah", "Rachel", "Joanne", "Yvonne", "Patricia", "Karen", "Lorraine", "Anne", "Mary", "Bernadette", "Maria", "Ana", "Oksana", "Olena", "Agnieszka", "Katarzyna", "Priya", "Grace", "Blessing", "Chiamaka", "Fatima", "Amina", "Joy", "Rita", "Sandra", "Declan", "Ciarán", "Pádraig", "Seán", "Eoin", "Tomás", "Conor", "Darragh", "Michael", "John", "Kevin", "Dmytro", "Tomasz", "Mateusz", "Ahmed", "Emmanuel", "Joseph", "Samuel", "Rahul", "Andrei", "Liam", "Niall", "Colm"];
const LAST = ["Byrne", "Walsh", "Kelly", "O'Brien", "Ryan", "Murphy", "Gallagher", "McHugh", "Reilly", "Brennan", "Duffy", "Flanagan", "Moran", "Kearney", "Hession", "Mulroy", "Tierney", "Joyce", "Conneely", "Maloney", "Fahy", "Finnerty", "Keane", "Hughes", "Connolly", "McGovern", "Brady", "Smith", "Lynch", "Hanley", "Egan", "Burke", "Staunton", "Durkan", "Nolan", "Farrell", "Kowalska", "Nowak", "Wiśniewska", "Kovalenko", "Shevchenko", "Okafor", "Adeyemi", "Nwosu", "Hassan", "Ali", "Singh", "Popescu", "Ionescu", "Costa", "Silva", "McLoughlin", "Tansey", "Kilgallon", "Callaghan", "Feeney", "Gillen", "Rooney", "Cunningham", "Beirne"];
const used = new Set<string>(["Aoife Byrne", "Liam Walsh", "Sarah O'Neill", "Ahmed Hassan", "Ciara Kelly", "Mateusz Nowak", "Róisín Tierney",
  ...STAFF.map((s) => s.name)]);
function uniqueName(): string {
  for (let i = 0; i < 200; i++) {
    const n = pick(FIRST) + " " + pick(LAST);
    if (!used.has(n)) { used.add(n); return n; }
  }
  const n = pick(FIRST) + " " + pick(LAST) + " " + used.size;
  used.add(n); return n;
}
export const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/* ------------------------------------------------------------------ */
/* Carers                                                              */
/* ------------------------------------------------------------------ */

export type Carer = {
  id: string; name: string; office: OfficeId; area: string; role: string;
  contracted: number; scheduledWeek: number; drives: boolean; startYear: number;
  rosteredToday: boolean; availableToday: boolean; unavailableReason?: string;
  visitsNext30: number; qqi: boolean; story?: string;
};

let carerSeq = 1100;
export const CARERS: Carer[] = [];
for (const o of OFFICES) {
  for (let i = 0; i < o.carers; i++) {
    const contracted = pick([20, 24, 30, 30, 35, 39, 39]);
    CARERS.push({
      id: "CR-" + (++carerSeq), name: uniqueName(), office: o.id, area: pick(o.areas), role: "Healthcare Assistant",
      contracted, scheduledWeek: Math.max(8, contracted - between(0, 9)), drives: rng() > 0.18, startYear: between(2014, 2026),
      rosteredToday: false, availableToday: true, visitsNext30: between(18, 64), qqi: rng() > 0.06,
    });
  }
}
/* Story carers take over fixed slots so office totals stay put. */
function claimCarer(office: OfficeId, name: string, patch: Partial<Carer>): Carer {
  const c = CARERS.find((x) => x.office === office && !x.story)!;
  used.delete(c.name);
  Object.assign(c, { name, ...patch });
  return c;
}
export const AOIFE = claimCarer("Galway", "Aoife Byrne", { area: "Tuam", visitsNext30: 38, drives: true, story: "compliance", contracted: 35, scheduledWeek: 33, startYear: 2021 });
export const LIAM = claimCarer("Sligo", "Liam Walsh", { area: "Tubbercurry", visitsNext30: 42, drives: true, story: "vehicle", contracted: 39, scheduledWeek: 37, startYear: 2019 });
export const ROISIN = claimCarer("Galway", "Róisín Tierney", { area: "Galway City", drives: true, story: "visit", contracted: 30, scheduledWeek: 28, startYear: 2023 });

/* Today: rostered / available / unavailable per office. */
const UNAVAIL = ["Annual leave", "Sick leave", "Training day", "Unavailable (personal)", "Compliance restriction"];
export const WORKFORCE_TODAY = { rostered: 0, available: 0, unavailable: 0 };
for (const o of OFFICES) {
  const list = shuffle(CARERS.filter((c) => c.office === o.id));
  const unavailable = Math.round(o.carers * 0.09) + (o.id === "Roscommon" ? 2 : 0);
  const rostered = Math.round((o.carers - unavailable) * 0.86);
  list.forEach((c, i) => {
    if (i < unavailable && !c.story) { c.availableToday = false; c.rosteredToday = false; c.unavailableReason = pick(UNAVAIL); }
    else if (i < unavailable + rostered || c.story) { c.rosteredToday = true; }
    else { c.rosteredToday = false; }
  });
}
for (const c of CARERS) {
  if (!c.availableToday) WORKFORCE_TODAY.unavailable++;
  else if (c.rosteredToday) WORKFORCE_TODAY.rostered++;
  else WORKFORCE_TODAY.available++;
}

/* ------------------------------------------------------------------ */
/* Compliance                                                          */
/* ------------------------------------------------------------------ */

export type ReqKind = "garda" | "training" | "vehicle" | "personnel";
export type ReqStatus = "Valid" | "Expiring" | "Expired" | "Missing" | "Renewal started" | "Awaiting document" | "Awaiting verification";
export type Requirement = { name: string; kind: ReqKind; validYears: number; driversOnly?: boolean; configurable?: boolean };

export const REQUIREMENTS: Requirement[] = [
  { name: "Garda Vetting", kind: "garda", validYears: 3 },
  { name: "International Garda Clearance", kind: "garda", validYears: 3 },
  { name: "QQI Level 5 (Health Service Skills)", kind: "training", validYears: 99 },
  { name: "Patient Manual Handling", kind: "training", validYears: 2, configurable: true },
  { name: "Safeguarding Adults", kind: "training", validYears: 3, configurable: true },
  { name: "Medication Management", kind: "training", validYears: 2, configurable: true },
  { name: "Infection Prevention & Control", kind: "training", validYears: 2, configurable: true },
  { name: "Fire Safety Awareness", kind: "training", validYears: 2, configurable: true },
  { name: "Car Insurance", kind: "vehicle", validYears: 1, driversOnly: true },
  { name: "Car Tax", kind: "vehicle", validYears: 1, driversOnly: true },
  { name: "NCT", kind: "vehicle", validYears: 2, driversOnly: true },
  { name: "Driving Licence", kind: "vehicle", validYears: 10, driversOnly: true },
  { name: "Signed Contract", kind: "personnel", validYears: 99 },
  { name: "References (2)", kind: "personnel", validYears: 99 },
  { name: "Right to Work", kind: "personnel", validYears: 99 },
];

export type ComplianceItem = {
  id: string; carerId: string; carer: string; office: OfficeId; requirement: string; kind: ReqKind;
  status: ReqStatus; daysRemaining: number | null; /* negative = expired */
  expiry: string; futureVisits: number; contact: string; owner: string; lastAction: string;
};

const COORD = (o: OfficeId) => officeOf(o).coordinator;
let compSeq = 5000;
export const COMPLIANCE: ComplianceItem[] = [];
function addItem(c: Carer, req: string, status: ReqStatus, days: number | null, contact: string, owner?: string, lastAction?: string) {
  const r = REQUIREMENTS.find((x) => x.name === req)!;
  const item: ComplianceItem = {
    id: "CMP-" + (++compSeq), carerId: c.id, carer: c.name, office: c.office, requirement: req, kind: r.kind, status,
    daysRemaining: days, expiry: days === null ? "Not on file" : dateLabel(days),
    futureVisits: days === null ? c.visitsNext30 : Math.max(0, Math.round(c.visitsNext30 * Math.min(1, Math.max(0, (30 - Math.max(days, 0)) / 30)))),
    contact, owner: owner || (r.kind === "garda" ? "Rachel Byrne" : COORD(c.office)), lastAction: lastAction || "",
  };
  COMPLIANCE.push(item);
  return item;
}

/* Story items first. */
addItem(AOIFE, "Patient Manual Handling", "Expiring", 6, "Reminder sent 08:12", "Niamh Kelly", "Compliance Agent sent renewal reminder").futureVisits = 38;
addItem(AOIFE, "Garda Vetting", "Renewal started", 18, "Renewal link opened", "Rachel Byrne", "Renewal application started 24 Sep");
addItem(LIAM, "Car Insurance", "Awaiting document", 6, "Reminder sent 07:45", "Emma Brennan", "Compliance Agent requested renewed certificate").futureVisits = 42;
addItem(LIAM, "NCT", "Expiring", 29, "Scheduled reminder", "Emma Brennan", "NCT booking reminder queued for 14 days out");

/* Remaining 10 critical (≤7 days) items, spread to match the office split. */
const CRIT_SPLIT: [OfficeId, number][] = [["Galway", 2], ["Sligo", 2], ["Mayo", 2], ["Roscommon", 2], ["Cavan", 1], ["Monaghan", 1]];
const CRIT_REQS = ["Garda Vetting", "Patient Manual Handling", "Car Insurance", "Safeguarding Adults", "Car Tax", "Medication Management", "NCT", "Infection Prevention & Control", "Patient Manual Handling", "Car Insurance"];
const CRIT_DAYS = [0, 1, 1, 2, 3, 4, 5, 5, 6, 7];
const CONTACTS = ["Reminder sent", "Reminder sent · no reply", "Escalated to coordinator", "Carer confirmed booking", "Document uploaded · awaiting check", "SMS delivered"];
const poolFor = (o: OfficeId) => shuffle(CARERS.filter((c) => c.office === o && !c.story));
const takenForRestriction = new Set<string>();
const takenForExpiry = new Set<string>();
{
  let k = 0;
  for (const [o, n] of CRIT_SPLIT) {
    const pool = poolFor(o).filter((c) => c.drives);
    for (let i = 0; i < n; i++) {
      const c = pool[i]; takenForExpiry.add(c.id);
      const days = CRIT_DAYS[k];
      const req = CRIT_REQS[k++];
      const status: ReqStatus = days <= 2 ? "Awaiting document" : rng() > 0.5 ? "Renewal started" : "Expiring";
      addItem(c, req, status, days, days === 0 ? "Escalated to coordinator" : pick(CONTACTS));
    }
  }
}
/* 8-14 days: 14 items. 15-30 days: 18 more (plus Aoife Garda 18d and Liam NCT 29d = 20). */
const SOON_REQS = ["Garda Vetting", "Patient Manual Handling", "Safeguarding Adults", "Car Tax", "NCT", "Car Insurance", "Medication Management", "Fire Safety Awareness", "Infection Prevention & Control", "International Garda Clearance"];
function addBand(count: number, lo: number, hi: number) {
  const pool = shuffle(CARERS.filter((c) => !c.story && !takenForExpiry.has(c.id)));
  for (let i = 0; i < count; i++) {
    const c = pool[i]; takenForExpiry.add(c.id);
    let req = pick(SOON_REQS);
    if (!c.drives && REQUIREMENTS.find((r) => r.name === req)!.driversOnly) req = "Safeguarding Adults";
    addItem(c, req, rng() > 0.55 ? "Renewal started" : "Expiring", between(lo, hi), pick(["Reminder scheduled", "Reminder sent", "Not yet contacted", "Carer confirmed booking"]));
  }
}
addBand(14, 8, 14);
addBand(18, 15, 30);

/* 16 compliance restrictions: 5 expired, 7 missing, 4 awaiting verification. */
function addRestrictions(count: number, status: ReqStatus, reqs: string[], days: (i: number) => number | null, contact: string) {
  const pool = shuffle(CARERS.filter((c) => !c.story && !takenForExpiry.has(c.id) && !takenForRestriction.has(c.id)));
  for (let i = 0; i < count; i++) {
    const c = pool[i]; takenForRestriction.add(c.id);
    addItem(c, reqs[i % reqs.length], status, days(i), contact, undefined, status === "Expired" ? "Restricted from new visits" : "Blocked from rostering until resolved");
  }
}
addRestrictions(5, "Expired", ["Patient Manual Handling", "Car Insurance", "Garda Vetting", "Safeguarding Adults", "NCT"], (i) => -[2, 4, 6, 9, 13][i], "Escalated to coordinator");
addRestrictions(7, "Missing", ["International Garda Clearance", "QQI Level 5 (Health Service Skills)", "References (2)", "Signed Contract", "QQI Level 5 (Health Service Skills)", "Right to Work", "International Garda Clearance"], () => null, "Document requested");
addRestrictions(4, "Awaiting verification", ["Garda Vetting", "Driving Licence", "Patient Manual Handling", "Car Insurance"], (i) => [3, 11, 20, 26][i], "Uploaded · awaiting human check");

export const RESTRICTED_CARER_IDS = new Set(COMPLIANCE.filter((i) => i.status === "Expired" || i.status === "Missing" || i.status === "Awaiting verification").map((i) => i.carerId));
/* Expiring = valid but within 30 days (includes the 12 critical). */
export const EXPIRING = COMPLIANCE.filter((i) => i.daysRemaining !== null && i.daysRemaining >= 0 && i.daysRemaining <= 30 && i.status !== "Awaiting verification");
export const CRITICAL = EXPIRING.filter((i) => (i.daysRemaining as number) <= 7);
export const EXPIRED = COMPLIANCE.filter((i) => i.status === "Expired");
export const MISSING = COMPLIANCE.filter((i) => i.status === "Missing");
export const AWAITING_VERIFY = COMPLIANCE.filter((i) => i.status === "Awaiting verification");
export const AUDIT_ATTENTION = EXPIRED.concat(MISSING); // 12 records

/* Compliance mix per office for the big stacked visual. */
export const complianceByOffice = (office: OfficeId) => {
  const carers = CARERS.filter((c) => c.office === office);
  const red = carers.filter((c) => RESTRICTED_CARER_IDS.has(c.id)).length;
  const amber = new Set(EXPIRING.filter((i) => i.office === office && !RESTRICTED_CARER_IDS.has(i.carerId)).map((i) => i.carerId)).size;
  const green = carers.length - red - amber;
  return { total: carers.length, green, amber, red };
};

/* Garda vetting pipeline (initial vetting for candidates + renewals for carers). */
export const GARDA_STAGES = [
  { stage: "Link Required", initial: 4, igc: 2 },
  { stage: "Link Sent", initial: 6, igc: 3 },
  { stage: "Application Started", initial: 7, igc: 2 },
  { stage: "Awaiting Result", initial: 9, igc: 4 },
  { stage: "Complete", initial: 214, igc: 61 },
  { stage: "Renewal Due", initial: 11, igc: 3 },
  { stage: "Expired", initial: 1, igc: 0 },
];

/* Training modules: completion across active carers. */
export const TRAINING = [
  { module: "QQI Level 5 (Health Service Skills)", mandatory: true, provider: "GSW Recruitment & Training Solutions", complete: 221, renewalYears: "One-off" },
  { module: "Patient Manual Handling", mandatory: true, provider: "GSW Recruitment & Training Solutions", complete: 219, renewalYears: "Every 2 years" },
  { module: "Safeguarding Adults", mandatory: true, provider: "GSW Recruitment & Training Solutions", complete: 223, renewalYears: "Every 3 years" },
  { module: "Medication Management", mandatory: true, provider: "GSW Recruitment & Training Solutions", complete: 204, renewalYears: "Every 2 years", note: "Required for medication-prompt visits" },
  { module: "Infection Prevention & Control", mandatory: true, provider: "GSW Recruitment & Training Solutions", complete: 225, renewalYears: "Every 2 years" },
  { module: "Fire Safety Awareness", mandatory: true, provider: "GSW Recruitment & Training Solutions", complete: 217, renewalYears: "Every 2 years" },
  { module: "Dementia Awareness", mandatory: false, provider: "GSW Recruitment & Training Solutions", complete: 168, renewalYears: "Every 3 years" },
  { module: "First Aid Responder", mandatory: false, provider: "GSW Recruitment & Training Solutions", complete: 131, renewalYears: "Every 2 years" },
];

/* ------------------------------------------------------------------ */
/* Recruitment                                                         */
/* ------------------------------------------------------------------ */

export type Stage = "New" | "Review" | "Interview" | "Garda Vetting" | "Office Handoff" | "Onboarding" | "Ready to Roster";
export const STAGES: Stage[] = ["New", "Review", "Interview", "Garda Vetting", "Office Handoff", "Onboarding", "Ready to Roster"];
export const STAGE_COUNTS: Record<Stage, number> = { "New": 88, "Review": 27, "Interview": 31, "Garda Vetting": 18, "Office Handoff": 12, "Onboarding": 9, "Ready to Roster": 5 };
export type Source = "Indeed" | "Referral" | "Social" | "Recruitment Event" | "Westcare Website";
export const SOURCE_WEEK: [Source, number][] = [["Indeed", 81], ["Referral", 22], ["Social", 18], ["Recruitment Event", 16], ["Westcare Website", 9]];

export type Candidate = {
  id: string; name: string; role: string; county: OfficeId; office: OfficeId; source: Source; sourceDetail: string;
  stage: Stage; daysInStage: number; hoursInStage?: number; appliedThisWeek: boolean;
  missing: string[]; lastContact: string; recruiter: string; garda?: string; onboardingDone?: number; story?: string;
};

const RECRUITERS = ["Daniel Walsh", "Orla Fahy", "Kevin Brady"];
const MISSING_POOL = ["QQI certificate", "Second reference", "Proof of address", "Driving licence copy", "Right to work", "CV", "Availability form"];
let candSeq = 3400;
export const CANDIDATES: Candidate[] = [];

/* The 146 this-week applications are in New, Review or Interview. */
const weekSources: Source[] = shuffle(SOURCE_WEEK.flatMap(([s, n]) => Array.from({ length: n }, () => s)));
const weekStages: Stage[] = [
  ...Array.from({ length: 88 }, () => "New" as Stage),
  ...Array.from({ length: 27 }, () => "Review" as Stage),
  ...Array.from({ length: 31 }, () => "Interview" as Stage),
];
/* Destination demand follows the open-hours gap: Mayo and Galway draw most. */
const OFFICE_WEIGHT: OfficeId[] = ["Mayo", "Mayo", "Mayo", "Galway", "Galway", "Galway", "Sligo", "Sligo", "Roscommon", "Roscommon", "Cavan", "Monaghan"];
const sourceDetail = (s: Source) => s === "Indeed" ? "Indeed via Cezanne" : s === "Referral" ? "Staff referral" : s === "Social" ? pick(["Facebook", "Instagram"]) + " via Cezanne" : s === "Recruitment Event" ? pick(["Mayo Open Day", "Galway Open Day", "Sligo Jobs Fair"]) : "westcarehomecare.ie careers";
weekStages.forEach((stage, i) => {
  const office = pick(OFFICE_WEIGHT);
  const src = weekSources[i];
  CANDIDATES.push({
    id: "CAN-" + (++candSeq), name: uniqueName(), role: "Healthcare Assistant", county: office, office, source: src, sourceDetail: sourceDetail(src),
    stage, daysInStage: stage === "New" ? between(0, 3) : between(0, 5), appliedThisWeek: true,
    missing: rng() > 0.62 ? [pick(MISSING_POOL)] : [], lastContact: stage === "New" ? "Auto-acknowledged" : pick(["Called", "Emailed", "SMS", "Interview invite sent"]),
    recruiter: pick(RECRUITERS),
  });
});
/* Earlier-week candidates further along. */
const LATER: [Stage, number][] = [["Garda Vetting", 18], ["Office Handoff", 12], ["Onboarding", 9], ["Ready to Roster", 5]];
const laterSources: Source[] = ["Indeed", "Indeed", "Indeed", "Referral", "Referral", "Social", "Recruitment Event", "Westcare Website"];
for (const [stage, n] of LATER) {
  for (let i = 0; i < n; i++) {
    const office = pick(OFFICE_WEIGHT); const src = pick(laterSources);
    CANDIDATES.push({
      id: "CAN-" + (++candSeq), name: uniqueName(), role: "Healthcare Assistant", county: office, office, source: src, sourceDetail: sourceDetail(src),
      stage, daysInStage: between(1, 9), appliedThisWeek: false, missing: rng() > 0.7 ? [pick(MISSING_POOL)] : [],
      lastContact: pick(["Called", "Emailed", "SMS"]), recruiter: pick(RECRUITERS),
      garda: stage === "Garda Vetting" ? pick(["Link sent", "Link sent", "Application started", "Application started", "Awaiting result"]) : stage === "Office Handoff" ? pick(["Application started", "Awaiting result"]) : "Complete",
      onboardingDone: stage === "Onboarding" ? between(4, 7) : stage === "Ready to Roster" ? 8 : stage === "Office Handoff" ? between(1, 3) : undefined,
    });
  }
}
/* Story candidates replace generated ones in the same stage so counts hold. */
function claimCandidate(stage: Stage, patch: Partial<Candidate>): Candidate {
  const c = CANDIDATES.find((x) => x.stage === stage && !x.story && (patch.appliedThisWeek === undefined || x.appliedThisWeek === patch.appliedThisWeek))!;
  const oldSrc = c.source;
  Object.assign(c, patch);
  /* keep the weekly source mix exact: swap sources with another this-week candidate */
  if (c.appliedThisWeek && patch.source && patch.source !== oldSrc) {
    const other = CANDIDATES.find((x) => x !== c && x.appliedThisWeek && !x.story && x.source === patch.source)!;
    other.source = oldSrc; other.sourceDetail = sourceDetail(oldSrc);
  }
  return c;
}
export const SARAH = claimCandidate("Office Handoff", { name: "Sarah O'Neill", county: "Galway", office: "Galway", source: "Indeed", sourceDetail: "Indeed via Cezanne", daysInStage: 0, hoursInStage: 19, garda: "Application started", onboardingDone: 3, missing: ["Signed contract", "Uniform sizing"], lastContact: "Handoff pack sent 19h ago", recruiter: "Orla Fahy", story: "handoff" });
export const AHMED = claimCandidate("Onboarding", { name: "Ahmed Hassan", county: "Mayo", office: "Mayo", source: "Referral", sourceDetail: "Staff referral", daysInStage: 2, onboardingDone: 5, missing: [], lastContact: "Induction booked Wed", recruiter: "Kevin Brady", story: "onboarding" });
export const CIARA = claimCandidate("Interview", { name: "Ciara Kelly", county: "Sligo", office: "Sligo", source: "Recruitment Event", sourceDetail: "Sligo Jobs Fair", daysInStage: 1, missing: [], lastContact: "Interview Thu 10:30", recruiter: "Daniel Walsh", appliedThisWeek: true, story: "interview" });
export const MATEUSZ = claimCandidate("Review", { name: "Mateusz Nowak", county: "Cavan", office: "Cavan", source: "Indeed", sourceDetail: "Indeed via Cezanne", daysInStage: 3, missing: ["QQI certificate"], lastContact: "Document request sent", recruiter: "Orla Fahy", appliedThisWeek: true, story: "missing" });

/* Handoffs: the 12 in Office Handoff. 8 not yet accepted, 7 of those over 12h. */
export type Handoff = { candidate: Candidate; recruiter: string; destination: OfficeId; stage: string; sent: string; acceptedBy: string | null; waitingHours: number; outstanding: string[] };
export const HANDOFFS: Handoff[] = (() => {
  const list = CANDIDATES.filter((c) => c.stage === "Office Handoff");
  const waits = [19, 41, 27, 16, 22, 14, 33, 6, 0, 0, 0, 0];
  const others = list.filter((c) => c !== SARAH);
  const ordered = [SARAH, ...others];
  return ordered.map((c, i) => {
    const w = waits[i];
    const accepted = i >= 8;
    return {
      candidate: c, recruiter: c.recruiter, destination: c.office, stage: accepted ? "Accepted · onboarding pack" : "Awaiting office acceptance",
      sent: accepted ? "Accepted " + between(2, 9) + "h ago" : w + "h ago", acceptedBy: accepted ? COORD(c.office) : null,
      waitingHours: accepted ? 0 : w, outstanding: c === SARAH ? ["Accept handoff", "Issue contract", "Book induction", "Uniform sizing", "Payroll details"] : accepted ? ["Book induction"] : ["Accept handoff", "Issue contract", "Book induction"],
    };
  });
})();

export const SOURCES_90 = [
  { source: "Indeed", applicants: 1012, interviews: 188, handoffs: 61, starters: 44, cost: "€2,940" },
  { source: "Job boards (other)", applicants: 164, interviews: 27, handoffs: 7, starters: 5, cost: "€1,150" },
  { source: "Westcare website", applicants: 118, interviews: 14, handoffs: 3, starters: 2, cost: "€0" },
  { source: "Social media", applicants: 231, interviews: 41, handoffs: 12, starters: 9, cost: "€860" },
  { source: "Referral", applicants: 276, interviews: 96, handoffs: 38, starters: 31, cost: "€3,100 (bonus)" },
  { source: "Open days", applicants: 142, interviews: 52, handoffs: 17, starters: 13, cost: "€1,420" },
  { source: "Job fairs", applicants: 58, interviews: 16, handoffs: 5, starters: 3, cost: "€900" },
];

export const OPEN_ROLES = OFFICES.map((o) => ({
  title: "Healthcare Assistant · " + o.id,
  office: o.id,
  openings: { Sligo: 5, Monaghan: 3, Cavan: 3, Roscommon: 4, Galway: 7, Mayo: 9 }[o.id],
  hoursGap: o.reqHours - o.allocHours,
  pipeline: CANDIDATES.filter((c) => c.office === o.id).length,
  newThisWeek: CANDIDATES.filter((c) => c.office === o.id && c.appliedThisWeek).length,
  posted: ["Indeed", "Westcare careers", "Social"],
  drivingRequired: o.id !== "Galway",
  areas: o.areas.slice(0, 3).join(", "),
}));

export const RECRUITMENT_EVENTS = [
  { name: "Mayo Open Day", where: "Castlebar", when: "Sat 19 Sep", rsvps: 42, attended: 17, screening: 7, garda: 3, status: "Complete" },
  { name: "Galway Open Day", where: "Galway City", when: "Sat 26 Sep", rsvps: 51, attended: 23, screening: 9, garda: 2, status: "Follow-up in progress" },
  { name: "Sligo Jobs Fair", where: "Sligo IT", when: "Thu 24 Sep", rsvps: 0, attended: 64, screening: 6, garda: 0, status: "Leads imported" },
  { name: "Referral Campaign", where: "All offices", when: "1 Sep to 31 Oct", rsvps: 0, attended: 0, screening: 22, garda: 5, status: "Live · €250 bonus on start" },
  { name: "Roscommon Open Day", where: "Roscommon Town", when: "Sat 10 Oct", rsvps: 18, attended: 0, screening: 0, garda: 0, status: "Upcoming" },
];

/* ------------------------------------------------------------------ */
/* Clients + HSE requests                                              */
/* ------------------------------------------------------------------ */

export const SERVICE_TYPES = ["Home Support", "Personal Care", "Home Support", "Personal Care", "Respite", "Night Support"];
export type Client = {
  id: string; initials: string; office: OfficeId; area: string; packageId: string; service: string;
  weeklyHours: number; carers: string[]; upcoming: number; cancellations30: number; contact: string;
};
export type HseRequest = {
  id: string; office: OfficeId; region: string; client: string; service: string;
  weeklyHours: number; assigned: number; gap: number; start: string; status: string; story?: string;
};

const clientIds = new Set<string>();
function clientId(): string {
  for (;;) {
    const id = String.fromCharCode(65 + Math.floor(rng() * 26)) + String.fromCharCode(65 + Math.floor(rng() * 26)) + "-" + between(1000, 1999);
    if (!clientIds.has(id) && id !== "MM-1042") { clientIds.add(id); return id; }
  }
}

export const HSE_REQUESTS: HseRequest[] = [];
let hcSeq = 24700;
for (const o of OFFICES) {
  const n = { Sligo: 27, Monaghan: 16, Cavan: 18, Roscommon: 21, Galway: 38, Mayo: 29 }[o.id];
  const hours = splitInt(o.reqHours, n, 40);
  const gapTotal = o.reqHours - o.allocHours;
  const withGap = { Sligo: 5, Monaghan: 3, Cavan: 3, Roscommon: 4, Galway: 6, Mayo: 6 }[o.id];
  const gapParts = o.id === "Mayo" ? [64].concat(splitInt(gapTotal - 64, withGap - 1, 12)) : splitInt(gapTotal, withGap, 12);
  hours.forEach((h, i) => {
    const isStory = o.id === "Mayo" && i === 0;
    const weekly = isStory ? 240 : h;
    const gap = i < withGap ? gapParts[i] : 0;
    const clients = Math.max(1, Math.round(weekly / between(14, 22)));
    HSE_REQUESTS.push({
      id: isStory ? "HC-24817" : "HC-" + (++hcSeq === 24817 ? ++hcSeq : hcSeq), office: o.id, region: isStory ? "Castlebar North" : pick(o.areas),
      client: clients > 1 ? clients + " clients · cohort" : clientId(), service: isStory ? "Home Support" : pick(SERVICE_TYPES),
      weeklyHours: weekly, assigned: weekly - gap, gap, start: shortDate(-between(3, 420)),
      status: gap === 0 ? "Fully allocated" : gap >= 40 ? "Capacity Gap" : "Partially allocated", story: isStory ? "capacity" : undefined,
    });
  });
  /* the story request is 240h: rebalance the rest of Mayo so the office total holds */
  if (o.id === "Mayo") {
    const list = HSE_REQUESTS.filter((r) => r.office === "Mayo");
    const diff = sum(list.map((r) => r.weeklyHours)) - o.reqHours;
    const target = list.filter((r) => r.gap === 0).sort((a, b) => b.weeklyHours - a.weeklyHours)[0];
    target.weeklyHours -= diff; target.assigned -= diff;
  }
}
export const HC24817 = HSE_REQUESTS.find((r) => r.id === "HC-24817")!;
HC24817.client = "14 clients · cohort";
export const HSE_GAPS = HSE_REQUESTS.filter((r) => r.gap > 0);

export const CLIENTS: Client[] = [];
for (const o of OFFICES) {
  const n = Math.round(o.visits24 * 0.64);
  for (let i = 0; i < n; i++) {
    const req = pick(HSE_REQUESTS.filter((r) => r.office === o.id));
    const pool = CARERS.filter((c) => c.office === o.id);
    const id = clientId();
    CLIENTS.push({
      id, initials: id.slice(0, 2), office: o.id, area: pick(o.areas), packageId: req.id, service: req.service,
      weeklyHours: pick([3.5, 5, 7, 7, 10.5, 14, 14, 21]), carers: [pick(pool).name, pick(pool).name].filter((v, k, a) => a.indexOf(v) === k),
      upcoming: between(4, 21), cancellations30: between(0, 3), contact: pick(["Phone · daughter", "Phone · client", "Email · son", "Phone · spouse", "SMS · client"]),
    });
  }
}
export const MM1042: Client = { id: "MM-1042", initials: "MM", office: "Galway", area: "Galway City", packageId: "HC-24761", service: "Personal Care", weeklyHours: 10.5, carers: ["Róisín Tierney", "Aoife Byrne"], upcoming: 14, cancellations30: 1, contact: "Phone · daughter" };
CLIENTS.unshift(MM1042);
{
  const r = HSE_REQUESTS.find((x) => x.office === "Galway" && x.gap === 0 && x.id !== "HC-24817")!;
  MM1042.packageId = r.id;
}

/* ------------------------------------------------------------------ */
/* Today's visits (next 24h): 1,028 scheduled, 994 covered, 34 open   */
/* ------------------------------------------------------------------ */

export type VisitStatus = "Completed" | "In progress" | "Upcoming" | "Late" | "Unfilled";
export type Visit = {
  id: string; client: string; carer: string | null; carerId: string | null; office: OfficeId;
  start: number; mins: number; status: VisitStatus; actualIn?: number; actualOut?: number;
  verification: string; billing: string; service: string; requiredSkill: string; note?: string; cancelledFrom?: string;
};

export const VISITS: Visit[] = [];
let visSeq = 20000;
const STATUS_SPLIT: Record<OfficeId, [number, number, number, number]> = {
  // completed, in progress, late, (upcoming = remainder) ; unfilled from office
  Sligo: [76, 16, 4, 0], Monaghan: [46, 10, 2, 0], Cavan: [50, 11, 2, 0], Roscommon: [55, 11, 5, 0], Galway: [104, 22, 5, 0], Mayo: [81, 16, 4, 0],
};
for (const o of OFFICES) {
  const [done, prog, late] = STATUS_SPLIT[o.id];
  const clients = CLIENTS.filter((c) => c.office === o.id);
  const carers = CARERS.filter((c) => c.office === o.id && c.rosteredToday);
  for (let i = 0; i < o.visits24; i++) {
    const status: VisitStatus = i < done ? "Completed" : i < done + prog ? "In progress" : i < done + prog + late ? "Late" : i < o.visits24 - o.unfilled24 ? "Upcoming" : "Unfilled";
    const mins = pick([30, 30, 45, 45, 45, 60, 60, 90]);
    const start = status === "Completed" ? between(7 * 60, 10 * 60 + 30) : status === "In progress" ? between(10 * 60 + 45, 11 * 60 + 30)
      : status === "Late" ? between(11 * 60, 11 * 60 + 35) : status === "Unfilled" ? between(12 * 60, 21 * 60) : between(12 * 60, 22 * 60 + 30);
    const carer = status === "Unfilled" ? null : pick(carers);
    const cl = pick(clients);
    const inOff = between(-4, 8);
    VISITS.push({
      id: "VIS-" + (++visSeq), client: cl.id, carer: carer ? carer.name : null, carerId: carer ? carer.id : null, office: o.id,
      start: Math.round(start / 5) * 5, mins, status,
      actualIn: status === "Completed" || status === "In progress" ? Math.round(start / 5) * 5 + inOff : undefined,
      actualOut: status === "Completed" ? Math.round(start / 5) * 5 + inOff + mins + between(-5, 4) : undefined,
      verification: status === "Completed" ? "Verified" : status === "In progress" ? "Checked in" : status === "Late" ? "Missing check-in" : status === "Unfilled" ? "No carer" : "Scheduled",
      billing: status === "Completed" ? "Ready" : "Pending", service: cl.service,
      requiredSkill: cl.service === "Personal Care" ? "Manual Handling" : cl.service === "Night Support" ? "Night support" : "Standard",
    });
  }
}
export const UNFILLED_TODAY = VISITS.filter((v) => v.status === "Unfilled");
/* Roscommon cluster: 5 of the Roscommon unfilled came from the 07:00-09:00 cancellations. */
UNFILLED_TODAY.filter((v) => v.office === "Roscommon").forEach((v, i) => {
  v.cancelledFrom = "Roscommon cluster 07:00-09:00"; v.start = [12 * 60, 12 * 60 + 30, 13 * 60, 14 * 60, 15 * 60 + 30][i];
  v.mins = [120, 90, 120, 90, 90][i]; v.note = "Original carer called in sick 07:10";
});
/* Aoife's rostered visits today (she is still valid today). */
export const AOIFE_UPCOMING_VISITS = VISITS.filter((v) => v.office === "Galway" && v.status === "Upcoming").slice(0, 4).map((v) => { v.carer = AOIFE.name; v.carerId = AOIFE.id; v.requiredSkill = "Manual Handling"; return v; });
export const LIAM_UPCOMING_VISITS = VISITS.filter((v) => v.office === "Sligo" && v.status === "Upcoming").slice(0, 5).map((v) => { v.carer = LIAM.name; v.carerId = LIAM.id; return v; });

export const TODAY_COUNTS = (() => {
  const c = (s: VisitStatus) => VISITS.filter((v) => v.status === s).length;
  return { completed: c("Completed"), inProgress: c("In progress"), upcoming: c("Upcoming"), late: c("Late"), unfilled: c("Unfilled"), cancelled: 19 };
})();

/* ------------------------------------------------------------------ */
/* Completed visits last 24h: 1,006 · 963 clean · 43 exceptions        */
/* ------------------------------------------------------------------ */

export type ExceptionType = "Short visit" | "Long visit" | "Manual correction requested" | "Missing check-out";
export type BillingIssue = "Duration mismatch" | "Manual adjustment" | "Duplicate event" | "Missing check-out" | "Cancelled but marked complete";
export type DoneVisit = {
  id: string; client: string; carer: string; office: OfficeId; start: number; mins: number;
  actualIn: number; actualOut: number | null; actualMins: number | null; verifiedMins: number | null;
  status: "Verified" | "Duration Exception" | "Missing Check-out";
  exception?: ExceptionType; billingIssue?: BillingIssue; source: string; gps: string; owner: string; service: string; story?: string;
};

export const DONE: DoneVisit[] = [];
{
  let seq = 10300;
  const exceptionsByOffice = Object.fromEntries(OFFICES.map((o) => [o.id, o.exceptions])) as Record<OfficeId, number>;
  /* 43 exceptions carry exactly 127.5 scheduled hours: 18 × 45m, 12 × 60m, 4 × 3h respite, 9 × 10h night support. */
  const exMins: number[] = shuffle([...Array(18).fill(45), ...Array(12).fill(60), ...Array(4).fill(180), ...Array(9).fill(600)]);
  /* 31 duration (24 short, 4 long, 3 manual) + 12 missing check-out; night sits are mostly the missing check-outs */
  const types: ExceptionType[] = [];
  const nightIdx = exMins.map((m, i) => (m === 600 ? i : -1)).filter((i) => i >= 0);
  const dayIdx = exMins.map((m, i) => (m !== 600 ? i : -1)).filter((i) => i >= 0);
  nightIdx.forEach((i, k) => { types[i] = k < 7 ? "Missing check-out" : "Short visit"; });
  const dayTypes: ExceptionType[] = shuffle([...Array(5).fill("Missing check-out"), ...Array(22).fill("Short visit"), ...Array(4).fill("Long visit"), ...Array(3).fill("Manual correction requested")]);
  dayIdx.forEach((i, k) => { types[i] = dayTypes[k]; });

  /* The story visit takes one 45-minute short-visit slot in Galway. */
  const storyAt = exMins.findIndex((m, i) => m === 45 && types[i] === "Short visit");
  const exOffices: OfficeId[] = shuffle(OFFICES.flatMap((o) => Array(exceptionsByOffice[o.id]).fill(o.id) as OfficeId[]));
  const gi = exOffices.indexOf("Galway"); [exOffices[gi], exOffices[storyAt]] = [exOffices[storyAt], exOffices[gi]];
  let billingDup = 0, billingCancel = 0;

  const makeClean = (o: OfficeId): DoneVisit => {
    const mins = pick([30, 30, 45, 45, 45, 60, 60, 90]);
    const start = Math.round(between(7 * 60, 21 * 60) / 5) * 5;
    const inAt = start + between(-3, 6);
    const actual = mins + between(-3, 3);
    const carer = pick(CARERS.filter((c) => c.office === o));
    return { id: "VIS-" + (++seq), client: pick(CLIENTS.filter((c) => c.office === o)).id, carer: carer.name, office: o, start, mins, actualIn: inAt, actualOut: inAt + actual, actualMins: actual, verifiedMins: mins, status: "Verified", source: BRAND.careSystem, gps: "Matched", owner: COORD(o), service: pick(SERVICE_TYPES) };
  };
  const exceptions: DoneVisit[] = exMins.map((mins, i) => {
    const o = exOffices[i];
    const t = types[i];
    const night = mins === 600;
    const start = night ? 21 * 60 + pick([0, 30, 60]) : Math.round(between(7 * 60, 20 * 60) / 5) * 5;
    const inAt = start + between(0, t === "Short visit" ? 12 : 6);
    const actual = t === "Short visit" ? Math.round(mins * (0.5 + rng() * 0.22)) : t === "Long visit" ? Math.round(mins * (1.35 + rng() * 0.3)) : t === "Manual correction requested" ? mins - between(8, 15) : null;
    const carer = pick(CARERS.filter((c) => c.office === o && !c.story));
    let issue: BillingIssue = t === "Missing check-out" ? "Missing check-out" : t === "Manual correction requested" ? "Manual adjustment" : "Duration mismatch";
    if (t === "Long visit" && billingDup < 1) { issue = "Duplicate event"; billingDup++; }
    if (t === "Missing check-out" && !night && billingCancel < 2) { issue = "Cancelled but marked complete"; billingCancel++; }
    return {
      id: "", client: pick(CLIENTS.filter((c) => c.office === o)).id, carer: carer.name, office: o, start, mins,
      actualIn: inAt, actualOut: actual === null ? null : inAt + actual, actualMins: actual, verifiedMins: null,
      status: t === "Missing check-out" ? "Missing Check-out" : "Duration Exception", exception: t, billingIssue: issue,
      source: BRAND.careSystem, gps: t === "Missing check-out" ? "Check-out not received" : rng() > 0.2 ? "Matched" : "Not available", owner: COORD(o), service: night ? "Night Support" : mins === 180 ? "Respite" : pick(["Home Support", "Personal Care"]),
    };
  });
  const story = exceptions[storyAt];
  Object.assign(story, { client: "MM-1042", carer: ROISIN.name, office: "Galway", start: 600, mins: 45, actualIn: 606, actualOut: 635, actualMins: 29, service: "Personal Care", gps: "Matched", owner: "Niamh Kelly", story: "visit" });

  /* Interleave: 963 clean + 43 exceptions, ids ascending by start time. */
  const clean: DoneVisit[] = [];
  for (const o of OFFICES) {
    const n = Math.round((K.cleanVerified * (o.visits24 - 0)) / K.visits24);
    for (let i = 0; i < n; i++) clean.push(makeClean(o.id));
  }
  while (clean.length > K.cleanVerified) clean.pop();
  while (clean.length < K.cleanVerified) clean.push(makeClean("Galway"));
  const all = clean.concat(exceptions).sort((a, b) => a.start - b.start);
  seq = 10000;
  for (const v of all) { v.id = v.story ? "" : "VIS-" + (++seq); }
  story.id = "VIS-10482";
  if (all.some((v) => v !== story && v.id === "VIS-10482")) { const dup = all.find((v) => v !== story && v.id === "VIS-10482")!; dup.id = "VIS-11" + (++seq); }
  DONE.push(...all);
}
export const EXCEPTIONS = DONE.filter((v) => v.status !== "Verified");
export const VIS10482 = DONE.find((v) => v.id === "VIS-10482")!;
export const DONE_TOTALS = (() => {
  const h = (xs: DoneVisit[], f: (v: DoneVisit) => number) => sum(xs.map(f)) / 60;
  const clean = DONE.filter((v) => v.status === "Verified");
  return {
    scheduled: h(DONE, (v) => v.mins),
    delivered: h(DONE, (v) => v.actualMins ?? 0),
    verified: h(clean, (v) => v.verifiedMins ?? 0),
    held: h(EXCEPTIONS, (v) => v.mins), // 127.5
  };
})();

/* ------------------------------------------------------------------ */
/* Cancellations                                                        */
/* ------------------------------------------------------------------ */

export const CANCEL_REASONS: [string, number][] = [["Carer unavailable", 763], ["Client cancellation", 612], ["Schedule conflict", 404], ["Hospital / service change", 296], ["No-show / failed visit", 185], ["Other", 124]];
export const CANCEL_DAILY: number[] = splitInt(K.cancellations30, 30, 50);
export const CANCEL_RECOVERED = Math.round(K.cancellations30 * K.recoveryRate / 100); // 1,716
export const CANCEL_TODAY = (() => {
  const rows: { time: string; office: OfficeId; client: string; reason: string; carer: string; replacement: string | null; hours: number; recovered: boolean }[] = [];
  const rosc = CLIENTS.filter((c) => c.office === "Roscommon");
  const roscCarers = CARERS.filter((c) => c.office === "Roscommon");
  const recoveredHours = [1, 1.5, 1, 0.75, 1, 0.75];
  const lostHours = [2, 1.5, 2, 1.5, 1.5]; // 8.5 at risk
  for (let i = 0; i < 11; i++) {
    const rec = i < 6;
    rows.push({ time: hhmm(7 * 60 + 4 + i * 10), office: "Roscommon", client: pick(rosc).id, reason: i % 3 === 0 ? "Client cancellation" : "Carer unavailable", carer: pick(roscCarers).name,
      replacement: rec ? pick(roscCarers).name : null, hours: rec ? recoveredHours[i] : lostHours[i - 6], recovered: rec });
  }
  const elsewhere: OfficeId[] = ["Galway", "Mayo", "Mayo", "Sligo", "Galway", "Cavan", "Monaghan", "Galway"];
  elsewhere.forEach((o, i) => {
    rows.push({ time: hhmm(8 * 60 + 12 + i * 23), office: o, client: pick(CLIENTS.filter((c) => c.office === o)).id, reason: pick(["Client cancellation", "Hospital / service change", "Carer unavailable", "Schedule conflict"]),
      carer: pick(CARERS.filter((c) => c.office === o)).name, replacement: i % 4 === 3 ? null : pick(CARERS.filter((c) => c.office === o)).name, hours: pick([0.5, 0.75, 1]), recovered: i % 4 !== 3 });
  });
  return rows.sort((a, b) => a.time.localeCompare(b.time));
})();
export const ROSCOMMON_CLUSTER = { office: "Roscommon" as OfficeId, period: "07:00-09:00", cancellations: 11, recovered: 6, uncovered: 5, hoursAtRisk: 8.5 };

/* ------------------------------------------------------------------ */
/* Trends                                                               */
/* ------------------------------------------------------------------ */

export const WEEKS = ["17 Aug", "24 Aug", "31 Aug", "7 Sep", "14 Sep", "21 Sep", "28 Sep"];
export const COVERAGE_TREND = [94.1, 94.8, 95.3, 95.0, 95.9, 96.4, 96.2];
export const REQUESTED_TREND = [37210, 37480, 37620, 37900, 38110, 38290, 38460];
export const ALLOCATED_TREND = [35015, 35531, 35852, 36005, 36547, 36912, 36980];
export const CANCEL_WEEKLY = [521, 548, 562, 539, 574, 556, 543];
export const NEW_STARTERS_TREND = [4, 6, 3, 7, 5, 8, 9];
export const CANDIDATE_TREND = [118, 124, 109, 131, 138, 129, 146];
export const COMPLIANCE_TREND = [91.6, 92.1, 92.4, 92.0, 92.8, 93.2, 93.0];
export const HOURS_BY_DAY: [string, number, number][] = [["Mon", 5720, 5512], ["Tue", 5690, 5476], ["Wed", 5710, 5498], ["Thu", 5660, 5452], ["Fri", 5640, 5428], ["Sat", 5030, 4822], ["Sun", 5010, 4792]];

/* ------------------------------------------------------------------ */
/* Roster optimiser suggestions (always human-approved)                */
/* ------------------------------------------------------------------ */

export const HC24817_OPTIONS = [
  { id: "opt1", title: "Extend 3 part-time Castlebar carers", hours: 26, detail: "Three carers are contracted 30h and scheduled 22 to 24h. All compliant, all within 8 km.", carers: 3 },
  { id: "opt2", title: "Cross-cover from Westport pool", hours: 18, detail: "Two Westport carers have Tuesday and Thursday afternoon gaps. Adds 14 min average travel.", carers: 2 },
  { id: "opt3", title: "Fast-track Ahmed Hassan onboarding", hours: 12, detail: "Onboarding 5 of 8 complete. Induction Wednesday. Available from Monday if Garda result lands.", carers: 1 },
  { id: "opt4", title: "Split two long calls into AM/PM pairs", hours: 8, detail: "Two 3h calls can be covered by existing morning and evening runs with no new carer.", carers: 0 },
];

/* ------------------------------------------------------------------ */
/* Scheduler grid (a Galway slice for the week)                        */
/* ------------------------------------------------------------------ */

export type Block = { day: number; start: number; mins: number; kind: "visit" | "travel" | "unfilled" | "blocked" | "conflict"; label: string };
export const SCHED_DAYS = ["Mon 28", "Tue 29", "Wed 30", "Thu 1", "Fri 2", "Sat 3", "Sun 4"];

/* ------------------------------------------------------------------ */
/* Integrations                                                         */
/* ------------------------------------------------------------------ */

export const SYSTEMS = [
  { name: "Cezanne HR", status: "Connected", note: "Recruitment and applicant tracking. Previously referred to internally as Occupop.", sync: "4 min ago", usage: "14 new applications synced this morning" },
  { name: "Indeed", status: "Connected through recruitment workflow", note: "Applications arrive in Cezanne and flow into Pulse.", sync: "4 min ago", usage: "81 applicants this week" },
  { name: "Westcare Careers / Website", status: "Connected", note: "Careers page applications.", sync: "22 min ago", usage: "9 applicants this week" },
  { name: "GSW Training", status: "Connected", note: "Training records from GSW Recruitment & Training Solutions.", sync: "1 h ago", usage: "Training completions nightly" },
  { name: BRAND.careSystem, status: "Connected", note: "Rostered visits and check-in / check-out events.", sync: "1 min ago", usage: "126 visit events in the last sync" },
  { name: "HSE Care Requests", status: "Data feed / import", note: "Requested hours imported per care package.", sync: "06:00 today", usage: "161 active requests" },
  { name: "Email", status: "Connected", note: "Reminders, handoff packs and candidate follow-ups.", sync: "2 min ago", usage: "212 emails today" },
  { name: "Payroll System", status: "Export", note: "Verified payroll hours only. Held visits never export.", sync: "Fri 17:00", usage: "Weekly export" },
  { name: "Finance System", status: "Export", note: "Verified billable hours only.", sync: "Fri 17:00", usage: "Weekly export" },
];
