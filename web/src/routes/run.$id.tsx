import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Play, ChevronDown, Check, Ticket } from "lucide-react";
import { createReplay, createRun, money, num, totalQloo, type RunView } from "@/lib/api";
import { SCENARIOS } from "@/lib/scenarios";
import { progressSteps } from "@/lib/presentation";
import { useRun } from "@/lib/useRun";
import { Footer } from "@/components/hc/shared";
import { Button } from "@/components/ui/button";
import {
  ActionsCard,
  ApprovalCard,
  AuditCard,
  AudienceCard,
  CompareCard,
  DebateCard,
  DemandCard,
  MathCard,
  MemoCard,
  Timeline,
} from "@/components/hc/RunPanels";

export const Route = createFileRoute("/run/$id")({
  head: () => ({
    meta: [
      { title: "Your concert offer — Headcount" },
      {
        name: "description",
        content: "A clear answer to your concert offer, using Qloo's city taste data.",
      },
      { property: "og:title", content: "Your concert offer — Headcount" },
      { property: "og:description", content: "GO, RESIZE or PASS. See the answer and why." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RunPage,
});
function RunPage() {
  const { id } = Route.useParams();
  return <RunContent key={id} id={id} />;
}
function Detail({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="detail-section">
      <summary>
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{summary}</p>
        </div>
        <ChevronDown className="size-5 shrink-0" />
      </summary>
      <div className="detail-body">{children}</div>
    </details>
  );
}
function Progress({ run }: { run: RunView }) {
  return (
    <section className="py-7 border-b border-border">
      <h1 className="font-display text-3xl mb-5">Checking your offer</h1>
      <ol className="space-y-4">
        {progressSteps(run).map((s) => (
          <li
            key={s.label}
            className={`flex items-center gap-3 text-sm ${s.active ? "text-amber" : s.done ? "text-foreground" : "text-muted-foreground"}`}
          >
            {s.done ? (
              <Check className="size-5 text-go" />
            ) : s.active ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <span className="size-5 rounded-full border border-border" />
            )}
            {s.label}
          </li>
        ))}
      </ol>
    </section>
  );
}
function RunContent({ id }: { id: string }) {
  const { run, err, resume } = useRun(id);
  const navigate = useNavigate();
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [began] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!run)
    return (
      <div className="min-h-screen grid place-items-center p-6">
        {err ? (
          <div>
            <p className="text-pass">{err}</p>
            <Link to="/" className="text-amber">
              Back home
            </Link>
          </div>
        ) : (
          <div className="flex gap-3 text-muted-foreground">
            <Loader2 className="animate-spin" />
            Loading your offer…
          </div>
        )}
      </div>
    );
  const o = run.offer;
  const elapsed =
    run.status === "running"
      ? Math.max(run.elapsed_s, now ? (now - began) / 1000 : 0)
      : run.elapsed_s;
  async function start(key?: string) {
    setStarting(key ?? "live");
    setStartError(null);
    try {
      const r = key ? await createReplay(key) : await createRun(o);
      await navigate({ to: "/run/$id", params: { id: r.id } });
    } catch (e) {
      setStartError(String(e));
      setStarting(null);
    }
  }
  const memo = run.memo ?? run.pending?.memo;
  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 flex gap-2 sm:gap-4 items-center">
          <Button asChild variant="ghost" size="icon" className="size-7 shrink-0">
            <Link to="/" aria-label="Home">
              <ArrowLeft />
            </Link>
          </Button>
          {run.act?.image && (
            <img
              src={run.act.image}
              alt={run.act.name}
              className="size-9 rounded object-cover shrink-0"
            />
          )}
          <div className="font-display text-xl sm:text-3xl truncate min-w-0 flex-1">
            {run.act?.name ?? o.act}
          </div>
          <div className="text-[10px] sm:text-xs text-muted-foreground text-right shrink-0">
            <div
              className={
                run.status === "awaiting_approval"
                  ? "text-gate"
                  : run.status === "done"
                    ? "text-go"
                    : "text-amber"
              }
            >
              {run.status === "awaiting_approval"
                ? "Your call"
                : run.status === "done"
                  ? "Done"
                  : run.status === "error"
                    ? "Error"
                    : "Checking"}
            </div>
            <div className="font-mono mt-1">
              {totalQloo(run)} Qloo calls · {elapsed.toFixed(0)}s
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="pt-4 text-xs sm:text-sm text-muted-foreground">
          {o.city} · {num(o.capacity)} seats · {money(o.guarantee)} to the band
        </div>
        {run.replay_of && (
          <div className="flex flex-wrap gap-2 items-center mt-2 text-[10px] sm:text-xs text-muted-foreground">
            <span className="border border-border rounded-full px-2 py-1">
              Replay of a recorded live run · 2×
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-6 px-0 text-xs"
              disabled={!!starting}
              onClick={() => start()}
            >
              Run this live
              <Play />
            </Button>
          </div>
        )}
        {run.status === "error" && (
          <section className="py-8">
            <h1 className="text-pass font-display text-3xl">This offer hit a snag</h1>
            <p className="text-sm mt-3 break-words">{run.error}</p>
            <Button className="mt-4" disabled={!!starting} onClick={() => start()}>
              Try again
            </Button>
          </section>
        )}
        {memo ? <MemoCard run={run} /> : run.status === "running" ? <Progress run={run} /> : null}
        {run.status === "awaiting_approval" && run.pending && (
          <div className="py-5">
            <ApprovalCard run={run} onDone={resume} />
          </div>
        )}
        <div className="mt-4">
          {(run.demand || run.comps) && (
            <Detail
              title="Where this band is loved"
              summary={
                run.demand
                  ? `${o.city}: rank ${run.demand.rank} of ${run.demand.of} US cities`
                  : "Audience ages, local openers and places"
              }
            >
              <DemandCard run={run} />
              <AudienceCard run={run} />
            </Detail>
          )}
          {run.baseline && (
            <Detail
              title="With Qloo vs without"
              summary={`Plain AI: ${run.baseline.verdict} · With Qloo: ${memo?.verdict ?? "checking"}`}
            >
              <CompareCard run={run} />
            </Detail>
          )}
          {run.skeptic && (
            <Detail
              title="The debate"
              summary={`Skeptic: ${run.skeptic.suggested_verdict} · Deal Agent: ${memo?.verdict ?? "checking"}`}
            >
              <DebateCard run={run} />
            </Detail>
          )}
          {run.actions?.length ? (
            <Detail
              title="Ready-to-send drafts"
              summary={`${run.actions.length} drafts · Headcount drafts, you send`}
            >
              <ActionsCard run={run} />
            </Detail>
          ) : null}
          <Detail
            title="Full agent log & Qloo calls (for technical judges)"
            summary={`${run.events.length} updates · ${totalQloo(run)} Qloo calls`}
          >
            <Timeline run={run} />
            {run.draft && <MathCard run={run} />}
            <AuditCard run={run} />
          </Detail>
        </div>
        {startError && (
          <p role="alert" className="text-pass text-sm mt-4">
            {startError}
          </p>
        )}
      </main>
      {run.status === "done" && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background">
          <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2">
            <span className="hidden sm:block text-xs text-muted-foreground shrink-0">
              Run another
            </span>
            <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto">
              {SCENARIOS.map((s) => (
                <Button
                  key={s.key}
                  variant="outline"
                  size="sm"
                  disabled={!!starting}
                  onClick={() => start(s.key)}
                  className="rounded-full shrink-0"
                >
                  {starting === s.key ? <Loader2 className="animate-spin" /> : <Play />}
                  {s.short}
                </Button>
              ))}
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link to="/" hash="own-offer">
                <Ticket />
                Your own offer
              </Link>
            </Button>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
