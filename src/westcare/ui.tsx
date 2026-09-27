/* Building blocks for the Westcare modules. Everything is drawn with the
   Pulse theme tokens (var(--surface), var(--accent) …) so the new modules sit
   inside the existing glass design and follow every theme, light or dark. */
import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import AgentFace from "../components/AgentFace";
import { OFFICE_IDS, type OfficeFilter } from "./model";
import { useWc, wc, type DrawerRef } from "./store";

/* ------------------------------------------------------------------ */
/* Tones                                                               */
/* ------------------------------------------------------------------ */

export type Tone = "ok" | "warn" | "bad" | "accent" | "neutral" | "info";
export const TONE: Record<Tone, { ink: string; soft: string }> = {
  ok: { ink: "var(--ok)", soft: "var(--ok-soft)" },
  warn: { ink: "var(--warn)", soft: "var(--warn-soft)" },
  bad: { ink: "var(--bad)", soft: "var(--bad-soft)" },
  accent: { ink: "var(--accent)", soft: "var(--accent-soft)" },
  neutral: { ink: "var(--dim)", soft: "var(--track)" },
  info: { ink: "var(--info,#7fb4d8)", soft: "var(--info-soft,rgba(127,180,216,.14))" },
};

/** One place that decides how any status word looks. */
export function toneOf(status: string): Tone {
  const s = status.toLowerCase();
  if (/^(valid|verified|complete|completed|covered|fully allocated|connected|ready|ready to roster|healthy|recovered|approved|accepted|on track|live)/.test(s)) return "ok";
  if (/(expired|missing|unfilled|no carer|capacity gap|held|hold|failed|no-show|restricted|critical|duration exception|missing check|delayed|blocked|lost|not on file|compliance block|double booking|no available)/.test(s)) return "bad";
  if (/(expiring|late|awaiting|renewal|partial|review|pending|attention|required|due|in progress|checked in|started|sent|queued|clarification|warning|scheduled reminder|conflict|reassigned|cancel)/.test(s)) return "warn";
  if (/(interview|onboarding|garda|handoff|new|upcoming|scheduled)/.test(s)) return "info";
  return "neutral";
}

/* ------------------------------------------------------------------ */
/* Text + chips                                                        */
/* ------------------------------------------------------------------ */

export const MONO = "var(--mono)";
export const label: CSSProperties = { fontFamily: MONO, fontSize: "9.5px", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--faint)" };

export function Chip({ children, tone, status, style }: { children?: ReactNode; tone?: Tone; status?: string; style?: CSSProperties }) {
  const t = TONE[tone || toneOf(status || String(children ?? ""))];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 22, padding: "0 9px", borderRadius: "var(--chip-r,7px)", background: t.soft, color: t.ink, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", flex: "none", ...style }}>
      <span style={{ width: 5, height: 5, borderRadius: 2, background: t.ink, flex: "none" }} />
      {children ?? status}
    </span>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ color: "var(--dim)", ...style }}>{children}</span>;
}

/** A clickable record name: opens the shared record drawer. */
export function RecLink({ to, children, style }: { to: DrawerRef; children: ReactNode; style?: CSSProperties }) {
  return (
    <button className="wc-link" onClick={(e) => { e.stopPropagation(); wc.open(to); }}
      style={{ background: "none", border: 0, padding: 0, margin: 0, font: "inherit", color: "var(--ink)", cursor: "pointer", textAlign: "left", borderBottom: "1px dashed var(--border-strong)", ...style }}>
      {children}
    </button>
  );
}

/** Jump to another module. */
export function GoLink({ page, sub, children }: { page: string; sub?: string; children: ReactNode }) {
  return (
    <button className="wc-go" onClick={(e) => { e.stopPropagation(); wc.go(page, sub); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: 0, padding: 0, font: "inherit", fontSize: 12, color: "var(--accent)", cursor: "pointer", whiteSpace: "nowrap" }}>
      {children}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13 M13 6.5 18.5 12 13 17.5" /></svg>
    </button>
  );
}

