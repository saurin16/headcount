import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Ticket, Users, CheckCircle2, ChevronDown } from "lucide-react";
import { createReplay, createRun, getMetros, type Offer } from "@/lib/api";
import { Footer } from "@/components/hc/shared";
import { SCENARIOS } from "@/lib/scenarios";
import { Button } from "@/components/ui/button";

const description =
  "Tell us the band, city and offer. Headcount uses Qloo's taste data to help you decide: GO, RESIZE or PASS.";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Headcount: know who'll show up before you sign the offer" },
      { name: "description", content: description },
      { property: "og:title", content: "Headcount: know who'll show up before you sign the offer" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});
const QLOO_USES = [
  ["Scout", "/search", "Finds the band, genres and photo"],
  [
    "Demand Analyst",
    "/v2/insights · urn:heatmap",
    "Ranks this band's audience taste across 105 US cities",
  ],
  ["Comps Agent", "/v2/insights · urn:entity:artist", "Bands with the same audience"],
  ["Comps Agent", "/v2/insights · artist + genre tags + location", "Openers in this genre that this city's audience likes"],
  ["Comps Agent", "/v2/insights · urn:entity:place", "Where to put posters"],
  ["Comps Agent", "/v2/insights · urn:entity:brand", "Potential sponsors"],
  ["Comps Agent", "/v2/insights · urn:demographics", "Who's in the room: age and gender"],
];
function Landing() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metros, setMetros] = useState<string[]>([]);
  const [form, setForm] = useState({
    act: "",
    city: "",
    capacity: "1500",
    guarantee: "25000",
    ticket_price: "35",
  });
  useEffect(() => {
    getMetros()
      .then(setMetros)
      .catch(() => setError("Couldn't load cities. Please try again."));
  }, []);
  async function start(offer: Offer, key: string, replay?: string) {
    setBusy(key);
    setError(null);
    try {
      const r = replay ? await createReplay(replay) : await createRun(offer);
      await navigate({ to: "/run/$id", params: { id: r.id } });
    } catch (e) {
      setError(String(e));
      setBusy(null);
    }
  }
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="pt-12 sm:pt-20 pb-12 sm:pb-16">
          <h1 className="font-display text-7xl sm:text-[140px] text-amber">Headcount</h1>
          <p className="font-display text-3xl sm:text-5xl mt-5 max-w-4xl leading-tight">
            Know who'll show up before you sign the offer.
          </p>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl">
            Tell us the band, the city and the offer. We tell you if people there will actually show
            up, using Qloo's taste data.
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            <strong className="text-foreground">64%</strong> of America's independent stages lost
            money in 2024 · NIVA
          </p>
        </section>
        <section className="border-t border-border py-10 sm:py-12">
          <h2 className="font-display text-3xl">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-7 mt-7">
            {[
              { icon: Ticket, title: "You enter an offer" },
              { icon: Users, title: "AI agents check what this city actually loves (Qloo)" },
              { icon: CheckCircle2, title: "You get a clear answer: GO, RESIZE or PASS" },
            ].map(({ icon: Icon, title }, i) => (
              <div key={title} className="flex items-start gap-4 sm:block">
                <Icon className="size-8 text-amber shrink-0 sm:mb-4" />
                <p className="text-lg">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {title}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section id="scenarios" className="scroll-mt-6 py-8">
          <h2 className="font-display text-3xl mb-2">Try an offer</h2>
          <p className="text-sm text-muted-foreground mb-6">Recorded live runs · replayed at 2×</p>
          <div className="grid gap-4 md:grid-cols-3">
            {SCENARIOS.map((s) => (
              <article key={s.key} className="panel p-6 flex flex-col">
                <h3 className="font-display text-3xl leading-tight">{s.label}</h3>
                <p className="mt-3 text-sm text-muted-foreground flex-1">{s.sub}</p>
                <div className="flex flex-wrap items-center gap-3 mt-6">
                  <Button disabled={!!busy} onClick={() => start(s.offer, s.key, s.key)}>
                    {busy === s.key ? <Loader2 className="animate-spin" /> : <ArrowRight />}Try it
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="px-0 text-muted-foreground"
                    disabled={!!busy}
                    onClick={() => start(s.offer, s.key + "-live")}
                  >
                    or run live (~40s)
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="own-offer" className="border-t border-border mt-10 py-10 sm:py-14 scroll-mt-6">
          <h2 className="font-display text-3xl sm:text-4xl mb-6">Run your own offer</h2>
          <form
            className="max-w-2xl space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.act.trim() || !form.city) return setError("Add a band and pick a city.");
              start(
                {
                  act: form.act.trim(),
                  city: form.city,
                  capacity: +form.capacity,
                  guarantee: +form.guarantee,
                  ticket_price: +form.ticket_price,
                },
                "custom",
              );
            }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Band">
                <input
                  required
                  className={inputCls}
                  placeholder="e.g. Mitski"
                  value={form.act}
                  onChange={(e) => setForm({ ...form, act: e.target.value })}
                />
              </Field>
              <Field label="City">
                <select
                  required
                  className={inputCls}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                >
                  <option value="">{metros.length ? "Select a city…" : "Loading cities…"}</option>
                  {metros.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Seats">
                <input
                  required
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </Field>
              <Field label="Band pay ($)">
                <input
                  required
                  type="number"
                  min={0}
                  className={inputCls}
                  value={form.guarantee}
                  onChange={(e) => setForm({ ...form, guarantee: e.target.value })}
                />
              </Field>
              <Field label="Ticket ($)">
                <input
                  required
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.ticket_price}
                  onChange={(e) => setForm({ ...form, ticket_price: e.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" disabled={!!busy} size="lg" className="w-full sm:w-auto">
              {busy === "custom" && <Loader2 className="animate-spin" />}Get an answer
              <ArrowRight />
            </Button>
          </form>
        </section>
        {error && (
          <p role="alert" className="text-sm text-pass break-words">
            {error}
          </p>
        )}
        <details className="detail-section">
          <summary>
            <span className="text-sm sm:text-base">
              For technical judges: how we use Qloo (7 calls per offer)
            </span>
            <ChevronDown className="size-5 shrink-0" />
          </summary>
          <div className="detail-body">
            <h2 className="font-display text-3xl mb-5">What Qloo powers</h2>
            <div className="divide-y divide-border">
              {QLOO_USES.map(([agent, ep, what]) => (
                <div key={ep} className="grid sm:grid-cols-[160px_1fr] gap-2 py-4">
                  <span className="text-sm">{agent}</span>
                  <div>
                    <div className="font-mono text-xs text-amber break-words">{ep}</div>
                    <p className="text-sm text-muted-foreground mt-1">{what}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Plain AI (no Qloo data) answers the same offer, so you can see what Qloo changes.
            </p>
          </div>
        </details>
      </main>
      <Footer />
    </div>
  );
}
const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring min-w-0";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs text-muted-foreground block mb-2">{label}</span>
      {children}
    </label>
  );
}
