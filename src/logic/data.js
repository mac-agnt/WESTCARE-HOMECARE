import { westcareAnswer } from "../westcare/answers";
/* Demo data and pure helpers for the Pulse prototype (Westcare Homecare). */

const INK="var(--ink)", BODY="var(--body)", DIM="var(--dim)", FAINT="var(--faint)";
const LIME="var(--accent)", GREEN="var(--ok)", AMBER="var(--warn)", RED="var(--bad)", NEUTRAL="var(--neutral)";
const MONO="var(--mono)";

const ICONS = {
  navHome:"M12 3.2 3.6 9.1v10a1.5 1.5 0 0 0 1.5 1.5h13.8a1.5 1.5 0 0 0 1.5-1.5v-10L12 3.2Z M8.9 13.1h2l1-2.6 1.5 5 1.1-2.4h1.6",
  navAgents:"M12 2.4v2.3 M12 2.4a.9.9 0 1 0 0-.02 M8.2 6.5h7.6A2.2 2.2 0 0 1 18 8.7v5.1a2.2 2.2 0 0 1-2.2 2.2H8.2A2.2 2.2 0 0 1 6 13.8V8.7a2.2 2.2 0 0 1 2.2-2.2Z M9.9 10.6v1.4 M14.1 10.6v1.4 M6 10h-1.9 M18 10h1.9 M9.2 18.6h5.6 M9.2 21.2h5.6",
  navDash:"M4 5.6h7.2v5.1H4V5.6Z M13.6 5.6H20v8.6h-6.4V5.6Z M4 13.1h7.2v5.3H4v-5.3Z M13.6 16.6H20v1.8h-6.4v-1.8Z",
  navWork:"M9.4 4.4h5.2a1.4 1.4 0 0 1 1.4 1.4v1.1h2.4A1.6 1.6 0 0 1 20 8.5v9.1a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 17.6V8.5a1.6 1.6 0 0 1 1.6-1.6H8V5.8a1.4 1.4 0 0 1 1.4-1.4Z M8 6.9h8 M9.6 13.3l1.8 1.8 3.4-3.6",
  navRecords:"M12 3.6c3.9 0 7 1.1 7 2.5S15.9 8.6 12 8.6 5 7.5 5 6.1 8.1 3.6 12 3.6Z M5 6.1v5.7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6.1 M5 11.8v5.7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5.7",
  navActivity:"M4.6 4.6h14.8A1.6 1.6 0 0 1 21 6.2v11.6a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.8V6.2a1.6 1.6 0 0 1 1.6-1.6Z M6 12.4h2.2l1.5-4.1 2.3 8 1.9-5.4 1.2 1.5H18",
  navAdmin:"M12 2.9 5 5.6v5.9c0 4 2.8 7.1 7 8.6 4.2-1.5 7-4.6 7-8.6V5.6L12 2.9Z M12 8.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z M8.8 16.3a3.6 3.6 0 0 1 6.4 0",
  helios:"M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-4-.8L3 21l1.9-4.9A8.3 8.3 0 0 1 4 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z M8 12h1.6l1.2-2.6 1.6 5 1.4-2.4H16",
  inbox:"M3 13h4l1.5 3h7l1.5-3h4 M3 13l2.4-7A2 2 0 0 1 7.3 4.6h9.4a2 2 0 0 1 1.9 1.4L21 13v4.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V13Z",
  work:"M6 4.6h12a1.6 1.6 0 0 1 1.6 1.6v12.2A1.6 1.6 0 0 1 18 20H6a1.6 1.6 0 0 1-1.6-1.6V6.2A1.6 1.6 0 0 1 6 4.6Z M8.4 10.4l1.9 1.9 3.9-3.9 M8.4 15.6h7.2",
  approvals:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  insights:"M4.5 19.5V13 M9.7 19.5V7.5 M14.9 19.5v-8 M20 19.5V5",
  people:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  orgs:"M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5 M7.5 15.5h2.5",
  teams:"M9 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 12Z M16.5 12.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M2.6 19.6c.8-2.8 3.2-4.4 6.4-4.4s5.6 1.6 6.4 4.4 M17 15.4c2.2.4 3.7 1.8 4.3 4.2",
  locations:"M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z",
  visits:"M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z M9 13.5l1.6 1.6 3.4-3.4",
  autos:"M18.5 8.5A5 5 0 0 0 8.9 7.3 3.8 3.8 0 0 0 6 14.6 M8 17.5l3.2 3.2 M11.2 20.7l3.2-3.2 M11.2 20.7V9.6",
  health:"M3 12.5h3.4l2-5 3 10 2.2-5H21",
  modules:"M6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v10.8a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V6.6a2.2 2.2 0 0 1 2.2-2.2Z M4.4 9.6h15.2 M9.6 19.6V9.6",
  agents:"M8.5 3.6h7A2.4 2.4 0 0 1 17.9 6v5.6a2.4 2.4 0 0 1-2.4 2.4h-7A2.4 2.4 0 0 1 6.1 11.6V6a2.4 2.4 0 0 1 2.4-2.4Z M9.6 8.2h.01 M14.4 8.2h.01 M12 14v2.6 M7.6 20.4h8.8 M12 16.6c-2.4 0-4.4 1.7-4.4 3.8h8.8c0-2.1-2-3.8-4.4-3.8Z",
  dash:"M4.4 4.4h6v6h-6v-6Z M13.6 4.4h6v3.6h-6V4.4Z M13.6 11.6h6v8h-6v-8Z M4.4 14h6v5.6h-6V14Z",
  files:"M5 7.2a1.8 1.8 0 0 1 1.8-1.8h3l1.8 2.2h5.6A1.8 1.8 0 0 1 19 9.4v7.4a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 16.8V7.2Z",
  pulseLine:"M2.5 12.5h3.6l2.1-6.4 3.2 12.2 2.6-8.4 1.8 2.6h5.7",
  records:"M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2 M9 12.4h6 M9 16h4",
  tree:"M4.5 6h5 M4.5 12h5 M4.5 18h5 M12.5 6h7 M12.5 12h7 M12.5 18h7",
  graph:"M7 7.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M17.6 10.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M9.4 21.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M8.6 6.4l7.6 2.6 M15.8 11.4l-5.6 5.2",
  bell:"M6 8.5a6 6 0 0 1 12 0c0 6.5 2.6 8.5 2.6 8.5H3.4S6 15 6 8.5Z M10.3 20.5a1.94 1.94 0 0 0 3.4 0",
  navRecruit:"M10 11.2a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z M3.6 19.6c.8-3 3.3-4.8 6.4-4.8 1.5 0 2.9.4 4 1.2 M18 13.6v6 M15 16.6h6",
  navCompliance:"M12 3.2 19.5 6v5.8c0 4.2-3.1 7.4-7.5 8.9-4.4-1.5-7.5-4.7-7.5-8.9V6L12 3.2Z M8.8 12.1l2.3 2.3 4.2-4.4",
  navRoster:"M4.5 6.4h15v13.1h-15V6.4Z M4.5 10.2h15 M8.5 4v4 M15.5 4v4 M7.5 13.4h3 M13.5 13.4h3 M7.5 16.4h3",
  navCare:"M3.5 11.2 12 4.2l8.5 7 M6 9.6v10h12v-10 M12 17.4s-3-1.9-3-3.9a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2-3 3.9-3 3.9Z",
  navBilling:"M6.4 3.6h11.2v16.8l-2.8-1.6-2.8 1.6-2.8-1.6-2.8 1.6V3.6Z M9.2 8.4h5.6 M9.2 11.6h5.6 M9.2 14.8h3.2"
};

const REC_SECTIONS = [
  {id:"contacts", label:"Contacts", blurb:"Every person Westcare works with: office teams, carers, candidates and partners."},
  {id:"files", label:"Files", blurb:"Garda Vetting, training certificates, vehicle documents, HSE packages and policies, indexed where Helios can read them."},
  {id:"ontology", label:"Ontology", blurb:"How every Westcare record connects, from HSE request to carer to verified hour."}
];

const CONTACTS = [
  ["Martin Murphy","Leadership","martin@westcarehomecare.ie","Westcare Homecare","leadership","var(--accent)"],
  ["Niamh Kelly","Galway Operations Coordinator","niamh.kelly@demo.westcare","Galway office","staff","#9fd6f0"],
  ["Sean Doyle","Mayo Operations Coordinator","sean.doyle@demo.westcare","Mayo office","staff","#e6c78a"],
  ["Emma Brennan","Sligo Operations Coordinator","emma.brennan@demo.westcare","Sligo office","staff","#c8b4f0"],
  ["Rachel Byrne","Compliance Manager","rachel.byrne@demo.westcare","Central","staff","#a8e0c0"],
  ["Daniel Walsh","Recruitment Lead","daniel.walsh@demo.westcare","Central","staff","#f0c04b"],
  ["Laura Martin","Payroll Administrator","laura.martin@demo.westcare","Central","staff","#9fd6f0"],
  ["Aoife Byrne","Healthcare Assistant","aoife.byrne@demo.westcare","Galway office","attention","#e6c78a"],
  ["Liam Walsh","Healthcare Assistant","liam.walsh@demo.westcare","Sligo office","attention","#e2a08c"],
  ["Róisín Tierney","Healthcare Assistant","roisin.tierney@demo.westcare","Galway office","carer","#c8b4f0"],
  ["Sarah O'Neill","Candidate · Healthcare Assistant","via Cezanne HR","Galway office","candidate","#a8e0c0"],
  ["Ahmed Hassan","Candidate · Healthcare Assistant","via Cezanne HR","Mayo office","candidate","#9fd6f0"],
  ["GSW Recruitment & Training","Training partner","training records feed","GSW Training","partner","#f0c04b"]
];

const FILE_TREE = [
  {type:"folder", id:"f-comp", name:"Compliance", depth:0},
  {type:"file", id:"fl-1", name:"Aoife Byrne · Patient Manual Handling cert.pdf", depth:1, parent:"f-comp", indexed:true,
   path:"Compliance / Training / Galway", title:"Aoife Byrne · Patient Manual Handling",
   facts:[["TYPE","PDF · 1 page"],["EXPIRES","4 Oct 2026"],["INDEXED","Yes"],["OWNER","Niamh Kelly"]],
   body:["Certificate issued by GSW Recruitment & Training Solutions. Valid for two years; expires in 6 days.",
     "Aoife has 38 visits in the next 30 days, most of them personal care that needs a valid manual handling certificate.",
     "The Compliance Agent sent the renewal reminder at 08:12. A person verifies the new certificate when it arrives."],
   links:[["Aoife Byrne","person"],["Patient Manual Handling","requirement"],["Compliance Renewal","workflow"]]},
  {type:"file", id:"fl-2", name:"Aoife Byrne · Garda Vetting disclosure.pdf", depth:1, parent:"f-comp", indexed:true,
   path:"Compliance / Garda Vetting / Galway", title:"Aoife Byrne · Garda Vetting disclosure",
   facts:[["TYPE","PDF · 2 pages"],["EXPIRES","16 Oct 2026"],["INDEXED","Yes"],["OWNER","Rachel Byrne"]],
   body:["National Vetting Bureau disclosure on file. Renewal application started on 24 September; 18 days remain.",
     "Only a person marks vetting as complete. Pulse tracks the stage and chases the link."],
   links:[["Aoife Byrne","person"],["Garda Vetting","requirement"]]},
  {type:"file", id:"fl-3", name:"Liam Walsh · Car insurance certificate.pdf", depth:1, parent:"f-comp", indexed:true,
   path:"Compliance / Vehicle / Sligo", title:"Liam Walsh · Car insurance certificate",
   facts:[["TYPE","PDF · 1 page"],["EXPIRES","4 Oct 2026"],["INDEXED","Yes"],["OWNER","Emma Brennan"]],
   body:["Business-use cover expires in 6 days. The NCT expires in 29 days.",
     "Liam drives to 42 visits in the next 30 days around Tubbercurry. A renewed certificate has been requested."],
   links:[["Liam Walsh","person"],["Car Insurance","requirement"]]},
  {type:"folder", id:"f-hse", name:"HSE requests", depth:0},
  {type:"file", id:"fl-4", name:"HC-24817 · Castlebar North home support.pdf", depth:1, parent:"f-hse", indexed:true,
   path:"HSE requests / Mayo", title:"HC-24817 · Castlebar North",
   facts:[["TYPE","PDF · 4 pages"],["WEEKLY HOURS","240"],["ALLOCATED","176"],["OWNER","Sean Doyle"]],
   body:["Home support request for 14 clients in Castlebar North, 240 hours per week.",
     "176 hours are allocated and 64 remain unfilled. The Roster Optimiser has prepared 4 coverage options for Sean Doyle to approve."],
   links:[["HC-24817","hse"],["Mayo office","office"]]},
  {type:"folder", id:"f-rec", name:"Recruitment", depth:0},
  {type:"file", id:"fl-5", name:"Sarah O'Neill · handoff pack.pdf", depth:1, parent:"f-rec", indexed:true,
   path:"Recruitment / Handoffs / Galway", title:"Sarah O'Neill · handoff pack",
   facts:[["TYPE","PDF · 3 pages"],["SOURCE","Indeed via Cezanne"],["SENT","19 hours ago"],["OWNER","Orla Fahy"]],
   body:["Handoff summary prepared by the Recruitment Agent: interview notes, references received, Garda Vetting application started.",
     "Waiting for Galway to accept. Onboarding is 3 of 8 tasks complete."],
   links:[["Sarah O'Neill","person"],["Candidate Handoff","workflow"]]},
  {type:"folder", id:"f-pol", name:"Policies", depth:0},
  {type:"file", id:"fl-6", name:"Visit verification policy v3.docx", depth:1, parent:"f-pol", indexed:false,
   path:"Policies / Operations", title:"Visit verification policy v3",
   facts:[["TYPE","DOCX · 6 pages"],["ADDED","2 Jun 2026"],["INDEXED","Not indexed"],["OWNER","Martin Murphy"]],
   body:["Sets the tolerance for scheduled against recorded time and who can approve a correction.",
     "Indexing it would let Helios quote the tolerance when a coordinator reviews a duration exception."],
   links:[["Visit Exception Review","workflow"],["Billing Reconciliation","workflow"]]}
];

