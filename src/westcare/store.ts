/* Shared Westcare demo state. Every module reads the same store, so one
   decision (a reconciliation approval, a compliance change) ripples to Home,
   Work, Activity, Agents and Records at once. Frontend only, nothing persists. */
import { useSyncExternalStore } from "react";
import {
  AOIFE, CRITICAL, EXCEPTIONS, EXPIRED, HANDOFFS, K, RESTRICTED_CARER_IDS, type OfficeFilter,
} from "./model";

export type ModuleId = "Recruitment" | "Compliance" | "Rostering" | "Care Delivery" | "Billing & Payroll" | "Dashboard";

export const SUBPAGES: Record<ModuleId, string[]> = {
  "Dashboard": ["Executive", "Workforce", "Service Delivery", "Finance"],
  "Recruitment": ["Overview", "Pipeline", "Sources", "Candidates", "Handoffs", "Open Roles", "Recruitment Events"],
  "Compliance": ["Overview", "Expiries", "Garda Vetting", "Training", "Vehicle Documents", "Audit Readiness"],
  "Rostering": ["Overview", "HSE Requests", "Scheduler", "Unfilled Hours", "Availability", "Exceptions"],
  "Care Delivery": ["Today", "Visits", "Clients", "Cancellations", "Time Verification", "Exceptions"],
  "Billing & Payroll": ["Overview", "Verified Hours", "Billing Exceptions", "Payroll Exceptions", "Reconciliation"],
};

export type ReconAction = "Approve Recorded Time" | "Approve Scheduled Time" | "Request Clarification" | "Mark Cancelled";
export type DrawerRef =
  | { kind: "carer"; id: string } | { kind: "candidate"; id: string } | { kind: "visit"; id: string }
  | { kind: "client"; id: string } | { kind: "hse"; id: string } | { kind: "office"; id: string };

export type LogEntry = { at: string; actor: string; text: string; stream: "data" | "people" | "ai"; related: string };

type State = {
  office: OfficeFilter;
  sub: Record<ModuleId, string>;
  drawer: DrawerRef | null;
  /* the cross-system scenario: Aoife's Patient Manual Handling lapses */
  aoifeExpired: boolean;
  recon: Record<string, { action: ReconAction; by: string; at: string }>;
  rosterDecisions: Record<string, "approved" | "declined">;
  handoffAccepted: Record<string, string>;
  reminded: Record<string, string>;
  log: LogEntry[];
  selectedVisit: string;
};

const initial: State = {
  office: "All",
  sub: Object.fromEntries(Object.entries(SUBPAGES).map(([k, v]) => [k, v[0]])) as Record<ModuleId, string>,
  drawer: null,
  aoifeExpired: false,
  recon: {},
  rosterDecisions: {},
  handoffAccepted: {},
  reminded: {},
  log: [],
  selectedVisit: "VIS-10482",
};

let state: State = initial;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<State> | ((s: State) => Partial<State>)) => {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  emit();
};
const clock = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const toTop = () => { if (typeof document !== "undefined") { const el = document.querySelector("[data-scroll-main]"); if (el) el.scrollTop = 0; } };
const log = (e: Omit<LogEntry, "at">) => set((s) => ({ log: [{ ...e, at: clock() }, ...s.log].slice(0, 40) }));

/* PulseLogic registers its router here so module pages can deep-link. */
let navigator: (page: string) => void = () => {};
export const registerNavigator = (fn: (page: string) => void) => { navigator = fn; };

