import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  ShieldAlert,
  MapPin,
  Bot,
  Scale,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  money,
  num,
  pendingAgents,
  postDecision,
  uniq,
  type RunEvent,
  type RunView,
} from "@/lib/api";
import { agentMeta, Card, Chip, FormattedNumber, VerdictStamp, verdictClasses } from "./shared";
import { DemandMap } from "./DemandMap";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  agentLabel,
  approvalExplanation,
  approvalWhy,
  rankPosition,
  verdictMeaning,
} from "@/lib/presentation";

/* ---------------- Timeline ---------------- */
export function Timeline({ run }: { run: RunView }) {
  const pending = pendingAgents(run);
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {run.events.map((e, i) => (
          <EventRow key={i} e={e} />
        ))}
        {pending.map(({ agent: a, waiting }) => {
          const m = agentMeta(a);
          const I = m.icon;
          return (
            <motion.div
              key={"p-" + a + run.events.length}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5",
                m.border,
              )}
            >
              <I className={cn("size-4", m.text)} />
              <span className="text-sm">{agentLabel(a)}</span>
              <span
                className={cn(
                  "ml-auto text-xs font-mono inline-flex items-center gap-1",
                  waiting ? "text-gate" : "text-muted-foreground",
                )}
              >
                {waiting ? (
                  "Waiting for you"
                ) : (
                  <>
                    <Loader2 className="size-3 animate-spin" /> working…
                  </>
                )}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function EventRow({ e }: { e: RunEvent }) {
  const m = agentMeta(e.agent);
  const I = m.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className={cn("rounded-lg border px-3 py-2.5", m.border, m.bg)}
    >
      <div className="flex items-center gap-2">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn("grid place-items-center size-7 rounded-md border", m.border)}
        >
          <I className={cn("size-4", m.text)} />
        </motion.span>
        <span className={cn("text-sm font-semibold", m.text)}>{agentLabel(e.agent)}</span>
        <span className="ml-auto text-[11px] font-mono text-muted-foreground">{num(e.ms)}ms</span>
      </div>
      <p className="text-sm mt-1.5 break-words">{e.text}</p>
      {e.qloo_calls?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {e.qloo_calls.map((q, i) => (
            <QlooChip key={i} q={q} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function QlooChip({ q }: { q: RunEvent["qloo_calls"][number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("min-w-0", open && "basis-full")}>
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        className="rounded-full border border-amber/40 bg-ink/60 px-2 py-0.5 text-[11px] font-mono text-amber hover:bg-amber/10 max-w-full truncate"
      >
        Qloo · {q.endpoint} · {num(q.ms)}ms
      </Button>
      {open && (
        <div className="mt-1.5 rounded-md bg-ink/70 border border-border p-2 text-xs">
          <div className="text-muted-foreground italic">{q.why}</div>
          <pre className="mt-1 font-mono text-[10px] whitespace-pre-wrap break-all text-foreground/80">
            {JSON.stringify(q.params, null, 1)}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ---------------- Demand ---------------- */
export function RankBar({ rank, of }: { rank: number; of: number }) {
  return (
    <div aria-label={`Rank ${rank} of ${of} US cities`}>
      <div className="rank-track">
        <span className="rank-marker" style={{ left: `${rankPosition(rank, of)}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Most loved · 1</span>
        <span>{of}</span>
      </div>
    </div>
  );
}
export function DemandCard({ run }: { run: RunView }) {
  const d = run.demand;
  if (!d) return null;
  const map = (run.events.find((e) => e.agent === "Demand Analyst")?.data?.["map"] ?? []) as any[];
  return (
    <section className="py-2">
      <div className="grid gap-5 md:grid-cols-[1.6fr_1fr] items-center">
        <DemandMap points={map} target={run.metro ?? d.metro} />
        <div>
          <h3 className="text-lg">{d.metro}</h3>
          <div className="font-display text-4xl text-amber mt-2">
            Rank {d.rank} of {d.of}
          </div>
          <p className="text-sm text-muted-foreground mt-2">US cities for this band's fans</p>
          <RankBar rank={d.rank} of={d.of} />
          <h4 className="text-sm mt-6 mb-2">Top 3 cities</h4>
          <ol className="space-y-2 text-sm">
            {d.top_metros?.slice(0, 3).map(([name], i) => (
              <li key={name}>
                {i + 1}. {name}
              </li>
            ))}
          </ol>
          {d.hype_gap > 0 && (
            <p className="text-sm text-muted-foreground mt-4">Known here, but not loved</p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Math ---------------- */
export function MathCard({ run }: { run: RunView }) {
  const [open, setOpen] = useState(false);
  const d = run.draft;
  if (!d) return null;
  return (
    <Card>
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <span className="font-display text-2xl">The math</span>
        <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} />
      </Button>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 font-mono">
        <Stat k="Demand factor" v={<FormattedNumber value={d.demand_factor} decimals={2} />} />
        <Stat k="Seats" v={<FormattedNumber value={d.recommended_capacity} />} />
        <Stat
          k="Max to pay the band"
          v={<FormattedNumber value={d.guarantee_ceiling} prefix="$" />}
        />
        <Stat
          k="Ticket income at this size"
          v={<FormattedNumber value={d.projected_gross_at_rec} prefix="$" />}
        />
      </div>
      {d.flags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {d.flags.map((f) => (
            <Chip key={f} className="border-amber/40 text-amber">
              {f}
            </Chip>
          ))}
        </div>
      )}
      {open && (
        <p className="text-sm text-muted-foreground mt-3">
          Qloo's city taste score sets a size factor between 0.25 and 1. We multiply the offered
          seats and band pay by that factor. The offered room is assumed to fit a strong market.
          Qloo measures taste, not ticket sales.
          <span className="block mt-2">
            Rules decide the numbers; the Skeptic and Deal Agent argue about the verdict; code guard
            rails stop the AI from inventing acts, sponsors or numbers.
          </span>
        </p>
      )}
    </Card>
  );
}
function Stat({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-md bg-ink/50 border border-border p-2 min-w-0">
      <div className="eyebrow text-[10px]">{k}</div>
      <div className="text-lg text-amber truncate">{v}</div>
    </div>
  );
}

/* ---------------- Audience ---------------- */
const AGE_LABEL: Record<string, string> = {
  "24_and_younger": "≤24",
  "25_to_29": "25–29",
  "30_to_34": "30–34",
  "35_to_44": "35–44",
  "45_to_54": "45–54",
  "55_and_older": "55+",
};
export function AudienceCard({ run }: { run: RunView }) {
  const c = run.comps;
  if (!c) return null;
  const rows = [
    ...Object.entries(c.age_index ?? {}).map(([k, v]) => [AGE_LABEL[k] ?? k, v] as const),
    ...Object.entries(c.gender_index ?? {}).map(
      ([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v] as const,
    ),
  ];
  return (
    <Card title="Who's in the room" accent="text-amber">
      <div className="space-y-1.5">
        {rows.map(([k, v]) => {
          const w = Math.min(Math.abs(v), 1) * 50;
          return (
            <div
              key={k}
              className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-xs font-mono"
            >
              <span className="text-muted-foreground">{k}</span>
              <div className="relative h-4 bg-ink/50 rounded">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                <motion.div
                  style={{ width: `${w}%` }}
                  className={cn(
                    "absolute top-0 bottom-0 rounded",
                    v >= 0 ? "left-1/2 bg-amber" : "right-1/2 bg-magenta",
                  )}
                />
              </div>
              <span className={v >= 0 ? "text-amber" : "text-magenta"}>
                {v >= 0 ? "+" : ""}
                {(v * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
        <div className="flex justify-between text-[10px] eyebrow pt-1">
          <span>← fewer</span>
          <span>vs average</span>
          <span>more →</span>
        </div>
      </div>
      <ChipGroup label="Local openers" items={c.local_cobills} />
      <ChipGroup label="Where to put posters" items={c.hangouts} />
      <ChipGroup label="Potential sponsors" items={c.sponsors} />
      <ChipGroup label="Similar bands" items={c.adjacent_acts} />
    </Card>
  );
}
function ChipGroup({
  label,
  items,
  cls,
}: {
  label: string;
  items?: string[];
  cls?: string | undefined;
}) {
  if (!items?.length) return null;
  const u = uniq(items);
  if (!u.length) return null;
  return (
    <div className="mt-3">
      <div className="eyebrow mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {u.map((x) => (
          <Chip key={x} className={cls}>
            {x}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Debate ---------------- */
export function DebateCard({ run }: { run: RunView }) {
  const s = run.skeptic;
  if (!s) return null;
  const m = run.memo ?? run.pending?.memo;
  return (
    <section>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="flex justify-between gap-3">
            <h3 className="text-magenta font-semibold">Skeptic</h3>
            <VerdictStamp verdict={s.suggested_verdict} size="sm" />
          </div>
          <p className="text-sm mt-3">{s.objections?.[0]?.claim ?? "Checks the risks."}</p>
        </div>
        <div>
          <div className="flex justify-between gap-3">
            <h3 className="text-go font-semibold">Deal Agent</h3>
            {m && <VerdictStamp verdict={m.verdict} size="sm" />}
          </div>
          <p className="text-sm mt-3">
            {m?.responds_to_skeptic?.split(/(?<=[.!?])\s/)[0] ?? "Reviewing the offer…"}
          </p>
        </div>
      </div>
      <ul className="mt-6 space-y-4 border-t border-border pt-5">
        {s.objections?.map((o, i) => (
          <li key={i} className="text-sm">
            <p>{o.claim}</p>
            <p className="text-muted-foreground mt-1">{o.evidence}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- Baseline compare ---------------- */
export function CompareCard({ run }: { run: RunView }) {
  const b = run.baseline;
  const m = run.memo ?? run.pending?.memo;
  if (!b) return null;
  const diff = !!m && b.verdict.toUpperCase() !== m.verdict.toUpperCase();
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="text-sm text-muted-foreground">Plain AI (no Qloo data)</h3>
        <div className={cn("font-display text-4xl mt-3", diff ? "text-amber" : "text-foreground")}>
          {b.verdict}
        </div>
        <Row k="Audience guess" v={b.demand_guess} />
        <p className="text-sm text-muted-foreground mt-3">{b.reason}</p>
        <ChipGroup label="Suggested openers" items={b.suggested_openers} />
      </div>
      <div>
        <h3 className="text-sm text-amber">With Qloo</h3>
        {m ? (
          <>
            <div
              className={cn("font-display text-4xl mt-3", diff ? "text-amber" : "text-foreground")}
            >
              {m.verdict}
            </div>
            {run.demand && (
              <Row k="City rank" v={`${run.demand.rank} of ${run.demand.of} US cities`} />
            )}
            <Row
              k="Seats"
              v={m.verdict.toUpperCase() === "PASS" ? "No offer" : num(m.recommended_capacity)}
              hl={m.recommended_capacity !== run.offer.capacity}
            />
            <Row
              k="Max to pay the band"
              v={m.verdict.toUpperCase() === "PASS" ? "No offer" : money(m.guarantee_ceiling)}
              hl={m.guarantee_ceiling !== run.offer.guarantee}
            />
            <ChipGroup label="Local openers" items={m.cobill} />
          </>
        ) : (
          <p className="text-sm mt-3">Checking this offer…</p>
        )}
      </div>
    </section>
  );
}
function Row({ k, v, hl }: { k: string; v: React.ReactNode; hl?: boolean }) {
  return (
    <div className="flex justify-between gap-2 text-sm mt-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("font-mono text-right", hl && "text-amber")}>{v}</span>
    </div>
  );
}

/* ---------------- Final memo ---------------- */
export function MemoCard({ run }: { run: RunView }) {
  const m = run.memo ?? run.pending?.memo;
  if (!m) return null;
  const d = run.demand;
  const b = run.baseline;
  return (
    <section className="answer-card py-6 sm:py-10 border-b border-border" aria-label="The answer">
      <p className="text-xs text-muted-foreground mb-4">
        {run.status === "awaiting_approval"
          ? "Proposed answer · your approval needed"
          : run.status === "running"
            ? "Proposed answer"
            : "The answer"}
      </p>
      <h1 className={cn("answer-verdict font-display", verdictClasses(m.verdict))}>{m.verdict}</h1>
      <p className="text-xl mt-3">{verdictMeaning(m.verdict)}</p>
      <div className="answer-terms font-display mt-6 leading-tight">
        {m.verdict.toUpperCase() === "PASS" ? (
          "No offer"
        ) : (
          <>
            <span>{num(m.recommended_capacity)} seats</span>
            <span className="hidden sm:inline text-muted-foreground"> · </span>
            <span className="block sm:inline">
              max {money(m.guarantee_ceiling)}{" "}
              <span className="text-base sm:text-2xl font-sans text-muted-foreground">
                to the band
              </span>
            </span>
          </>
        )}
      </div>
      <h2 className="text-sm text-muted-foreground mt-6 mb-3">Why</h2>
      <ul className="space-y-3 text-sm sm:text-base max-w-3xl">
        <li className="flex gap-3">
          <MapPin className="size-5 shrink-0 text-amber" />
          <div>
            {d ? (
              <>
                {run.offer.city} ranks{" "}
                <strong>
                  {d.rank} of {d.of}
                </strong>{" "}
                US cities for this band's fans
                <RankBar rank={d.rank} of={d.of} />
              </>
            ) : (
              "Checking this city's taste for the band…"
            )}
          </div>
        </li>
        <li className="flex gap-3">
          <Bot className="size-5 shrink-0 text-steel" />
          <span>
            {b
              ? b.verdict.toUpperCase() !== m.verdict.toUpperCase()
                ? `A plain AI without Qloo said ${b.verdict}`
                : `A plain AI agreed, but Qloo sized it to ${num(m.recommended_capacity)} seats`
              : "Waiting for the plain AI comparison…"}
          </span>
        </li>
        <li className="flex gap-3">
          <Scale className="size-5 shrink-0 text-gate" />
          <span>{approvalWhy(run)}</span>
        </li>
      </ul>
    </section>
  );
}

export function ApprovalCard({ run, onDone }: { run: RunView; onDone: (r?: RunView) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }, []);
  if (!run.pending) return null;
  async function decide(decision: "approve" | "reject") {
    setBusy(decision);
    setErr(null);
    try {
      onDone(await postDecision(run.id, decision, note));
    } catch (e) {
      setErr(String(e));
      setBusy(null);
    }
  }
  const buttons = (
    <>
      <Button
        disabled={!!busy}
        onClick={() => decide("approve")}
        className="flex-1 h-12 bg-gate text-primary-foreground text-lg"
      >
        {busy === "approve" && <Loader2 className="animate-spin" />}Approve
      </Button>
      <Button
        disabled={!!busy}
        onClick={() => decide("reject")}
        variant="outline"
        className="flex-1 h-12 border-pass text-pass text-lg"
      >
        {busy === "reject" && <Loader2 className="animate-spin" />}Reject
      </Button>
    </>
  );
  return (
    <>
      <section
        ref={ref}
        className="approval-highlight rounded-md p-5 sm:p-6 scroll-mt-20"
        aria-label="Your call"
      >
        <h2 className="font-display text-3xl text-gate flex gap-3 items-center">
          <ShieldAlert className="size-6" />
          Your call
        </h2>
        <p className="text-sm mt-3">{approvalExplanation(run)}</p>
        <div className="flex gap-3 mt-5">{buttons}</div>
        <details className="mt-4 text-sm text-muted-foreground">
          <summary className="cursor-pointer">Add a note (optional)</summary>
          <textarea
            aria-label="Note for the audit trail"
            className="mt-2 w-full rounded-md border border-input bg-background p-3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </details>
        {err && (
          <p role="alert" className="text-pass text-sm mt-3">
            {err}
          </p>
        )}
      </section>
      <div
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gate bg-background p-3 flex gap-3"
        aria-label="Mobile approval"
      >
        {buttons}
      </div>
    </>
  );
}

/* ---------------- Actions ---------------- */
export function ActionsCard({ run }: { run: RunView }) {
  return (
    <Card eyebrow="Headcount drafts, you send" title="Ready-to-send drafts">
      <div className="grid gap-3 md:grid-cols-2">
        {(run.actions ?? []).map((a, i) => (
          <ActionItem key={i} a={a} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Nothing has been sent. These are drafts for you to review and send yourself.
      </p>
    </Card>
  );
}
function ActionItem({ a }: { a: NonNullable<RunView["actions"]>[number] }) {
  const [copied, setCopied] = useState(false);
  const st = a.status.toLowerCase();
  const c = st.includes("reject")
    ? "border-pass/50 text-pass"
    : st.includes("approv")
      ? "border-gate/50 text-gate"
      : "border-go/50 text-go";
  return (
    <div className="rounded-lg border border-border bg-ink/40 p-3 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Chip className="font-mono uppercase text-[10px]">{a.kind}</Chip>
        <Chip className={c}>{a.status}</Chip>
        <Button
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(`${a.title}\n\n${a.body}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="ml-auto inline-flex items-center gap-1 text-xs text-amber hover:underline"
        >
          {copied ? (
            <>
              <Check className="size-3.5" /> Copied draft
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy draft
            </>
          )}
        </Button>
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
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(run, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `headcount-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Card>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 font-display text-2xl"
        >
          Audit trail{" "}
          <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} />
        </Button>
        <Button
          variant="outline"
          onClick={download}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
        >
          <Download className="size-3.5" /> Download audit JSON
        </Button>
      </div>
      {open && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left eyebrow">
              <tr>
                <th className="py-1 pr-2">Agent</th>
                <th className="pr-2">Event</th>
                <th className="pr-2 text-right">ms</th>
                <th className="text-right">Qloo</th>
              </tr>
            </thead>
            <tbody>
              {run.events.map((e, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className={cn("py-1.5 pr-2 whitespace-nowrap", agentMeta(e.agent).text)}>
                    {agentLabel(e.agent)}
                  </td>
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