const ONTO_NODES = [
  ["Office","entity",500,300,1,"Six offices. Every carer, client, request and visit belongs to one."],
  ["Carer","entity",300,190,1,"Healthcare assistants: contracted hours, availability and compliance."],
  ["Client","entity",700,190,1,"Fictional client IDs with a service package. No clinical detail."],
  ["Candidate","entity",250,430,1,"From Cezanne HR through handoff and onboarding to active carer."],
  ["Visit","entity",690,430,1,"Rostered visits with check-in and check-out from the care system."],
  ["Roster","entity",850,320,0,"Assignments a coordinator has approved."],
  ["Billing Record","ledger",390,95,0,"Verified billable hours. Held visits never bill."],
  ["Payroll Record","ledger",620,95,0,"Verified payable hours. Held visits never pay."],
  ["HSE Request","module",860,470,0,"Requested hours per care package, imported daily."],
  ["Compliance Document","entity",140,300,0,"Garda, training, vehicle and personnel evidence."],
  ["works from","predicate",395,240,0,"Carer → Office."],
  ["served by","predicate",605,240,0,"Client → Office."],
  ["becomes","predicate",360,370,0,"Candidate → Carer."],
  ["verifies","predicate",600,370,0,"Visit → Billing and Payroll."],
  ["evidences","predicate",140,372,0,"Document → Compliance requirement."]
];

const ONTO_EDGES = [
  [500,300,300,190],[500,300,700,190],[500,300,250,430],[500,300,690,430],
  [500,300,850,320],[500,300,390,95],[500,300,620,95],[500,300,140,300],
  [300,190,250,430],[700,190,860,470],[690,430,850,320],[690,430,860,470],
  [300,190,140,300],[390,95,620,95]
];

const REC_TEMPLATES = [
  ["Field sheet","Records","Labelled fields in a grid — the default for a person, organisation or location.",
   "M5 5.5h14v13H5v-13Z M5 10h14 M12 10v8.5","grid"],
  ["Contact card","Records","A portrait, key fields and every linked record in one compact panel.",
   "M12 11.5a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z M5.5 19c.8-3 3.3-4.7 6.5-4.7s5.7 1.7 6.5 4.7","card"],
  ["Directory","Records","A sortable table of many records at once, built for lists.",
   "M4.5 6.5h15 M4.5 12h15 M4.5 17.5h15 M4.5 6.5h.01 M4.5 12h.01 M4.5 17.5h.01","rows"],
  ["Timeline","Case work","Ordered events with who did what and when. Good for a case or a claim.",
   "M12 3.5v17 M12 7.5h6 M12 13h-6 M12 18h6","timeline"],
  ["Kanban board","Case work","Cards in columns by status. For anything that moves through stages.",
   "M5 5h4.5v14H5V5Z M9.75 5h4.5v9h-4.5V5Z M14.5 5H19v6h-4.5V5Z","kanban"],
  ["Checklist","Case work","Ticked steps in order, with an owner and a due date on each.",
   "M5 6.5h2l1.4 1.4L11 5.5 M5 12.5h2l1.4 1.4 2.6-2.4 M5 18.5h2l1.4 1.4 2.6-2.4 M15 6.5h4 M15 12.5h4 M15 18.5h4","checklist"],
  ["Ledger","Finance","Rows and running totals. For anything with amounts and dates.",
   "M4 6h16 M4 12h16 M4 18h16 M9 3.5v17","ledger"],
  ["Invoice","Finance","Line items, totals and a status — built to be sent, not just stored.",
   "M7 3.5h10v17H7v-17Z M9.5 8h5 M9.5 11.5h5 M9.5 15h3","invoice"],
  ["Document","Notes","Long-form text with linked records pulled out down the side.",
   "M7 3.5h7l5 5v12H7v-17Z M14 3.7v5h5 M10 13h6 M10 16.5h4","document"],
  ["Gallery","Notes","A wall of images and files with a caption on each — for a site or a job.",
   "M4.5 6h6v6h-6V6Z M13.5 6h6v6h-6V6Z M4.5 14h6v4h-6v-4Z M13.5 14h6v4h-6v-4Z","gallery"],
  ["Map & locations","Ops","A pinboard of places, with the record's fields beside each pin.",
   "M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z M12 12.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z","map"],
  ["Schedule","Ops","A calendar of bookings against this record, with recurring rules.",
   "M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z","schedule"]
];
const REC_TEMPLATE_CATS = ["All","Records","Case work","Finance","Notes","Ops"];

/* ---- admin hub ---- */
/* ---- admin hub: 13 settings areas in five groups ---- */
const PEOPLE = [
  ["Martin Murphy","Leadership","martin@westcarehomecare.ie","All offices","active","Admin","Now"],
  ["Rachel Byrne","Compliance Manager","rachel.byrne@demo.westcare","Central","active","Manager","6 min ago"],
  ["Daniel Walsh","Recruitment Lead","daniel.walsh@demo.westcare","Central","active","Manager","12 min ago"],
  ["Niamh Kelly","Galway Operations Coordinator","niamh.kelly@demo.westcare","Galway","active","Manager","2 min ago"],
  ["Sean Doyle","Mayo Operations Coordinator","sean.doyle@demo.westcare","Mayo","active","Manager","9 min ago"],
  ["Emma Brennan","Sligo Operations Coordinator","emma.brennan@demo.westcare","Sligo","active","Manager","31 min ago"],
  ["Laura Martin","Payroll Administrator","laura.martin@demo.westcare","Central","active","Standard","1 h ago"],
  ["Orla Fahy","Recruiter","orla.fahy@demo.westcare","Central","active","Standard","18 min ago"]
];
const ROLE_LEVELS = ["Admin","Manager","Standard","External"];
const PERM_KEYS = [["view","View records"],["edit","Edit records"],["approve","Approve payments"]];
const GRANT_DEFS = [
  ["view","View records","Read anything in scope"],
  ["edit","Edit records","Create and change records"],
  ["approve","Approve decisions","Say yes to parked work"],
  ["pay","Release payments","Send money out"],
  ["export","Export data","Download and share out"],
  ["agents","Manage agents","Create and grant agents"],
  ["settings","Change settings","Modules, roles, integrations"],
  ["audit","Read the audit log","Every action, everyone"]
];
const ROLE_SCOPES = ["All records","Their location","Assigned only"];
const DEFAULT_PERMS = {Admin:{view:true,edit:true,approve:true}, Manager:{view:true,edit:true,approve:true},
  Standard:{view:true,edit:true,approve:false}, External:{view:true,edit:false,approve:false}};
const INTEGRATIONS = [
  {name:"Cezanne HR", blurb:"Recruitment and applicant tracking (known internally as Occupop). New applications flow into the Pulse pipeline within minutes.", tint:"#6ad0f0", status:"connected", statusKind:"ok",
   glyph:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
   lastSync:"4 min ago", usage:"14 applications this morning", auth:"API key", scopes:["Read"]},
  {name:"Indeed", blurb:"Connected through the recruitment workflow: Indeed applications arrive in Cezanne and continue into Pulse.", tint:"#8fa6ff", status:"via Cezanne", statusKind:"ok",
   glyph:"M12 4.5v15 M8 9.5l4-5 4 5",
   lastSync:"4 min ago", usage:"81 applicants this week", auth:"Through Cezanne", scopes:["Read"]},
  {name:"Westcare Careers", blurb:"Applications from the Westcare website careers page.", tint:"#e8dccc", status:"connected", statusKind:"ok",
   glyph:"M4 6.5h16v11H4v-11Z M4 10h16 M7 8.2h.01",
   lastSync:"22 min ago", usage:"9 applicants this week", auth:"Webhook", scopes:["Read"]},
  {name:"GSW Training", blurb:"Training records from GSW Recruitment & Training Solutions: QQI, manual handling and mandatory modules.", tint:"#f0c04b", status:"training records", statusKind:"ok",
   glyph:"M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z M7 11.6v4.2c1.4 1.3 3.1 2 5 2s3.6-.7 5-2v-4.2",
   lastSync:"1 h ago", usage:"Nightly completions", auth:"SFTP import", scopes:["Read"]},
  {name:"Current Care Management System", blurb:"Rostered visits plus check-in and check-out events from the carers' mobile app. Pulse verifies; it does not track location itself.", tint:"#5fe0a8", status:"connected", statusKind:"ok",
   glyph:"M8 4v3 M16 4v3 M4.5 9.5h15 M6.4 6h11.2A1.9 1.9 0 0 1 19.5 8v10a1.9 1.9 0 0 1-1.9 1.9H6.4A1.9 1.9 0 0 1 4.5 18V8A1.9 1.9 0 0 1 6.4 6Z M9 13.5l1.6 1.6 3.4-3.4",
   lastSync:"1 min ago", usage:"126 visit events last sync", auth:"API key", scopes:["Read"]},
  {name:"HSE Care Requests", blurb:"Requested home-care hours per care package, imported as a data feed.", tint:"#9fd6f0", status:"data feed", statusKind:"warn",
   glyph:"M6.4 3.6h7.4l4.2 4.2v12.6H6.4V3.6Z M13.4 3.8v4.2h4.2 M9 12.4h6 M9 16h4",
   lastSync:"06:00 today", usage:"149 active requests", auth:"File import", scopes:["Read"]},
  {name:"Email", blurb:"Reminders, handoff packs and candidate follow-ups. Drafts from agents wait for a person where required.", tint:"#f07a9d", status:"connected", statusKind:"ok",
   glyph:"M4 7.2 12 13 20 7.2 M4 7.2v10.6h16V7.2 M4 7.2 8.5 4h7L20 7.2",
   lastSync:"2 min ago", usage:"212 emails today", auth:"OAuth 2.0", scopes:["Read","Send"]},
  {name:"Payroll System", blurb:"Receives verified payroll hours only. Held visits never export.", tint:"#c8b4f0", status:"export only", statusKind:"warn",
   glyph:"M5 6.5h14v11H5v-11Z M5 10h14 M8.5 14h3",
   lastSync:"Fri 17:00", usage:"Weekly export", auth:"File export", scopes:["Write"]},
  {name:"Finance System", blurb:"Receives verified billable hours only, after reconciliation.", tint:"#a8e0c0", status:"export only", statusKind:"warn",
   glyph:"M4.5 19.5V13 M9.7 19.5V7.5 M14.9 19.5v-8 M20 19.5V5",
   lastSync:"Fri 17:00", usage:"Weekly export", auth:"File export", scopes:["Write"]}
];

/* Background catalogue. Each entry is pure CSS so a tile is the real thing at
   thumbnail size, not a picture of it. */