export const wc = {
  get: () => state,
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  setOffice: (office: OfficeFilter) => set({ office }),
  setSub: (m: ModuleId, sub: string) => { set((s) => ({ sub: { ...s.sub, [m]: sub } })); toTop(); },
  /** Jump to a module (and optionally a subpage), keeping the office filter. */
  go: (page: ModuleId | string, sub?: string) => {
    if (sub && (SUBPAGES as Record<string, string[]>)[page]) set((s) => ({ sub: { ...s.sub, [page as ModuleId]: sub } }));
    set({ drawer: null });
    navigator(page);
    toTop();
  },
  open: (ref: DrawerRef) => set({ drawer: ref }),
  close: () => set({ drawer: null }),
  selectVisit: (id: string) => set({ selectedVisit: id }),

  setAoifeExpired: (on: boolean) => {
    set({ aoifeExpired: on });
    if (on) {
      log({ stream: "data", actor: "GSW Training", text: "Aoife Byrne's Patient Manual Handling passed its expiry date without a renewal record.", related: "Aoife Byrne" });
      log({ stream: "ai", actor: "Compliance Agent", text: "Restricted Aoife Byrne from manual-handling visits and flagged 38 future visits for review.", related: "Aoife Byrne" });
      log({ stream: "ai", actor: "Roster Optimiser", text: "4 of Aoife Byrne's visits today now need cover. Alternatives prepared for Niamh Kelly to approve.", related: "Galway" });
    } else {
      log({ stream: "people", actor: "Rachel Byrne", text: "Verified Aoife Byrne's renewed Patient Manual Handling certificate. Restriction lifted.", related: "Aoife Byrne" });
    }
  },
  reconcile: (visitId: string, action: ReconAction) => {
    set((s) => ({ recon: { ...s.recon, [visitId]: { action, by: "Martin Murphy", at: clock() } } }));
    log({ stream: "people", actor: "Martin Murphy", text: visitId + ": " + action.toLowerCase() + ". " + (action === "Request Clarification" ? "Billing and payroll stay held." : "Released to billing and payroll."), related: visitId });
  },
  decideRoster: (id: string, d: "approved" | "declined", label: string) => {
    set((s) => ({ rosterDecisions: { ...s.rosterDecisions, [id]: d } }));
    log({ stream: "people", actor: "Sean Doyle", text: (d === "approved" ? "Approved " : "Declined ") + "roster option: " + label + ".", related: "HC-24817" });
  },
  acceptHandoff: (candidateId: string, name: string, by: string) => {
    set((s) => ({ handoffAccepted: { ...s.handoffAccepted, [candidateId]: by } }));
    log({ stream: "people", actor: by, text: "Accepted " + name + "'s recruitment handoff. Onboarding tasks created.", related: name });
  },
  remind: (key: string, who: string, what: string) => {
    set((s) => ({ reminded: { ...s.reminded, [key]: clock() } }));
    log({ stream: "ai", actor: "Compliance Agent", text: "Reminded " + who + " to renew " + what + ".", related: who });
  },
  reset: () => set(initial),
};

export function useWc(): State {
  return useSyncExternalStore(wc.subscribe, wc.get, wc.get);
}

/* Live numbers: the anchors, moved only by decisions made in this session. */
export function live(s: State = state) {
  const resolved = EXCEPTIONS.filter((v) => s.recon[v.id] && s.recon[v.id].action !== "Request Clarification");
  const openExceptions = EXCEPTIONS.length - resolved.length;
  const heldHours = K.heldHours - resolved.reduce((a, v) => a + v.mins, 0) / 60;
  const aoife = s.aoifeExpired;
  const handoffsWaiting = HANDOFFS.filter((h) => h.waitingHours > 12 && !s.handoffAccepted[h.candidate.id]).length;
  const approvedOpts = Object.values(s.rosterDecisions).filter((d) => d === "approved").length;
  return {
    openExceptions,
    heldHours,
    critical: CRITICAL.length - (aoife ? 1 : 0),
    expired: EXPIRED.length + (aoife ? 1 : 0),
    restricted: RESTRICTED_CARER_IDS.size + (aoife ? 1 : 0),
    fullyCompliant: K.activeCarers - RESTRICTED_CARER_IDS.size - (aoife ? 1 : 0),
    unfilled: K.unfilled24 + (aoife ? 4 : 0),
    covered: K.covered24 - (aoife ? 4 : 0),
    handoffsWaiting,
    approvedOpts,
    aoifeExpired: aoife,
    aoifeName: AOIFE.name,
  };
}
export function useLive() { return live(useWc()); }
