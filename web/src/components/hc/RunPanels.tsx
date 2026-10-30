import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Copy, Download, Loader2, ShieldAlert, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { money, num, ordinal, ordinalSuffix, pendingAgents, postDecision, uniq, type RunEvent, type RunView } from "@/lib/api";
import { agentMeta, Card, Chip, CountUp, VerdictStamp, verdictClasses } from "./shared";
import { DemandMap } from "./DemandMap";
import { cn } from "@/lib/utils";


/* ---------------- Timeline ---------------- */
export function Timeline({ run }: { run: RunView }) {
  const pending = pendingAgents(run);
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {run.events.map((e, i) => <EventRow key={i} e={e} />)}
        {pending.map(({ agent: a, waiting }) => {
          const m = agentMeta(a); const I = m.icon;
          return (
            <motion.div key={"p-" + a + run.events.length} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={cn("flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5", m.border)}>
              <I className={cn("size-4 animate-pulse", m.text)} />
              <span className="text-sm">{a}</span>
              <span className={cn("ml-auto text-xs font-mono inline-flex items-center gap-1", waiting ? "text-gate" : "text-muted-foreground")}>
                {waiting ? "Waiting for you" : <><Loader2 className="size-3 animate-spin" /> working…</>}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function EventRow({ e }: { e: RunEvent }) {
  const m = agentMeta(e.agent); const I = m.icon;
  return (
    <motion.div layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}
      className={cn("rounded-lg border px-3 py-2.5", m.border, m.bg)}>
      <div className="flex items-center gap-2">
        <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} className={cn("grid place-items-center size-7 rounded-md border", m.border)}>
          <I className={cn("size-4", m.text)} />
        </motion.span>
        <span className={cn("text-sm font-semibold", m.text)}>{e.agent}</span>
        <span className="ml-auto text-[11px] font-mono text-muted-foreground">{num(e.ms)}ms</span>
      </div>
      <p className="text-sm mt-1.5 break-words">{e.text}</p>
      {e.qloo_calls?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">{e.qloo_calls.map((q, i) => <QlooChip key={i} q={q} />)}</div>
      )}
    </motion.div>
  );
}

function QlooChip({ q }: { q: RunEvent["qloo_calls"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("min-w-0", open && "basis-full")}>
      <button onClick={() => setOpen(!open)} className="rounded-full border border-amber/40 bg-ink/60 px-2 py-0.5 text-[11px] font-mono text-amber hover:bg-amber/10 max-w-full truncate">
        Qloo · {q.endpoint} · {num(q.ms)}ms
      </button>
      {open && (
        <div className="mt-1.5 rounded-md bg-ink/70 border border-border p-2 text-xs">
          <div className="text-muted-foreground italic">{q.why}</div>
          <pre className="mt-1 font-mono text-[10px] whitespace-pre-wrap break-all text-foreground/80">{JSON.stringify(q.params, null, 1)}</pre>
        </div>
      )}
    </div>
  );
}

/* ---------------- Demand ---------------- */
export function DemandCard({ run }: { run: RunView }) {
  const d = run.demand!;
  const ev = run.events.find((e) => e.agent === "Demand Analyst");
  const map = (ev?.data?.["map"] ?? []) as any[];
  return (
    <Card eyebrow="Demand map" title="Where the taste lives" accent="text-amber">
      <div className="grid gap-4 md:grid-cols-[1.6fr_1fr] items-start">
        <div className="min-w-0"><DemandMap points={map} target={run.metro ?? d.metro} /></div>
        <div>
          <div className="eyebrow">{d.metro}</div>
          <div className="font-display text-6xl text-amber"><CountUp value={Math.round(d.percentile)} suffix={ordinalSuffix(d.percentile)} /></div>
          <div className="font-mono text-sm text-muted-foreground">percentile · rank {d.rank}/{d.of}</div>
          <div className="eyebrow mt-4 mb-1">Strongest markets</div>
          <ol className="space-y-1 text-sm font-mono">
            {d.top_metros?.slice(0, 6).map(([n, p], i) => (
              <li key={n} className="flex justify-between gap-2"><span className="truncate">{i + 1}. {n}</span><span className="text-amber">{Math.round(p)}</span></li>
            ))}
          </ol>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Qloo heatmap: where this act's audience taste is strongest, across 105 US metros.</p>
    </Card>
  );
}

/* ---------------- Math ---------------- */
export function MathCard({ run }: { run: RunView }) {
  const [open, setOpen] = useState(false);
  const d = run.draft!;
  return (
    <Card>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <span className="font-display text-2xl">How the number is made</span>
        <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} />
      </button>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 font-mono">
        <Stat k="Demand factor" v={<CountUp value={d.demand_factor} decimals={2} />} />
        <Stat k="Rec. room" v={<CountUp value={d.recommended_capacity} />} />
        <Stat k="Guarantee ceiling" v={<CountUp value={d.guarantee_ceiling} prefix="$" />} />
        <Stat k="Gross @ rec." v={<CountUp value={d.projected_gross_at_rec} prefix="$" />} />
      </div>
      {d.flags?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{d.flags.map((f) => <Chip key={f} className="border-amber/40 text-amber">{f}</Chip>)}</div>}
      {open && (
        <p className="text-sm text-muted-foreground mt-3">
          Demand factor = percentile ÷ 75 (min 0.25, max 1). Recommended room = proposed room × factor. Guarantee ceiling = proposed guarantee × factor. Assumes the proposed room is sized for the act's typical strong market. Qloo measures taste affinity, not ticket sales.
          <span className="block mt-2">Rules decide the numbers; the Skeptic and Deal Agent argue about the verdict; code guard rails stop the AI from inventing acts, sponsors or numbers.</span>
        </p>
      )}
    </Card>
  );
}
function Stat({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="rounded-md bg-ink/50 border border-border p-2 min-w-0"><div className="eyebrow text-[10px]">{k}</div><div className="text-lg text-amber truncate">{v}</div></div>;
}

/* ---------------- Audience ---------------- */
const AGE_LABEL: Record<string, string> = { "24_and_younger": "≤24", "25_to_29": "25–29", "30_to_34": "30–34", "35_to_44": "35–44", "45_to_54": "45–54", "55_and_older": "55+" };
export function AudienceCard({ run }: { run: RunView }) {
  const c = run.comps!;
  const rows = [
    ...Object.entries(c.age_index ?? {}).map(([k, v]) => [AGE_LABEL[k] ?? k, v] as const),
    ...Object.entries(c.gender_index ?? {}).map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v] as const),
  ];
  return (
    <Card eyebrow="Who's in the room" title="Audience shape" accent="text-amber">
      <div className="space-y-1.5">
        {rows.map(([k, v], i) => {
          const w = Math.min(Math.abs(v), 1) * 50;
          return (
            <div key={k} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-xs font-mono">
              <span className="text-muted-foreground">{k}</span>
              <div className="relative h-4 bg-ink/50 rounded">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: i * 0.05, duration: 0.6 }}
                  className={cn("absolute top-0 bottom-0 rounded", v >= 0 ? "left-1/2 bg-amber" : "right-1/2 bg-magenta")} />
              </div>
              <span className={v >= 0 ? "text-amber" : "text-magenta"}>{v >= 0 ? "+" : ""}{(v * 100).toFixed(0)}%</span>
            </div>
          );
        })}
        <div className="flex justify-between text-[10px] eyebrow pt-1"><span>← under-index</span><span>vs average</span><span>over-index →</span></div>
      </div>
      <ChipGroup label="Local co-bill pool" items={c.local_cobills} />
      <ChipGroup label="Audience hangouts" items={c.hangouts} />
      <ChipGroup label="Sponsor targets" items={c.sponsors} />
      <ChipGroup label="Adjacent acts" items={c.adjacent_acts} />
    </Card>
  );
}
function ChipGroup({ label, items, cls }: { label: string; items?: string[]; cls?: string | undefined }) {
  if (!items?.length) return null;
  const u = uniq(items); if (!u.length) return null;
  return <div className="mt-3"><div className="eyebrow mb-1">{label}</div><div className="flex flex-wrap gap-1.5">{u.map((x) => <Chip key={x} className={cls}>{x}</Chip>)}</div></div>;
}