const BG_DEFS = [
  {id:"bloom", name:"Bloom", cat:"Signature",
   css:"background:radial-gradient(60% 48% at 50% 34%, var(--accent-faint), transparent 72%), radial-gradient(44% 38% at 16% 84%, rgba(255,255,255,.05), transparent 70%)",
   thumb:"background:radial-gradient(62% 58% at 46% 34%, var(--accent-soft), transparent 74%), radial-gradient(50% 46% at 82% 84%, rgba(255,255,255,.08), transparent 72%), var(--surface-2)"},
  {id:"mist", name:"Mist", cat:"Signature",
   css:"background:radial-gradient(52% 44% at 24% 22%, rgba(255,255,255,.07), transparent 70%), radial-gradient(56% 46% at 80% 76%, rgba(255,255,255,.05), transparent 72%)",
   thumb:"background:radial-gradient(58% 52% at 24% 22%, rgba(255,255,255,.16), transparent 72%), radial-gradient(60% 54% at 82% 78%, rgba(255,255,255,.10), transparent 74%), var(--surface-2)"},
  {id:"grid", name:"Grid", cat:"Signature",
   css:"background-image:linear-gradient(var(--border) 1px, transparent 1px),linear-gradient(90deg, var(--border) 1px, transparent 1px);background-size:56px 56px;mask-image:radial-gradient(62% 56% at 50% 46%, #000, transparent 78%);-webkit-mask-image:radial-gradient(62% 56% at 50% 46%, #000, transparent 78%)",
   thumb:"background-color:var(--surface-2);background-image:linear-gradient(var(--border-strong) 1px, transparent 1px),linear-gradient(90deg, var(--border-strong) 1px, transparent 1px);background-size:14px 14px"},
  {id:"none", name:"None", cat:"Signature", css:"", thumb:"background:var(--surface-2)"},

  {id:"aurora", name:"Aurora", cat:"Gradient",
   css:"background:radial-gradient(70% 52% at 18% 8%, var(--bloom-a), transparent 66%), radial-gradient(64% 48% at 84% 22%, var(--bloom-b), transparent 68%), radial-gradient(70% 60% at 50% 104%, var(--bloom-c), transparent 70%);filter:blur(24px)",
   thumb:"background:radial-gradient(72% 60% at 16% 6%, var(--bloom-a), transparent 68%), radial-gradient(66% 54% at 86% 24%, var(--bloom-b), transparent 70%), radial-gradient(74% 66% at 50% 108%, var(--bloom-c), transparent 72%), var(--surface-2)"},
  {id:"horizon", name:"Horizon", cat:"Gradient",
   css:"background:linear-gradient(180deg, transparent 0%, var(--accent-faint) 58%, transparent 100%), radial-gradient(90% 40% at 50% 72%, var(--accent-soft), transparent 70%)",
   thumb:"background:linear-gradient(180deg, var(--surface-2) 0%, var(--accent-faint) 58%, var(--surface-2) 100%), radial-gradient(90% 44% at 50% 74%, var(--accent-soft), transparent 70%)"},
  {id:"dusk", name:"Dusk", cat:"Gradient",
   css:"background:linear-gradient(200deg, var(--bloom-c) -10%, transparent 46%), linear-gradient(20deg, var(--bloom-b) -10%, transparent 52%);opacity:.5",
   thumb:"background:linear-gradient(200deg, var(--bloom-c) -12%, transparent 48%), linear-gradient(20deg, var(--bloom-b) -12%, transparent 54%), var(--surface-2)"},
  {id:"ember", name:"Ember", cat:"Gradient",
   css:"background:radial-gradient(60% 70% at 84% 96%, var(--bloom-a), transparent 64%), radial-gradient(50% 60% at 10% 96%, var(--bloom-c), transparent 66%)",
   thumb:"background:radial-gradient(64% 76% at 84% 100%, var(--bloom-a), transparent 66%), radial-gradient(54% 66% at 8% 100%, var(--bloom-c), transparent 68%), var(--surface-2)"},

  {id:"mesh", name:"Mesh", cat:"Abstract",
   css:"background-image:radial-gradient(var(--border-strong) 1px, transparent 1px);background-size:22px 22px;mask-image:radial-gradient(70% 62% at 50% 46%, #000, transparent 76%);-webkit-mask-image:radial-gradient(70% 62% at 50% 46%, #000, transparent 76%)",
   thumb:"background-color:var(--surface-2);background-image:radial-gradient(var(--border-strong) 1px, transparent 1px);background-size:8px 8px"},
  {id:"contour", name:"Contour", cat:"Abstract",
   css:"background:repeating-radial-gradient(circle at 30% 110%, transparent 0 22px, var(--border) 22px 23px);mask-image:radial-gradient(80% 70% at 40% 80%, #000, transparent 78%);-webkit-mask-image:radial-gradient(80% 70% at 40% 80%, #000, transparent 78%)",
   thumb:"background:repeating-radial-gradient(circle at 26% 116%, var(--surface-2) 0 9px, var(--border-strong) 9px 10px)"},
  {id:"weave", name:"Weave", cat:"Abstract",
   css:"background:repeating-linear-gradient(48deg, transparent 0 16px, var(--border) 16px 17px), repeating-linear-gradient(-48deg, transparent 0 16px, var(--border) 16px 17px);opacity:.7",
   thumb:"background-color:var(--surface-2);background-image:repeating-linear-gradient(48deg, transparent 0 7px, var(--border-strong) 7px 8px), repeating-linear-gradient(-48deg, transparent 0 7px, var(--border-strong) 7px 8px)"},
  {id:"halo", name:"Halo", cat:"Abstract",
   css:"background:repeating-radial-gradient(circle at 50% 50%, transparent 0 46px, var(--accent-line) 46px 47px);mask-image:radial-gradient(60% 60% at 50% 50%, #000, transparent 72%);-webkit-mask-image:radial-gradient(60% 60% at 50% 50%, #000, transparent 72%)",
   thumb:"background:repeating-radial-gradient(circle at 50% 50%, var(--surface-2) 0 11px, var(--accent-line) 11px 12px)"},
  {id:"drift", name:"Drift", cat:"Abstract",
   css:"background:conic-gradient(from 210deg at 32% 38%, var(--bloom-b), transparent 38%), conic-gradient(from 20deg at 76% 70%, var(--bloom-a), transparent 34%);filter:blur(30px);opacity:.6",
   thumb:"background:conic-gradient(from 210deg at 32% 38%, var(--bloom-b), transparent 38%), conic-gradient(from 20deg at 76% 70%, var(--bloom-a), transparent 34%), var(--surface-2)"},
  {id:"scan", name:"Scanlines", cat:"Abstract",
   css:"background:repeating-linear-gradient(0deg, var(--border) 0 1px, transparent 1px 7px);mask-image:linear-gradient(180deg, #000, transparent 88%);-webkit-mask-image:linear-gradient(180deg, #000, transparent 88%)",
   thumb:"background-color:var(--surface-2);background-image:repeating-linear-gradient(0deg, var(--border-strong) 0 1px, transparent 1px 5px)"}
];

const THEMES = [
  {id:"westcare", label:"Westcare", group:"Dark", bg:"#0d0b0b", surface:"#171413", ink:"#f4eee6", accent:"#e8dccc"},
  {id:"westcare-light", label:"Westcare Light", group:"Light", bg:"#f1eae0", surface:"#ffffff", ink:"#2b211d", accent:"#594a42"},
  {id:"dark", label:"Dark", group:"Dark", bg:"#0b0c0b", surface:"#1a1c19", ink:"#f2f3ef", accent:"#c8f04b"},
  {id:"indigo", label:"Indigo", group:"Dark", bg:"#0a0b13", surface:"#1a1b26", ink:"#f0f1fa", accent:"#8b93ff"},
  {id:"slate", label:"Slate", group:"Dark", bg:"#100e0c", surface:"#211c17", ink:"#f4f0ea", accent:"#e8a14a"},
  {id:"plum", label:"Plum", group:"Dark", bg:"#100a10", surface:"#20151f", ink:"#f6eef4", accent:"#f077b0"},
  {id:"ember", label:"Ember", group:"Dark", bg:"#0b0b0b", surface:"#1c1714", ink:"#f7f3ef", accent:"#f4561a"},
  {id:"harbour", label:"Harbour", group:"Dark", bg:"#0b0e10", surface:"#13171a", ink:"#f3f5f4", accent:"#5ee79a"},
  {id:"cargo", label:"Cargo", group:"Dark", bg:"#0a0a0a", surface:"#1a1c1a", ink:"#f2f5f2", accent:"#4ade80"},
  {id:"ocean", label:"Ocean", group:"Dark", bg:"#080e12", surface:"#141f25", ink:"#eaf4f8", accent:"#4fd4d0"},
  {id:"graphite", label:"Graphite", group:"Dark", bg:"#111112", surface:"#212124", ink:"#f4f4f5", accent:"#f4f4f5"},
  {id:"light", label:"Cream", group:"Light", bg:"#f4f2ed", surface:"#ffffff", ink:"#16181c", accent:"#0071e3"},
  {id:"warm", label:"Warm paper", group:"Light", bg:"#faf5ec", surface:"#fffdf9", ink:"#2a2016", accent:"#c9683f"},
  {id:"mist", label:"Mist", group:"Light", bg:"#eef1f4", surface:"#ffffff", ink:"#141e20", accent:"#0e9f6e"},
  {id:"sand", label:"Sand", group:"Light", bg:"#f6f1e6", surface:"#fffdf7", ink:"#221d12", accent:"#7d5fd6"}
];

const ADMIN_ICONS = {
  people:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9",
  teams:"M9 12a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 12Z M16.5 12.5a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z M2.6 19.6c.8-2.8 3.2-4.4 6.4-4.4s5.6 1.6 6.4 4.4 M17 15.4c2.2.4 3.7 1.8 4.3 4.2",
  structure:"M4.5 20V6.4A1.4 1.4 0 0 1 5.9 5h6.2a1.4 1.4 0 0 1 1.4 1.4V20 M13.5 10.5h4.6A1.4 1.4 0 0 1 19.5 12v8 M3 20h18 M7.5 8.5h2.5 M7.5 12h2.5",
  shield:"M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7",
  agent:"M2 12h4l2.5-6 3.5 12 3-8 2 2h5",
  flow:"M18.5 8.5A5 5 0 0 0 8.9 7.3 3.8 3.8 0 0 0 6 14.6 M8 17.5l3.2 3.2 M11.2 20.7l3.2-3.2 M11.2 20.7V9.6",
  plug:"M9 3.5v5 M15 3.5v5 M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0v-3Z M12 17v3.5",
  modules:"M6.6 4.4h10.8a2.2 2.2 0 0 1 2.2 2.2v10.8a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2V6.6a2.2 2.2 0 0 1 2.2-2.2Z M4.4 9.6h15.2 M9.6 19.6V9.6",
  health:"M3 12.5h3.4l2-5 3 10 2.2-5H21",
  lock:"M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5Z M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3",
  audit:"M8 3.5h8l3.5 3.5v13a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5h2Z M9 12h6 M9 16h4",
  brand:"M12 3.5 14.6 9l6.4.6-4.8 4.2 1.4 6.2-5.6-3.3-5.6 3.3 1.4-6.2L3 9.6 9.4 9 12 3.5Z",
  bell:"M6 8.5a6 6 0 0 1 12 0c0 6.5 2.6 8.5 2.6 8.5H3.4S6 15 6 8.5Z M10.3 20.5a1.94 1.94 0 0 0 3.4 0",
  data:"M4.5 7.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3Z M4.5 7.5v9c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-9 M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"
};