export function Btn({ children, onClick, kind = "ghost", disabled, style, title }: { children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger" | "quiet"; disabled?: boolean; style?: CSSProperties; title?: string }) {
  const base: CSSProperties = { height: 32, padding: "0 14px", borderRadius: "var(--r-ctl,10px)", fontSize: 12.5, fontWeight: 500, cursor: disabled ? "default" : "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 7, transition: "background .2s var(--ease),border-color .2s var(--ease),color .2s var(--ease),transform .18s var(--ease)", opacity: disabled ? 0.45 : 1 };
  const k: Record<string, CSSProperties> = {
    primary: { background: "var(--accent-fill,var(--accent))", color: "var(--on-accent)", border: 0, boxShadow: "var(--accent-glow,none)" },
    ghost: { background: "var(--surface-2)", color: "var(--body)", border: "1px solid var(--border)" },
    danger: { background: "var(--bad-soft)", color: "var(--bad)", border: "1px solid var(--bad-soft)" },
    quiet: { background: "none", color: "var(--dim)", border: "1px solid transparent" },
  };
  return <button className="wc-btn" title={title} disabled={disabled} onClick={disabled ? undefined : onClick} style={{ ...base, ...k[kind], ...style }}>{children}</button>;
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Page({ children }: { children: ReactNode }) {
  return <div style={{ width: "100%", maxWidth: 1560, margin: "0 auto", boxSizing: "border-box", padding: "16px 24px 64px", animation: "pageIn .6s var(--ease) both" }}>{children}</div>;
}

export function Grid({ cols, gap = 12, children, style }: { cols: string; gap?: number; children: ReactNode; style?: CSSProperties }) {
  return <div className="wc-grid" style={{ display: "grid", gridTemplateColumns: cols, gap, alignItems: "stretch", marginTop: gap, ...style }}>{children}</div>;
}

/** Page heading row with the global office filter on the right. */
export function ScopeBar({ title, sub, right, noOffice }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; noOffice?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", padding: "6px 2px 4px" }}>
      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.5px", lineHeight: 1.15 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 5, maxWidth: "80ch", lineHeight: 1.5 }}>{sub}</div>}
      </div>
      {right}
      {!noOffice && <OfficePills />}
    </div>
  );
}

export function OfficePills({ compact }: { compact?: boolean }) {
  const { office } = useWc();
  const list: OfficeFilter[] = ["All", ...OFFICE_IDS];
  return (
    <div role="tablist" aria-label="Office" style={{ display: "inline-flex", flexWrap: "wrap", gap: 2, padding: 3, background: "var(--surface-faint)", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,11px)" }}>
      {list.map((o) => {
        const on = office === o;
        return (
          <button key={o} role="tab" aria-selected={on} className={on ? undefined : "wc-seg"} onClick={() => wc.setOffice(o)}
            style={{ height: compact ? 26 : 30, padding: compact ? "0 9px" : "0 12px", border: 0, borderRadius: "var(--r-ctl,9px)", cursor: "pointer", fontSize: 12, fontWeight: on ? 600 : 500, whiteSpace: "nowrap",
              background: on ? "var(--pill-bg)" : "none", color: on ? "var(--pill-ink)" : "var(--dim)", boxShadow: on ? "0 2px 6px rgba(0,0,0,.28)" : "none", transition: "background .2s var(--ease),color .2s var(--ease)" }}>
            {o === "All" ? "All offices" : o}
          </button>
        );
      })}
    </div>
  );
}

/** Local segmented control. */
export function Seg<T extends string>({ value, options, onChange }: { value: T; options: readonly T[] | { id: T; label: string }[]; onChange: (v: T) => void }) {
  const opts = (options as any[]).map((o) => (typeof o === "string" ? { id: o, label: o } : o)) as { id: T; label: string }[];
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 3, background: "var(--surface-faint)", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,11px)", flexWrap: "wrap" }}>
      {opts.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} className={on ? undefined : "wc-seg"} onClick={() => onChange(o.id)}
            style={{ height: 26, padding: "0 11px", border: 0, borderRadius: "var(--r-ctl,8px)", cursor: "pointer", fontSize: 11.5, fontWeight: on ? 600 : 500, whiteSpace: "nowrap", background: on ? "var(--surface-2)" : "none", color: on ? "var(--ink)" : "var(--dim)", boxShadow: on ? "inset 0 0 0 1px var(--border-strong)" : "none" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Panel({ title, meta, action, children, pad = true, style, tone, id }: { title?: ReactNode; meta?: ReactNode; action?: ReactNode; children: ReactNode; pad?: boolean; style?: CSSProperties; tone?: Tone; id?: string }) {
  return (
    <section id={id} style={{ position: "relative", minWidth: 0, display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid " + (tone ? TONE[tone].soft : "var(--border)"), borderRadius: "var(--card-r,18px)", boxShadow: "var(--card-shadow)", backdropFilter: "blur(20px) saturate(1.3)", overflow: "hidden", animation: "springIn .5s var(--ease) both", ...style }}>
      {(title || action) && (
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 18px 0", minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-.1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
            {meta && <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{meta}</div>}
          </div>
          {action}
        </header>
      )}
      <div style={{ padding: pad ? "12px 18px 16px" : "10px 0 0", flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* KPIs                                                                */
/* ------------------------------------------------------------------ */

export type Kpi = { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; onClick?: () => void; spark?: number[] };

export function KpiStrip({ items, min = 150 }: { items: Kpi[]; min?: number }) {
  return (
    <div className="wc-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(" + min + "px,1fr))", gap: 10, marginTop: 12 }}>
      {items.map((k, i) => {
        const t = k.tone ? TONE[k.tone] : null;
        const Tag = k.onClick ? "button" : "div";
        return (
          <Tag key={i} className={k.onClick ? "wc-kpi" : undefined} onClick={k.onClick}
            style={{ position: "relative", textAlign: "left", font: "inherit", color: "inherit", minWidth: 0, padding: "14px 16px 13px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md,16px)", cursor: k.onClick ? "pointer" : "default", overflow: "hidden", animation: "springIn .5s var(--ease) " + i * 40 + "ms both", transition: "border-color .2s var(--ease),transform .2s var(--ease)" }}>
            <div style={{ ...label, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.8px", marginTop: 8, lineHeight: 1, color: t ? t.ink : "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k.sub}</div>}
            {k.spark && <Spark values={k.spark} tone={k.tone} style={{ position: "absolute", right: 12, top: 14, opacity: 0.9 }} />}
          </Tag>
        );
      })}
    </div>
  );
}

export function Spark({ values, tone, w = 64, h = 22, style }: { values: number[]; tone?: Tone; w?: number; h?: number; style?: CSSProperties }) {
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => [(i * w) / (values.length - 1), h - 2 - ((v - min) / (max - min || 1)) * (h - 4)]);
  return (
    <svg width={w} height={h} viewBox={"0 0 " + w + " " + h} style={style} aria-hidden="true">
      <path d={"M" + pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" L")} fill="none" stroke={tone ? TONE[tone].ink : "var(--accent)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

/** Horizontal bars with labels and values. */
export function Bars({ data, max, fmtValue, highlight }: { data: { label: ReactNode; value: number; color?: string; note?: ReactNode; onClick?: () => void }[]; max?: number; fmtValue?: (n: number) => ReactNode; highlight?: number }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {data.map((d, i) => (
        <div key={i} onClick={d.onClick} className={d.onClick ? "wc-row" : undefined} style={{ display: "grid", gridTemplateColumns: "minmax(90px,150px) 1fr auto", alignItems: "center", gap: 10, cursor: d.onClick ? "pointer" : "default", borderRadius: 8 }}>
          <div style={{ fontSize: 12.5, color: "var(--body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</div>
          <div style={{ height: 10, borderRadius: 4, background: "var(--track)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: Math.max(1.5, (100 * d.value) / m) + "%", borderRadius: 4, background: d.color || (i === highlight ? "var(--accent)" : "var(--neutral)"), transformOrigin: "left", animation: "sweep .8s var(--ease) " + i * 50 + "ms both" }} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--ink)", minWidth: 48, textAlign: "right" }}>{fmtValue ? fmtValue(d.value) : d.value.toLocaleString("en-IE")}{d.note && <span style={{ color: "var(--faint)", marginLeft: 6 }}>{d.note}</span>}</div>
        </div>
      ))}
    </div>
  );
}

/** Vertical columns (one or two series). */
export function Columns({ labels, series, height = 150, fmtValue, colors }: { labels: string[]; series: number[][]; height?: number; fmtValue?: (n: number) => string; colors?: string[] }) {
  const max = Math.max(1, ...series.flat());
  const cols = colors || ["var(--accent)", "var(--neutral)", "var(--warn)"];
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, paddingTop: 16, position: "relative" }}>
        {labels.map((l, i) => (
          <div key={l + i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, position: "relative" }}>
            {series.map((s, k) => (
              <div key={k} title={l + ": " + (fmtValue ? fmtValue(s[i]) : s[i])} style={{ flex: 1, maxWidth: 26, height: Math.max(2, (100 * s[i]) / max) + "%", borderRadius: "5px 5px 2px 2px", background: cols[k], opacity: hover === null || hover === i ? 1 : 0.45, transformOrigin: "bottom", animation: "growBar .7s var(--ease) " + i * 30 + "ms both", transition: "opacity .2s var(--ease)" }} />
            ))}
            {hover === i && <div style={{ position: "absolute", bottom: "100%", marginBottom: -12, left: "50%", transform: "translateX(-50%)", padding: "3px 8px", borderRadius: 7, background: "var(--tooltip)", color: "var(--tooltip-ink)", fontFamily: MONO, fontSize: 10.5, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 2 }}>{series.map((s) => (fmtValue ? fmtValue(s[i]) : s[i].toLocaleString("en-IE"))).join(" / ")}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
        {labels.map((l, i) => <div key={l + i} style={{ flex: 1, minWidth: 0, textAlign: "center", fontFamily: MONO, fontSize: 9.5, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden" }}>{l}</div>)}
      </div>
    </div>
  );
}

/** Line / area trend in SVG, scales to its container. */
export function Trend({ labels, series, height = 150, fmtValue, area = true, target }: { labels: string[]; series: { name: string; values: number[]; color?: string }[]; height?: number; fmtValue?: (n: number) => string; area?: boolean; target?: { value: number; label: string } }) {
  const W = 600, H = 150;
  const all = series.flatMap((s) => s.values).concat(target ? [target.value] : []);
  const max = Math.max(...all), min = Math.min(...all);
  const lo = min - (max - min) * 0.15, hi = max + (max - min) * 0.1 || 1;
  const x = (i: number) => (i * W) / Math.max(1, labels.length - 1);
  const y = (v: number) => H - 8 - ((v - lo) / (hi - lo || 1)) * (H - 20);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none" style={{ width: "100%", height, display: "block", overflow: "visible" }}
        onPointerMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); setHover(Math.round(((e.clientX - r.left) / r.width) * (labels.length - 1))); }}
        onPointerLeave={() => setHover(null)}>
        {[0, 1, 2, 3].map((g) => <line key={g} x1="0" x2={W} y1={12 + g * 40} y2={12 + g * 40} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        {target && <line x1="0" x2={W} y1={y(target.value)} y2={y(target.value)} stroke="var(--warn)" strokeDasharray="5 5" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />}
        {series.map((s, k) => {
          const pts = s.values.map((v, i) => [x(i), y(v)]);
          const d = "M" + pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" L");
          const c = s.color || (k === 0 ? "var(--accent)" : "var(--neutral)");
          return (
            <g key={k}>
              {area && k === 0 && <path d={d + " L" + W + "," + H + " L0," + H + " Z"} fill={c} opacity=".1" />}
              <path d={d} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="var(--border-strong)" vectorEffect="non-scaling-stroke" />}
      </svg>
      {hover !== null && (
        <div style={{ position: "absolute", top: 0, left: Math.min(78, Math.max(0, (100 * hover) / Math.max(1, labels.length - 1) - 8)) + "%", padding: "5px 9px", borderRadius: 8, background: "var(--tooltip)", color: "var(--tooltip-ink)", fontSize: 11, pointerEvents: "none", whiteSpace: "nowrap", zIndex: 2 }}>
          <div style={{ fontFamily: MONO, fontSize: 9.5, opacity: 0.7 }}>{labels[hover]}</div>
          {series.map((s) => <div key={s.name}>{s.name}: <b>{fmtValue ? fmtValue(s.values[hover]) : s.values[hover].toLocaleString("en-IE")}</b></div>)}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {labels.map((l, i) => <span key={i} style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--faint)" }}>{l}</span>)}
      </div>
      {(series.length > 1 || target) && (
        <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          {series.map((s, k) => <Legend key={s.name} color={s.color || (k === 0 ? "var(--accent)" : "var(--neutral)")}>{s.name}</Legend>)}
          {target && <Legend color="var(--warn)" dashed>{target.label}</Legend>}
        </div>
      )}
    </div>
  );
}

export function Legend({ color, children, dashed }: { color: string; children: ReactNode; dashed?: boolean }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--dim)" }}><span style={{ width: 12, height: dashed ? 0 : 8, borderRadius: 2, background: dashed ? "none" : color, borderTop: dashed ? "2px dashed " + color : undefined }} />{children}</span>;
}

/** A single stacked bar (e.g. green / amber / red). */
export function Stack({ parts, height = 10, showLabels }: { parts: { value: number; color: string; label?: string }[]; height?: number; showLabels?: boolean }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height, borderRadius: 4, overflow: "hidden", gap: 2, background: "var(--track)" }}>
        {parts.filter((p) => p.value > 0).map((p, i) => <div key={i} title={(p.label || "") + " " + p.value} style={{ width: (100 * p.value) / total + "%", background: p.color, transformOrigin: "left", animation: "sweep .8s var(--ease) both" }} />)}
      </div>
      {showLabels && (
        <div style={{ display: "flex", gap: 12, marginTop: 7, flexWrap: "wrap" }}>
          {parts.map((p, i) => <Legend key={i} color={p.color}>{p.label} <b style={{ color: "var(--ink)", fontWeight: 500 }}>{p.value}</b></Legend>)}
        </div>
      )}
    </div>
  );
}

/** Stage-to-stage funnel with conversion. */
export function Funnel({ steps }: { steps: { label: string; value: number; onClick?: () => void }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {steps.map((s, i) => (
        <div key={s.label} onClick={s.onClick} className={s.onClick ? "wc-row" : undefined} style={{ display: "grid", gridTemplateColumns: "140px 1fr 70px", alignItems: "center", gap: 10, cursor: s.onClick ? "pointer" : "default", borderRadius: 8 }}>
          <div style={{ fontSize: 12.5, color: "var(--body)" }}>{s.label}</div>
          <div style={{ height: 24, display: "flex", alignItems: "center" }}>
            <div style={{ height: "100%", width: Math.max(3, (100 * s.value) / max) + "%", borderRadius: 6, background: i === 0 ? "var(--accent)" : "color-mix(in srgb, var(--accent) " + Math.max(18, 70 - i * 9) + "%, var(--track))", display: "flex", alignItems: "center", paddingLeft: 9, fontFamily: MONO, fontSize: 11.5, fontWeight: 600, color: i === 0 ? "var(--on-accent)" : "var(--ink)", transformOrigin: "left", animation: "sweep .8s var(--ease) " + i * 60 + "ms both", whiteSpace: "nowrap" }}>{s.value.toLocaleString("en-IE")}</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--faint)", textAlign: "right" }}>{i === 0 || !steps[i - 1].value ? "" : Math.round((100 * s.value) / steps[i - 1].value) + "% of prev"}</div>
        </div>
      ))}
    </div>
  );
}

/** Big percentage ring for scores. */
export function Ring({ value, size = 150, stroke = 12, label: lbl, tone = "accent" }: { value: number; size?: number; stroke?: number; label?: ReactNode; tone?: Tone }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONE[tone].ink} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 1s var(--ease)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: size * 0.24, fontWeight: 600, letterSpacing: "-1.5px", lineHeight: 1 }}>{value}%</div>
        {lbl && <div style={{ ...label, marginTop: 6 }}>{lbl}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export type Col<T> = { key: string; label: string; w?: string; align?: "left" | "right" | "center"; mono?: boolean; render?: (row: T) => ReactNode; sort?: (row: T) => number | string };

export function Table<T>({ cols, rows, onRow, pageSize = 12, empty = "Nothing here for this office.", footer, rowTone, dense, selected, rowKey }: {
  cols: Col<T>[]; rows: T[]; onRow?: (row: T) => void; pageSize?: number; empty?: ReactNode; footer?: ReactNode;
  rowTone?: (row: T) => Tone | undefined; dense?: boolean; selected?: (row: T) => boolean; rowKey?: (row: T, i: number) => string;
}) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const sorted = useMemo(() => {
    const c = cols.find((x) => x.key === sortKey);
    if (!c || !c.sort) return rows;
    return rows.slice().sort((a, b) => { const x = c.sort!(a), y = c.sort!(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
  }, [rows, sortKey, dir, cols]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const p = Math.min(page, pages - 1);
  const shown = sorted.slice(p * pageSize, p * pageSize + pageSize);
  const tpl = cols.map((c) => c.w || "1fr").join(" ");
  const cellPad = dense ? "8px 12px" : "11px 14px";
  return (
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", flex: 1 }}>
      <div style={{ overflowX: "auto", minWidth: 0 }}>
        <div style={{ minWidth: Math.max(560, cols.length * 110) }}>
          <div style={{ display: "grid", gridTemplateColumns: tpl, background: "var(--surface-faint)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
            {cols.map((c) => (
              <div key={c.key} onClick={c.sort ? () => { if (sortKey === c.key) setDir(dir === 1 ? -1 : 1); else { setSortKey(c.key); setDir(1); } } : undefined}
                style={{ padding: "8px 14px", fontSize: 11, fontWeight: 500, color: "var(--faint)", textAlign: c.align || "left", cursor: c.sort ? "pointer" : "default", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", userSelect: "none" }}>
                {c.label}{sortKey === c.key ? (dir === 1 ? " ↑" : " ↓") : ""}
              </div>
            ))}
          </div>
          {shown.map((r, i) => {
            const t = rowTone ? rowTone(r) : undefined;
            const sel = selected ? selected(r) : false;
            return (
              <div key={rowKey ? rowKey(r, i) : i} className={onRow ? "wc-row" : undefined} onClick={onRow ? () => onRow(r) : undefined}
                style={{ display: "grid", gridTemplateColumns: tpl, borderBottom: "1px solid var(--border)", cursor: onRow ? "pointer" : "default", background: sel ? "var(--accent-faint)" : "none", boxShadow: sel ? "inset 2px 0 0 var(--accent)" : t ? "inset 2px 0 0 " + TONE[t].ink : "none", transition: "background .18s var(--ease)" }}>
                {cols.map((c) => (
                  <div key={c.key} style={{ padding: cellPad, minWidth: 0, fontSize: 12.5, color: "var(--body)", textAlign: c.align || "left", fontFamily: c.mono ? MONO : "inherit", display: "flex", alignItems: "center", justifyContent: c.align === "right" ? "flex-end" : c.align === "center" ? "center" : "flex-start", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {c.render ? c.render(r) : String((r as any)[c.key] ?? "")}
                  </div>
                ))}
              </div>
            );
          })}
          {rows.length === 0 && <div style={{ padding: "36px 18px", textAlign: "center", fontSize: 13, color: "var(--dim)" }}>{empty}</div>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginTop: "auto" }}>
        <span style={{ flex: 1, fontSize: 11.5, color: "var(--faint)" }}>
          {footer ?? (rows.length ? "Showing " + (p * pageSize + 1) + " to " + (p * pageSize + shown.length) + " of " + rows.length.toLocaleString("en-IE") : "")}
        </span>
        {pages > 1 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Btn kind="quiet" disabled={p === 0} onClick={() => setPage(p - 1)} style={{ height: 26, padding: "0 9px" }}>Prev</Btn>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--dim)" }}>{p + 1} / {pages}</span>
            <Btn kind="quiet" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} style={{ height: 26, padding: "0 9px" }}>Next</Btn>
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lists + AI                                                          */
/* ------------------------------------------------------------------ */

export function ListRow({ left, title, meta, right, onClick, tone }: { left?: ReactNode; title: ReactNode; meta?: ReactNode; right?: ReactNode; onClick?: () => void; tone?: Tone }) {
  return (
    <div className={onClick ? "wc-row" : undefined} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 4px", borderTop: "1px solid var(--border)", cursor: onClick ? "pointer" : "default", borderRadius: 6 }}>
      {left ?? (tone && <span style={{ width: 7, height: 7, borderRadius: 2, flex: "none", background: TONE[tone].ink }} />)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink)" }}>{title}</div>
        {meta && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2, lineHeight: 1.45 }}>{meta}</div>}
      </div>
      {right}
    </div>
  );
}

export const AGENT_LOOK: Record<string, { shape: string; tint: string }> = {
  "Briefing": { shape: "crown-pebble", tint: "#191c1f" },
  "Ops Watchdog": { shape: "shield", tint: "#2b1b1e" },
  "Compliance Agent": { shape: "executive-capsule", tint: "#2a2118" },
  "Roster Optimiser": { shape: "control-cube", tint: "#16241f" },
  "Recruitment Agent": { shape: "low-dome", tint: "#241b2e" },
  "Visit Integrity Agent": { shape: "glass-visor", tint: "#1b2430" },
  "Care Hours Agent": { shape: "offset-pebble", tint: "#16241f" },
  "Reconciliation Agent": { shape: "rim-capsule", tint: "#1b2430" },
};

/** An agent's note: what it detected or prepared. Never a decision. */
export function AgentNote({ agent, children, action, state = "working" }: { agent: string; children: ReactNode; action?: ReactNode; state?: string }) {
  const look = AGENT_LOOK[agent] || AGENT_LOOK["Briefing"];
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "11px 13px", background: "var(--accent-faint)", border: "1px solid var(--accent-line)", borderRadius: "var(--r-md,14px)" }}>
      <AgentFace shape={look.shape} state={state} tint={look.tint} size="26" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>{agent}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--body)", marginTop: 2 }}>{children}</div>
      </div>
      {action}
    </div>
  );
}

export function HumanGate({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--dim)" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.6 19.5 6v6.1c0 4-3.1 6.9-7.5 8.3-4.4-1.4-7.5-4.3-7.5-8.3V6L12 3.6Z M9.2 12.2l2 2 3.6-3.7" /></svg>
      {children ?? "Suggestions only. A coordinator approves every change."}
    </div>
  );
}

export function Timeline({ items }: { items: { when: ReactNode; text: ReactNode; tone?: Tone; who?: ReactNode }[] }) {
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 12 }}>
          <div style={{ width: 12, flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, marginTop: 4, background: it.tone ? TONE[it.tone].ink : "var(--neutral)", boxShadow: "0 0 0 3px var(--surface)" }} />
            {i < items.length - 1 && <span style={{ flex: 1, width: 1, background: "var(--border)", minHeight: 14 }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 13 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--faint)" }}>{it.when}</span>
              {it.who && <span style={{ fontSize: 11.5, color: "var(--dim)" }}>{it.who}</span>}
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--body)", marginTop: 2 }}>{it.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Stat({ k, v, tone }: { k: ReactNode; v: ReactNode; tone?: Tone }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,10px)", minWidth: 0 }}>
      <div style={{ ...label, fontSize: 8.5 }}>{k}</div>
      <div style={{ fontSize: 13.5, marginTop: 5, color: tone ? TONE[tone].ink : "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
    </div>
  );
}

/** Filter pills with counts, for queues. */
export function Filters<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} className={on ? undefined : "wc-seg"} onClick={() => onChange(o.id)}
            style={{ height: 28, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 11px", borderRadius: "var(--r-ctl,9px)", cursor: "pointer", fontSize: 12, border: "1px solid " + (on ? "var(--accent-line)" : "var(--border)"), background: on ? "var(--accent-faint)" : "var(--surface-2)", color: on ? "var(--ink)" : "var(--dim)", fontWeight: on ? 600 : 500 }}>
            {o.label}
            {o.count !== undefined && <span style={{ fontFamily: MONO, fontSize: 10.5, color: on ? "var(--accent)" : "var(--faint)" }}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 11px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-ctl,10px)", minWidth: 200 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.8" strokeLinecap="round"><path d="m21 21-4.3-4.3 M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "none", fontSize: 12.5 }} />
    </label>
  );
}

/** Office filter helper for any row type with an `office` field. */
export function byOffice<T extends { office: string }>(rows: T[], office: OfficeFilter): T[] {
  return office === "All" ? rows : rows.filter((r) => r.office === office);
}

export { Fragment };