/* ---------------- Debate ---------------- */
export function DebateCard({ run }: { run: RunView }) {
  const s = run.skeptic!; const m = run.memo ?? run.pending?.memo;
  const disagree = m && s.suggested_verdict?.toUpperCase() !== m.verdict?.toUpperCase();
  const clamps = run.events.filter((e) => e.agent === "Deal Agent").flatMap((e) => (e.data?.["clamps"] ?? []) as any[]);
  return (
    <Card eyebrow={`The debate${run.round ? ` · round ${run.round}` : ""}`} title="Skeptic vs Deal Agent">
      {disagree && (
        <div className="crackle mb-3 rounded-md border-2 border-magenta bg-magenta/15 text-magenta font-display text-2xl text-center py-1 inline-flex w-full justify-center items-center gap-2">
          <Zap className="size-5" /> Disagreement <Zap className="size-5" />
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-magenta/50 bg-magenta/5 p-3 min-w-0">
          <div className="flex items-center justify-between"><span className="font-semibold text-magenta">Skeptic</span><VerdictStamp verdict={s.suggested_verdict} size="sm" /></div>
          <ul className="mt-3 space-y-2">
            {s.objections?.map((o, i) => (
              <li key={i} className="text-sm">
                <div className="flex gap-2 items-start"><Sev s={o.severity} /><span className="font-medium">{o.claim}</span></div>
                <div className="text-xs text-muted-foreground mt-0.5 pl-1">{o.evidence}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-go/50 bg-go/5 p-3 min-w-0">
          <div className="flex items-center justify-between"><span className="font-semibold text-go">Deal Agent</span>{m ? <VerdictStamp verdict={m.verdict} size="sm" /> : <Loader2 className="size-4 animate-spin text-go" />}</div>
          <p className="text-sm mt-3">{m?.responds_to_skeptic ?? "Drafting a response…"}</p>
        </div>
      </div>
      {clamps.length > 0 && (
        <div className="mt-3 rounded-md border border-border bg-ink/50 p-2 text-xs">
          <div className="eyebrow mb-1">Arbiter override</div>
          <ul className="space-y-0.5 font-mono">{clamps.map((c, i) => <li key={i}>• {typeof c === "string" ? c : JSON.stringify(c)}</li>)}</ul>
        </div>
      )}
    </Card>
  );
}
function Sev({ s }: { s: string }) {
  const c = s === "high" ? "bg-pass/20 text-pass border-pass/50" : s === "medium" ? "bg-amber/20 text-amber border-amber/50" : "bg-steel/20 text-steel border-steel/40";
  return <span className={cn("shrink-0 rounded border px-1.5 text-[10px] font-mono uppercase mt-0.5", c)}>{s}</span>;
}

/* ---------------- Baseline compare ---------------- */
export function CompareCard({ run }: { run: RunView }) {
  const b = run.baseline!; const m = run.memo; const d = run.demand;
  const vDiff = !!m && b.verdict?.toUpperCase() !== m.verdict?.toUpperCase();
  const capDiff = !!m && m.recommended_capacity !== run.offer.capacity;
  const gDiff = !!m && m.guarantee_ceiling !== run.offer.guarantee;
  const guessHigh = /high|strong|very|sell/i.test(b.demand_guess ?? "");
  const demandDiff = !!d && (vDiff || (guessHigh && d.percentile < 50) || (!guessHigh && d.percentile >= 75));
  const where = d?.metro ?? run.metro ?? run.offer.city;
  return (
    <Card eyebrow="Without Qloo vs with Qloo" title="What the data changed">
      {m && vDiff && (
        <div className="mb-3 rounded-md border border-amber bg-amber/10 p-3 text-sm">
          A plain LLM would have said <b>{b.verdict}</b> at {money(run.offer.guarantee)}.{d && <> Qloo's taste data puts {where} at the <b className="text-amber">{ordinal(d.percentile)} percentile</b> (rank {d.rank}/{d.of}).</>}
        </div>
      )}
      {m && !vDiff && (capDiff || gDiff) && (
        <div className="mb-3 rounded-md border border-amber bg-amber/10 p-3 text-sm">
          Both say <b>{m.verdict}</b>, but Qloo sizes it: <b className="text-amber">{num(m.recommended_capacity)} cap / {money(m.guarantee_ceiling)}</b> instead of the plain LLM's guess.
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-steel/40 p-3 min-w-0">
          <div className="eyebrow">Plain LLM (no data)</div>
          <div className={cn("font-display text-4xl mt-1", verdictClasses(b.verdict), vDiff && "bg-amber/10 rounded px-1")}>{b.verdict}</div>
          <Row k="Demand guess" v={b.demand_guess} hl={demandDiff} />
          <p className="text-sm text-muted-foreground mt-2">{b.reason}</p>
          <ChipGroup label="Suggested openers" items={b.suggested_openers} />
        </div>
        <div className="rounded-lg border border-amber/50 p-3 min-w-0">
          <div className="eyebrow text-amber">Headcount (Qloo-grounded)</div>
          {m ? (
            <>
              <div className={cn("font-display text-4xl mt-1", verdictClasses(m.verdict), vDiff && "bg-amber/10 rounded px-1")}>{m.verdict}</div>
              <Row k="Percentile" v={d ? `${ordinal(d.percentile)} · rank ${d.rank}/${d.of}` : "—"} hl={demandDiff} />
              <Row k="Recommended room" v={num(m.recommended_capacity)} hl={capDiff} />
              <Row k="Guarantee ceiling" v={money(m.guarantee_ceiling)} hl={gDiff} />
              <ChipGroup label="Co-bill" items={m.cobill} cls="border-amber/40" />
            </>
          ) : <div className="text-sm text-muted-foreground mt-2 inline-flex gap-2 items-center"><Loader2 className="size-4 animate-spin" /> Agents still working…</div>}
        </div>
      </div>
    </Card>
  );
}
function Row({ k, v, hl }: { k: string; v: React.ReactNode; hl?: boolean }) {
  return <div className="flex justify-between gap-2 text-sm mt-1.5"><span className="text-muted-foreground">{k}</span><span className={cn("font-mono text-right", hl && "text-amber")}>{v}</span></div>;
}

/* ---------------- Final memo ---------------- */
export function MemoCard({ run }: { run: RunView }) {
  const m = run.memo!;
  const pass = m.verdict?.toUpperCase() === "PASS";
  return (
    <Card className="p-6 sm:p-10 text-center relative overflow-hidden">
      <div className="eyebrow">Final memo · {run.offer.act} · {run.offer.city}</div>
      <div className="my-6"><VerdictStamp verdict={m.verdict} /></div>
      <h2 className="font-display text-3xl sm:text-5xl max-w-3xl mx-auto">{m.headline}</h2>
      <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{m.rationale}</p>
      <div className="mt-6 font-mono text-xl sm:text-2xl text-amber">
        {pass ? "No offer" : `${num(m.recommended_capacity)} cap · up to ${money(m.guarantee_ceiling)}`}
      </div>
      <div className="grid gap-4 sm:grid-cols-3 mt-6 text-left">
        <ChipGroup label="Co-bill" items={m.cobill} />
        <ChipGroup label="Sponsors" items={m.sponsors} />
        <ChipGroup label="Promo spots" items={m.promo_hangouts} />
      </div>
    </Card>
  );
}

/* ---------------- Approval ---------------- */
export function ApprovalCard({ run, onDone }: { run: RunView; onDone: (r?: RunView) => void }) {
  const p = run.pending!;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const decide = async (d: "approve" | "reject") => {
    setBusy(d); setErr(null);
    try { onDone(await postDecision(run.id, d, note)); } catch (e) { setErr(String(e)); setBusy(null); }
  };
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  return (
    <>
    <motion.section ref={ref} initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1, boxShadow: ["0 0 20px -10px var(--gate)", "0 0 70px -6px var(--gate)", "0 0 20px -10px var(--gate)"] }}
      transition={{ boxShadow: { repeat: Infinity, duration: 1.8 } }}
      className="scroll-mt-28 rounded-xl border-2 border-gate bg-gate/10 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-gate"><ShieldAlert className="size-6" /><h2 className="font-display text-3xl sm:text-4xl">Human approval required</h2></div>
      <ul className="mt-3 space-y-1 text-sm list-disc pl-5">{p.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <VerdictStamp verdict={p.memo.verdict} size="sm" />
        <span className="font-mono text-amber">{p.memo.verdict?.toUpperCase() === "PASS" ? "No offer" : `${num(p.memo.recommended_capacity)} cap · up to ${money(p.memo.guarantee_ceiling)}`}</span>
      </div>
      <p className="text-sm mt-2">{p.memo.headline}</p>
      {p.actions?.length > 0 && (
        <div className="mt-3"><div className="eyebrow mb-1">Drafts waiting on you</div>
          <ul className="text-sm space-y-0.5">{uniq(p.actions.map((a) => a.title)).map((t) => ({ title: t })).map((a) => <li key={a.title}>• {a.title}</li>)}</ul></div>
      )}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the audit trail (optional)"
        className="mt-4 w-full rounded-md border border-input bg-background/60 p-2 text-sm min-h-20 focus:outline-none focus:ring-2 focus:ring-gate" />
      <div className="mt-3 flex gap-2">
        <button disabled={!!busy} onClick={() => decide("approve")} className="flex-1 rounded-md bg-gate text-primary-foreground font-display text-2xl py-2.5 hover:brightness-110 disabled:opacity-60 inline-flex justify-center items-center gap-2">
          {busy === "approve" && <Loader2 className="size-5 animate-spin" />} Approve
        </button>
        <button disabled={!!busy} onClick={() => decide("reject")} className="flex-1 rounded-md border-2 border-pass text-pass font-display text-2xl py-2.5 hover:bg-pass/10 disabled:opacity-60 inline-flex justify-center items-center gap-2">
          {busy === "reject" && <Loader2 className="size-5 animate-spin" />} Reject
        </button>
      </div>
      {err && <p className="text-xs text-pass mt-2 font-mono break-words">{err}</p>}
    </motion.section>
    <div className="sm:hidden fixed inset-x-0 bottom-0 z-40 border-t-2 border-gate bg-background/95 backdrop-blur p-3 flex gap-2 items-center">
      <span className="text-xs text-gate font-mono shrink-0">Your call:</span>
      <button disabled={!!busy} onClick={() => decide("approve")} className="flex-1 rounded-md bg-gate text-primary-foreground font-display text-xl py-2 disabled:opacity-60">{busy === "approve" ? "…" : "Approve"}</button>
      <button disabled={!!busy} onClick={() => decide("reject")} className="flex-1 rounded-md border-2 border-pass text-pass font-display text-xl py-2 disabled:opacity-60">{busy === "reject" ? "…" : "Reject"}</button>
    </div>
    </>
  );
}

/* ---------------- Actions ---------------- */
export function ActionsCard({ run }: { run: RunView }) {
  return (
    <Card eyebrow="Headcount drafts, you send" title="Drafted actions">
      <div className="grid gap-3 md:grid-cols-2">{run.actions!.map((a, i) => <ActionItem key={i} a={a} />)}</div>
      <p className="text-xs text-muted-foreground mt-3">Nothing has been sent. These are drafts for you to review and send yourself.</p>
    </Card>
  );
}
function ActionItem({ a }: { a: NonNullable<RunView["actions"]>[number] }) {
  const [copied, setCopied] = useState(false);
  const st = a.status.toLowerCase();
  const c = st.includes("reject") ? "border-pass/50 text-pass" : st.includes("approv") ? "border-gate/50 text-gate" : "border-go/50 text-go";
  return (
    <div className="rounded-lg border border-border bg-ink/40 p-3 min-w-0">
      <div className="flex items-center gap-2 flex-wrap"><Chip className="font-mono uppercase text-[10px]">{a.kind}</Chip><Chip className={c}>{a.status}</Chip>
        <button onClick={() => { navigator.clipboard.writeText(`${a.title}\n\n${a.body}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="ml-auto inline-flex items-center gap-1 text-xs text-amber hover:underline">
          {copied ? <><Check className="size-3.5" /> Copied draft</> : <><Copy className="size-3.5" /> Copy draft</>}
        </button>
      </div>
      <div className="font-semibold mt-2">{a.title}</div>
      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">{a.body}</p>
    </div>
  );
}

/* ---------------- Audit ---------------- */
export function AuditCard({ run }: { run: RunView }) {
  const [open, setOpen] = useState(false);
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `headcount-${run.id}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 font-display text-2xl">Audit trail <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} /></button>
        <button onClick={download} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"><Download className="size-3.5" /> Download audit JSON</button>
      </div>
      {open && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left eyebrow"><tr><th className="py-1 pr-2">Agent</th><th className="pr-2">Event</th><th className="pr-2 text-right">ms</th><th className="text-right">Qloo</th></tr></thead>
            <tbody>
              {run.events.map((e, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className={cn("py-1.5 pr-2 whitespace-nowrap", agentMeta(e.agent).text)}>{e.agent}</td>
                  <td className="pr-2 min-w-48">{e.text}</td>
                  <td className="pr-2 text-right font-mono">{num(e.ms)}</td>
                  <td className="text-right font-mono">{e.qloo_calls?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