const ADMIN_CARDS = [
  {id:"people", group:"ORGANISATION", title:"People & access", icon:"people", tint:"#6ad0f0",
   blurb:"Invite, suspend and offboard the office and central teams who use Pulse.",
   tags:["19 staff users","6 offices","Central team"], badge:"2 waiting", badgeKind:"warn",
   footer:"Last login checked 4 minutes ago", action:"Review 2 invites",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Add, invite or remove staff users","",""],["Create teams","Central Recruitment, Compliance, Coordinators"],["Assign managers","6 office coordinators"],
     ["Set offices","Sligo · Monaghan · Cavan · Roscommon · Galway · Mayo"],["Suspend accounts","0 suspended"],["View last login","19 people tracked"]]},
  {id:"teams", group:"ORGANISATION", title:"Roles & permissions", icon:"shield", tint:"var(--accent)",
   blurb:"What each role can see and approve, scoped by office.",
   tags:["5 roles","office scope","approval gates"],
   heroLabel:"THE QUESTION THIS ANSWERS", heroAction:"Show me what someone can access",
   heroText:"Pick a person and see every carer, client, visit and export they can reach, resolved through their grants and their office.",
   footer:"Preview Pulse as another user", action:"Open preview",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Coordinators approve rosters for their office","office scope"],["Compliance verifies documents","Compliance team"],
     ["Payroll and billing adjustments","Payroll Administrator + coordinator"],["Hiring decisions","Recruitment Lead + office"],["Preview Pulse as another user",""]]},
  {id:"structure", group:"ORGANISATION", title:"Company structure", icon:"structure", tint:"#f0c04b",
   blurb:"Offices, reporting lines and working hours.",
   tags:["6 offices","Europe/Dublin","EUR"],
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Company details","Westcare Homecare"],["Offices","6"],["Central teams","3"],["Coordinators","6"],
     ["Reporting lines","Coordinators to Leadership"],["Office hours","08:00-18:00, 7 days"],["Holidays","Irish public holidays"],
     ["Default currency and timezone","EUR · Europe/Dublin"]]},

  {id:"agents", group:"CONTROL", title:"Agents & AI controls", icon:"agent", tint:"var(--accent)",
   blurb:"What agents may read, what they may do, and where they must stop.",
   tags:["8 agents","412 actions today","€0.71 spent"],
   heroLabel:"GLOBAL CONTROL", heroAction:"Pause every agent",
   heroText:"One switch stops every agent immediately. Anything mid-run finishes its current step and then holds.",
   footer:"Hiring, rosters, pay and compliance verification always need a person", action:"Review limits",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Create approved agent roles","8 approved"],["Control which data agents can read","by permission"],
     ["Candidate ranking","never allowed", false],["Roster assignment without approval","never allowed", false],
     ["Payroll or billing changes","never allowed", false],["Set spending and usage limits","€40/month cap"],["Manage agent memory and retention","90 days"]]},
  {id:"wf", group:"CONTROL", title:"Workflow controls", icon:"flow", tint:"#9d8cf5",
   blurb:"The guardrails, not the builder. Building happens in Work.",
   tags:["Managers only","6 approval gates","Retry twice"],
   footer:"Building workflows happens in Work", action:"Open Work",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Who can create workflows","Managers only"],["Maximum autonomy","prepares, never decides", true],
     ["Approval rules","6 configured"],["Failure handling","retry twice, then notify"],
     ["Usage limits","500 runs/day"],["Global pause","all workflows", true],["Default notification settings","inbox only"]]},
  {id:"notif", group:"CONTROL", title:"Notifications", icon:"bell", tint:"#f0994b",
   blurb:"Which events reach people, on which channel, and when not to.",
   tags:["Inbox","Email","SMS reminders"],
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Which events trigger notifications","16 of 24 events"],["Email","", true],["SMS to carers","", true],
     ["Mobile push","", false],["In-app","", true],["Escalation rules","coordinator after 12 hours"],
     ["Quiet hours for carers","21:00-07:00"],["Daily briefing","07:00 weekdays"]]},

  {id:"integrations", group:"SYSTEMS", title:"Systems", icon:"plug", tint:"#6ad0f0",
   blurb:"Cezanne, Indeed, the care system, GSW, the HSE feed, email and payroll exports.",
   tags:["7 connected","1 data feed","2 exports"],
   footer:"Care system synced 1 minute ago", action:"View systems",
   listLabel:"CONNECTIONS",
   rows:[["Cezanne HR","connected"],["Indeed","through recruitment workflow"],["Westcare Careers / Website","connected"],["GSW Training","training records"],
     ["Current Care Management System","connected"],["HSE Care Requests","data feed / import"],["Email","connected"],["Payroll System","export"],["Finance System","export"]]},
  {id:"modules", group:"SYSTEMS", title:"Modules & configuration", icon:"modules", tint:"#f0c04b",
   blurb:"Turn modules on, and make Pulse speak Westcare's words.",
   tags:["5 modules","3 renamed terms"],
   heroLabel:"TERMINOLOGY", heroAction:"Edit terminology",
   heroText:"Task reads as Visit where it belongs, Organisation reads as Office, and Package reads as HSE request, everywhere, including what Helios says back.",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Recruitment","on", true],["Compliance","on", true],["Rostering","on", true],["Care Delivery","on", true],["Billing & Payroll","on", true],
     ["Compliance requirements","15 configured"],["Visit tolerance","±10% before review"]]},
  {id:"health", group:"SYSTEMS", title:"Data health", icon:"health", tint:"#e2705c",
   blurb:"What is wrong with the data, how bad it is, and the fix.",
   tags:["5 issue types","61 records affected"], badge:"12 unmatched", badgeKind:"warn",
   footer:"Last scanned 12 minutes ago", action:"Fix 2 automatically",
   listLabel:"ISSUES FOUND",
   trend:[118,104,96,88,79,70,61],
   bySeverity:[["High","14","var(--bad)"],["Medium","29","var(--warn)"],["Low","18","var(--dim)"]],
   issues:[["Visits with no matched carer","12","high","Care system events with an unknown staff ID","Review"],
     ["Candidates missing documents","23","medium","Flagged on import from Cezanne","Review"],
     ["Duplicate client contacts","9","medium","Same phone number on two client records","Fix automatically"],
     ["Training records unmatched","14","low","GSW completions with no Pulse carer","Fix automatically"],
     ["HSE packages without office","3","high","Imported with a region code only","Review"]],
   rows:[]},

  {id:"security", group:"GOVERNANCE", title:"Security", icon:"lock", tint:"#8fa6ff",
   blurb:"Sign-in, sessions, devices and the keys that reach the API.",
   tags:["SSO on","2FA enforced","4 API keys"], badge:"1 advisory", badgeKind:"warn",
   footer:"1 security recommendation open", action:"Review",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Single sign-on","Microsoft 365", true],["Two-factor authentication","enforced", true],
     ["Login policies","12-hour session"],["Active sessions","17"],["Approved devices","24"],
     ["IP restrictions","off", false],["Security alerts","on", true],["API keys","4 active"],
     ["Data retention rules","7 years"]]},
  {id:"audit", group:"GOVERNANCE", title:"Audit log", icon:"audit", tint:"#9d8cf5",
   blurb:"A locked history of who changed what. Searchable, exportable, never editable.",
   tags:["Append-only","7-year retention"],
   footer:"Nobody can edit or delete entries", action:"Export",
   listLabel:"WHAT IS RECORDED",
   rows:[["Compliance verifications","212 this month"],["Roster approvals","1,904"],["Time corrections","318"],
     ["Candidate handoffs","41"],["Agent actions","6,420"],["Data exports","9"],["Admin changes","14"]]},
  {id:"datamgmt", group:"GOVERNANCE", title:"Data management", icon:"data", tint:"#5fe0a8",
   blurb:"Import, export, restore and, carefully, delete.",
   tags:["Backup 02:00","30-day restore"],
   footer:"Last backup completed 02:00 today", action:"Run backup",
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Import data","Cezanne, care system, GSW, HSE feed"],["Export data","full or per module"],["Backup status","healthy · 02:00 daily"],
     ["Restore previous versions","30 days available"],["Merge records","9 candidates"],
     ["Data retention","7 years"],["Delete company data","requires two admins"]]},

  {id:"brand", group:"EXPERIENCE", title:"Branding", icon:"brand", tint:"var(--accent)",
   blurb:"Logo, accent colour and how agents appear.",
   tags:["Westcare cream on brown","2 themes"],
   listLabel:"WHAT YOU CONTROL HERE",
   rows:[["Company logo","westcare-logohead.svg"],["Pulse accent colour","#E8DCCC on #594A42"],
     ["Email templates","6"],["Document templates","3"],["Agent appearance","8 agents"],
     ["Carer-facing reminder branding","on", true]]},
  {id:"appearance", group:"EXPERIENCE", title:"Appearance & themes", icon:"brand", tint:"#6ad0f0",
   blurb:"Pick a light or dark theme for how Pulse looks to you.",
   tags:["Westcare dark","Westcare light"],
   listLabel:"THEMES", rows:[]}
];

const ADMIN_GROUPS = [
  ["ORGANISATION", "repeat(3,1fr)"],
  ["CONTROL", "repeat(3,1fr)"],
  ["SYSTEMS", "repeat(3,1fr)"],
  ["GOVERNANCE", "repeat(3,1fr)"],
  ["EXPERIENCE", "repeat(3,1fr)"]
];

/* ---- activity feeds ---- */
const SRC_TINT = {Cezanne:"#6ad0f0", Pulse:"var(--accent)", "Care System":"#5fe0a8", GSW:"#f0c04b", Email:"#f07a9d",
  HSE:"#9fd6f0", Agent:"var(--accent)"};
const SRC_ABBR = {Cezanne:"CZ", Pulse:"PL", "Care System":"CS", GSW:"GS", Email:"EM", HSE:"HS", Agent:"AI"};

const DATA_EVENTS = [
  ["Cezanne synced 14 new applications","Indeed 9, social 3, website 2. Missing documents flagged on 4.","Cezanne sync","Central Recruitment","Cezanne","completed"],
  ["Care system synced 126 visit events","Check-ins and check-outs from 07:00 to 09:30 across six offices.","Care system sync","All offices","Care System","completed"],
  ["VIS-10482 check-out received","Galway, client MM-1042: 29 minutes recorded against 45 scheduled.","Care system sync","VIS-10482","Care System","completed"],
  ["HSE request import completed","149 active packages imported; HC-24817 still 64 hours short.","HSE feed","HC-24817","HSE","completed"],
  ["GSW training completions imported","11 module completions recorded across Galway, Sligo and Cavan.","GSW import","Training records","GSW","completed"],
  ["Roscommon cancellations received","11 carer and client cancellations between 07:00 and 09:00.","Care system sync","Roscommon","Care System","completed"],
  ["Renewed insurance uploaded","A Sligo carer uploaded a renewed certificate for a person to verify.","Carer upload","Sligo office","Pulse","completed"],
  ["Candidate replied by email","Mateusz Nowak sent his QQI certificate; queued for recruiter check.","Email","Mateusz Nowak","Email","completed"]
];

const PEOPLE_EVENTS = [
  ["Mayo Coordinator reviewed HC-24817","Sean Doyle opened the four coverage options for the 64-hour gap.","Sean Doyle","HC-24817","Pulse","completed"],
  ["Galway received Sarah O'Neill's handoff","Handoff pack from Central Recruitment, waiting 19 hours for acceptance.","Orla Fahy","Sarah O'Neill","Pulse","awaiting"],
  ["Roscommon recovered 6 cancelled visits","Replacement carers confirmed by Ciarán Moran. 5 visits still need cover.","Ciarán Moran","Roscommon","Pulse","completed"],
  ["Compliance verified a Garda disclosure","Rachel Byrne marked a Cavan carer's vetting complete.","Rachel Byrne","Cavan office","Pulse","completed"],
  ["Payroll reviewed held visits","Laura Martin confirmed 43 visits stay held until coordinators decide.","Laura Martin","Billing & Payroll","Pulse","awaiting"],
  ["Recruiter scheduled 6 interviews","Ciara Kelly booked for Thursday 10:30 in Sligo.","Daniel Walsh","Ciara Kelly","Pulse","completed"],
  ["Coordinator approved a roster change","Emma Brennan confirmed cover for two Tubbercurry visits.","Emma Brennan","Sligo office","Pulse","completed"]
];

const AI_EVENTS = [
  ["Compliance Agent reminded Aoife Byrne","Patient Manual Handling renewal, 6 days left, 38 future visits depend on it.","Compliance Agent","Aoife Byrne","Agent","completed"],
  ["Roster Optimiser proposed cover for 18 care hours","Options for Mayo and Galway prepared for coordinator approval.","Roster Optimiser","HC-24817","Agent","awaiting"],
  ["VIS-10482 flagged as a duration exception","45 minutes scheduled, 29 recorded. Galway Coordinator to review.","Visit Integrity Agent","VIS-10482","Agent","completed"],
  ["Billing and payroll placed VIS-10482 on hold","Nothing is paid or invoiced until a coordinator decides.","Reconciliation Agent","VIS-10482","Agent","awaiting"],
  ["Recruitment Agent flagged a stalled handoff","Sarah O'Neill has waited 19 hours for Galway acceptance.","Recruitment Agent","Sarah O'Neill","Agent","working"],
  ["Compliance Agent reminded Liam Walsh","Car insurance expires in 6 days; 42 visits in the next 30 days need a car.","Compliance Agent","Liam Walsh","Agent","completed"],
  ["Ops Watchdog raised a cancellation cluster","Roscommon 07:00 to 09:00: 11 cancellations, 8.5 care hours still at risk.","Ops Watchdog","Roscommon","Agent","working"],
  ["Briefing posted the morning briefing","34 visits need cover, 12 critical compliance items, 43 exceptions held.","Briefing","Martin Murphy","Agent","completed"]
];

const STREAM_DEFS = [
  {id:"data", title:"New data", sub:"From Cezanne, the care system, GSW and the HSE feed", pool:DATA_EVENTS, every:3200,
   tint:"#6ad0f0", icon:"M4.5 7.5c0-1.7 3.4-3 7.5-3s7.5 1.3 7.5 3-3.4 3-7.5 3-7.5-1.3-7.5-3Z M4.5 7.5v9c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-9 M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"},
  {id:"people", title:"Team decisions", sub:"Coordinators, recruiters, compliance and payroll", pool:PEOPLE_EVENTS, every:6400,
   tint:"#f0c04b", icon:"M12 12.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z M5 20.2c.9-3.1 3.6-4.9 7-4.9s6.1 1.8 7 4.9"},
  {id:"ai", title:"AI activity", sub:"Agents detecting, preparing and reminding", pool:AI_EVENTS, every:4600,
   tint:"var(--accent)", icon:"M2 12h4l2.5-6 3.5 12 3-8 2 2h5"}
];

