/* Rostering: HSE requested hours, the weekly scheduler, unfilled work, carer
   availability and roster exceptions. Roster Optimiser only suggests, using
   compliance status, qualifications, availability, area, existing roster,
   contracted hours and continuity. A coordinator approves every change. */
import { useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import {
  ALLOCATED_TREND, AOIFE, BRAND, AOIFE_UPCOMING_VISITS, CANCEL_TODAY, CARERS, CLIENTS, COMPLIANCE, COVERAGE_TREND, EXPIRED,
  HC24817, HC24817_OPTIONS, HOURS_BY_DAY, HSE_REQUESTS, K, LIAM, LIAM_UPCOMING_VISITS, NOW_MINS, OFFICES,
  REQUESTED_TREND, RESTRICTED_CARER_IDS, ROSCOMMON_CLUSTER, SCHED_DAYS, UNFILLED_TODAY, VISITS, WEEKS,
  fmt, fmtH, hhmm, minsLabel, officeOf, pct, type Carer, type Client, type HseRequest, type Office, type OfficeFilter, type OfficeId, type Visit,
} from "../model";
import { useWc, wc } from "../store";
import {
  AgentNote, Btn, Chip, Columns, Filters, GoLink, Grid, HumanGate, KpiStrip, Legend, ListRow, MONO, Page, Panel, RecLink,
  ScopeBar, SearchBox, Seg, Stack, Stat, Table, Timeline, Trend, TONE, byOffice, label, type Col, type Tone,
} from "../ui";

/* ------------------------------------------------------------------ */
/* Session state local to Rostering (offers, approvals, exception flow) */
/* ------------------------------------------------------------------ */

type Offer = { carerId: string; name: string; at: string };
type ExStatus = "Open" | "In progress" | "Awaiting reply" | "Resolved";
type Local = {
  offers: Record<string, Offer>;      /* visitId -> offered carer */
  moves: Record<string, Offer>;       /* schedule block id -> approved carer */
  decisions: Record<string, "approved" | "declined">;
  ex: Record<string, ExStatus>;
  selUnfilled: string | null;
};
let local: Local = { offers: {}, moves: {}, decisions: {}, ex: {}, selUnfilled: null };
const subs = new Set<() => void>();
const setLocal = (fn: (l: Local) => Partial<Local>) => { local = { ...local, ...fn(local) }; subs.forEach((f) => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
function useLocal(): Local { return useSyncExternalStore(subscribe, () => local, () => local); }
const clock = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const act = {
  offer: (visitId: string, c: Carer) => setLocal((l) => ({ offers: { ...l.offers, [visitId]: { carerId: c.id, name: c.name, at: clock() } } })),
  withdraw: (visitId: string) => setLocal((l) => { const o = { ...l.offers }; delete o[visitId]; return { offers: o }; }),
  move: (blockId: string, c: Carer) => setLocal((l) => ({ moves: { ...l.moves, [blockId]: { carerId: c.id, name: c.name, at: clock() } } })),
  decide: (id: string, d: "approved" | "declined") => setLocal((l) => ({ decisions: { ...l.decisions, [id]: d } })),
  undo: (sugId: string, visitId: string | undefined, blockId: string) => setLocal((l) => {
    const offers = { ...l.offers }, moves = { ...l.moves }, decisions = { ...l.decisions };
    if (visitId) delete offers[visitId];
    delete moves[blockId]; delete decisions[sugId];
    return { offers, moves, decisions };
  }),
  setEx: (id: string, st: ExStatus) => setLocal((l) => ({ ex: { ...l.ex, [id]: st } })),
  selectUnfilled: (id: string | null) => setLocal(() => ({ selUnfilled: id })),
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function seeded(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

const CLIENT_MAP = new Map<string, Client>(CLIENTS.map((c) => [c.id, c]));
const CARER_BY_NAME = new Map<string, Carer>(CARERS.map((c) => [c.name, c]));
const VISIT_MAP = new Map<string, Visit>(VISITS.map((v) => [v.id, v]));
const TODAY_BY_CARER = new Map<string, Visit[]>();
for (const v of VISITS) if (v.carerId) { const l = TODAY_BY_CARER.get(v.carerId) || []; l.push(v); TODAY_BY_CARER.set(v.carerId, l); }

const coord = (o: OfficeId) => officeOf(o).coordinator;
const isRestricted = (id: string, aoife: boolean) => RESTRICTED_CARER_IDS.has(id) || (aoife && id === AOIFE.id);
const officesIn = (f: OfficeFilter): Office[] => (f === "All" ? OFFICES : OFFICES.filter((o) => o.id === f));
const sumBy = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const span = (start: number, mins: number) => hhmm(start) + "-" + hhmm(start + mins);
const byName = (a: Carer, b: Carer) => a.name.localeCompare(b.name);
const h1 = (n: number) => fmtH(n) + "h";
const carerLink = (c: Carer) => <RecLink to={{ kind: "carer", id: c.id }}>{c.name}</RecLink>;
const nameLink = (name: string) => { const c = CARER_BY_NAME.get(name); return c ? carerLink(c) : <span>{name}</span>; };

/** Split a total across weights so the parts sum exactly (for pro-rating a network series to one office). */
function prorate(values: number[], total: number): number[] {
  const s = values.reduce((a, b) => a + b, 0) || 1;
  const parts = values.map((v) => Math.round((v * total) / s));
  parts[parts.length - 1] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

/* Unfilled queue: the model's unfilled visits, plus Aoife's four when her PMH lapses. */
type QItem = { v: Visit; flag: "cluster" | "aoife" | null };
function unfilledQueue(office: OfficeFilter, aoife: boolean): QItem[] {
  const base: QItem[] = byOffice(UNFILLED_TODAY, office).map((v) => ({ v, flag: v.cancelledFrom ? "cluster" : null }));
  const ao: QItem[] = aoife && (office === "All" || office === "Galway") ? AOIFE_UPCOMING_VISITS.map((v) => ({ v, flag: "aoife" })) : [];
  return base.concat(ao);
}

/* Eligible cover for a visit. Only permitted criteria: same office, compliance
   status, qualification, availability today, area, contracted vs scheduled
   hours, continuity with the client. Nothing about the person. */
type Elig = { c: Carer; continuity: boolean; area: boolean; open: number; reasons: string[] };
const ELIG_CACHE = new Map<string, Elig[]>();
function eligibleFor(v: Visit, aoife: boolean): Elig[] {
  const key = v.id + (aoife ? ":a" : "");
  const hit = ELIG_CACHE.get(key);
  if (hit) return hit;
  const cl = CLIENT_MAP.get(v.client);
  const out: Elig[] = [];
  for (const c of CARERS) {
    if (c.office !== v.office || c.id === v.carerId || !c.availableToday || isRestricted(c.id, aoife) || !c.qqi) continue;
    const open = c.contracted - c.scheduledWeek;
    if (open * 60 < v.mins) continue;
    const area = !!cl && cl.area === c.area;
    const mine = TODAY_BY_CARER.get(c.id) || [];
    /* rostered carers stay in their own area; carers free all day can drive over */
    if (!area && (!c.drives || mine.length > 0)) continue;
    if (mine.some((x) => x.start < v.start + v.mins + 30 && v.start < x.start + x.mins + 30)) continue;
    /* daily load stays within a fifth of contracted hours plus 30 min */
    if ((sumBy(mine, (x) => x.mins) + v.mins) / 60 > c.contracted / 5 + 0.5) continue;
    const continuity = !!cl && cl.carers.includes(c.name);
    const reasons = [
      continuity ? "Has visited this client before" : "",
      v.requiredSkill === "Manual Handling" ? "Compliant, manual handling valid" : "Compliant",
      c.rosteredToday ? "Free " + span(v.start - 30, v.mins + 60) : "Available today, not rostered",
      area ? "Based in " + c.area : "Based in " + c.area + ", drives",
      c.scheduledWeek + "h of " + c.contracted + "h contracted",
    ].filter(Boolean);
    out.push({ c, continuity, area, open, reasons });
  }
  out.sort((a, b) => Number(b.continuity) - Number(a.continuity) || Number(b.area) - Number(a.area) || b.open - a.open || a.c.name.localeCompare(b.c.name));
  ELIG_CACHE.set(key, out);
  return out;
}
/** Drop carers already offered an overlapping visit this session. */
function notDoubleOffered(list: Elig[], v: Visit, offers: Record<string, Offer>): Elig[] {
  const taken = Object.entries(offers).filter(([vid]) => vid !== v.id).map(([vid, o]) => ({ o, x: VISIT_MAP.get(vid) }))
    .filter((t) => t.x && t.x.start < v.start + v.mins + 20 && v.start < t.x.start + t.x.mins + 20).map((t) => t.o.carerId);
  return list.filter((e) => !taken.includes(e.c.id));
}

/* ------------------------------------------------------------------ */
/* Scheduler model (deterministic, generated from model data)          */
/* ------------------------------------------------------------------ */

type Kind = "visit" | "travel" | "available" | "unfilled" | "blocked" | "conflict" | "off" | "pending";
type SBlock = {
  id: string; row: string; day: number; start: number; mins: number; kind: Kind; label: string;
  client?: string; visitId?: string; skill?: string; note?: string; ctype?: "Double booking" | "Travel conflict"; moveId?: string;
};
type Sched = { office: OfficeId; carers: Carer[]; blocks: SBlock[] };
const T0 = 7 * 60, T1 = 23 * 60, SPAN = T1 - T0;
const OPEN_ROW = "open";
/* Synthetic conflicts per office: [double bookings tomorrow, travel conflicts today]. Liam's double booking is real model data. */
const SYNTH: Record<OfficeId, [number, number]> = { Galway: [1, 1], Mayo: [1, 0], Sligo: [0, 1], Roscommon: [0, 0], Cavan: [0, 0], Monaghan: [0, 1] };
const SCHED_CACHE = new Map<OfficeId, Sched>();

function buildSchedule(office: OfficeId): Sched {
  const hit = SCHED_CACHE.get(office);
  if (hit) return hit;
  const r = seeded(hash("sched-" + office));
  const pick = <T,>(l: readonly T[]): T => l[Math.floor(r() * l.length)];
  const pool = CARERS.filter((c) => c.office === office);
  const story = pool.filter((c) => c.story);
  const restricted = pool.filter((c) => !c.story && RESTRICTED_CARER_IDS.has(c.id)).slice(0, 1);
  const off = pool.filter((c) => !c.story && !c.availableToday && !RESTRICTED_CARER_IDS.has(c.id)).slice(0, 1);
  const spare = pool.filter((c) => !c.story && c.availableToday && !c.rosteredToday && !RESTRICTED_CARER_IDS.has(c.id)).slice(0, 2);
  const need = 15 - story.length - restricted.length - off.length - spare.length;
  const rostered = pool.filter((c) => !c.story && c.rosteredToday && !RESTRICTED_CARER_IDS.has(c.id)).slice(0, need).sort(byName);
  const carers = [...story, ...rostered, ...spare, ...off, ...restricted];
  const cls = CLIENTS.filter((c) => c.office === office);
  const skillOf = (cl: Client) => (cl.service === "Personal Care" ? "Manual Handling" : cl.service === "Night Support" ? "Night support" : "Standard");

  const blocks: SBlock[] = [];
  let seq = 0;
  const add = (b: Omit<SBlock, "id">): SBlock => { const x = { ...b, id: office + "-" + ++seq }; blocks.push(x); return x; };

  for (const c of carers) {
    const cr = seeded(hash("carer-" + c.id));
    const cp = <T,>(l: readonly T[]): T => l[Math.floor(cr() * l.length)];
    const k = 1 + Math.floor(cr() * 5);
    const offDays = new Set([k, k + 1]);
    const perDay = Math.max(120, Math.round((c.scheduledWeek * 60) / 5 / 15) * 15);
    const openDay = Math.max(0, Math.round(((c.contracted - c.scheduledWeek) * 60) / 5 / 30) * 30);
    const restr = COMPLIANCE.find((i) => i.carerId === c.id && (i.status === "Expired" || i.status === "Missing" || i.status === "Awaiting verification"));
    for (let d = 0; d < 7; d++) {
      if (offDays.has(d)) { add({ row: c.id, day: d, start: T0, mins: SPAN, kind: "off", label: "Day off" }); continue; }
      if (restr) { add({ row: c.id, day: d, start: 8 * 60, mins: 12 * 60, kind: "blocked", label: "Restricted", note: restr.requirement + ": " + restr.status.toLowerCase() + ". Not rosterable until resolved." }); continue; }
      if (d === 0 && !c.availableToday) { add({ row: c.id, day: 0, start: T0, mins: SPAN, kind: "off", label: c.unavailableReason || "Unavailable" }); continue; }
      if (d === 0 && !c.rosteredToday) { add({ row: c.id, day: 0, start: 8 * 60, mins: 8 * 60, kind: "available", label: "Available, not rostered" }); continue; }
      let t = T0 + cp([0, 15, 30, 45, 60, 90]);
      let left = perDay;
      const run = (until: number, end: number) => {
        let done = 0;
        while (done < until && left > 0) {
          const mins = Math.min(cp([30, 45, 45, 60, 60, 90]), Math.max(30, left));
          if (t + mins > end) break;
          const cl = cp(cls);
          add({ row: c.id, day: d, start: t, mins, kind: "visit", label: cl.id, client: cl.id, skill: skillOf(cl) });
          t += mins; done += mins; left -= mins;
          if (done < until && left > 0) { const tr = cp([10, 15, 15, 20, 25]); add({ row: c.id, day: d, start: t, mins: tr, kind: "travel", label: "Travel " + tr + " min" }); t += tr; }
        }
      };
      run(Math.round(perDay * (0.5 + cr() * 0.2)), 13 * 60 + 30);
      let resume = t + 120;
      if (openDay >= 30) {
        const s = t + 30, m = Math.min(openDay, 150);
        add({ row: c.id, day: d, start: s, mins: m, kind: "available", label: "Available" });
        resume = Math.max(resume, s + m + 15);
      }
      t = Math.max(resume, 16 * 60 + cp([0, 30, 60]));
      run(left, 22 * 60 + 30);
    }
  }

  /* Story carers today use their real visits from the model. */
  const merge = (c: Carer, list: Visit[]) => {
    const from = Math.min(...list.map((v) => v.start)) - 30;
    for (let i = blocks.length - 1; i >= 0; i--) { const b = blocks[i]; if (b.row === c.id && b.day === 0 && b.start + b.mins > from) blocks.splice(i, 1); }
    const sorted = list.slice().sort((a, b) => a.start - b.start);
    sorted.forEach((v, i) => {
      const prev = sorted[i - 1];
      const clash = !!prev && prev.start + prev.mins > v.start;
      add({ row: c.id, day: 0, start: v.start, mins: v.mins, kind: clash ? "conflict" : "visit", label: v.client, client: v.client, visitId: v.id, skill: v.requiredSkill,
        ctype: clash ? "Double booking" : undefined, note: clash ? "Overlaps " + prev.id + " (" + span(prev.start, prev.mins) + ") for the same carer" : undefined });
    });
  };
  if (office === "Galway") merge(AOIFE, AOIFE_UPCOMING_VISITS);
  if (office === "Sligo") merge(LIAM, LIAM_UPCOMING_VISITS);

  /* Synthetic conflicts on ordinary rostered carers. */
  const [nd, nt] = SYNTH[office];
  const cands = rostered.slice(2);
  let ci = 0;
  for (let i = 0; i < nd; i++) {
    for (let tries = 0; tries < cands.length; tries++) {
      const c = cands[ci++ % cands.length];
      const base = blocks.filter((b) => b.row === c.id && b.day === 1 && b.kind === "visit").sort((a, b) => b.start - a.start)[0];
      if (!base) continue;
      const cl = pick(cls);
      const x = add({ row: c.id, day: 1, start: base.start + 15, mins: 45, kind: "conflict", ctype: "Double booking", label: cl.id, client: cl.id, skill: skillOf(cl), note: "Overlaps " + base.label + " (" + span(base.start, base.mins) + ") for the same carer" });
      x.moveId = x.id;
      break;
    }
  }
  for (let i = 0; i < nt; i++) {
    for (let tries = 0; tries < cands.length; tries++) {
      const c = cands[ci++ % cands.length];
      const tr = blocks.find((b) => b.row === c.id && b.day === 0 && b.kind === "travel" && b.start >= NOW_MINS);
      if (!tr) continue;
      const next = blocks.filter((b) => b.row === c.id && b.day === 0 && b.kind === "visit" && b.start >= tr.start + tr.mins).sort((a, b) => a.start - b.start)[0];
      if (!next) continue;
      const needs = tr.mins + 15 + Math.floor(r() * 3) * 5;
      Object.assign(tr, { kind: "conflict", ctype: "Travel conflict", label: "Travel", moveId: next.id, note: "Next visit " + next.label + " needs " + needs + " min travel, " + tr.mins + " min allowed" });
      break;
    }
  }

  /* Open shifts lane: today's real unfilled visits, then generated ones for the rest of the week. */
  for (const v of UNFILLED_TODAY.filter((x) => x.office === office)) {
    add({ row: OPEN_ROW, day: 0, start: v.start, mins: v.mins, kind: "unfilled", label: v.client, client: v.client, visitId: v.id, skill: v.requiredSkill, note: v.cancelledFrom ? "From " + v.cancelledFrom : undefined });
  }
  const o = officeOf(office);
  for (let d = 1; d < 7; d++) {
    const n = Math.max(1, o.unfilled24 - 2 + Math.floor(r() * 5));
    for (let i = 0; i < n; i++) {
      const cl = pick(cls);
      add({ row: OPEN_ROW, day: d, start: 12 * 60 + Math.floor(r() * 36) * 15, mins: pick([30, 45, 60, 90]), kind: "unfilled", label: cl.id, client: cl.id, skill: skillOf(cl) });
    }
  }
  const out = { office, carers, blocks };
  SCHED_CACHE.set(office, out);
  return out;
}

/** Apply session state: Aoife's restriction, approved offers and moves. */
function effective(s: Sched, aoife: boolean, l: Local): SBlock[] {
  const rows = new Set(s.carers.map((c) => c.id));
  const out: SBlock[] = [];
  for (const b0 of s.blocks) {
    let b = b0;
    if (aoife && b.row === AOIFE.id && b.kind === "visit" && b.skill === "Manual Handling" && (b.day > 0 || b.start >= NOW_MINS)) {
      b = { ...b, kind: "blocked", note: "Patient Manual Handling expired. Needs reassignment." };
    }
    const to = (b.visitId ? l.offers[b.visitId] : undefined) || l.moves[b.id];
    if (to && b.kind !== "travel") {
      if (rows.has(to.carerId)) out.push({ ...b, row: to.carerId, kind: "pending", note: "Approved " + to.at + ", awaiting carer confirmation" });
      else out.push({ ...b, kind: "pending", note: "Offered to " + to.name + " at " + to.at + ", awaiting reply" });
      continue;
    }
    if (b.kind === "conflict" && b.ctype === "Travel conflict" && b.moveId && l.moves[b.moveId]) b = { ...b, kind: "travel", label: "Travel " + b.mins + " min", note: undefined };
    out.push(b);
  }
  return out;
}

const KIND: Record<Kind, { name: string; bg: string; border: string; ink: string }> = {
  visit: { name: "Assigned visit", bg: "var(--accent-soft)", border: "1px solid var(--accent-line)", ink: "var(--ink)" },
  travel: { name: "Travel", bg: "repeating-linear-gradient(90deg,var(--neutral) 0 2px,transparent 2px 5px)", border: "0", ink: "var(--dim)" },
  available: { name: "Available", bg: "var(--ok-soft)", border: "1px dashed var(--ok)", ink: "var(--ok)" },
  unfilled: { name: "Unfilled shift", bg: "var(--bad-soft)", border: "1px dashed var(--bad)", ink: "var(--bad)" },
  blocked: { name: "Compliance block", bg: "repeating-linear-gradient(135deg,var(--bad-soft) 0 5px,transparent 5px 10px)", border: "1px solid var(--bad)", ink: "var(--bad)" },
  conflict: { name: "Schedule conflict", bg: "var(--warn-soft)", border: "1px solid var(--warn)", ink: "var(--warn)" },
  off: { name: "Leave or day off", bg: "repeating-linear-gradient(135deg,var(--track) 0 4px,transparent 4px 8px)", border: "0", ink: "var(--faint)" },
  pending: { name: "Approved, awaiting carer", bg: "var(--info-soft)", border: "1px dashed var(--info)", ink: "var(--info)" },
};
const LEGEND_ORDER: Kind[] = ["visit", "travel", "available", "unfilled", "conflict", "blocked", "pending", "off"];
const px = (m: number) => ((Math.max(T0, Math.min(T1, m)) - T0) / SPAN) * 100 + "%";

function BlockEl({ b, labels, selected, onSel }: { b: SBlock; labels: boolean; selected: boolean; onSel: (b: SBlock) => void }) {
  const k = KIND[b.kind];
  const thin = b.kind === "travel" || (b.kind === "conflict" && b.ctype === "Travel conflict");
  const w = (b.mins / SPAN) * 100;
  const title = k.name + ": " + span(b.start, b.mins) + (b.kind === "off" || b.kind === "blocked" ? " " + b.label : b.client ? " " + b.client : "") + (b.note ? ". " + b.note : "");
  return (
    <button title={title} aria-label={title} onClick={(e) => { e.stopPropagation(); onSel(b); }}
      style={{ position: "absolute", left: px(b.start), width: "calc(" + w + "% - 1px)", top: thin ? "38%" : 3, bottom: thin ? "38%" : 3, padding: labels && !thin ? "0 5px" : 0, margin: 0,
        background: k.bg, border: k.border, borderRadius: 4, color: k.ink, cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", textAlign: "left",
        font: "inherit", fontFamily: MONO, fontSize: 10, whiteSpace: "nowrap", outline: selected ? "2px solid var(--ink)" : "none", outlineOffset: 1, zIndex: selected ? 2 : 1 }}>
      {labels && !thin && b.mins >= 60 && b.label}
    </button>
  );
}

function Track({ items, height, labels, today, sel, onSel, empty }: { items: SBlock[]; height: number; labels: boolean; today: boolean; sel: string | null; onSel: (b: SBlock) => void; empty?: ReactNode }) {
  return (
    <div style={{ position: "relative", height, background: "var(--surface-faint)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
      {labels && Array.from({ length: 15 }, (_, i) => <span key={i} style={{ position: "absolute", top: 0, bottom: 0, left: px(T0 + (i + 1) * 60), width: 1, background: "var(--border)" }} />)}
      {today && <span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: px(NOW_MINS), background: "var(--track)", opacity: 0.45 }} />}
      {items.map((b) => <BlockEl key={b.id} b={b} labels={labels} selected={sel === b.id} onSel={onSel} />)}
      {today && <span style={{ position: "absolute", top: 0, bottom: 0, left: px(NOW_MINS), width: 2, background: "var(--accent)", zIndex: 3 }} />}
      {items.length === 0 && empty && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, color: "var(--faint)" }}>{empty}</span>}
    </div>
  );
}

function pack(items: SBlock[]): SBlock[][] {
  const lanes: SBlock[][] = [];
  for (const b of items.slice().sort((a, c) => a.start - c.start)) {
    const lane = lanes.find((l) => l[l.length - 1].start + l[l.length - 1].mins <= b.start);
    if (lane) lane.push(b); else lanes.push([b]);
  }
  return lanes;
}

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                  */
/* ------------------------------------------------------------------ */

function MiniHead({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 8px" }}><div style={{ ...label, flex: 1 }}>{children}</div>{right}</div>;
}
function Meter({ parts, height = 8 }: { parts: { value: number; color: string }[]; height?: number }) {
  return <Stack parts={parts} height={height} />;
}
const note: CSSProperties = { fontSize: 11.5, color: "var(--faint)", lineHeight: 1.5 };

/* ------------------------------------------------------------------ */
/* Overview                                                             */
/* ------------------------------------------------------------------ */

function Overview() {
  const s = useWc();
  const office = s.office;
  const aoife = s.aoifeExpired;
  const offs = officesIn(office);
  const req = sumBy(offs, (o) => o.reqHours), alloc = sumBy(offs, (o) => o.allocHours), gap = req - alloc;
  const carers = byOffice(CARERS, office);
  const rostered = carers.filter((c) => c.availableToday && c.rosteredToday).length;
  const available = carers.filter((c) => c.availableToday && !c.rosteredToday).length;
  const unavailable = carers.filter((c) => !c.availableToday).length;
  const queue = unfilledQueue(office, aoife);
  const qHours = sumBy(queue, (q) => q.v.mins) / 60;
  const reqs = byOffice(HSE_REQUESTS, office);
  const gaps = reqs.filter((r) => r.gap > 0).sort((a, b) => b.gap - a.gap);
  const all = office === "All";

  /* capacity: weekly gap vs open contracted hours of compliant carers */
  const openOf = (list: Carer[]) => sumBy(list.filter((c) => !isRestricted(c.id, aoife)), (c) => Math.max(0, c.contracted - c.scheduledWeek));
  const capRows = all
    ? OFFICES.map((o) => ({ key: o.id, name: <RecLink to={{ kind: "office", id: o.id }}>{o.id}</RecLink>, gap: o.reqHours - o.allocHours, open: openOf(CARERS.filter((c) => c.office === o.id)), meta: o.id === "Mayo" ? "incl. HC-24817 64h" : o.areas.length + " areas" }))
    : Array.from(new Set(gaps.map((g) => g.region))).map((region) => {
        const g = sumBy(gaps.filter((x) => x.region === region), (x) => x.gap);
        const inArea = CARERS.filter((c) => c.office === office && c.area === region.replace(" North", ""));
        return { key: region, name: <span>{region}</span>, gap: g, open: openOf(inArea), meta: inArea.length + " carers based here" };
      });
  capRows.sort((a, b) => b.gap - a.gap);
  const capMax = Math.max(1, ...capRows.map((r) => Math.max(r.gap, r.open)));

  const days = HOURS_BY_DAY.map((d) => d[0]);
  const dayReq = all ? HOURS_BY_DAY.map((d) => d[1]) : prorate(HOURS_BY_DAY.map((d) => d[1]), req);
  const dayAlloc = all ? HOURS_BY_DAY.map((d) => d[2]) : prorate(HOURS_BY_DAY.map((d) => d[2]), alloc);

  const byArea = all ? null : Array.from(new Set(reqs.map((r) => r.region))).map((region) => {
    const rs = reqs.filter((r) => r.region === region);
    return { region, req: sumBy(rs, (r) => r.weeklyHours), alloc: sumBy(rs, (r) => r.assigned) };
  }).sort((a, b) => b.req - a.req);

  const reasons = Array.from(carers.filter((c) => !c.availableToday).reduce((m, c) => m.set(c.unavailableReason || "Unavailable", (m.get(c.unavailableReason || "Unavailable") || 0) + 1), new Map<string, number>()));
  reasons.sort((a, b) => b[1] - a[1]);

  return (
    <>
      <ScopeBar title="Rostering overview" sub="HSE requested hours against allocated hours this week, carers available today, and where the unfilled hours sit." />
      <KpiStrip items={[
        { label: "Requested hours / week", value: fmt(req), sub: reqs.length + " HSE requests", onClick: () => wc.setSub("Rostering", "HSE Requests") },
        { label: "Allocated hours", value: fmt(alloc), sub: fmt(sumBy(reqs, (r) => r.assigned)) + "h assigned to carers" },
        { label: "Unfilled hours", value: fmt(gap), tone: "bad", sub: gaps.length + " requests with a gap", onClick: () => wc.setSub("Rostering", "HSE Requests") },
        { label: "Coverage", value: pct(alloc, req), tone: alloc / req >= 0.96 ? "ok" : "warn", sub: all ? "Up from " + COVERAGE_TREND[0] + "% in 7 weeks" : "Network " + K.coverage, spark: all ? COVERAGE_TREND : undefined },
        { label: "Carers available today", value: available, sub: rostered + " rostered, " + unavailable + " unavailable", onClick: () => wc.setSub("Rostering", "Availability") },
        { label: "Unfilled visits today", value: queue.length, tone: "bad", sub: h1(qHours) + " of care" + (aoife && (all || office === "Galway") ? ", incl. 4 of Aoife's" : ""), onClick: () => wc.setSub("Rostering", "Unfilled Hours") },
      ]} />

      <Grid cols="minmax(0,1.35fr) minmax(0,1fr)">
        <Panel title={all ? "Hours by office" : "Hours by area · " + office} meta="Requested vs allocated, this week"
          action={<span style={{ display: "flex", gap: 12 }}><Legend color="var(--accent)">Requested</Legend><Legend color="var(--neutral)">Allocated</Legend></span>}>
          {all
            ? <Columns labels={OFFICES.map((o) => o.id)} series={[OFFICES.map((o) => o.reqHours), OFFICES.map((o) => o.allocHours)]} height={190} fmtValue={(n) => fmt(n) + "h"} />
            : <Columns labels={(byArea || []).map((a) => a.region)} series={[(byArea || []).map((a) => a.req), (byArea || []).map((a) => a.alloc)]} height={190} fmtValue={(n) => fmt(n) + "h"} />}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(" + (all ? 6 : Math.min(6, (byArea || []).length || 1)) + ",minmax(0,1fr))", gap: 6, marginTop: 10 }}>
            {(all ? OFFICES.map((o) => ({ k: o.id, g: o.reqHours - o.allocHours, c: pct(o.allocHours, o.reqHours) })) : (byArea || []).slice(0, 6).map((a) => ({ k: a.region, g: a.req - a.alloc, c: pct(a.alloc, a.req) }))).map((x) => (
              <div key={x.k} style={{ textAlign: "center", fontSize: 11, color: "var(--dim)" }}>
                <div style={{ fontFamily: MONO, color: x.g > 0 ? "var(--bad)" : "var(--ok)" }}>{x.g > 0 ? "-" + fmt(x.g) + "h" : "0h"}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--faint)", marginTop: 2 }}>{x.c}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={all ? "Over and under capacity" : "Gap by area · geographic coverage"} meta="Weekly unfilled hours against open contracted hours of compliant carers">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {capRows.length === 0 && <div style={note}>No unfilled hours in {office} this week.</div>}
            {capRows.map((r) => {
              const short = r.gap - r.open;
              return (
                <div key={r.key} style={{ display: "grid", gridTemplateColumns: "minmax(80px,120px) minmax(0,1fr) 108px", gap: 12, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5 }}>{r.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.meta}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 8, background: "var(--track)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: (100 * r.gap) / capMax + "%", background: "var(--bad)", borderRadius: 3, transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} /></div>
                      <span style={{ fontFamily: MONO, fontSize: 11, width: 44, textAlign: "right" }}>{fmt(r.gap)}h</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: "var(--track)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: (100 * r.open) / capMax + "%", background: "var(--ok)", borderRadius: 3, transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} /></div>
                      <span style={{ fontFamily: MONO, fontSize: 10.5, width: 44, textAlign: "right", color: "var(--dim)" }}>{fmt(r.open)}h</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>{short > 0 ? <Chip tone="bad">Short {fmt(short)}h</Chip> : <Chip tone="ok">Can absorb</Chip>}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 10 }}><Legend color="var(--bad)">Unfilled hours / week</Legend><Legend color="var(--ok)">Open contracted hours</Legend></div>
        </Panel>
      </Grid>

      <Grid cols="minmax(0,1fr) minmax(0,1.15fr) minmax(0,.9fr)">
        <Panel title="Hours by day" meta={all ? "Requested vs allocated, this week" : "Network daily profile, pro-rated to " + office}>
          <Columns labels={days} series={[dayReq, dayAlloc]} height={150} fmtValue={(n) => fmt(n) + "h"} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 6, marginTop: 8 }}>
            {days.map((d, i) => <div key={d} style={{ textAlign: "center", fontFamily: MONO, fontSize: 10, color: "var(--bad)" }}>-{fmt(dayReq[i] - dayAlloc[i])}</div>)}
          </div>
          <div style={{ ...note, marginTop: 8 }}>Weekend demand drops about 12%, but allocation drops with it. Gap per day holds near {fmt(Math.round(gap / 7))}h.</div>
        </Panel>
        <Panel title="Coverage trend" meta={(all ? "All offices" : "Network context, all offices") + ", last 7 weeks"}>
          <Trend labels={WEEKS} series={[{ name: "Requested", values: REQUESTED_TREND }, { name: "Allocated", values: ALLOCATED_TREND }]} height={130} fmtValue={(n) => fmt(n) + "h"} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4, marginTop: 10 }}>
            {COVERAGE_TREND.map((c, i) => (
              <div key={i} style={{ textAlign: "center", padding: "5px 0", borderRadius: 6, background: i === COVERAGE_TREND.length - 1 ? "var(--accent-faint)" : "var(--surface-2)", fontFamily: MONO, fontSize: 10.5, color: c >= 96 ? "var(--ok)" : "var(--body)" }}>{c}%</div>
            ))}
          </div>
        </Panel>
        <Panel title="Carers today" meta={carers.length + " active carers" + (all ? "" : " in " + office)}>
          <Stack parts={[{ value: rostered, color: "var(--accent)", label: "Rostered" }, { value: available, color: "var(--ok)", label: "Available" }, { value: unavailable, color: "var(--bad)", label: "Unavailable" }]} height={12} showLabels />
          <MiniHead>Unavailable today</MiniHead>
          {reasons.map(([r, n]) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
              <span style={{ flex: 1, color: "var(--body)" }}>{r}</span><span style={{ fontFamily: MONO, color: "var(--ink)" }}>{n}</span>
            </div>
          ))}
          <div style={{ marginTop: "auto", paddingTop: 10 }}><GoLink page="Rostering" sub="Availability">Availability heatmap</GoLink></div>
        </Panel>
      </Grid>

      <Grid cols="minmax(0,1.55fr) minmax(0,1fr)">
        {all || office === "Mayo" ? <HC24817Card /> : (
          <Panel title={"Unfilled visits today · " + office} meta="By start time. Cover is offered by the coordinator." action={<GoLink page="Rostering" sub="Unfilled Hours">Find cover</GoLink>}>
            {queue.length === 0 ? <div style={note}>Every visit in {office} is covered today.</div> : (
              <Timeline items={queue.slice().sort((a, b) => a.v.start - b.v.start).map((q) => ({
                when: span(q.v.start, q.v.mins), tone: q.flag === "aoife" ? "bad" as Tone : q.flag === "cluster" ? "warn" as Tone : "bad" as Tone,
                who: q.v.requiredSkill,
                text: <span><RecLink to={{ kind: "visit", id: q.v.id }}>{q.v.id}</RecLink> for <RecLink to={{ kind: "client", id: q.v.client }}>{q.v.client}</RecLink>{q.flag === "cluster" ? ", Roscommon cancellation cluster" : q.flag === "aoife" ? ", Aoife Byrne restricted" : ""}. {eligibleFor(q.v, aoife).length} eligible carers.</span>,
              }))} />
            )}
          </Panel>
        )}
        <Panel title="Uncovered work" meta={gaps.length + " HSE requests carry " + fmt(gap) + "h unallocated"} action={<GoLink page="Rostering" sub="HSE Requests">All requests</GoLink>}>
          {gaps.slice(0, 7).map((r) => (
            <ListRow key={r.id} title={<span><RecLink to={{ kind: "hse", id: r.id }}>{r.id}</RecLink> <span style={{ color: "var(--dim)" }}>{r.office} · {r.region}</span></span>}
              meta={r.service + " · " + r.assigned + "h of " + r.weeklyHours + "h allocated"}
              right={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: MONO, fontSize: 12, color: "var(--bad)" }}>{r.gap}h</span><Chip status={r.status} /></span>} />
          ))}
          {gaps.length > 7 && <div style={{ ...note, paddingTop: 8, borderTop: "1px solid var(--border)" }}>{gaps.length - 7} more requests with smaller gaps.</div>}
        </Panel>
      </Grid>
    </>
  );
}

function HC24817Card() {
  const s = useWc();
  const approvedH = sumBy(HC24817_OPTIONS.filter((o) => s.rosterDecisions[o.id] === "approved"), (o) => o.hours);
  const decided = HC24817_OPTIONS.filter((o) => s.rosterDecisions[o.id]).length;
  const remaining = Math.max(0, HC24817.gap - approvedH);
  return (
    <Panel title={<span>HC-24817 · Castlebar North capacity gap</span>} meta="Mayo · Home Support · 14 clients · cohort" tone="bad"
      action={<span style={{ display: "flex", gap: 8, alignItems: "center" }}><Chip status={HC24817.status} /><RecLink to={{ kind: "hse", id: HC24817.id }} style={{ fontSize: 12 }}>Open request</RecLink></span>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
        <Stat k="Required / week" v={HC24817.weeklyHours + "h"} />
        <Stat k="Allocated" v={HC24817.assigned + "h"} />
        <Stat k="Unfilled" v={HC24817.gap + "h"} tone="bad" />
        <Stat k="Approved options" v={approvedH + "h of " + HC24817.gap + "h"} tone={approvedH >= HC24817.gap ? "ok" : approvedH ? "warn" : undefined} />
      </div>
      <div style={{ marginTop: 10 }}>
        <Meter height={10} parts={[{ value: HC24817.assigned, color: "var(--accent)" }, { value: Math.min(approvedH, HC24817.gap), color: "var(--info)" }, { value: remaining, color: "var(--bad)" }]} />
        <div style={{ display: "flex", gap: 14, marginTop: 7, flexWrap: "wrap" }}>
          <Legend color="var(--accent)">Allocated {HC24817.assigned}h</Legend><Legend color="var(--info)">Approved, pending roster {Math.min(approvedH, HC24817.gap)}h</Legend><Legend color="var(--bad)">Still open {remaining}h</Legend>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <AgentNote agent="Roster Optimiser" state={decided === HC24817_OPTIONS.length ? "done" : "working"}>
          Prepared 4 coverage options for Sean Doyle using compliance status, contracted vs scheduled hours, availability, area and existing runs. Together they cover {sumBy(HC24817_OPTIONS, (o) => o.hours)}h of the {HC24817.gap}h gap. Nothing is rostered until a coordinator approves.
        </AgentNote>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 10 }}>
        {HC24817_OPTIONS.map((o) => {
          const d = s.rosterDecisions[o.id];
          return (
            <div key={o.id} style={{ padding: "11px 12px", background: d === "approved" ? "var(--ok-soft)" : "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", opacity: d === "declined" ? 0.6 : 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{o.title}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ok)" }}>+{o.hours}h</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--dim)", lineHeight: 1.45 }}>{o.detail}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: "auto" }}>
                <span style={{ fontSize: 11, color: "var(--faint)", flex: 1 }}>{o.carers ? o.carers + " carer" + (o.carers > 1 ? "s" : "") : "No new carer"}</span>
                {d ? <Chip tone={d === "approved" ? "ok" : "neutral"}>{d === "approved" ? "Approved" : "Declined"}</Chip> : (
                  <>
                    <Btn kind="primary" onClick={() => wc.decideRoster(o.id, "approved", o.title)} style={{ height: 26, padding: "0 10px" }}>Approve</Btn>
                    <Btn kind="quiet" onClick={() => wc.decideRoster(o.id, "declined", o.title)} style={{ height: 26, padding: "0 8px" }}>Decline</Btn>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <HumanGate>Suggestions only. Sean Doyle approves each option; carers confirm before anything is rostered.</HumanGate>
        <span style={{ flex: 1 }} />
        <GoLink page="Recruitment" sub="Handoffs">Ahmed Hassan onboarding</GoLink>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* HSE Requests                                                         */
/* ------------------------------------------------------------------ */

type HseFilter = "all" | "gap" | "full";
function HseRequests() {
  const s = useWc();
  const [f, setF] = useState<HseFilter>("all");
  const [q, setQ] = useState("");
  const scoped = byOffice(HSE_REQUESTS, s.office);
  const withGap = scoped.filter((r) => r.gap > 0);
  const full = scoped.filter((r) => r.gap === 0);
  const rows = useMemo(() => {
    const base = f === "gap" ? withGap : f === "full" ? full : scoped;
    const needle = q.trim().toLowerCase();
    const hit = needle ? base.filter((r) => (r.id + " " + r.region + " " + r.client + " " + r.service + " " + r.office).toLowerCase().includes(needle)) : base;
    return hit.slice().sort((a, b) => Number(b.id === "HC-24817") - Number(a.id === "HC-24817") || b.gap - a.gap || a.id.localeCompare(b.id));
  }, [f, q, s.office]); // eslint-disable-line react-hooks/exhaustive-deps
  const req = sumBy(scoped, (r) => r.weeklyHours), asg = sumBy(scoped, (r) => r.assigned), gap = sumBy(scoped, (r) => r.gap);
  const capGap = withGap.filter((r) => r.status === "Capacity Gap");
  const partial = withGap.filter((r) => r.status !== "Capacity Gap");

  const cols: Col<HseRequest>[] = [
    { key: "id", label: "Request ID", w: "104px", mono: true, sort: (r) => r.id, render: (r) => <RecLink to={{ kind: "hse", id: r.id }}>{r.id}</RecLink> },
    { key: "office", label: "Office", w: "92px", sort: (r) => r.office },
    { key: "region", label: "Region", w: "minmax(110px,1fr)", sort: (r) => r.region },
    { key: "client", label: "Client identifier", w: "minmax(120px,1fr)", mono: true },
    { key: "service", label: "Service type", w: "118px", sort: (r) => r.service },
    { key: "weekly", label: "Weekly hours", w: "96px", align: "right", mono: true, sort: (r) => r.weeklyHours, render: (r) => fmt(r.weeklyHours) },
    { key: "start", label: "Start date", w: "90px", mono: true, render: (r) => r.start },
    { key: "assigned", label: "Assigned", w: "84px", align: "right", mono: true, sort: (r) => r.assigned, render: (r) => fmt(r.assigned) },
    { key: "gap", label: "Gap", w: "64px", align: "right", mono: true, sort: (r) => r.gap, render: (r) => <span style={{ color: r.gap ? "var(--bad)" : "var(--faint)" }}>{r.gap ? r.gap : "0"}</span> },
    { key: "status", label: "Status", w: "142px", sort: (r) => r.status, render: (r) => <Chip status={r.status} /> },
  ];

  const svc = Array.from(new Set(withGap.map((r) => r.service))).map((sv) => ({ label: sv, value: sumBy(withGap.filter((r) => r.service === sv), (r) => r.gap) })).sort((a, b) => b.value - a.value);
  const grp = s.office === "All"
    ? OFFICES.map((o) => ({ label: o.id, value: o.reqHours - o.allocHours, onClick: () => wc.setOffice(o.id) })).sort((a, b) => b.value - a.value)
    : Array.from(new Set(withGap.map((r) => r.region))).map((rg) => ({ label: rg, value: sumBy(withGap.filter((r) => r.region === rg), (r) => r.gap), onClick: undefined as undefined | (() => void) })).sort((a, b) => b.value - a.value);

  return (
    <>
      <ScopeBar title="HSE requests" sub="Every active HSE home-care request with its weekly hours, what is allocated to carers and the unfilled balance. Service type only, no health detail." />
      <KpiStrip items={[
        { label: "Active requests", value: scoped.length, sub: "Imported from HSE Care Requests 06:00" },
        { label: "Requested hours / week", value: fmt(req) },
        { label: "Assigned hours", value: fmt(asg), sub: pct(asg, req) + " coverage" },
        { label: "Unallocated hours", value: fmt(gap), tone: "bad", onClick: () => setF("gap") },
        { label: "Requests with a gap", value: withGap.length, tone: "warn", sub: partial.length + " partially allocated", onClick: () => setF("gap") },
        { label: "Capacity Gap (40h+)", value: capGap.length, tone: "bad", sub: fmt(sumBy(capGap, (r) => r.gap)) + "h of the gap" },
      ]} />
      <div style={{ marginTop: 12 }}>
        <Panel pad={false} title="Requests" meta="HC-24817 pinned. Click a row to open the request."
          action={<SearchBox value={q} onChange={setQ} placeholder="Search ID, region, service" />}>
          <div style={{ padding: "0 18px 10px" }}>
            <Filters<HseFilter> value={f} onChange={setF} options={[{ id: "all", label: "All", count: scoped.length }, { id: "gap", label: "With gap", count: withGap.length }, { id: "full", label: "Fully allocated", count: full.length }]} />
          </div>
          <Table<HseRequest> cols={cols} rows={rows} pageSize={14} dense onRow={(r) => wc.open({ kind: "hse", id: r.id })} rowKey={(r) => r.id}
            rowTone={(r) => (r.id === "HC-24817" ? "bad" : r.status === "Capacity Gap" ? "warn" : undefined)} empty="No requests match this filter." />
          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 18px 14px", borderTop: "1px solid var(--border)", background: "var(--surface-faint)", flexWrap: "wrap" }}>
            <span style={{ ...label, flex: 1 }}>Totals for {rows.length} {rows.length === 1 ? "request" : "requests"}</span>
            <span style={{ fontSize: 12, color: "var(--dim)" }}>Requested <b style={{ fontFamily: MONO, color: "var(--ink)", fontWeight: 500 }}>{fmt(sumBy(rows, (r) => r.weeklyHours))}h</b></span>
            <span style={{ fontSize: 12, color: "var(--dim)" }}>Assigned <b style={{ fontFamily: MONO, color: "var(--ink)", fontWeight: 500 }}>{fmt(sumBy(rows, (r) => r.assigned))}h</b></span>
            <span style={{ fontSize: 12, color: "var(--dim)" }}>Gap <b style={{ fontFamily: MONO, color: "var(--bad)", fontWeight: 600 }}>{fmt(sumBy(rows, (r) => r.gap))}h</b></span>
          </div>
        </Panel>
      </div>
      <Grid cols="minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)">
          <Panel title="Allocation status" meta={scoped.length + " requests"}>
            <Stack height={12} showLabels parts={[{ value: full.length, color: "var(--ok)", label: "Fully allocated" }, { value: partial.length, color: "var(--warn)", label: "Partial" }, { value: capGap.length, color: "var(--bad)", label: "Capacity Gap" }]} />
            <div style={{ marginTop: 14 }}>
              <AgentNote agent="Care Hours Agent">
                {withGap.length} requests carry {fmt(gap)}h unallocated this week{s.office === "All" ? "; Mayo holds " + fmt(officeOf("Mayo").reqHours - officeOf("Mayo").allocHours) + "h of it, " + HC24817.gap + "h on HC-24817" : ""}. Allocations change only when a coordinator updates the roster.
              </AgentNote>
            </div>
          </Panel>
          <Panel title={s.office === "All" ? "Gap by office" : "Gap by region"} meta="Unallocated hours / week">
            <Bars data={grp.map((g) => ({ label: g.label, value: g.value, color: "var(--bad)", onClick: g.onClick, note: g.label === "Mayo" ? "HC-24817 64h" : undefined }))} fmtValue={(n) => fmt(n) + "h"} />
          </Panel>
          <Panel title="Gap by service type">
            {svc.length ? <Bars data={svc.map((x) => ({ ...x, color: "var(--warn)" }))} fmtValue={(n) => fmt(n) + "h"} /> : <div style={note}>No unallocated hours.</div>}
          </Panel>
          <Panel title="Next steps" meta="Where the gap gets worked">
            <ListRow title={<GoLink page="Rostering" sub="Scheduler">Scheduler</GoLink>} meta="Build cover into the weekly roster, with Roster Optimiser suggestions" />
            <ListRow title={<GoLink page="Rostering" sub="Unfilled Hours">Unfilled Hours</GoLink>} meta="Offer today's open visits to eligible carers" />
            <ListRow title={<GoLink page="Recruitment" sub="Open Roles">Open roles</GoLink>} meta="Recruitment demand follows the gap by office" />
          </Panel>
      </Grid>
    </>
  );
}

function Bars({ data, fmtValue }: { data: { label: string; value: number; color?: string; note?: string; onClick?: () => void }[]; fmtValue: (n: number) => string }) {
  const m = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d, i) => (
        <div key={d.label + i} onClick={d.onClick} className={d.onClick ? "wc-row" : undefined} style={{ display: "grid", gridTemplateColumns: "minmax(70px,150px) 1fr auto", gap: 10, alignItems: "center", cursor: d.onClick ? "pointer" : "default", borderRadius: 6 }}>
          <span style={{ fontSize: 12, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</span>
          <div style={{ height: 8, background: "var(--track)", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: Math.max(2, (100 * d.value) / m) + "%", background: d.color || "var(--accent)", borderRadius: 3, transformOrigin: "left", animation: "sweep .8s var(--ease) " + i * 40 + "ms both" }} /></div>
          <span style={{ fontFamily: MONO, fontSize: 11.5, minWidth: 42, textAlign: "right" }}>{fmtValue(d.value)}{d.note && <span style={{ color: "var(--faint)", marginLeft: 6, fontSize: 10 }}>{d.note}</span>}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scheduler                                                            */
/* ------------------------------------------------------------------ */

type Sug = { id: string; kind: "aoife" | "conflict" | "open"; block: SBlock; visit?: Visit; carer: Carer | null; reasons: string[]; title: string; sub: string; alt: number };

function Scheduler() {
  const s = useWc();
  const l = useLocal();
  const aoife = s.aoifeExpired;
  const view: OfficeId = s.office === "All" ? "Galway" : s.office;
  const sched = useMemo(() => buildSchedule(view), [view]);
  const eff = useMemo(() => effective(sched, aoife, l), [sched, aoife, l]);
  const [day, setDay] = useState<string>("week");
  const [sel, setSel] = useState<string | null>(null);
  const rows = sched.carers;
  const rowSet = useMemo(() => new Set(rows.map((c) => c.id)), [rows]);

  const free = (carerId: string, d: number, start: number, mins: number) =>
    !eff.some((b) => b.row === carerId && b.day === d && b.kind !== "available" && b.start < start + mins + 15 && start < b.start + b.mins + 15);

  const sugs = useMemo<Sug[]>(() => {
    const out: Sug[] = [];
    /* one carer is not suggested for two overlapping slots, nor past their open contracted hours */
    const held = new Map<string, { d: number; start: number; mins: number }[]>();
    const fits = (c: Carer, d: number, start: number, mins: number) => {
      const mine = held.get(c.id) || [];
      return !mine.some((x) => x.d === d && x.start < start + mins + 30 && start < x.start + x.mins + 30) && sumBy(mine, (x) => x.mins) + mins <= (c.contracted - c.scheduledWeek) * 60;
    };
    const hold = (c: Carer | null, d: number, start: number, mins: number) => { if (c) held.set(c.id, (held.get(c.id) || []).concat({ d, start, mins })); };
    const forVisit = (b: SBlock, v: Visit, kind: Sug["kind"], title: string) => {
      const list = notDoubleOffered(eligibleFor(v, aoife), v, l.offers).filter((e) => fits(e.c, 0, v.start, v.mins));
      const inGrid = list.find((e) => rowSet.has(e.c.id) && free(e.c.id, 0, v.start, v.mins));
      const e = inGrid || list.find((x) => !rowSet.has(x.c.id)) || null;
      hold(e ? e.c : null, 0, v.start, v.mins);
      out.push({ id: "sch:" + v.id, kind, block: b, visit: v, carer: e ? e.c : null, reasons: e ? e.reasons : [], title, sub: span(v.start, v.mins) + " · " + v.requiredSkill + " · client " + v.client, alt: Math.max(0, list.length - 1) });
    };
    const base = effective(sched, aoife, { ...l, offers: {}, moves: {} });
    if (aoife && view === "Galway") {
      for (const b of base.filter((x) => x.row === AOIFE.id && x.kind === "blocked" && x.day === 0 && x.visitId)) {
        const v = VISIT_MAP.get(b.visitId as string);
        if (v) forVisit(b, v, "aoife", "Reassign Aoife Byrne's " + hhmm(v.start) + " visit");
      }
    }
    for (const b of base.filter((x) => x.kind === "conflict")) {
      const target = b.ctype === "Travel conflict" ? base.find((x) => x.id === b.moveId) : b;
      if (!target) continue;
      const owner = rows.find((c) => c.id === b.row);
      if (target.visitId) { const v = VISIT_MAP.get(target.visitId); if (v) { forVisit(target, v, "conflict", b.ctype + ": move " + v.client + " off " + (owner ? owner.name : "carer")); continue; } }
      const cl = target.client ? CLIENT_MAP.get(target.client) : undefined;
      const cands = rows.filter((c) => c.id !== b.row && !isRestricted(c.id, aoife) && (target.day > 0 || c.availableToday) && (c.contracted - c.scheduledWeek) * 60 >= target.mins && free(c.id, target.day, target.start, target.mins) && fits(c, target.day, target.start, target.mins))
        .sort((a, c) => Number(!!cl && c.area === cl.area) - Number(!!cl && a.area === cl.area) || (c.contracted - c.scheduledWeek) - (a.contracted - a.scheduledWeek));
      const c = cands[0] || null;
      hold(c, target.day, target.start, target.mins);
      out.push({
        id: "sch:" + target.id, kind: "conflict", block: target, carer: c, alt: Math.max(0, cands.length - 1),
        title: (b.ctype || "Conflict") + ": move " + target.label + " off " + (owner ? owner.name : "carer"),
        sub: SCHED_DAYS[target.day] + " · " + span(target.start, target.mins) + (b.note ? " · " + b.note : ""),
        reasons: c ? ["Free " + span(target.start - 15, target.mins + 30) + " on " + SCHED_DAYS[target.day], "Compliant", cl && cl.area === c.area ? "Based in " + c.area : c.area + ", drives", c.scheduledWeek + "h of " + c.contracted + "h contracted"] : [],
      });
    }
    const open = base.filter((x) => x.row === OPEN_ROW && x.day === 0 && x.visitId && x.start >= NOW_MINS).sort((a, b) => a.start - b.start).slice(0, 5);
    for (const b of open) { const v = VISIT_MAP.get(b.visitId as string); if (v) forVisit(b, v, "open", "Cover unfilled " + hhmm(v.start) + " visit"); }
    return out;
  }, [sched, aoife, l, rowSet, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusOf = (g: Sug): { text: string; tone: Tone } | null => {
    const vid = g.visit ? g.visit.id : undefined;
    if (vid && l.offers[vid]) return { text: "Offered to " + l.offers[vid].name, tone: "ok" };
    if (l.moves[g.block.id]) return { text: "Moved to " + l.moves[g.block.id].name, tone: "ok" };
    if (l.decisions[g.id] === "declined") return { text: "Declined", tone: "neutral" };
    return null;
  };
  const approve = (g: Sug) => {
    if (!g.carer) return;
    if (g.visit) act.offer(g.visit.id, g.carer); else act.move(g.block.id, g.carer);
    act.decide(g.id, "approved");
  };

  /* KPIs from the grid itself */
  const carerBlocks = eff.filter((b) => b.row !== OPEN_ROW);
  const rostH = sumBy(carerBlocks.filter((b) => b.kind === "visit" || b.kind === "pending" || (b.kind === "conflict" && b.ctype === "Double booking")), (b) => b.mins) / 60;
  const lane = eff.filter((b) => b.row === OPEN_ROW);
  const openShifts = lane.filter((b) => b.kind === "unfilled");
  const conflicts = eff.filter((b) => b.kind === "conflict");
  const blockedRows = rows.filter((c) => isRestricted(c.id, false)).length;
  const aoifeBlocked = eff.filter((b) => b.row === AOIFE.id && b.kind === "blocked").length;
  const openContract = sumBy(rows.filter((c) => !isRestricted(c.id, aoife)), (c) => Math.max(0, c.contracted - c.scheduledWeek));
  const waiting = sugs.filter((g) => !statusOf(g) && g.carer).length;
  const selected = sel ? eff.find((b) => b.id === sel) || null : null;

  const onSel = (b: SBlock) => setSel(sel === b.id ? null : b.id);
  const dayIdx = day === "week" ? -1 : Number(day);
  const wk = dayIdx < 0;
  const gridCols = wk ? "172px repeat(7,minmax(0,1fr))" : "172px minmax(0,1fr) 52px";

  const carerChip = (c: Carer) => {
    if (c.id === AOIFE.id) return <Chip status={aoife ? "Restricted" : "Attention Required"} style={{ height: 18, fontSize: 10, padding: "0 6px" }} />;
    if (c.id === LIAM.id) return <Chip status="Renewal Required" style={{ height: 18, fontSize: 10, padding: "0 6px" }} />;
    if (RESTRICTED_CARER_IDS.has(c.id)) return <Chip status="Restricted" style={{ height: 18, fontSize: 10, padding: "0 6px" }} />;
    if (!c.availableToday) return <Chip tone="neutral" style={{ height: 18, fontSize: 10, padding: "0 6px" }}>{c.unavailableReason}</Chip>;
    if (!c.rosteredToday) return <Chip tone="ok" style={{ height: 18, fontSize: 10, padding: "0 6px" }}>Available</Chip>;
    return null;
  };

  return (
    <>
      <ScopeBar title="Scheduler" sub={<>Week of 28 Sep for <b style={{ color: "var(--ink)", fontWeight: 500 }}>{view}</b>{s.office === "All" ? " (pick an office to switch)" : ""}. {rows.length} carers, 07:00 to 23:00. Roster Optimiser suggests cover; the {view} coordinator, {coord(view)}, approves.</>} />
      <KpiStrip min={140} items={[
        { label: "Carers in view", value: rows.length, sub: rows.filter((c) => c.rosteredToday).length + " rostered today" },
        { label: "Rostered hours / week", value: fmtH(rostH), sub: "Across " + carerBlocks.filter((b) => b.kind === "visit" || b.kind === "pending").length + " visits" },
        { label: "Open shifts / week", value: openShifts.length, tone: "bad", sub: openShifts.filter((b) => b.day === 0).length + " today", onClick: () => wc.setSub("Rostering", "Unfilled Hours") },
        { label: "Schedule conflicts", value: conflicts.length, tone: conflicts.length ? "warn" : "ok", sub: conflicts.filter((b) => b.ctype === "Double booking").length + " double, " + conflicts.filter((b) => b.ctype === "Travel conflict").length + " travel" },
        { label: "Compliance blocks", value: blockedRows + (aoifeBlocked ? 1 : 0), tone: blockedRows + aoifeBlocked ? "bad" : "ok", sub: aoifeBlocked ? eff.filter((b) => b.row === AOIFE.id && b.kind === "blocked" && b.day === 0).length + " of Aoife's visits today, " + aoifeBlocked + " this week" : blockedRows + " restricted carer" + (blockedRows === 1 ? "" : "s") },
        { label: "Open contracted hours", value: fmt(openContract), tone: "ok", sub: "Compliant carers in view" },
      ]} />
      <Grid cols="minmax(0,1fr) 340px">
        <Panel title={"Weekly roster · " + view} meta={wk ? "Each cell is one day, 07:00 to 23:00. Click a block for detail." : SCHED_DAYS[dayIdx] + (dayIdx === 0 ? ", today. Shaded area is before 11:40." : "")}
          action={<Seg<string> value={day} onChange={(v) => { setDay(v); setSel(null); }} options={[{ id: "week", label: "Week" }, ...SCHED_DAYS.map((d, i) => ({ id: String(i), label: d }))]} />}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
            {LEGEND_ORDER.map((k) => (
              <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--dim)" }}>
                <span style={{ width: 16, height: k === "travel" ? 4 : 10, borderRadius: 2, background: KIND[k].bg, border: KIND[k].border }} />{KIND[k].name}
              </span>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: wk ? 760 : 720 }}>
              {/* header */}
              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 6, alignItems: "end", paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
                <div style={label}>Carer</div>
                {wk ? SCHED_DAYS.map((d, i) => {
                  const vis = eff.filter((b) => b.day === i && b.row !== OPEN_ROW && (b.kind === "visit" || b.kind === "pending")).length;
                  const op = eff.filter((b) => b.day === i && b.kind === "unfilled").length;
                  return (
                    <button key={d} onClick={() => setDay(String(i))} className="wc-row" style={{ textAlign: "left", background: i === 0 ? "var(--accent-faint)" : "none", border: 0, borderRadius: 6, padding: "4px 6px", cursor: "pointer", font: "inherit" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? "var(--accent)" : "var(--ink)", whiteSpace: "nowrap" }}>{d}</div>
                      <div title={vis + " visits, " + op + " open shifts"} style={{ fontFamily: MONO, fontSize: 10, color: "var(--faint)", marginTop: 2, whiteSpace: "nowrap" }}>{vis} · <span style={{ color: op ? "var(--bad)" : "var(--faint)" }}>{op} open</span></div>
                    </button>
                  );
                }) : (
                  <div style={{ position: "relative", height: 18 }}>
                    {Array.from({ length: 16 }, (_, i) => T0 + i * 60).map((m) => (
                      <span key={m} style={{ position: "absolute", left: px(m), transform: m === T0 ? "none" : "translateX(-50%)", fontFamily: MONO, fontSize: 9.5, color: m <= NOW_MINS && dayIdx === 0 ? "var(--faint)" : "var(--dim)" }}>{hhmm(m).slice(0, 2)}</span>
                    ))}
                  </div>
                )}
                {!wk && <div style={{ ...label, textAlign: "right" }}>Hours</div>}
              </div>

              {/* open shifts lane */}
              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 6, alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border)", background: "var(--bad-soft)", margin: "0 -6px", paddingLeft: 6, paddingRight: 6, borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--bad)" }}>Open shifts</div>
                  <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 2 }}>{wk ? openShifts.length + " this week" : lane.filter((b) => b.day === dayIdx && b.kind === "unfilled").length + " unfilled"}{dayIdx <= 0 && lane.some((b) => b.day === 0 && b.kind === "pending") ? ", " + lane.filter((b) => b.day === 0 && b.kind === "pending").length + " offered" : ""}</div>
                </div>
                {wk ? SCHED_DAYS.map((d, i) => <Track key={d} items={lane.filter((b) => b.day === i)} height={26} labels={false} today={i === 0} sel={sel} onSel={onSel} empty="None" />) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {(() => { const lanes = pack(lane.filter((b) => b.day === dayIdx)); return lanes.length ? lanes.map((ln, i) => <Track key={i} items={ln} height={24} labels today={dayIdx === 0} sel={sel} onSel={onSel} />) : <Track items={[]} height={24} labels today={dayIdx === 0} sel={sel} onSel={onSel} empty="No open shifts" />; })()}
                  </div>
                )}
                {!wk && <div style={{ fontFamily: MONO, fontSize: 11, textAlign: "right", color: "var(--bad)" }}>{fmtH(sumBy(lane.filter((b) => b.day === dayIdx && b.kind === "unfilled"), (b) => b.mins) / 60)}</div>}
              </div>

              {/* carer rows */}
              {rows.map((c) => {
                const mine = eff.filter((b) => b.row === c.id);
                const dayH = wk ? 0 : sumBy(mine.filter((b) => b.day === dayIdx && (b.kind === "visit" || b.kind === "pending" || b.kind === "blocked" || (b.kind === "conflict" && b.ctype === "Double booking")) && b.label !== "Restricted"), (b) => b.mins) / 60;
                return (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: gridCols, gap: 6, alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{carerLink(c)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, minWidth: 0 }}>
                        {carerChip(c)}
                        <span style={{ fontSize: 10.5, color: "var(--faint)", fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{carerChip(c) ? c.scheduledWeek + "/" + c.contracted + "h" : c.area + " · " + c.scheduledWeek + "/" + c.contracted + "h"}</span>
                      </div>
                    </div>
                    {wk ? SCHED_DAYS.map((d, i) => <Track key={d} items={mine.filter((b) => b.day === i)} height={28} labels={false} today={i === 0} sel={sel} onSel={onSel} />)
                      : <Track items={mine.filter((b) => b.day === dayIdx)} height={30} labels today={dayIdx === 0} sel={sel} onSel={onSel} />}
                    {!wk && <div style={{ fontFamily: MONO, fontSize: 11, textAlign: "right", color: "var(--body)" }}>{dayH ? fmtH(dayH) : "-"}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* selected block detail */}
          <div style={{ marginTop: 12, padding: "11px 13px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md,12px)", minHeight: 48, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {!selected ? <span style={note}>Select any block to see its detail. Unfilled shifts link to the cover finder, conflicts and blocks link to the suggestion that resolves them.</span> : (() => {
              const b = selected;
              const owner = rows.find((c) => c.id === b.row);
              const sug = sugs.find((g) => g.block.id === b.id || (b.visitId && g.visit && g.visit.id === b.visitId) || (b.ctype === "Travel conflict" && g.block.id === b.moveId));
              return (
                <>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12 }}><span style={{ width: 14, height: 10, borderRadius: 2, background: KIND[b.kind].bg, border: KIND[b.kind].border }} />{KIND[b.kind].name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12 }}>{SCHED_DAYS[b.day]} · {span(b.start, b.mins)}</span>
                  {owner && <span style={{ fontSize: 12 }}>{carerLink(owner)}</span>}
                  {b.client && <span style={{ fontSize: 12, color: "var(--dim)" }}>Client <RecLink to={{ kind: "client", id: b.client }}>{b.client}</RecLink></span>}
                  {b.visitId && <span style={{ fontSize: 12, color: "var(--dim)" }}>Visit <RecLink to={{ kind: "visit", id: b.visitId }}>{b.visitId}</RecLink></span>}
                  {b.skill && <span style={{ fontSize: 12, color: "var(--dim)" }}>{b.skill}</span>}
                  {(b.note || b.kind === "off" || b.kind === "blocked") && <span style={{ fontSize: 12, color: KIND[b.kind].ink }}>{b.kind === "off" ? b.label : b.note || b.label}</span>}
                  <span style={{ flex: 1 }} />
                  {b.kind === "unfilled" && b.visitId && <Btn onClick={() => { act.selectUnfilled(b.visitId as string); wc.setSub("Rostering", "Unfilled Hours"); }} style={{ height: 28 }}>Find cover</Btn>}
                  {sug && <span style={{ fontSize: 11.5, color: "var(--accent)" }}>Suggestion ready in the side panel</span>}
                </>
              );
            })()}
          </div>
        </Panel>

        <Panel title="AI Suggestions" meta={"Roster Optimiser · " + waiting + " waiting for " + coord(view)}>
          <AgentNote agent="Roster Optimiser" state={waiting ? "working" : "done"}>
            Checked {rows.length} carers against {openShifts.filter((b) => b.day === 0).length} open shifts today, {conflicts.length} conflict{conflicts.length === 1 ? "" : "s"}{aoife && view === "Galway" ? " and Aoife Byrne's restriction" : ""}. Criteria: compliance, qualification, availability, area, existing roster, contracted hours, continuity.
          </AgentNote>
          {view === "Mayo" && (
            <>
              <MiniHead right={<RecLink to={{ kind: "hse", id: "HC-24817" }} style={{ fontSize: 11.5 }}>HC-24817</RecLink>}>HC-24817 coverage options</MiniHead>
              {HC24817_OPTIONS.map((o) => {
                const d = s.rosterDecisions[o.id];
                return (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: "1px solid var(--border)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.title}</div>
                      <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--ok)" }}>+{o.hours}h / week</div>
                    </div>
                    {d ? <Chip tone={d === "approved" ? "ok" : "neutral"}>{d === "approved" ? "Approved" : "Declined"}</Chip> : (
                      <>
                        <Btn kind="primary" onClick={() => wc.decideRoster(o.id, "approved", o.title)} style={{ height: 24, padding: "0 9px", fontSize: 11.5 }}>Approve</Btn>
                        <Btn kind="quiet" onClick={() => wc.decideRoster(o.id, "declined", o.title)} style={{ height: 24, padding: "0 6px", fontSize: 11.5 }}>Decline</Btn>
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}
          <MiniHead>{sugs.length} suggestions this week</MiniHead>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 760, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
            {sugs.length === 0 && <div style={note}>No conflicts or open shifts need cover in {view}.</div>}
            {sugs.map((g) => {
              const st = statusOf(g);
              const tone: Tone = g.kind === "aoife" ? "bad" : g.kind === "conflict" ? "warn" : "accent";
              const hot = g.block.id === sel || (g.visit && eff.some((b) => b.id === sel && b.visitId === g.visit!.id));
              return (
                <div key={g.id} onClick={() => setSel(g.block.id)} className="wc-card"
                  style={{ padding: "10px 11px", background: hot ? "var(--accent-faint)" : "var(--surface-2)", border: "1px solid " + (hot ? "var(--accent-line)" : "var(--border)"), borderRadius: "var(--r-sm,10px)", cursor: "pointer", opacity: st && st.tone === "neutral" ? 0.6 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: TONE[tone].ink, flex: "none" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--faint)", marginTop: 3, fontFamily: MONO, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.sub}</div>
                  {st && st.tone === "ok" ? null : g.carer ? (
                    <>
                      <div style={{ fontSize: 12, marginTop: 7 }}>Suggest {carerLink(g.carer)}{g.alt ? <span style={{ color: "var(--faint)" }}> · {g.alt} other eligible</span> : null}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {g.reasons.map((r) => <span key={r} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 6, background: "var(--surface-faint)", border: "1px solid var(--border)", color: "var(--dim)" }}>{r}</span>)}
                      </div>
                    </>
                  ) : <div style={{ fontSize: 12, marginTop: 7, color: "var(--bad)" }}>No carer in this view is free for this slot. {coord(view)} to check the wider {view} roster.</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                    {st ? <Chip tone={st.tone}>{st.text}</Chip> : g.carer ? (
                      <>
                        <Btn kind="primary" onClick={() => approve(g)} style={{ height: 26, padding: "0 10px", fontSize: 11.5 }}>Approve</Btn>
                        <Btn kind="quiet" onClick={() => act.decide(g.id, "declined")} style={{ height: 26, padding: "0 8px", fontSize: 11.5 }}>Decline</Btn>
                      </>
                    ) : <GoLink page="Rostering" sub="Unfilled Hours">Unfilled Hours</GoLink>}
                    <span style={{ flex: 1 }} />
                    {st && <Btn kind="quiet" onClick={() => act.undo(g.id, g.visit ? g.visit.id : undefined, g.block.id)} style={{ height: 24, padding: "0 6px", fontSize: 11 }}>Undo</Btn>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12 }}><HumanGate>Suggestions only. Nothing changes on the roster until {coord(view)} approves and the carer confirms.</HumanGate></div>
        </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Unfilled Hours                                                       */
/* ------------------------------------------------------------------ */

type Order = "time" | "office" | "skill" | "duration" | "cover";
type URow = QItem & { elig: Elig[] };

function UnfilledHours() {
  const s = useWc();
  const l = useLocal();
  const aoife = s.aoifeExpired;
  const [order, setOrder] = useState<Order>("time");
  const queue = unfilledQueue(s.office, aoife);
  const rows: URow[] = useMemo(() => {
    const base = queue.map((q) => ({ ...q, elig: notDoubleOffered(eligibleFor(q.v, aoife), q.v, l.offers) }));
    const cmp: Record<Order, (a: URow, b: URow) => number> = {
      time: (a, b) => a.v.start - b.v.start,
      office: (a, b) => a.v.office.localeCompare(b.v.office) || a.v.start - b.v.start,
      skill: (a, b) => a.v.requiredSkill.localeCompare(b.v.requiredSkill) || a.v.start - b.v.start,
      duration: (a, b) => b.v.mins - a.v.mins || a.v.start - b.v.start,
      cover: (a, b) => a.elig.length - b.elig.length || a.v.start - b.v.start,
    };
    return base.sort(cmp[order]);
  }, [s.office, aoife, order, l.offers]); // eslint-disable-line react-hooks/exhaustive-deps
  const selId = l.selUnfilled && rows.some((r) => r.v.id === l.selUnfilled) ? l.selUnfilled : rows[0] ? rows[0].v.id : null;
  const cur = rows.find((r) => r.v.id === selId) || null;
  const hours = sumBy(rows, (r) => r.v.mins) / 60;
  const offered = rows.filter((r) => l.offers[r.v.id]);
  const noCover = rows.filter((r) => !l.offers[r.v.id] && r.elig.length <= 2);
  const gaps = byOffice(HSE_REQUESTS, s.office).filter((r) => r.gap > 0).sort((a, b) => b.gap - a.gap);
  const cluster = rows.filter((r) => r.flag === "cluster");

  const cols: Col<URow>[] = [
    { key: "start", label: "Time", w: "104px", mono: true, sort: (r) => r.v.start, render: (r) => span(r.v.start, r.v.mins) },
    { key: "visit", label: "Visit and client", w: "minmax(150px,1.2fr)", mono: true, render: (r) => <span style={{ display: "inline-flex", gap: 8 }}><RecLink to={{ kind: "visit", id: r.v.id }}>{r.v.id}</RecLink><RecLink to={{ kind: "client", id: r.v.client }} style={{ color: "var(--dim)" }}>{r.v.client}</RecLink></span> },
    { key: "office", label: "Office", w: "90px", sort: (r) => r.v.office, render: (r) => r.v.office },
    { key: "skill", label: "Qualification", w: "minmax(110px,1fr)", sort: (r) => r.v.requiredSkill, render: (r) => r.v.requiredSkill },
    { key: "cover", label: "Eligible", w: "64px", align: "right", mono: true, sort: (r) => r.elig.length, render: (r) => <span style={{ color: r.elig.length <= 2 ? "var(--bad)" : "var(--body)" }}>{r.elig.length}</span> },
    { key: "status", label: "Status", w: "140px", render: (r) => l.offers[r.v.id] ? <Chip tone="info">Offered</Chip> : r.flag === "aoife" ? <Chip tone="bad">Needs reassignment</Chip> : r.flag === "cluster" ? <Chip tone="warn">Roscommon cluster</Chip> : <Chip status="Unfilled" /> },
  ];


  const bands = [12, 14, 16, 18, 20, 22].map((h) => ({ h, n: rows.filter((r) => r.v.start >= h * 60 && r.v.start < (h + 2) * 60).length }));

  return (
    <>
      <ScopeBar title="Unfilled hours" sub="Today's visits without a carer, ordered operationally, and the weekly HSE gap packages. Cover suggestions use only permitted criteria; the coordinator offers each shift." />
      <KpiStrip items={[
        { label: "Unfilled visits today", value: rows.length, tone: "bad", sub: aoife && (s.office === "All" || s.office === "Galway") ? "incl. 4 from Aoife's restriction" : fmt(byOffice(VISITS, s.office).length) + " visits scheduled" },
        { label: "Unfilled hours today", value: fmtH(hours), tone: "bad", sub: cluster.length ? h1(sumBy(cluster, (r) => r.v.mins) / 60) + " from Roscommon cluster" : "Care hours without a carer" },
        { label: "Offers out", value: offered.length, tone: offered.length ? "info" : undefined, sub: "Awaiting carer reply" },
        { label: "Hard to cover", value: noCover.length, tone: noCover.length ? "bad" : "ok", sub: "Two or fewer eligible carers", onClick: () => setOrder("cover") },
        { label: "Weekly gap packages", value: gaps.length, sub: fmt(sumBy(gaps, (r) => r.gap)) + "h unallocated / week", onClick: () => wc.setSub("Rostering", "HSE Requests") },
      ]} />
      {(s.office === "All" || s.office === "Roscommon") && (
        <div style={{ marginTop: 12 }}>
          <AgentNote agent="Ops Watchdog" state="attention" action={<Btn onClick={() => setOrder("office")} style={{ height: 28 }}>Group by office</Btn>}>
            Roscommon cluster {ROSCOMMON_CLUSTER.period}: {ROSCOMMON_CLUSTER.cancellations} cancellations after a carer called in sick, {ROSCOMMON_CLUSTER.recovered} recovered, {ROSCOMMON_CLUSTER.uncovered} still uncovered with {ROSCOMMON_CLUSTER.hoursAtRisk} care hours at risk. They are flagged in the queue below for Ciarán Moran.
          </AgentNote>
        </div>
      )}
      <Grid cols="minmax(0,1.6fr) minmax(0,1fr)">
        <Panel pad={false} title="Unfilled visits today" meta="Operational order only. No clinical prioritisation."
          action={<Seg<Order> value={order} onChange={setOrder} options={[{ id: "time", label: "Start time" }, { id: "office", label: "Office" }, { id: "skill", label: "Qualification" }, { id: "duration", label: "Duration" }, { id: "cover", label: "Fewest eligible" }]} />}>
          <Table<URow> cols={cols} rows={rows} pageSize={13} dense onRow={(r) => act.selectUnfilled(r.v.id)} selected={(r) => r.v.id === selId} rowKey={(r) => r.v.id}
            rowTone={(r) => (r.flag === "aoife" ? "bad" : r.flag === "cluster" ? "warn" : undefined)} empty="No unfilled visits for this office today." />
        </Panel>
        <CoverPanel row={cur} aoife={aoife} offers={l.offers} />
      </Grid>
      <Grid cols="minmax(0,1.6fr) minmax(0,1fr)">
        <Panel pad={false} title="Weekly gap packages" meta={gaps.length + " HSE requests · " + fmt(sumBy(gaps, (r) => r.gap)) + "h unallocated of " + fmt(sumBy(gaps, (r) => r.weeklyHours)) + "h requested"} action={<GoLink page="Rostering" sub="HSE Requests">HSE Requests</GoLink>}>
          <Table<HseRequest> dense pageSize={8} rows={gaps} rowKey={(r) => r.id} onRow={(r) => wc.open({ kind: "hse", id: r.id })} rowTone={(r) => (r.id === "HC-24817" ? "bad" : undefined)}
            cols={[
              { key: "id", label: "Request", w: "100px", mono: true, render: (r) => <RecLink to={{ kind: "hse", id: r.id }}>{r.id}</RecLink> },
              { key: "office", label: "Office", w: "90px", render: (r) => r.office },
              { key: "region", label: "Region", w: "minmax(110px,1fr)", render: (r) => r.region },
              { key: "weekly", label: "Assigned / weekly", w: "120px", align: "right", mono: true, sort: (r) => r.weeklyHours, render: (r) => r.assigned + " / " + r.weeklyHours },
              { key: "gap", label: "Gap", w: "60px", align: "right", mono: true, sort: (r) => r.gap, render: (r) => <span style={{ color: "var(--bad)" }}>{r.gap}</span> },
              { key: "status", label: "Status", w: "132px", render: (r) => <Chip status={r.status} /> },
            ]} />
        </Panel>
        <Panel title="When today's gaps fall" meta="Unfilled visits by start time">
          <Columns labels={bands.map((b) => b.h + ":00")} series={[bands.map((b) => b.n)]} colors={["var(--bad)"]} height={120} />
          <MiniHead>By qualification</MiniHead>
          <Bars fmtValue={(n) => String(n)} data={Array.from(new Set(rows.map((r) => r.v.requiredSkill))).map((sk) => ({ label: sk, value: rows.filter((r) => r.v.requiredSkill === sk).length, color: "var(--warn)" })).sort((a, b) => b.value - a.value)} />
          {s.office === "All" && (
            <>
              <MiniHead>By office</MiniHead>
              <Bars fmtValue={(n) => String(n)} data={OFFICES.map((o) => ({ label: o.id, value: rows.filter((r) => r.v.office === o.id).length, color: "var(--bad)", onClick: () => wc.setOffice(o.id) })).sort((a, b) => b.value - a.value)} />
            </>
          )}
        </Panel>
      </Grid>
    </>
  );
}

function CoverPanel({ row, aoife, offers }: { row: URow | null; aoife: boolean; offers: Record<string, Offer> }) {
  if (!row) return <Panel title="Cover"><div style={note}>Select an unfilled visit to see eligible carers.</div></Panel>;
  const v = row.v;
  const cl = CLIENT_MAP.get(v.client);
  const off = offers[v.id];
  return (
    <Panel title={<span>Cover for {v.id}</span>} meta={v.office + " · coordinator " + coord(v.office)} action={<RecLink to={{ kind: "visit", id: v.id }} style={{ fontSize: 12 }}>Open visit</RecLink>}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <Stat k="Time" v={span(v.start, v.mins)} />
        <Stat k="Duration" v={minsLabel(v.mins)} />
        <Stat k="Qualification" v={v.requiredSkill} />
        <Stat k="Area" v={cl ? cl.area : "-"} />
      </div>
      {row.flag === "cluster" && <div style={{ marginTop: 10 }}><AgentNote agent="Ops Watchdog" state="attention">{v.note}. Part of the Roscommon cluster {ROSCOMMON_CLUSTER.period}.</AgentNote></div>}
      {row.flag === "aoife" && <div style={{ marginTop: 10 }}><AgentNote agent="Compliance Agent" state="attention">Aoife Byrne's Patient Manual Handling has expired, so she is restricted from this manual-handling visit. It needs a compliant carer.</AgentNote></div>}
      <MiniHead right={<span style={{ fontFamily: MONO, fontSize: 11, color: "var(--dim)" }}>{row.elig.length} eligible</span>}>Eligible carers</MiniHead>
      <div style={{ ...note, marginBottom: 6 }}>Criteria: same office, compliant, qualification held, free 30 min either side, same area (carers free all day may drive over), within contracted and daily hours, continuity with the client. Listed by continuity, then area, then open hours.</div>
      {off && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 6, background: "var(--info-soft)", borderRadius: "var(--r-sm,10px)" }}>
          <span style={{ fontSize: 12.5, flex: 1 }}>Offered to <b style={{ fontWeight: 600 }}>{off.name}</b> at {off.at}. Waiting for the carer to accept in the {BRAND.careSystem}.</span>
          <Btn kind="quiet" onClick={() => act.withdraw(v.id)} style={{ height: 26 }}>Withdraw</Btn>
        </div>
      )}
      {row.elig.length === 0 && <div style={{ padding: "12px 0", fontSize: 12.5, color: "var(--bad)" }}>No carer meets the criteria for this slot. Escalate to {coord(v.office)} or check cross-office cover.</div>}
      {row.elig.slice(0, 5).map((e) => (
        <div key={e.c.id} style={{ padding: "9px 0", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, flex: 1 }}>{carerLink(e.c)} <span style={{ color: "var(--faint)", fontSize: 11.5 }}>{e.c.area}</span></span>
            {off && off.carerId === e.c.id ? <Chip tone="info">Offered</Chip> : <Btn kind={off ? "ghost" : "primary"} disabled={!!off} onClick={() => act.offer(v.id, e.c)} style={{ height: 26, padding: "0 10px", fontSize: 11.5 }}>Offer shift</Btn>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
            {e.reasons.map((r) => <span key={r} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--dim)" }}>{r}</span>)}
          </div>
        </div>
      ))}
      {row.elig.length > 5 && <div style={{ ...note, paddingTop: 6 }}>{row.elig.length - 5} more eligible carers.</div>}
      <div style={{ marginTop: "auto", paddingTop: 10 }}><HumanGate>Suggestions only. The coordinator offers the shift and the carer accepts.</HumanGate></div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Availability                                                         */
/* ------------------------------------------------------------------ */

const BANDS = [{ id: "am", label: "07-12" }, { id: "pm", label: "12-17" }, { id: "eve", label: "17-22" }] as const;
type BandId = "all" | "am" | "pm" | "eve";
const AVAIL_CACHE = new Map<string, number[]>();
/** Open hours per (day, band): contracted minus scheduled, spread deterministically in half hours. */
function availCells(c: Carer): number[] {
  const hit = AVAIL_CACHE.get(c.id);
  if (hit) return hit;
  const r = seeded(hash("avail-" + c.id));
  const units = Math.max(0, (c.contracted - c.scheduledWeek) * 2);
  const w: number[] = Array.from({ length: 21 }, (_, i): number => {
    const d = Math.floor(i / 3);
    let x = 0.2 + r();
    if (r() < 0.4) x = 0;
    if (d === 0 && !c.availableToday) x = 0;
    return x;
  });
  if (!w.some((x) => x > 0)) w[4] = 1;
  const tot = w.reduce((a, b) => a + b, 0);
  const cells = Array(21).fill(0) as number[];
  for (let u = 0; u < units; u++) {
    let k = r() * tot, i = 0;
    while (i < 20 && k >= w[i]) { k -= w[i]; i++; }
    if (w[i] === 0) i = w.findIndex((x) => x > 0);
    cells[i] += 0.5;
  }
  AVAIL_CACHE.set(c.id, cells);
  return cells;
}

function Availability() {
  const s = useWc();
  const aoife = s.aoifeExpired;
  const [day, setDay] = useState<string>("all");
  const [band, setBand] = useState<BandId>("all");
  const [comp, setComp] = useState<"all" | "ok" | "restricted">("all");
  const [minH, setMinH] = useState<"0" | "2" | "4" | "8">("0");
  const [showAll, setShowAll] = useState(false);
  const scoped = byOffice(CARERS, s.office);
  const colIdx = Array.from({ length: 21 }, (_, i) => i).filter((i) => (day === "all" || Math.floor(i / 3) === Number(day)) && (band === "all" || BANDS[i % 3].id === band));
  const visDays = Array.from(new Set(colIdx.map((i) => Math.floor(i / 3))));
  const carerTotal = (c: Carer) => sumBy(colIdx, (i) => availCells(c)[i]);
  const filtered = scoped.filter((c) => {
    const rs = isRestricted(c.id, aoife);
    if (comp === "ok" && rs) return false;
    if (comp === "restricted" && !rs) return false;
    return carerTotal(c) >= Number(minH) && (Number(minH) === 0 || carerTotal(c) > 0);
  });
  const all = s.office === "All";
  type HRow = { key: string; name: ReactNode; meta: string; cells: number[]; restricted: boolean; total: number; onClick?: () => void; chip?: ReactNode };
  const hrows: HRow[] = all
    ? OFFICES.map((o) => {
        const cs = filtered.filter((c) => c.office === o.id);
        const cells = colIdx.map((i) => sumBy(cs, (c) => availCells(c)[i]));
        return { key: o.id, name: <span style={{ fontWeight: 600 }}>{o.id}</span>, meta: cs.length + " carers · " + cs.filter((c) => isRestricted(c.id, aoife)).length + " restricted", cells, restricted: false, total: sumBy(cells, (x) => x), onClick: () => wc.setOffice(o.id) };
      })
    : filtered.map((c) => {
        const cells = colIdx.map((i) => availCells(c)[i]);
        const rs = isRestricted(c.id, aoife);
        return { key: c.id, name: carerLink(c), meta: c.area + " · " + c.scheduledWeek + "/" + c.contracted + "h", cells, restricted: rs, total: sumBy(cells, (x) => x), chip: rs ? <Chip status="Restricted" style={{ height: 18, fontSize: 10, padding: "0 6px" }} /> : !c.availableToday ? <Chip tone="neutral" style={{ height: 18, fontSize: 10, padding: "0 6px" }}>Off today</Chip> : undefined };
      }).sort((a, b) => b.total - a.total);
  const shown = all || showAll ? hrows : hrows.slice(0, 18);
  const maxCell = Math.max(0.5, ...hrows.flatMap((r) => r.cells));
  const colTotals = colIdx.map((_, k) => sumBy(hrows, (r) => r.cells[k]));
  const gridCols = "200px repeat(" + colIdx.length + ",minmax(0,1fr)) 64px";

  const restrictedN = scoped.filter((c) => isRestricted(c.id, aoife)).length;
  const openH = sumBy(scoped.filter((c) => !isRestricted(c.id, aoife)), (c) => Math.max(0, c.contracted - c.scheduledWeek));
  const rostered = scoped.filter((c) => c.availableToday && c.rosteredToday).length;
  const availToday = scoped.filter((c) => c.availableToday && !c.rosteredToday).length;
  const unavailable = scoped.filter((c) => !c.availableToday);
  const byDay = SCHED_DAYS.map((_, d) => sumBy(filtered.filter((c) => !isRestricted(c.id, aoife)), (c) => sumBy([0, 1, 2].filter((b) => band === "all" || BANDS[b].id === band), (b) => availCells(c)[d * 3 + b])));
  const top = scoped.filter((c) => !isRestricted(c.id, aoife) && c.availableToday).sort((a, b) => (b.contracted - b.scheduledWeek) - (a.contracted - a.scheduledWeek) || a.name.localeCompare(b.name)).slice(0, 6);

  return (
    <>
      <ScopeBar title="Carer availability" sub="Open contracted hours (contracted minus scheduled) by day and time band, with compliance status. Restricted carers cannot be rostered until resolved." />
      <KpiStrip items={[
        { label: "Active carers", value: scoped.length },
        { label: "Fully compliant", value: scoped.length - restrictedN, tone: "ok", onClick: () => setComp("ok") },
        { label: "Restricted", value: restrictedN, tone: "bad", sub: aoife && (all || s.office === "Galway") ? "incl. Aoife Byrne" : "Blocked from rostering", onClick: () => setComp("restricted") },
        { label: "Open contracted hours / week", value: fmt(openH), tone: "ok", sub: "Compliant carers only" },
        { label: "Available today, not rostered", value: availToday, sub: rostered + " rostered today" },
        { label: "Unavailable today", value: unavailable.length, tone: "warn", sub: "Leave, sickness, training, restriction" },
      ]} />
      <Grid cols="minmax(0,1fr) 300px">
        <Panel title={all ? "Open hours by office" : "Open hours by carer · " + s.office} meta={all ? "Click an office to see its carers" : filtered.length + " carers match. Sorted by open hours in the selected window."}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", marginBottom: 12 }}>
            <FilterGroup name="Day"><Seg<string> value={day} onChange={setDay} options={[{ id: "all", label: "Week" }, ...SCHED_DAYS.map((d, i) => ({ id: String(i), label: d.split(" ")[0] }))]} /></FilterGroup>
            <FilterGroup name="Time"><Seg<BandId> value={band} onChange={setBand} options={[{ id: "all", label: "All day" }, { id: "am", label: "07-12" }, { id: "pm", label: "12-17" }, { id: "eve", label: "17-22" }]} /></FilterGroup>
            <FilterGroup name="Compliance"><Seg<"all" | "ok" | "restricted"> value={comp} onChange={setComp} options={[{ id: "all", label: "All" }, { id: "ok", label: "Compliant only" }, { id: "restricted", label: "Restricted" }]} /></FilterGroup>
            <FilterGroup name="Available hours"><Seg<"0" | "2" | "4" | "8"> value={minH} onChange={setMinH} options={[{ id: "0", label: "Any" }, { id: "2", label: "2h+" }, { id: "4", label: "4h+" }, { id: "8", label: "8h+" }]} /></FilterGroup>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: Math.max(640, 270 + colIdx.length * 30) }}>
              <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 3, alignItems: "end" }}>
                <div />
                {visDays.map((d) => <div key={d} style={{ gridColumn: "span " + colIdx.filter((i) => Math.floor(i / 3) === d).length, fontSize: 11.5, fontWeight: 600, textAlign: "center", color: d === 0 ? "var(--accent)" : "var(--ink)", borderBottom: "1px solid var(--border)", paddingBottom: 4 }}>{SCHED_DAYS[d]}</div>)}
                <div />
                <div style={label}>{all ? "Office" : "Carer"}</div>
                {colIdx.map((i) => <div key={i} style={{ fontFamily: MONO, fontSize: 9, color: "var(--faint)", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>{colIdx.length > 12 ? ["am", "pm", "eve"][i % 3] : BANDS[i % 3].label}</div>)}
                <div style={{ ...label, textAlign: "right" }}>Open h</div>
              </div>
              {shown.length === 0 && <div style={{ padding: "30px 0", textAlign: "center", fontSize: 12.5, color: "var(--dim)" }}>No carers match these filters.</div>}
              {shown.map((r) => (
                <div key={r.key} onClick={r.onClick} className={r.onClick ? "wc-row" : undefined} style={{ display: "grid", gridTemplateColumns: gridCols, gap: 3, alignItems: "center", padding: "3px 0", cursor: r.onClick ? "pointer" : "default", borderRadius: 6 }}>
                  <div style={{ minWidth: 0, paddingRight: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, minWidth: 0 }}><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>{r.chip}</div>
                    <div style={{ fontSize: 10.5, color: "var(--faint)", fontFamily: MONO, marginTop: 1 }}>{r.meta}</div>
                  </div>
                  {r.cells.map((v, k) => {
                    const ratio = v / maxCell;
                    const ink = r.restricted ? "var(--bad)" : "var(--ok)";
                    return (
                      <div key={k} title={SCHED_DAYS[Math.floor(colIdx[k] / 3)] + " " + BANDS[colIdx[k] % 3].label + ": " + fmtH(v) + "h open" + (r.restricted ? " (restricted)" : "")}
                        style={{ height: all ? 34 : 24, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 9.5,
                          background: v ? "color-mix(in srgb, " + ink + " " + Math.round(14 + 70 * ratio) + "%, var(--surface-2))" : "var(--surface-faint)",
                          border: "1px solid " + (v ? "transparent" : "var(--border)"), color: ratio > 0.55 ? "var(--on-accent)" : v ? "var(--ink)" : "var(--faint)" }}>
                        {v ? fmtH(v) : ""}
                      </div>
                    );
                  })}
                  <div style={{ fontFamily: MONO, fontSize: 11.5, textAlign: "right", color: r.restricted ? "var(--bad)" : "var(--ink)" }}>{fmtH(r.total)}</div>
                </div>
              ))}
              {shown.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 3, alignItems: "center", paddingTop: 6, marginTop: 4, borderTop: "1px solid var(--border)" }}>
                  <div style={label}>Total</div>
                  {colTotals.map((t, k) => <div key={k} style={{ fontFamily: MONO, fontSize: 9.5, textAlign: "center", color: "var(--dim)" }}>{fmtH(t)}</div>)}
                  <div style={{ fontFamily: MONO, fontSize: 11.5, textAlign: "right" }}>{fmtH(sumBy(colTotals, (x) => x))}</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
            <Legend color="color-mix(in srgb, var(--ok) 70%, var(--surface-2))">Open hours, compliant</Legend>
            <Legend color="color-mix(in srgb, var(--bad) 60%, var(--surface-2))">Open hours, restricted</Legend>
            <span style={note}>am 07-12, pm 12-17, eve 17-22</span>
            <span style={{ flex: 1 }} />
            {!all && hrows.length > 18 && <Btn kind="quiet" onClick={() => setShowAll(!showAll)} style={{ height: 26 }}>{showAll ? "Show top 18" : "Show all " + hrows.length}</Btn>}
          </div>
        </Panel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <Panel title="Today" meta={TODAY_LABEL_TEXT}>
            <Stack height={12} showLabels parts={[{ value: rostered, color: "var(--accent)", label: "Rostered" }, { value: availToday, color: "var(--ok)", label: "Available" }, { value: unavailable.length, color: "var(--bad)", label: "Unavailable" }]} />
            <MiniHead>Unavailable</MiniHead>
            {unavailable.slice(0, 6).map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid var(--border)", fontSize: 12 }}>
                <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{carerLink(c)}</span>
                <span style={{ color: "var(--dim)", fontSize: 11 }}>{all ? c.office + " · " : ""}{c.unavailableReason}</span>
              </div>
            ))}
            {unavailable.length > 6 && <div style={{ ...note, paddingTop: 6 }}>{unavailable.length - 6} more.</div>}
          </Panel>
          <Panel title="Open hours by day" meta="Compliant carers matching the filters">
            <Columns labels={SCHED_DAYS.map((d) => d.split(" ")[0])} series={[byDay]} colors={["var(--ok)"]} height={110} fmtValue={(n) => fmtH(n) + "h"} />
          </Panel>
          <Panel title="Most open hours this week" meta="Compliant, available today">
            {top.map((c) => (
              <ListRow key={c.id} title={carerLink(c)} meta={c.office + " · " + c.area + " · " + (c.rosteredToday ? "rostered today" : "not rostered today")}
                right={<span style={{ fontFamily: MONO, fontSize: 12, color: "var(--ok)" }}>{c.contracted - c.scheduledWeek}h</span>} />
            ))}
          </Panel>
        </div>
      </Grid>
    </>
  );
}
const TODAY_LABEL_TEXT = "Mon 28 Sep, 11:40";
function FilterGroup({ name, children }: { name: string; children: ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={label}>{name}</span>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Exceptions                                                           */
/* ------------------------------------------------------------------ */

type ExType = "Carer sick" | "Late cancellation" | "Double booking" | "Compliance restriction" | "Client cancellation" | "Travel conflict" | "No available cover";
const EX_TYPES: ExType[] = ["Carer sick", "Late cancellation", "Double booking", "Compliance restriction", "Client cancellation", "Travel conflict", "No available cover"];
const EX_STATUSES: ExStatus[] = ["Open", "In progress", "Awaiting reply", "Resolved"];
type ExRow = { id: string; type: ExType; office: OfficeId; raised: number; title: ReactNode; detail: string; impact: string; todayH: number; status0: ExStatus; go?: [string, string]; opportunity?: boolean };

const EX_CACHE = new Map<string, ExRow[]>();
function buildExceptions(aoife: boolean): ExRow[] {
  const key = aoife ? "a" : "n";
  const hit = EX_CACHE.get(key);
  if (hit) return hit;
  const rows: Omit<ExRow, "id">[] = [];
  /* Carer sick: carers on sick leave today. Roscommon's call triggered the cluster. */
  CARERS.filter((c) => c.unavailableReason === "Sick leave").forEach((c, i) => {
    const rosc = c.office === "Roscommon";
    rows.push(rosc
      ? { type: "Carer sick", office: c.office, raised: 7 * 60 + 10, title: <span>{carerLink(c)} called in sick at 07:10</span>, detail: "Roscommon cluster " + ROSCOMMON_CLUSTER.period + ": " + ROSCOMMON_CLUSTER.cancellations + " visits cancelled, " + ROSCOMMON_CLUSTER.recovered + " recovered, " + ROSCOMMON_CLUSTER.uncovered + " uncovered.", impact: ROSCOMMON_CLUSTER.hoursAtRisk + "h at risk today", todayH: ROSCOMMON_CLUSTER.hoursAtRisk, status0: "In progress", go: ["Rostering", "Unfilled Hours"] }
      : { type: "Carer sick", office: c.office, raised: 6 * 60 + 25 + i * 9, title: <span>{carerLink(c)} on sick leave</span>, detail: "Today's run moved to other carers before 07:00. Tomorrow's run still needs confirming.", impact: fmtH(Math.round((c.scheduledWeek / 5) * 2) / 2) + "h tomorrow", todayH: 0, status0: (["Open", "Resolved", "Awaiting reply", "Open"] as ExStatus[])[i % 4] });
  });
  /* Late cancellations: carer-side cancellations elsewhere that were not re-covered. */
  CANCEL_TODAY.filter((c) => c.office !== "Roscommon" && !c.recovered).forEach((c) => {
    const [hh, mm] = c.time.split(":").map(Number);
    rows.push({ type: "Late cancellation", office: c.office, raised: hh * 60 + mm, title: <span>{nameLink(c.carer)} cancelled at {c.time}</span>, detail: c.reason + " for client " + c.client + ". Visit not yet re-covered.", impact: fmtH(c.hours) + "h today", todayH: c.hours, status0: "Open", go: ["Rostering", "Unfilled Hours"] });
  });
  /* Client cancellations in the Roscommon cluster free a carer: a replacement opportunity. */
  CANCEL_TODAY.filter((c) => c.office === "Roscommon" && c.reason === "Client cancellation" && c.recovered).slice(0, 2).forEach((c, i) => {
    const [hh, mm] = c.time.split(":").map(Number);
    rows.push({ type: "Client cancellation", office: c.office, raised: hh * 60 + mm, title: <span>Client <RecLink to={{ kind: "client", id: c.client }}>{c.client}</RecLink> cancelled at {c.time}</span>, detail: c.carer + " has " + minsLabel(Math.round(c.hours * 60)) + " free. Could take one of the 5 uncovered cluster visits.", impact: "Replacement opportunity", todayH: 0, status0: i === 0 ? "Awaiting reply" : "Open", opportunity: true, go: ["Rostering", "Unfilled Hours"] });
  });
  /* Double booking and travel conflicts from the scheduler grid of each office. */
  for (const o of OFFICES) {
    const sch = buildSchedule(o.id);
    sch.blocks.filter((b) => b.kind === "conflict").forEach((b, i) => {
      const c = sch.carers.find((x) => x.id === b.row);
      if (!c) return;
      const raised = 6 * 60 + 5 + i * 3 + OFFICES.indexOf(o) * 4;
      rows.push(b.ctype === "Double booking"
        ? { type: "Double booking", office: o.id, raised, title: <span>{carerLink(c)} double booked {SCHED_DAYS[b.day]} {span(b.start, b.mins)}</span>, detail: (b.note || "Two visits overlap") + ". One visit needs another carer.", impact: minsLabel(b.mins) + (b.day === 0 ? " today" : " tomorrow"), todayH: b.day === 0 ? b.mins / 60 : 0, status0: "Open", go: ["Rostering", "Scheduler"] }
        : { type: "Travel conflict", office: o.id, raised, title: <span>{carerLink(c)} cannot reach the next visit in time</span>, detail: (b.note || "Travel gap too short") + ", " + SCHED_DAYS[b.day] + " " + hhmm(b.start) + ".", impact: "Late arrival risk", todayH: 0, status0: "Open", go: ["Rostering", "Scheduler"] });
    });
  }
  /* Compliance restrictions: expired items, plus Aoife when her PMH lapses. */
  EXPIRED.forEach((it, i) => {
    rows.push({ type: "Compliance restriction", office: it.office, raised: 6 * 60 + i * 2, title: <span>{nameLink(it.carer)}: {it.requirement} expired</span>, detail: "Expired " + Math.abs(it.daysRemaining || 0) + " days ago. Restricted from new visits until a renewed record is verified.", impact: it.futureVisits + " visits in 30 days", todayH: 0, status0: i % 2 ? "In progress" : "Open", go: ["Compliance", "Expiries"] });
  });
  if (aoife) {
    rows.push({ type: "Compliance restriction", office: "Galway", raised: NOW_MINS - 6, title: <span>{carerLink(AOIFE)}: Patient Manual Handling expired</span>, detail: "Restricted from manual-handling visits. 4 visits today need reassignment, 38 in the next 30 days are flagged.", impact: fmtH(sumBy(AOIFE_UPCOMING_VISITS, (v) => v.mins) / 60) + "h today", todayH: sumBy(AOIFE_UPCOMING_VISITS, (v) => v.mins) / 60, status0: "Open", go: ["Rostering", "Scheduler"] });
  }
  /* No available cover: unfilled visits with no eligible carer (or the fewest). */
  const q = unfilledQueue("All", aoife).map((x) => ({ v: x.v, n: eligibleFor(x.v, aoife).length })).filter((x) => x.n <= 2).sort((a, b) => a.n - b.n || b.v.mins - a.v.mins).slice(0, 3);
  q.forEach(({ v, n }) => {
    rows.push({ type: "No available cover", office: v.office, raised: 9 * 60 + 30 + (v.start % 60), title: <span><RecLink to={{ kind: "visit", id: v.id }}>{v.id}</RecLink> at {hhmm(v.start)} has {n === 0 ? "no eligible carer" : "only " + n + " eligible carer" + (n > 1 ? "s" : "")}</span>, detail: v.requiredSkill + ", " + minsLabel(v.mins) + ", client " + v.client + ". " + (n === 0 ? "No compliant carer in " + v.office + " is free with contract hours left." : "Nobody else in " + v.office + " is free, compliant and within contract hours."), impact: fmtH(v.mins / 60) + "h today", todayH: v.mins / 60, status0: "Open", go: ["Rostering", "Unfilled Hours"] });
  });
  const out = rows.sort((a, b) => b.raised - a.raised).map((r, i) => ({ ...r, id: "RX-" + (4100 + rows.length - i) }));
  EX_CACHE.set(key, out);
  return out;
}

function Exceptions() {
  const s = useWc();
  const l = useLocal();
  const [type, setType] = useState<"all" | ExType>("all");
  const scoped = byOffice(buildExceptions(s.aoifeExpired), s.office);
  const stOf = (r: ExRow): ExStatus => l.ex[r.id] || r.status0;
  const shown = type === "all" ? scoped : scoped.filter((r) => r.type === type);
  const open = scoped.filter((r) => stOf(r) !== "Resolved");
  const atRisk = sumBy(open, (r) => r.todayH);
  const next: Record<ExStatus, { label: string; to: ExStatus; kind: "primary" | "ghost" }[]> = {
    "Open": [{ label: "Take", to: "In progress", kind: "primary" }],
    "In progress": [{ label: "Offer cover", to: "Awaiting reply", kind: "ghost" }, { label: "Resolve", to: "Resolved", kind: "primary" }],
    "Awaiting reply": [{ label: "Resolve", to: "Resolved", kind: "primary" }],
    "Resolved": [{ label: "Reopen", to: "Open", kind: "ghost" }],
  };
  const typeTone = (t: ExType): Tone => (t === "Compliance restriction" || t === "No available cover" || t === "Double booking" ? "bad" : t === "Client cancellation" ? "info" : "warn");

  return (
    <>
      <ScopeBar title="Roster exceptions" sub="Sickness, cancellations, conflicts, restrictions and gaps that break today's or tomorrow's roster. Each has an owner; every action is taken by a person." />
      <KpiStrip items={[
        { label: "Open exceptions", value: open.length, tone: open.length ? "warn" : "ok", sub: scoped.length + " raised today" },
        { label: "Care hours at risk today", value: fmtH(atRisk), tone: "bad", sub: "From open exceptions" },
        { label: "No available cover", value: open.filter((r) => r.type === "No available cover").length, tone: "bad", onClick: () => setType("No available cover") },
        { label: "Compliance restrictions", value: open.filter((r) => r.type === "Compliance restriction").length, tone: "bad", onClick: () => setType("Compliance restriction") },
        { label: "Conflicts", value: open.filter((r) => r.type === "Double booking" || r.type === "Travel conflict").length, tone: "warn", sub: "Double booking and travel" },
        { label: "Replacement opportunities", value: open.filter((r) => r.opportunity).length, tone: "info", sub: "Carers freed by cancellations", onClick: () => setType("Client cancellation") },
      ]} />
      <div style={{ marginTop: 12 }}>
        <Panel title="Exception queue" meta={shown.length + " shown · owner is the office coordinator"}>
          <Filters<"all" | ExType> value={type} onChange={setType} options={[{ id: "all", label: "All", count: scoped.length }, ...EX_TYPES.map((t) => ({ id: t, label: t, count: scoped.filter((r) => r.type === t).length }))]} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginTop: 12, alignItems: "start" }}>
            {EX_STATUSES.map((st) => {
              const col = shown.filter((r) => stOf(r) === st);
              return (
                <div key={st} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8, padding: 8, maxHeight: 700, overflowY: "auto", background: "var(--surface-faint)", border: "1px solid var(--border)", borderRadius: "var(--r-md,12px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
                    <Chip tone={st === "Open" ? "bad" : st === "In progress" ? "warn" : st === "Awaiting reply" ? "info" : "ok"}>{st}</Chip>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--faint)" }}>{col.length}</span>
                  </div>
                  {col.length === 0 && <div style={{ ...note, padding: "14px 6px", textAlign: "center" }}>Nothing {st.toLowerCase()}.</div>}
                  {col.map((r) => (
                    <div key={r.id} className="wc-card" style={{ padding: "10px 11px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", opacity: st === "Resolved" ? 0.65 : 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Chip tone={typeTone(r.type)} style={{ height: 19, fontSize: 10, padding: "0 7px" }}>{r.type}</Chip>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--faint)" }}>{r.id} · {hhmm(r.raised)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, marginTop: 7, lineHeight: 1.4 }}>{r.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 4, lineHeight: 1.45 }}>{r.detail}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, fontSize: 11 }}>
                        <span style={{ fontFamily: MONO, color: r.todayH ? "var(--bad)" : "var(--dim)" }}>{r.impact}</span>
                        <span style={{ flex: 1 }} />
                        <span style={{ color: "var(--faint)" }}>{r.office} · {coord(r.office)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                        {next[st].map((n) => <Btn key={n.label} kind={n.kind} onClick={() => act.setEx(r.id, n.to)} style={{ height: 25, padding: "0 9px", fontSize: 11.5 }}>{n.label}</Btn>)}
                        <span style={{ flex: 1 }} />
                        {r.go && <GoLink page={r.go[0]} sub={r.go[1]}>{r.go[1]}</GoLink>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <Grid cols="minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)">
          <Panel title="Open by type">
            <Bars fmtValue={(n) => String(n)} data={EX_TYPES.map((t) => ({ label: t, value: open.filter((r) => r.type === t).length, color: TONE[typeTone(t)].ink, onClick: () => setType(t) })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value)} />
          </Panel>
          <Panel title="Open by owner">
            {officesIn(s.office).map((o) => {
              const n = open.filter((r) => r.office === o.id).length;
              return (
                <ListRow key={o.id} title={coord(o.id)} meta={o.id + " coordinator"}
                  right={<span style={{ fontFamily: MONO, fontSize: 12, color: n ? "var(--warn)" : "var(--faint)" }}>{n}</span>} />
              );
            })}
          </Panel>
          <Panel title="Latest raised" meta="Detected by Ops Watchdog and Roster Optimiser">
            <AgentNote agent="Ops Watchdog">Raises an exception when a visit loses its carer, clashes or loses compliance. Owners decide the fix.</AgentNote>
            <div style={{ marginTop: 10 }}>
              <Timeline items={scoped.slice(0, 5).map((r) => ({ when: hhmm(r.raised), who: r.office, tone: typeTone(r.type), text: <span>{r.type}: {r.title}</span> }))} />
            </div>
          </Panel>
      </Grid>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Module                                                               */
/* ------------------------------------------------------------------ */

export default function Rostering() {
  const s = useWc();
  const sub = s.sub["Rostering"];
  return (
    <Page>
      {sub === "HSE Requests" ? <HseRequests />
        : sub === "Scheduler" ? <Scheduler />
        : sub === "Unfilled Hours" ? <UnfilledHours />
        : sub === "Availability" ? <Availability />
        : sub === "Exceptions" ? <Exceptions />
        : <Overview />}
    </Page>
  );
}
