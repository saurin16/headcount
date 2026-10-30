import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { createReplay, createRun, getMetros, type Offer } from "@/lib/api";
import { agentMeta, Footer } from "@/components/hc/shared";
import { SCENARIOS } from "@/lib/scenarios";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Headcount: know who'll show up before you sign the offer" },
      { name: "description", content: "Qloo-grounded AI agents measure a city's taste for an act, debate the offer, and return GO / RESIZE / PASS with room size, guarantee ceiling, openers and sponsors." },
      { property: "og:title", content: "Headcount: know who'll show up before you sign the offer" },
      { property: "og:description", content: "Qloo-grounded AI agents measure a city's taste for an act, debate the offer, and return GO / RESIZE / PASS with room size, guarantee ceiling, openers and sponsors." },
      { name: "twitter:title", content: "Headcount: know who'll show up before you sign the offer" },
      { name: "twitter:description", content: "Qloo-grounded AI agents measure a city's taste for an act, debate the offer, and return GO / RESIZE / PASS with room size, guarantee ceiling, openers and sponsors." },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});


const QLOO_USES: [string, string, string][] = [
  ["Scout", "/search", "Resolves the act to a Qloo entity (genres, photo)"],
  ["Demand Analyst", "/v2/insights · urn:heatmap", "Thousands of taste cells → 105-metro demand percentile + hype gap"],
  ["Comps Agent", "/v2/insights · urn:entity:artist", "Acts with the same audience"],
  ["Comps Agent", "/v2/insights · artist + genre tags + location", "Co-bill pool this metro loves"],
  ["Comps Agent", "/v2/insights · urn:entity:place", "Where this audience already goes (promo spots)"],
  ["Comps Agent", "/v2/insights · urn:entity:brand", "Sponsor targets"],
  ["Comps Agent", "/v2/insights · urn:demographics", "Who's in the room (age, gender)"],
];

const FLOW: (string | string[])[] = ["Scout", ["Demand Analyst", "Comps Agent", "Baseline (no Qloo)"], "Rubric", ["Skeptic", "Deal Agent"], "Risk Gate"];