const NAV = [
  {label:"Home", icon:"helios", page:"Home"},
  {label:"Dashboard", icon:"navDash", page:"Dashboard", dot:true},
  {label:"Recruitment", icon:"navRecruit", page:"Recruitment"},
  {label:"Compliance", icon:"navCompliance", page:"Compliance", dot:true},
  {label:"Rostering", icon:"navRoster", page:"Rostering"},
  {label:"Care Delivery", icon:"navCare", page:"Care Delivery"},
  {label:"Billing & Payroll", icon:"navBilling", page:"Billing & Payroll"},
  {divider:true},
  {label:"Agents", icon:"navAgents", page:"Agents"},
  {label:"Work", icon:"navWork", page:"Work"},
  {label:"Records", icon:"navRecords", page:"Records"},
  {label:"Activity", icon:"pulseLine", page:"Activity", dot:true}
];

/* Inbox items follow the real InboxItem shape: what happened, why it matters, what I can do. */
const ITEMS = {
  roster:{kind:"Approval", importance:"high", icon:ICONS.approvals, age:"42m",
    title:"HC-24817 Mayo: 4 coverage options waiting",
    why:"240 hours a week required, 176 allocated, 64 unfilled. The Roster Optimiser prepared options; a coordinator has to approve them.",
    detail:"Options use only compliance, availability, area, existing roster and contracted hours. Approving one creates roster changes for Sean Doyle to confirm with the carers.",
    actionLabel:"Review options", secondaryLabel:"Assign to Sean Doyle", group:"Approvals",
    fields:[{k:"Package",v:"HC-24817"},{k:"Office",v:"Mayo"},{k:"Gap",v:"64 h / week"},{k:"Prepared by",v:"Roster Optimiser"}],
    history:[{when:"Today 06:10",text:"HSE import confirmed the 64-hour gap"},{when:"Today 06:14",text:"Roster Optimiser prepared 4 options"}]},
  vis:{kind:"Alert", importance:"critical", icon:ICONS.health, age:"5h",
    title:"43 visits held from billing and payroll",
    why:"31 duration exceptions and 12 missing check-outs from the last 24 hours. 127.5 care hours wait for a coordinator decision.",
    detail:"VIS-10482 in Galway is typical: 45 minutes scheduled, 29 recorded. Nothing is invoiced or paid until a person approves recorded time, approves scheduled time, requests clarification or marks it cancelled.",
    actionLabel:"Open reconciliation", secondaryLabel:"Snooze", group:"Alerts",
    fields:[{k:"Visits",v:"43"},{k:"Hours held",v:"127.5"},{k:"Oldest",v:"VIS-10482"},{k:"Owner",v:"Office coordinators"}],
    history:[{when:"Today 06:02",text:"Visit Integrity Agent flagged 43 exceptions"},{when:"Today 06:03",text:"Reconciliation Agent held billing and payroll"}]},
  cover:{kind:"Task", importance:"high", icon:ICONS.visits, age:"2h",
    title:"34 visits in the next 24 hours have no carer",
    why:"Mayo carries 11. Roscommon's 07:00 to 09:00 cancellation cluster left 5 uncovered, 8.5 care hours at risk.",
    detail:"Eligible carers are listed per visit in Rostering, based only on compliance, availability, area and existing roster. Coordinators confirm every assignment.",
    actionLabel:"Open unfilled hours", secondaryLabel:"Escalate", group:"Work",
    fields:[{k:"Unfilled",v:"34"},{k:"Largest",v:"Mayo · 11"},{k:"Cluster",v:"Roscommon · 5"},{k:"Window",v:"Next 24 h"}],
    history:[{when:"Today 07:10",text:"First Roscommon cancellation received"},{when:"Today 09:05",text:"Ops Watchdog raised the cluster"}]},
  handoff:{kind:"Alert", importance:"normal", icon:ICONS.autos, age:"19h",
    title:"7 recruitment handoffs waiting over 12 hours",
    why:"Sarah O'Neill has waited 19 hours for Galway to accept. Garda Vetting is started and onboarding is 3 of 8.",
    detail:"The Recruitment Agent prepared each handoff summary. Acceptance and every hiring decision stay with the office.",
    actionLabel:"Open handoffs", secondaryLabel:"Remind offices", group:"Automations",
    fields:[{k:"Waiting",v:"7 over 12 h"},{k:"Longest",v:"41 h"},{k:"Story",v:"Sarah O'Neill"},{k:"Destination",v:"Galway"}],
    history:[{when:"Yesterday 16:40",text:"Handoff pack sent to Galway"},{when:"Today 08:00",text:"Recruitment Agent flagged the delay"}]},
  aoife:{kind:"Task", importance:"normal", icon:ICONS.work, age:"6d",
    title:"12 compliance items become critical within 7 days",
    why:"Includes Aoife Byrne's Patient Manual Handling (6 days, 38 visits) and Liam Walsh's car insurance (6 days, 42 visits).",
    detail:"Reminders went out automatically. A person verifies each renewed document before the restriction clock stops.",
    actionLabel:"Open expiries", secondaryLabel:"Assign", group:"Work",
    fields:[{k:"Critical",v:"12"},{k:"Expired",v:"5"},{k:"Due in 30 days",v:"46"},{k:"Owner",v:"Rachel Byrne"}],
    history:[{when:"Today 07:45",text:"Compliance Agent sent 18 reminders"},{when:"Today 08:12",text:"Aoife Byrne reminded about manual handling"}]}
};
const ORDER = ["vis","roster","cover","handoff","aoife"];

const ANSWERS = {};

// Turns a plain-English filter name into a full dashboard area — the "primitive
// vibe-coding" bit: no real backend, just a seeded generator so the same phrase
// always produces the same numbers, with direction and vocabulary nudged by
// keywords in the text (expansion/growth trends up, risk/issue trends down, a
// region/cost/people/ops/customer word picks which metrics show).
function synthesizeCustomArea(name){
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  let seed = 0;
  for (let i = 0; i < trimmed.length; i++) seed = (seed * 31 + trimmed.charCodeAt(i)) >>> 0;
  const rnd = (n) => (((seed >>> (n % 24)) ^ (seed << ((n * 7) % 13))) >>> 0) % 997 / 997;
  const low = trimmed.toLowerCase();
  const has = (...words) => words.some(w => low.indexOf(w) > -1);
  const growth = has("expansion","growth","launch","scale","pilot","new site","open","opening","grow");
  const risk = has("risk","issue","delay","problem","complaint","fault","incident","churn","decline");
  const dir = risk ? -1 : (growth ? 1 : (rnd(2) > 0.45 ? 1 : -1));

  let vocab = "generic";
  if (has("scotland","ireland","wales","england","region","dublin","belfast","cork","galway","london","glasgow","edinburgh"))
    vocab = "region";
  else if (has("cost","spend","budget","saving","margin")) vocab = "cost";
  else if (has("staff","hiring","team","recruit","headcount")) vocab = "people";
  else if (has("supplier","stock","inventory","warehouse","fleet")) vocab = "ops";
  else if (has("customer","client","retention","account")) vocab = "customer";

  const V = {
    region:   {labels:["New enquiries","Orders won","Revenue","Site coverage"], unit:"EUR — 30 DAYS"},
    cost:     {labels:["Spend","Cost per job","Savings found","Budget used"], unit:"EUR — 30 DAYS"},
    people:   {labels:["Headcount","Open roles","Time to hire","Retention"], unit:"PEOPLE"},
    ops:      {labels:["Stock cover","Lead time","Stockouts","Reorders raised"], unit:"DAYS"},
    customer: {labels:["Active accounts","Repeat rate","Churn","NPS"], unit:"ACCOUNTS"},
    generic:  {labels:["Volume","Rate","Cost","Coverage"], unit:"ACTIVITY — 30 DAYS"}
  }[vocab];

  const months = ["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug"];
  let v0 = 40 + Math.floor(rnd(1) * 220);
  const chart = months.map((m, i) => {
    v0 = Math.max(8, Math.round(v0 * (1 + dir * (0.03 + rnd(i + 3) * 0.07))));
    return [m, v0, String(v0)];
  });
  const metrics = V.labels.map((label, i) => {
    const val = 20 + Math.floor(rnd(i + 5) * 400);
    const pct = 2 + Math.round(rnd(i + 9) * 18);
    const up = dir > 0 ? rnd(i + 12) > 0.25 : rnd(i + 12) > 0.7;
    const bars = [0,1,2,3,4,5,6,7,8].map(k => 0.3 + rnd(i * 3 + k) * 0.7);
    return [label, i === 1 ? pct + "%" : String(val), (up ? "+" : "\u2212") + pct + (i === 1 ? "pt" : "%"), up ? "up" : "down", "vs last month", bars];
  });
  const capName = trimmed.replace(/\b\w/g, c => c.toUpperCase());
  const split = [
    [capName + " \u2014 direct", String(Math.round(v0 * 0.5)), "48%", 1],
    ["Existing pipeline", String(Math.round(v0 * 0.3)), "31%", 0],
    ["Everything else", String(Math.round(v0 * 0.2)), "21%", 0]
  ];
  const table = [1,2,3].map(w => [capName + " \u2014 week " + w, String(20 + Math.floor(rnd(20 + w) * 200)),
    (dir > 0 ? "+" : "\u2212") + (3 + Math.floor(rnd(23 + w) * 14)) + "%", "Auto-tagged from records mentioning \u201c" + low + "\u201d"]);
  table.push(["Everything else", String(20 + Math.floor(rnd(30) * 200)), "\u2014", "Baseline"]);
  return {
    id: trimmed, label: capName, color: "var(--accent)", owner: "CUSTOM FILTER",
    description: "Generated from \u201c" + trimmed + "\u201d \u2014 a plain-English filter, not a registered metric set. Refine it and Pulse will tighten this up.",
    kind: "columns", chartTitle: capName + " over time", chartUnit: V.unit,
    chart, splitTitle: "Where \u201c" + low + "\u201d shows up", split,
    tableCols: ["Item","Value","Change","Note"], table,
    metrics, legend: [capName, "Pipeline", "Other"]
  };
}

function pickAnswer(q){
  return westcareAnswer(q);
}

const ORGS = [
  ["Galway office","Office","56 carers","262 visits today","active"],
  ["Mayo office","Office","41 carers","198 visits today","capacity gap"],
  ["Sligo office","Office","42 carers","190 visits today","active"],
  ["Roscommon office","Office","32 carers","140 visits today","attention"],
  ["Cavan office","Office","29 carers","124 visits today","active"],
  ["Monaghan office","Office","27 carers","114 visits today","active"]
];
const TEAMS = [
  ["Central Recruitment","3 members","Daniel Walsh","recruitment:candidate:*"],
  ["Compliance","2 members","Rachel Byrne","compliance:verify"],
  ["Office Coordinators","6 members","Niamh Kelly","roster:approve"],
  ["Leadership","1 member","Martin Murphy","all permissions"]
];
const LOCATIONS = [
  ["Sligo","Sligo","42 carers","active"],["Galway","Galway","56 carers","active"],["Mayo","Castlebar","41 carers","capacity gap"],
  ["Roscommon","Roscommon","32 carers","attention"],["Cavan","Cavan","29 carers","active"],["Monaghan","Monaghan","27 carers","active"]
];

