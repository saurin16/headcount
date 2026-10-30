import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Play, RotateCcw, Ticket } from "lucide-react";
import { createReplay, createRun, money, num, totalQloo } from "@/lib/api";
import { SCENARIOS } from "@/lib/scenarios";
import { useRun } from "@/lib/useRun";
import { Chip, CountUp, Footer } from "@/components/hc/shared";
import { ActionsCard, ApprovalCard, AuditCard, AudienceCard, CompareCard, DebateCard, DemandCard, MathCard, MemoCard, Timeline } from "@/components/hc/RunPanels";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/run/$id")({
  head: () => ({
    meta: [
      { title: "Live run — Headcount" },
      { name: "description", content: "Watch Headcount's AI agents weigh a concert offer live using Qloo taste data." },
      { property: "og:title", content: "Live run — Headcount" },
      { property: "og:description", content: "AI agents debate a concert offer live and return GO / RESIZE / PASS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RunPage,
});

const STATUS: Record<string, [string, string]> = {
  running: ["Agents working", "border-amber text-amber"],
  awaiting_approval: ["Awaiting approval", "border-gate text-gate"],
  done: ["Done", "border-go text-go"],
  error: ["Error", "border-pass text-pass"],
};

function RunPage() {
  const { id } = Route.useParams();
  const { run, err, resume } = useRun(id);
  const navigate = useNavigate();
  const [t0] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  useEffect(() => { const i = setInterval(() => setTick((x) => x + 1), 200); return () => clearInterval(i); }, []);

  if (!run) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        {err ? <div><p className="text-pass font-mono break-words">{err}</p><Link to="/" className="text-amber underline mt-3 inline-block">Back home</Link></div>
          : <div className="inline-flex gap-2 items-center text-muted-foreground"><Loader2 className="animate-spin" /> Connecting to the agents…</div>}
      </div>
    );
  }

  const live = run.status === "running" || run.status === "awaiting_approval";
  const elapsed = live ? Math.max(run.elapsed_s, (Date.now() - t0) / 1000) : run.elapsed_s;
  void tick;
  const [label, cls] = STATUS[run.status] ?? STATUS["running"]!;
  const o = run.offer;

  const retry = async () => {
    setRetrying(true);
    try { const r = await createRun(o); navigate({ to: "/run/$id", params: { id: r.id } }); } catch { setRetrying(false); }
  };
  const another = async (key: string) => {
    setStarting(key);
    try { const r = await createReplay(key); navigate({ to: "/run/$id", params: { id: r.id } }); } catch { setStarting(null); }
  };

  return (
    <div className={cn("min-h-screen", run.status === "done" && "pb-14")}>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-2 sm:py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap sm:gap-x-3 sm:gap-y-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 sm:flex-1 sm:basis-64">
            <Link to="/" className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Home"><ArrowLeft className="size-5" /></Link>
            {run.act?.image ? <img src={run.act.image} alt={run.act.name} className="size-9 sm:size-14 rounded-md object-cover border border-border shrink-0" />
              : <div className="size-9 sm:size-14 rounded-md bg-secondary shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl sm:text-4xl truncate">{run.act?.name ?? o.act}</div>
              <div className="hidden sm:block font-mono text-xs text-muted-foreground">{o.city} · {num(o.capacity)} cap · {money(o.guarantee)} · ${o.ticket_price}</div>
              {!!run.act?.genre_names?.length && (
                <div className="hidden sm:flex flex-wrap gap-1 mt-1">{run.act.genre_names.slice(0, 3).map((g) => <Chip key={g} className="text-[10px] py-0">{g}</Chip>)}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end sm:flex-wrap sm:ml-auto">
            {run.replay_of && (
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 pl-2.5 pr-1 py-0.5 text-[11px] font-mono text-muted-foreground">
                Replay of a recorded live run · 2×
                <button onClick={retry} disabled={retrying} className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 font-sans font-semibold disabled:opacity-60">
                  {retrying ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />} Run this live
                </button>
              </div>
            )}
            <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-mono whitespace-nowrap", cls)}>
              {live && <span className="size-1.5 rounded-full bg-current animate-pulse" />}<span className="sm:hidden">{run.status === "running" ? "" : label.replace("Awaiting approval", "Approve?")}</span><span className="hidden sm:inline">{label}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 font-mono tabular-nums">
              <div className="text-right leading-tight"><div className="eyebrow text-[9px] text-amber">Qloo calls</div><div className="text-base sm:text-xl text-amber"><CountUp value={totalQloo(run)} /></div></div>
              <div className="text-right leading-tight"><div className="eyebrow text-[9px]">Elapsed</div><div className="text-base sm:text-xl">{elapsed.toFixed(1)}s</div></div>
            </div>
          </div>
        </div>
      </header>
      <div className="sm:hidden mx-auto px-3 pt-3 space-y-1.5">
        <div className="font-mono text-[11px] text-muted-foreground">{o.city} · {num(o.capacity)} cap · {money(o.guarantee)} · ${o.ticket_price}</div>
        {!!run.act?.genre_names?.length && <div className="flex flex-wrap gap-1">{run.act.genre_names.slice(0, 3).map((g) => <Chip key={g} className="text-[10px] py-0">{g}</Chip>)}</div>}
        {run.replay_of && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
            Replay of a recorded live run · 2×
            <button onClick={retry} disabled={retrying} className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 font-sans font-semibold disabled:opacity-60">
              {retrying ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />} Run this live
            </button>
          </div>
        )}
      </div>

      <main className={cn("mx-auto max-w-7xl px-4 py-6 space-y-6", run.status === "awaiting_approval" && "pb-24 sm:pb-6")}>
        {run.status === "error" && (
          <div className="rounded-xl border-2 border-pass bg-pass/10 p-5">
            <div className="font-display text-3xl text-pass">The run hit a snag</div>
            <p className="text-sm mt-2 font-mono break-words">{run.error}</p>
            <button onClick={retry} disabled={retrying} className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 font-semibold">
              {retrying ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Try again
            </button>
          </div>
        )}
        {run.status === "awaiting_approval" && run.pending && <ApprovalCard run={run} onDone={resume} />}
        {run.memo && <MemoCard run={run} />}
        {run.status === "done" && (
          <div className="text-center font-mono text-sm text-muted-foreground">Total: <span className="text-foreground">{run.elapsed_s.toFixed(1)}s</span> · <span className="text-amber">{totalQloo(run)} Qloo calls</span></div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <aside className="min-w-0">
            <div className="eyebrow mb-2">Agent timeline · {run.events.length} events · {totalQloo(run)} Qloo calls</div>
            <div className="lg:sticky lg:top-24"><Timeline run={run} /></div>
          </aside>
          <div className="space-y-6 min-w-0">
            {run.demand && <DemandCard run={run} />}
            {run.draft && <MathCard run={run} />}
            {run.comps && <AudienceCard run={run} />}
            {run.skeptic && <DebateCard run={run} />}
            {run.baseline && <CompareCard run={run} />}
            {run.actions && run.actions.length > 0 && <ActionsCard run={run} />}
            {!run.demand && !run.comps && !run.baseline && run.status === "running" && (
              <div className="panel p-10 text-center text-muted-foreground">
                <Loader2 className="size-6 animate-spin mx-auto text-amber" />
                <p className="mt-3">Scout is finding {o.act} in Qloo's taste graph…</p>
              </div>
            )}
            <AuditCard run={run} />
          </div>
        </div>
      </main>
      {run.status === "done" && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block eyebrow text-muted-foreground shrink-0">Run another</div>
            <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SCENARIOS.map((s) => (
                <button key={s.key} disabled={!!starting} onClick={() => another(s.key)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs whitespace-nowrap hover:border-amber hover:text-amber transition-colors disabled:opacity-60 shrink-0">
                  {starting === s.key ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />} {s.short}
                </button>
              ))}
            </div>
            <Link to="/" hash="own-offer" className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold whitespace-nowrap hover:brightness-110 shrink-0">
              <Ticket className="size-3" /> Your own offer
            </Link>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