function Landing() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metros, setMetros] = useState<string[]>([]);
  const [form, setForm] = useState({ act: "", city: "", capacity: "1500", guarantee: "25000", ticket_price: "35" });

  useEffect(() => { getMetros().then(setMetros).catch(() => setError("Couldn't load cities from the API.")); }, []);

  async function start(o: Offer, key: string, replay?: string) {
    setBusy(key); setError(null);
    try {
      const r = replay ? await createReplay(replay) : await createRun(o);
      navigate({ to: "/run/$id", params: { id: r.id } });
    } catch (e) {
      setError(String(e)); setBusy(null);
    }
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="pt-14 sm:pt-24 pb-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow text-amber">Qloo Agentic Hackathon · for independent promoters</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-display text-[22vw] sm:text-[11rem] text-glow-amber text-amber mt-3">
            Headcount
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="font-display text-3xl sm:text-5xl mt-2 max-w-4xl">
            Know who'll show up <span className="text-magenta">before</span> you sign the offer.
          </motion.p>
          <div className="mt-8 grid gap-6 sm:grid-cols-[auto_1fr] items-center">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-7xl sm:text-8xl text-pass">64%</span>
              <span className="text-sm text-muted-foreground max-w-[14rem]">of America's independent stages lost money in 2024 <span className="font-mono">(NIVA)</span></span>
            </div>
            <p className="text-muted-foreground max-w-xl sm:border-l sm:border-border sm:pl-6">
              Seven AI agents read Qloo's taste graph to measure how much a city really loves an act, argue about it, and return <b className="text-go">GO</b> / <b className="text-amber">RESIZE</b> / <b className="text-pass">PASS</b> — with room size, guarantee ceiling, openers and sponsors.
            </p>
          </div>
          <p className="mt-6 text-sm text-muted-foreground/80 italic max-w-3xl">
            Spotify tells you where your fans are. Headcount tells you whether a city's taste will buy tickets, even for an act that's never played there.
          </p>
        </section>

        <section>
          <div className="eyebrow mb-3">Pick a scenario: recorded live runs, replayed at 2× · or run your own live</div>
          <div className="grid gap-4 md:grid-cols-3">
            {SCENARIOS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                whileHover={{ y: -4 }}
                className={cn("panel text-left p-5 group transition-colors", busy && "opacity-70", s.tone)}
              >
                <div className="eyebrow">0{i + 1}</div>
                <div className="font-display text-3xl mt-2">{s.label}</div>
                <p className="text-sm text-muted-foreground mt-2 min-h-10">{s.sub}</p>
                <div className="mt-4 font-mono text-xs space-y-1">
                  <div className="text-amber">{s.offer.act}</div>
                  <div>{s.offer.city} · {s.offer.capacity.toLocaleString()} cap · ${s.offer.guarantee.toLocaleString()}</div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button disabled={!!busy} onClick={() => start(s.offer, s.label, s.key)}
                    className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:brightness-110 disabled:opacity-60">
                    {busy === s.label ? <><Loader2 className="size-4 animate-spin" /> Starting…</> : <>Run it <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" /></>}
                  </button>
                  <button disabled={!!busy} onClick={() => start(s.offer, s.label + "-live")}
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-amber disabled:opacity-60 inline-flex items-center gap-1">
                    {busy === s.label + "-live" && <Loader2 className="size-3 animate-spin" />} or run live (~40s)
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-pass font-mono break-words">{error}</p>}
        </section>

        <section className="mt-14">
          <h2 className="font-display text-4xl sm:text-5xl">What <span className="text-amber">Qloo</span> powers</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {QLOO_USES.map(([agent, ep, what], i) => {
              const m = agentMeta(agent); const I = m.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                  className="panel p-3 flex gap-3 items-start min-w-0">
                  <I className={cn("size-4 mt-0.5 shrink-0", m.text)} />
                  <div className="min-w-0">
                    <div className="text-xs"><span className={cn("font-semibold", m.text)}>{agent}</span></div>
                    <div className="font-mono text-xs text-amber break-words mt-0.5">{ep}</div>
                    <div className="text-sm text-muted-foreground mt-1">{what}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">A Baseline agent answers the same offer with no Qloo data, so you can see exactly what the taste graph changes.</p>
        </section>

        <section id="own-offer" className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.2fr] scroll-mt-6">
          <form
            className="panel p-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.act || !form.city) return setError("Add an act and pick a city.");
              start({ act: form.act.trim(), city: form.city, capacity: +form.capacity, guarantee: +form.guarantee, ticket_price: +form.ticket_price }, "custom");
            }}
          >
            <h2 className="font-display text-3xl">Run your own offer</h2>
            <Field label="Act"><input className={inputCls} placeholder="e.g. Mitski" value={form.act} onChange={(e) => setForm({ ...form, act: e.target.value })} /></Field>
            <Field label="City">
              <select className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                <option value="">{metros.length ? "Select a metro…" : "Loading metros…"}</option>
                {metros.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Capacity"><input type="number" min={1} className={inputCls} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
              <Field label="Guarantee $"><input type="number" min={0} className={inputCls} value={form.guarantee} onChange={(e) => setForm({ ...form, guarantee: e.target.value })} /></Field>
              <Field label="Ticket $"><input type="number" min={1} className={inputCls} value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: e.target.value })} /></Field>
            </div>
            <button disabled={!!busy} className="w-full rounded-md bg-primary text-primary-foreground font-display text-2xl py-3 hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {busy === "custom" ? <Loader2 className="size-5 animate-spin" /> : null} Get a verdict
            </button>
          </form>

          <div className="panel p-5">
            <h2 className="font-display text-3xl">How it works</h2>
            <p className="text-sm text-muted-foreground mt-1">A LangGraph crew, grounded in Qloo taste data. Risky offers pause for a human.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {FLOW.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <ArrowRight className="size-4 text-muted-foreground shrink-0" />}
                  <div className={cn("flex gap-1.5", Array.isArray(step) && "flex-col")}>
                    {(Array.isArray(step) ? step : [step]).map((n) => {
                      const m = agentMeta(n); const I = m.icon;
                      return (
                        <div key={n} className={cn("flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs", m.border, m.bg)}>
                          <I className={cn("size-3.5", m.text)} /> <span>{n}</span>
                          {n === "Skeptic" && <span className="text-muted-foreground">⇄</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background/60 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring min-w-0";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0"><span className="eyebrow block mb-1">{label}</span>{children}</label>;
}