const AGENT_DEFS = [
  {id:"briefing", name:"Briefing", shape:"crown-pebble", tint:"#191c1f", state:"complete", role:"Reads all six offices overnight and tells Martin what needs him",
   when:"07:02", preview:"34 visits need cover. 12 compliance items critical.",
   thread:[
     {kind:"stamp", text:"Today 07:00"},
     {kind:"routine", text:"Ran routine", routine:"Morning briefing"},
     {kind:"agent", text:"good morning Martin.", lines:[
       {k:"Cover", v:"34 visits need a carer in the next 24 hours · Mayo 11"},
       {k:"Capacity", v:"HC-24817 Mayo is 64 hours short of 240 a week"},
       {k:"Compliance", v:"12 requirements become critical within seven days"},
       {k:"Time", v:"43 completed visits held before billing and payroll"},
       {k:"Recruitment", v:"146 new candidates in the last seven days"}]},
     {kind:"agent", text:"the two to look at first: Mayo's capacity gap, where the Roster Optimiser has 4 options ready, and Galway's handoff backlog, where Sarah O'Neill has waited 19 hours."},
     {kind:"user", text:"remind galway about the handoffs"},
     {kind:"agent", text:"drafted a note to Niamh Kelly listing the 3 Galway handoffs over 12 hours. it waits for your yes before it sends."}
   ]},
  {id:"ops", name:"Ops Watchdog", shape:"shield", tint:"#2b1b1e", state:"attention", role:"Watches uncovered visits, handoff delays, visit failures and cancellation clusters",
   when:"09:05", preview:"roscommon: 11 cancellations 07:00 to 09:00, 5 still uncovered.",
   thread:[
     {kind:"stamp", text:"Today 09:05"},
     {kind:"agent", text:"cancellation cluster in Roscommon between 07:00 and 09:00: 11 cancellations. 6 recovered by Ciarán Moran's team, 5 still uncovered, 8.5 care hours at risk."},
     {kind:"agent", text:"the 5 open visits start between 12:00 and 15:30. two eligible carers are free after 13:00. i have not assigned anyone; the options are in Rostering for the coordinator."}
   ]},
  {id:"compliance", name:"Compliance Agent", shape:"executive-capsule", tint:"#2a2118", state:"working", role:"Monitors expiries, prepares reminders, chases documents and escalates. People verify.",
   when:"08:12", preview:"18 reminders sent. aoife byrne: manual handling in 6 days.",
   thread:[
     {kind:"stamp", text:"Today 07:45"},
     {kind:"agent", text:"18 reminders sent this morning across six offices. 12 items are now inside seven days."},
     {kind:"agent", text:"Aoife Byrne, Galway: Patient Manual Handling expires in 6 days, Garda Vetting in 18. 38 visits in the next 30 days depend on her. reminder sent at 08:12."},
     {kind:"agent", text:"Liam Walsh, Sligo: car insurance expires in 6 days, NCT in 29. 42 visits need a car. renewed certificate requested; Emma Brennan verifies it when it lands."}
   ]},
  {id:"roster", name:"Roster Optimiser", shape:"control-cube", tint:"#16241f", state:"waiting", role:"Suggests ways to cover missing hours. Never schedules a carer without approval.",
   when:"06:14", preview:"4 options for HC-24817. waiting on sean doyle.",
   thread:[
     {kind:"stamp", text:"Today 06:14"},
     {kind:"agent", text:"HC-24817, Castlebar North: 240 hours a week required, 176 allocated, 64 unfilled. i prepared 4 options that together cover the gap."},
     {kind:"agent", text:"i only used compliance status, availability, area, existing roster and contracted hours. every option waits for Sean Doyle to approve."}
   ]},
  {id:"recruit", name:"Recruitment Agent", shape:"low-dome", tint:"#241b2e", state:"working", role:"Organises applications, spots missing documents, drafts follow-ups and prepares handoffs. No ranking, no hiring decisions.",
   when:"08:00", preview:"sarah o'neill waiting 19h for galway.",
   thread:[
     {kind:"stamp", text:"Today 08:00"},
     {kind:"agent", text:"Cezanne synced 14 new applications this morning. 146 this week: Indeed 81, referrals 22, social 18, events 16, website 9."},
     {kind:"agent", text:"7 office handoffs have waited over 12 hours. Sarah O'Neill, Galway, 19 hours: Garda Vetting started, onboarding 3 of 8. handoff summary is ready for Niamh Kelly."}
   ]},
  {id:"integrity", name:"Visit Integrity Agent", shape:"glass-visor", tint:"#1b2430", state:"attention", role:"Finds short, long, late and unrecorded visits in the care system's events",
   when:"06:02", preview:"43 exceptions. vis-10482: 29 of 45 minutes.",
   thread:[
     {kind:"stamp", text:"Today 06:02"},
     {kind:"agent", text:"1,006 visits completed in the last 24 hours. 963 verified cleanly. 43 exceptions: 31 duration and 12 missing check-outs."},
     {kind:"agent", text:"VIS-10482, Galway, client MM-1042: scheduled 10:00 to 10:45, recorded 10:06 to 10:35. 29 of 45 minutes. flagged for the Galway Coordinator."}
   ]},
  {id:"hours", name:"Care Hours Agent", shape:"offset-pebble", tint:"#16241f", state:"working", role:"Tracks requested, allocated and delivered hours and remaining capacity. Does not decide who receives care.",
   when:"06:00", preview:"38,460 requested. 36,980 allocated. 96.2%.",
   thread:[
     {kind:"stamp", text:"Today 06:00"},
     {kind:"agent", text:"this week: 38,460 HSE hours requested, 36,980 allocated, 1,480 unfilled. coverage 96.2%."},
     {kind:"agent", text:"Mayo has the largest gap at 448 hours, 64 of them on HC-24817. Galway is next at 328."}
   ]},
  {id:"recon", name:"Reconciliation Agent", shape:"rim-capsule", tint:"#1b2430", state:"waiting", role:"Prepares billing and payroll exception reviews. Never changes pay.",
   when:"06:03", preview:"127.5 care hours held for review.",
   thread:[
     {kind:"stamp", text:"Today 06:03"},
     {kind:"agent", text:"43 visits held from billing and payroll, 127.5 care hours in total. each has the scheduled time, both check events and the carer's notes ready for review."},
     {kind:"agent", text:"only verified hours go to the Payroll System and Finance System on Friday. i do not adjust pay or invoices; a coordinator decides every held visit."}
   ]}
];

const KPI_DEFS = {
  revenue:{label:"Next 24h visits", value:"1,028", delta:"994 covered", dir:"up", hint:"all offices", hero:true},
  cash:{label:"Hours filled", value:"96.2%", delta:"+0.2pt", dir:"up", hint:"this week"},
  overdue:{label:"Unfilled visits", value:"34", delta:"Mayo 11", dir:"down", hint:"next 24 hours"},
  margin:{label:"Visit exceptions", value:"43", delta:"127.5 h held", dir:"down", hint:"last 24 hours"},
  jobs:{label:"New candidates", value:"146", delta:"+17", dir:"up", hint:"this week"},
  nps:{label:"Compliance", value:"93.0%", delta:"12 critical", dir:"down", hint:"fully compliant"},
  pipeline:{label:"Active carers", value:"227", delta:"+9 starting", dir:"up", hint:"six offices"},
  utilisation:{label:"Cancellation recovery", value:"72%", delta:"2,384 in 30 days", dir:"up", hint:"recovered"}
};

const ASPECT_DEFS = [
  {id:"sales", label:"Service", color:"var(--accent)", owner:"MARTIN MURPHY", description:"Visits, cover and verified hours across six offices.",
   kind:"columns", chartTitle:"Coverage by week", chartUnit:"%",
   chart:[["17 Aug",94,"94.1%"],["24 Aug",95,"94.8%"],["31 Aug",95,"95.3%"],["7 Sep",95,"95.0%"],["14 Sep",96,"95.9%"],["21 Sep",96,"96.4%"],["28 Sep",96,"96.2%"]],
   splitTitle:"By office", split:[["Galway","262","25%",1],["Mayo","198","19%",0],["Sligo","190","18%",0]],
   tableCols:["Office","Visits","Change","Coordinator"],
   table:[["Galway","262","+1.2%","Niamh Kelly"],["Mayo","198","−0.8%","Sean Doyle"],["Sligo","190","+0.6%","Emma Brennan"]],
   metrics:[["Visits","1,028","+14","up","next 24h",[.5,.6,.55,.7,.66,.8,.9]],["Coverage","96.2%","+0.2pt","up","this week",[.6,.62,.6,.7,.72,.8,.78]],["Exceptions","43","+4","down","last 24h",[.4,.5,.44,.5,.6,.55,.62]],["Unfilled","34","−3","up","next 24h",[.7,.66,.6,.62,.5,.48,.44]]]}
];

const FILTER_GROUPS = [
  {title:"AREA", items:["Sales","Development","Marketing","Operations","Finance","Support"]},
  {title:"SPINE", items:["Location","Team","Person","Organisation","Module"]},
  {title:"TIME", items:["This week","This month","This quarter","Year to date"]}
];

const OPS_DEFS = [
  {id:"o1", name:"Compliance Renewal", kind:"automation", owner:"Compliance Agent", ownerKind:"agent", initials:"CA",
   trigger:"30, 14, 7 and 1 days before expiry", triggerKind:"event", next:"Today 14:00", last:"18 reminders sent", status:"approval", rate:97, on:true,
   what:"Watches every Garda, training, vehicle and personnel requirement, reminds the carer at 30, 14, 7 and 1 days, chases the document and escalates to the coordinator.",
   why:"Offices were working from printed expiry lists and chasing people by phone.",
   saved:"38 hours a month",
   steps:[["Trigger","A requirement reaches 30, 14, 7 or 1 days"],["Find","The carer, their office and future visits affected"],["Send","Remind the carer by SMS and email"],["Check","Has a renewed document been uploaded?"],["Approval","Compliance verifies the document","gate"],["Update","Clear or restrict the carer and log it"]],
   runs:[["Today 07:45","1m 02s","ok","18 reminders","€0.03"],["Yesterday 07:45","58s","ok","15 reminders","€0.03"],["Sat 07:45","54s","ok","11 reminders","€0.02"]]},
  {id:"o2", name:"Candidate Handoff", kind:"automation", owner:"Recruitment Agent", ownerKind:"agent", initials:"RA",
   trigger:"Garda Vetting link issued", triggerKind:"event", next:"Event-based", last:"7 waiting over 12h", status:"approval", rate:91, on:true,
   what:"When Central Recruitment issues a Garda Vetting link, prepares the handoff summary for the destination office and chases acceptance after 12 hours.",
   why:"Candidates were going quiet between central screening and local onboarding.",
   saved:"14 hours a month",
   steps:[["Trigger","Garda Vetting link issued in Cezanne"],["Draft","Handoff summary: interview notes, documents, gaps"],["Send","Hand to the destination office"],["Approval","Office coordinator accepts","gate"],["Update","Create onboarding tasks"]],
   runs:[["Today 08:00","12s","partial","3 handoffs chased","€0.01","7 handoffs waiting over 12 hours"],["Yesterday 16:40","9s","ok","Sarah O'Neill sent to Galway","€0.01"],["Yesterday 11:20","8s","ok","2 handoffs","€0.01"]]},
  {id:"o3", name:"New Carer Onboarding", kind:"routine", owner:"Office coordinators", ownerKind:"person", initials:"OC",
   trigger:"Handoff accepted", triggerKind:"event", next:"Event-based", last:"9 carers onboarding", status:"healthy", rate:96, on:true,
   what:"Eight-step onboarding checklist from contract to induction to first roster, with GSW training booked automatically.",
   why:"New starters sat ready but unrostered because one document was missing.",
   saved:"11 hours a month",
   steps:[["Trigger","Office accepts the handoff"],["Send","Contract and payroll details request"],["Update","Book GSW induction and manual handling"],["Check","All compliance requirements valid"],["Approval","Coordinator marks ready to roster","gate"]],
   runs:[["Today 09:10","6s","ok","Ahmed Hassan induction booked","€0.01"],["Yesterday 14:02","7s","ok","2 carers","€0.01"]]},
  {id:"o4", name:"Unfilled Visit Escalation", kind:"automation", owner:"Ops Watchdog", ownerKind:"agent", initials:"OW",
   trigger:"Visit unfilled 6h before start", triggerKind:"event", next:"Every 30 min", last:"34 unfilled · Roscommon cluster", status:"approval", rate:94, on:true,
   what:"Finds visits with no carer inside six hours of start, asks the Roster Optimiser for eligible cover and escalates to the office coordinator.",
   why:"Last-minute gaps were found by the client ringing the office.",
   saved:"22 hours a month",
   steps:[["Trigger","A visit has no carer 6 hours before start"],["Find","Eligible carers: compliant, available, in area"],["Draft","Cover options for the coordinator"],["Approval","Coordinator confirms the carer","gate"],["Update","Roster updated in the care system"]],
   runs:[["Today 09:05","21s","partial","11 of 16 covered","€0.02","Roscommon: 5 visits with no eligible carer before 13:00"],["Today 08:35","18s","ok","4 covered","€0.01"],["Today 08:05","17s","ok","2 covered","€0.01"]]},
  {id:"o5", name:"Morning briefing", kind:"routine", owner:"Briefing", ownerKind:"agent", initials:"BR",
   trigger:"Weekdays, 07:00", triggerKind:"schedule", next:"Tomorrow 07:00", last:"Delivered 07:02", status:"healthy", rate:100, on:true,
   what:"Reads all six offices overnight and tells Martin what needs him: cover, compliance, recruitment and held time.",
   why:"Six offices meant six phone calls before nine.",
   saved:"9 hours a month",
   steps:[["Trigger","Every weekday at 07:00"],["Find","Overnight changes across all modules"],["Check","Drop anything already handled"],["Draft","Write the briefing"],["Send","Post to Home"]],
   runs:[["Today 07:00","22s","ok","1 briefing","€0.02"],["Fri 07:00","19s","ok","1 briefing","€0.02"],["Thu 07:00","24s","ok","1 briefing","€0.02"]]},
  {id:"o6", name:"Visit Exception Review", kind:"automation", owner:"Visit Integrity Agent", ownerKind:"agent", initials:"VI",
   trigger:"Daily, 06:00", triggerKind:"schedule", next:"Tomorrow 06:00", last:"43 exceptions flagged", status:"approval", rate:99, on:true,
   what:"Compares every completed visit's scheduled time with its check-in and check-out and flags short, long, late and missing events.",
   why:"Duration problems surfaced only when a client queried an invoice.",
   saved:"26 hours a month",
   steps:[["Trigger","Every day at 06:00"],["Find","Completed visits from the care system"],["Check","Recorded against scheduled duration"],["Update","Hold billing and payroll on exceptions"],["Approval","Coordinator reviews each exception","gate"]],
   runs:[["Today 06:02","1m 48s","ok","1,006 visits · 43 flagged","€0.06"],["Yesterday 06:02","1m 41s","ok","988 visits · 39 flagged","€0.06"]]},
  {id:"o7", name:"Billing Reconciliation", kind:"report", owner:"Reconciliation Agent", ownerKind:"agent", initials:"RC",
   trigger:"Fridays, 15:00", triggerKind:"schedule", next:"Fri 15:00", last:"127.5 h held", status:"approval", rate:98, on:true,
   what:"Prepares the weekly billing and payroll exports from verified hours only and lists every held visit with its evidence.",
   why:"Corrections after payroll ran cost more than reviewing before it.",
   saved:"16 hours a month",
   steps:[["Trigger","Every Friday at 15:00"],["Find","Verified hours for the week"],["Check","Every held visit has a decision"],["Approval","Payroll and billing sign off","gate"],["Send","Export to the Payroll System and Finance System"]],
   runs:[["Fri 15:00","2m 12s","ok","6,912 visits exported","€0.08"],["Fri 18 Sep 15:00","2m 04s","ok","6,870 visits exported","€0.08"]]},
  {id:"o8", name:"Cezanne application sync", kind:"automation", owner:"Recruitment Agent", ownerKind:"agent", initials:"RA",
   trigger:"Every 15 min", triggerKind:"schedule", next:"11:45", last:"14 applications", status:"healthy", rate:100, on:true,
   what:"Pulls new applications from Cezanne HR, reads submitted qualifications and flags missing documents. Does not rank anyone.",
   why:"Applications from Indeed, social and the website were landing in different inboxes.",
   saved:"12 hours a month",
   steps:[["Trigger","Every 15 minutes"],["Find","New applications in Cezanne"],["Check","Documents submitted against the role"],["Update","Add to the pipeline with missing items"]],
   runs:[["Today 11:30","4s","ok","2 applications","€0.00"],["Today 11:15","4s","ok","1 application","€0.00"]]},
  {id:"o9", name:"Care system visit sync", kind:"task", owner:"Ops Watchdog", ownerKind:"agent", initials:"OW",
   trigger:"Every 5 min", triggerKind:"schedule", next:"11:45", last:"126 events", status:"healthy", rate:100, on:true,
   what:"Reads roster, check-in and check-out events from the Current Care Management System.",
   why:"Visit status used to be a phone call to the office.",
   saved:"20 hours a month",
   steps:[["Trigger","Every 5 minutes"],["Find","New visit events"],["Update","Match events to rostered visits"]],
   runs:[["Today 11:40","3s","ok","126 events","€0.00"],["Today 11:35","3s","ok","118 events","€0.00"]]},
  {id:"o10", name:"HSE request import", kind:"task", owner:"Care Hours Agent", ownerKind:"agent", initials:"CH",
   trigger:"Daily, 06:00", triggerKind:"schedule", next:"Tomorrow 06:00", last:"149 requests", status:"healthy", rate:100, on:true,
   what:"Imports requested hours per care package and recalculates allocated, delivered and unfilled hours by office.",
   why:"Requested hours lived in spreadsheets separate from the roster.",
   saved:"8 hours a month",
   steps:[["Trigger","Every day at 06:00"],["Find","HSE care requests"],["Check","Requested against allocated hours"],["Update","Flag capacity gaps"]],
   runs:[["Today 06:00","38s","ok","149 requests","€0.01"],["Yesterday 06:00","36s","ok","148 requests","€0.01"]]},
  {id:"o11", name:"Weekly payroll export", kind:"report", owner:"Laura Martin", ownerKind:"person", initials:"LM",
   trigger:"Fridays, 17:00", triggerKind:"schedule", next:"Fri 17:00", last:"Exported 25 Sep", status:"healthy", rate:100, on:true,
   what:"Sends verified payroll hours to the Payroll System after sign-off. Held visits never export.",
   why:"Carers were being corrected a week late.",
   saved:"6 hours a month",
   steps:[["Trigger","Every Friday at 17:00"],["Check","Reconciliation signed off"],["Send","Export verified hours"]],
   runs:[["Fri 25 Sep 17:00","41s","ok","227 carers","€0.00"],["Fri 18 Sep 17:00","39s","ok","224 carers","€0.00"]]}
];

const OPS_FILTERS = [
  ["all","All"], ["routine","Agent routines"], ["automation","Automations"],
  ["report","Scheduled reports"], ["task","Recurring tasks"], ["approval","Needs approval"], ["failed","Failed"]
];

const WORK_SECTIONS = [
  {id:"tasks", label:"Tasks", blurb:"Everything assigned to you or your team, in one permission-filtered list.",
   views:["All tasks","Due tasks","Review","Done"], filters:["Due date","Any status","Anyone","Any due date"]},
  {id:"approvals", label:"Approvals", blurb:"Requests and their steps. Every decision is written as the person who made it.",
   views:["Awaiting you","Awaiting others","Decided"], filters:["Raised date","Any value","Anyone"]},
  {id:"workflows", label:"Workflows", blurb:"Automations and agent routines — what runs on its own, and who owns it.",
   views:[], filters:[]},
  {id:"schedules", label:"Schedules", blurb:"The team calendar: when recurring work fires and what it costs the week.",
   views:[], filters:[]}
];

const WORK_TASKS = [
  {id:"w1", title:"Cover remaining HC-24817 Mayo hours", status:"In progress", priority:"High", who:"SD",
   due:"Due today", late:false, client:"HSE Request HC-24817", day:"Today", mins:"Critical", view:"Due tasks"},
  {id:"w2", title:"Accept Sarah O'Neill handoff", status:"Review", priority:"High", who:"NK",
   due:"Waiting 19h", late:true, client:"Galway Operations", day:"Today", mins:"15 mins", view:"Due tasks"},
  {id:"w3", title:"Review VIS-10482 duration", status:"Review", priority:"High", who:"NK",
   due:"Due today", late:false, client:"Galway Coordinator", day:"Today", mins:"10 mins", view:"Review"},
  {id:"w4", title:"Renew car insurance: Liam Walsh", status:"In progress", priority:"High", who:"EB",
   due:"Due in 6 days", late:false, client:"Compliance · Liam Walsh", day:"Sat", mins:"20 mins", view:"All tasks"},
  {id:"w5", title:"Patient Manual Handling renewal: Aoife Byrne", status:"In progress", priority:"High", who:"RB",
   due:"Due in 6 days", late:false, client:"Compliance · Aoife Byrne", day:"Sat", mins:"20 mins", view:"All tasks"},
  {id:"w6", title:"Cover 5 Roscommon visits from the 07:00 cluster", status:"In progress", priority:"High", who:"CM",
   due:"Before 12:00", late:false, client:"Roscommon", day:"Today", mins:"8.5 care hours", view:"Due tasks"},
  {id:"w7", title:"Request QQI certificate: Mateusz Nowak", status:"Not started", priority:"Medium", who:"OF",
   due:"Tomorrow", late:false, client:"Recruitment · Cavan", day:"Tue", mins:"10 mins", view:"All tasks"},
  {id:"w8", title:"Sign off last week's payroll exceptions", status:"Done", priority:"Medium", who:"LM",
   due:"Done Friday", late:false, client:"Billing & Payroll", day:"Fri", mins:"1 hour", view:"Done", done:true}
];

const WORKFLOWS = [
  {name:"Compliance Renewal", state:"live", trigger:"event · requirement.expiring",
   actions:[["notify.sms","write"],["tasks.create","write"]], lastRun:"Today 07:45",
   result:"18 reminders", resultKind:"ok", runSummary:"14 ok",
   runs:["ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok","ok"]}
];

const SCHEDULES = [
  {id:"s1", name:"Morning briefing", cadence:"Every weekday · 07:00", next:"Tomorrow 07:00", owner:"Briefing", on:true, day:1},
  {id:"s2", name:"Visit Exception Review", cadence:"Daily · 06:00", next:"Tomorrow 06:00", owner:"Visit Integrity Agent", on:true, day:1},
  {id:"s3", name:"HSE request import", cadence:"Daily · 06:00", next:"Tomorrow 06:00", owner:"Care Hours Agent", on:true, day:1},
  {id:"s4", name:"Billing Reconciliation", cadence:"Fridays · 15:00", next:"Fri 15:00", owner:"Reconciliation Agent", on:true, day:4},
  {id:"s5", name:"Weekly payroll export", cadence:"Fridays · 17:00", next:"Fri 17:00", owner:"Laura Martin", on:true, day:4}
];

const WIDGET_DEFS = [["inbox","Action inbox"],["work","My work"],["activity","Activity"],["kpi","Today's numbers"],["visits","Unfilled visits"]];
const WORK_WIDGETS = [
  {id:"queue", label:"My queue", value:"6", hint:"assigned to you", icon:"work", queue:"mine"},
  {id:"late", label:"Running late", value:"3", hint:"past their due time", icon:"health", queue:"overdue"},
  {id:"unassigned", label:"Unassigned", value:"2", hint:"nobody owns it yet", icon:"teams", queue:"unassigned"},
  {id:"week", label:"Next 7 days", value:"5", hint:"due this week", icon:"visits", queue:"upcoming"}
];
const PERSONALITIES = ["Straight-talking","Warm","Formal","Dry"];
const ANSWER_STYLES = ["Short answers","Show the working","Ask before acting"];
/* Every context source and every registered tool the agent could be granted —
   the builder shows the whole catalogue, grouped, rather than a sample. */
const CONTEXT_DEFS = [
  ["Carers","records","Offices, contracted hours, availability"],
  ["Candidates","records","Pipeline stage, source, missing documents"],
  ["Clients","records","Fictional IDs, packages, contact preferences"],
  ["Compliance","records","Garda, training, vehicle and personnel documents"],
  ["HSE Requests","work","Requested, allocated and unfilled hours"],
  ["Rosters","work","Assignments, gaps and conflicts"],
  ["Visits","work","Scheduled, checked in, checked out"],
  ["Tasks","work","Queues, owners, due dates"],
  ["Billing records","money","Billable hours and holds"],
  ["Payroll records","money","Payable hours and holds"],
  ["Activity log","system","Every event, agent and human"],
  ["Files","system","Indexed certificates and packages"]
];
const CONTEXT_SOURCES = CONTEXT_DEFS.map(c => c[0]);
const SKILL_DEFS = [
  ["Search records","read"],["Summarise activity","read"],["Read compliance","read"],
  ["Read visits","read"],["Check permissions","read"],
  ["Draft email","write"],["Create task","write"],["Prepare roster option","write"],
  ["Hold billing and payroll","write"],["Raise approval","write"],
  ["Send email","external"],["Send SMS reminder","external"],["Export to Payroll System","external"],["Sync with Cezanne HR","external"]
];
/* The two questions the agent asks back once it knows the job. */
const TRAIN_PHASES = [
  ["Reading the whole ontology", "18,420 records"],
  ["Learning how Westcare words things", "visit, package, handoff"],
  ["Researching Irish home-care operations", "HSE home support, Garda Vetting"],
  ["Writing its own system prompt", "1,240 tokens"]
];
const BRIEF_QUESTIONS = [
  {title:"What should it cover?", sub:"Pick as many as you like. You can refine it later.",
   options:[["Cover","Unfilled visits and capacity gaps"],["Compliance","Expiries and restrictions"],
            ["Recruitment","Pipeline and handoffs"],["Time and pay","Held visits and reconciliation"],
            ["Something else","Tell me in the next message"]]},
  {title:"When should it land?", sub:"One is enough to start.",
   options:[["Every morning 07:00","Before the offices open"],["Weekdays 08:00","Monday to Friday only"],
            ["Only when something changes","Event-driven, no noise"],["On demand","When you ask for it"]]}
];
/* The words under a name, keyed to the same state the face lights with. */
const STATE_LABELS = {working:"working", thinking:"thinking", waiting:"waiting on you",
  complete:"up to date", attention:"needs you", idle:"idle"};

const FACE_SHAPES = [
  ["crown-pebble","Crown pebble"],["executive-capsule","Executive capsule"],["shield","Shield"],
  ["glass-visor","Glass visor"],["control-cube","Control cube"],["low-dome","Low dome"],
  ["offset-pebble","Offset pebble"],["rim-capsule","Rim capsule"],["wide-eyed","Wide-eyed"],
  ["precision-brow","Precision brow"],["tall-unit","Tall unit"],["soft-asymmetric","Soft asymmetric"]
];
/* Shell colours only — deliberately desaturated so none of them reads as a
   state. The eyes, rim and dots always carry the state colour. */
const FACE_TINTS = [
  ["#191c1f","Graphite"],["#1b2430","Slate"],["#241b2e","Aubergine"],
  ["#2a2118","Bronze"],["#16241f","Pine"],["#2b1b1e","Oxblood"]
];

/* ---- ontology graph: generation, Dijkstra traversal, canvas render ---- */
const CLUSTERS = [
  ["Carers",            "#e8dccc", 0.00, 0.62, 46],
  ["Candidates",        "#6ad0f0", 0.90, 0.70, 52],
  ["Compliance",        "#b06cf0", 1.75, 0.66, 58],
  ["Visits",            "#f0c04b", 2.55, 0.72, 44],
  ["Billing & Payroll", "#f0567f", 3.35, 0.60, 38],
  ["Clients",           "#5fe0a8", 4.15, 0.70, 40],
  ["Offices",           "#f0803a", 4.95, 0.64, 30],
  ["HSE Requests",      "#5f7cf0", 5.65, 0.72, 34]
];

function mulberry(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Hub-and-spoke clusters around a dense phyllotaxis core, in unit space
   (-1..1 on both axes) so the layout is resolution independent. */
const _hexCache = {};
function hexRGB(hex){
  if (_hexCache[hex]) return _hexCache[hex];
  const h = hex.replace("#", "");
  const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  _hexCache[hex] = v;
  return v;
}


function buildGraph(){
  const rnd = mulberry(20260902);
  const nodes = [], edges = [], adj = [];
  const add = (x, y, z, r, cluster, kind) => {
    nodes.push({x, y, z, r, cluster, kind}); adj.push([]); return nodes.length - 1;
  };
  const link = (a, b) => {
    const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, dz = nodes[a].z - nodes[b].z;
    const w = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.004;
    const id = edges.length;
    edges.push({a, b, w});
    adj[a].push([b, w, id]); adj[b].push([a, w, id]);
  };

  // the core is a filled sphere on a Fibonacci lattice, not a disc
  const CORE = 880, coreIds = [];
  for (let i = 0; i < CORE; i++){
    const t = (i + 0.5) / CORE;
    const phi = Math.acos(1 - 2 * t);
    const theta = i * 2.39996;
    const shell = 0.16 + 0.28 * Math.pow(rnd(), 0.5);
    const grade = rnd();
    coreIds.push(add(
      Math.sin(phi) * Math.cos(theta) * shell * 1.04,
      Math.cos(phi) * shell * 0.96,
      Math.sin(phi) * Math.sin(theta) * shell,
      grade < 0.06 ? 3.4 + rnd() * 1.4 : grade < 0.3 ? 2.1 + rnd() * 0.7 : 1.0 + rnd() * 0.8, 0, "core"));
  }
  // lattice neighbours plus a mesh of chords, so the sphere reads as a volume
  for (let i = 1; i < coreIds.length; i++){
    link(coreIds[i], coreIds[i - 1]);
    if (i >= 13) link(coreIds[i], coreIds[i - 13]);
    if (i >= 21 && i % 2 === 0) link(coreIds[i], coreIds[i - 21]);
    if (i >= 34 && i % 3 === 0) link(coreIds[i], coreIds[i - 34]);
    if (i >= 55 && i % 4 === 0) link(coreIds[i], coreIds[i - 55]);
    if (i >= 89 && i % 5 === 0) link(coreIds[i], coreIds[i - 89]);
    if (i % 6 === 0) link(coreIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
  }

  // a mid shell between the nucleus and the lobes: the layer that makes it
  // read as a network rather than a ball with satellites
  const MID = 560, midIds = [];
  for (let i = 0; i < MID; i++){
    const t = (i + 0.5) / MID;
    const phi = Math.acos(1 - 2 * t), theta = i * 2.39996 + 0.7;
    const d = 0.52 + 0.16 * Math.pow(rnd(), 0.6);
    const g2 = rnd();
    midIds.push(add(
      Math.sin(phi) * Math.cos(theta) * d * 1.02,
      Math.cos(phi) * d * 0.96,
      Math.sin(phi) * Math.sin(theta) * d,
      g2 < 0.05 ? 2.6 + rnd() * 1.0 : g2 < 0.3 ? 1.6 + rnd() * 0.6 : 0.8 + rnd() * 0.7, 0, "core"));
  }
  for (let i = 0; i < midIds.length; i++){
    if (i >= 1) link(midIds[i], midIds[i - 1]);
    if (i >= 17) link(midIds[i], midIds[i - 17]);
    if (i >= 29 && i % 2 === 0) link(midIds[i], midIds[i - 29]);
    // radial spokes tying the shell to the nucleus
    if (i % 2 === 0) link(midIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
    if (i % 9 === 0) link(midIds[i], coreIds[Math.floor(rnd() * coreIds.length)]);
  }

  // clusters ride a sphere: each hub gets its own latitude as well as longitude
  const hubs = [], clusterLeaves = [];
  const onSphere = (lon, lat, d0) => { const d = d0 * 1.22;
    return [Math.cos(lat) * Math.cos(lon) * d * 1.02, Math.sin(lat) * d * 0.96, Math.cos(lat) * Math.sin(lon) * d]; };
  CLUSTERS.forEach((c, ci) => {
    const [, , ang, dist, leaves] = c;
    const lat = (ci % 2 ? 1 : -1) * (0.26 + rnd() * 0.5);
    const wob = 1.06 + rnd() * 0.16;
    const hp = onSphere(ang, lat, dist * wob);
    const hub = add(hp[0], hp[1], hp[2], 5.4, ci, "hub");
    hubs.push(hub);
    const mine = [];
    clusterLeaves.push(mine);
    for (let k = 0; k < 3; k++) link(hub, coreIds[Math.floor(rnd() * coreIds.length)]);
    for (let k = 0; k < 5; k++) link(hub, midIds[Math.floor(rnd() * midIds.length)]);

    const subs = 5 + Math.floor(rnd() * 4);
    const subIds = [];
    for (let s = 0; s < subs; s++){
      const sa = ang + (rnd() - 0.5) * 0.52, sl = lat + (rnd() - 0.5) * 0.3;
      const sd = dist + 0.08 + rnd() * 0.18;
      const sp = onSphere(sa, sl, sd);
      const sub = add(sp[0], sp[1], sp[2], 3.2, ci, "sub");
      subIds.push(sub);
      link(sub, hub);
      if (s > 0 && rnd() < 0.7) link(sub, subIds[s - 1]);
      const fan = Math.floor((leaves * 7.4) / subs);
      const spread = 0.17 + rnd() * 0.2;
      let prev = -1;
      for (let l = 0; l < fan; l++){
        const la = sa + (rnd() - 0.5) * spread * 2 + (rnd() - 0.5) * 0.06;
        const ll = sl + (rnd() - 0.5) * spread * 1.1;
        const ld = sd + 0.03 + Math.pow(rnd(), 0.8) * 0.17;
        const lp = onSphere(la, ll, ld);
        const lg = rnd();
        const leaf = add(lp[0], lp[1], lp[2],
          lg < 0.08 ? 2.8 + rnd() * 1.2 : lg < 0.34 ? 1.8 + rnd() * 0.6 : 1.0 + rnd() * 0.7, ci, "leaf");
        link(leaf, sub);
        mine.push(leaf);
        if (rnd() < 0.14) link(leaf, hub);
        if (prev >= 0 && rnd() < 0.34) link(leaf, prev);
        if (rnd() < 0.16) link(leaf, midIds[Math.floor(rnd() * midIds.length)]);
        prev = leaf;
      }
    }
  });
  // far satellites hanging off the outer leaves
  CLUSTERS.forEach((c, ci) => {
    const [, , ang, dist] = c;
    for (let s = 0; s < 7; s++){
      const sa = ang + (rnd() - 0.5) * 1.5, sl = (rnd() - 0.5) * 1.3;
      const sd = dist + 0.42 + rnd() * 0.22;
      const ap = onSphere(sa, sl, sd);
      const anchor = add(ap[0], ap[1], ap[2], 2.4, ci, "sub");
      link(anchor, hubs[ci]);
      const n = 14 + Math.floor(rnd() * 18);
      for (let l = 0; l < n; l++){
        const la = sa + (rnd() - 0.5) * 0.9, ll = sl + (rnd() - 0.5) * 0.7;
        const ld = sd + 0.02 + Math.pow(rnd(), 0.8) * 0.18;
        const p = onSphere(la, ll, ld);
        const leaf = add(p[0], p[1], p[2], 0.8 + rnd() * 0.9, ci, "leaf");
        link(leaf, anchor);
        clusterLeaves[ci].push(leaf);
      }
    }
  });

  // two hub rings and long chords across the sphere
  hubs.forEach((h, i) => {
    link(h, hubs[(i + 1) % hubs.length]);
    link(h, hubs[(i + 2) % hubs.length]);
    if (i % 3 === 0) link(h, hubs[(i + 4) % hubs.length]);
  });
  // neighbouring clusters share records, so their leaves cross-link
  for (let ci = 0; ci < clusterLeaves.length; ci++){
    const a = clusterLeaves[ci], b = clusterLeaves[(ci + 1) % clusterLeaves.length];
    const n = 26 + Math.floor(rnd() * 16);
    for (let k = 0; k < n; k++){
      link(a[Math.floor(rnd() * a.length)], b[Math.floor(rnd() * b.length)]);
    }
    // and a good number reach right across to the far side
    for (let k = 0; k < 12; k++){
      const far = clusterLeaves[(ci + 3) % clusterLeaves.length];
      link(a[Math.floor(rnd() * a.length)], far[Math.floor(rnd() * far.length)]);
    }
    for (let k = 0; k < 8; k++){
      const far = clusterLeaves[(ci + 4) % clusterLeaves.length];
      link(a[Math.floor(rnd() * a.length)], far[Math.floor(rnd() * far.length)]);
    }
  }

  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const n of nodes){
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
    if (n.z < minZ) minZ = n.z; if (n.z > maxZ) maxZ = n.z;
  }
  const bounds = {minX, maxX, minY, maxY, cx:(minX + maxX) / 2, cy:(minY + maxY) / 2,
    cz:(minZ + maxZ) / 2, w:maxX - minX, h:maxY - minY, d:maxZ - minZ,
    radius: Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2,
    reach: nodes.reduce((m, n) => Math.max(m, Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)), 0)};
  return {nodes, edges, adj, hubs, coreIds, bounds};
}

export {
  INK,
  BODY,
  DIM,
  FAINT,
  LIME,
  GREEN,
  AMBER,
  RED,
  NEUTRAL,
  MONO,
  ICONS,
  REC_SECTIONS,
  CONTACTS,
  FILE_TREE,
  ONTO_NODES,
  ONTO_EDGES,
  REC_TEMPLATES,
  REC_TEMPLATE_CATS,
  PEOPLE,
  ROLE_LEVELS,
  PERM_KEYS,
  GRANT_DEFS,
  ROLE_SCOPES,
  DEFAULT_PERMS,
  INTEGRATIONS,
  BG_DEFS,
  THEMES,
  ADMIN_ICONS,
  ADMIN_CARDS,
  ADMIN_GROUPS,
  SRC_TINT,
  SRC_ABBR,
  DATA_EVENTS,
  PEOPLE_EVENTS,
  AI_EVENTS,
  STREAM_DEFS,
  NAV,
  ITEMS,
  ORDER,
  ANSWERS,
  synthesizeCustomArea,
  pickAnswer,
  ORGS,
  TEAMS,
  LOCATIONS,
  AGENT_DEFS,
  KPI_DEFS,
  ASPECT_DEFS,
  FILTER_GROUPS,
  OPS_DEFS,
  OPS_FILTERS,
  WORK_SECTIONS,
  WORK_TASKS,
  WORKFLOWS,
  SCHEDULES,
  WIDGET_DEFS,
  WORK_WIDGETS,
  PERSONALITIES,
  ANSWER_STYLES,
  CONTEXT_DEFS,
  CONTEXT_SOURCES,
  SKILL_DEFS,
  TRAIN_PHASES,
  BRIEF_QUESTIONS,
  STATE_LABELS,
  FACE_SHAPES,
  FACE_TINTS,
  CLUSTERS,
  mulberry,
  _hexCache,
  hexRGB,
  buildGraph
};
