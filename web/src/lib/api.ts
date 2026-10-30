export const API_BASE = "https://headcount-api-786561239973.us-central1.run.app";

export type Verdict = "GO" | "RESIZE" | "PASS" | string;
export interface QlooCall { endpoint: string; params: Record<string, unknown>; status: number | string; ms: number; why: string }
export interface RunEvent { agent: string; text: string; ms: number; qloo_calls: QlooCall[]; data?: Record<string, any> }
export interface Memo {
  verdict: Verdict; recommended_capacity: number; guarantee_ceiling: number; headline: string; rationale: string;
  responds_to_skeptic: string; cobill: string[]; sponsors: string[]; promo_hangouts: string[];
}
export interface Action { kind: string; title: string; body: string; status: string }
export interface Offer { act: string; city: string; capacity: number; guarantee: number; ticket_price: number }
export interface RunView {
  id: string;
  status: "running" | "awaiting_approval" | "done" | "error";
  elapsed_s: number;
  error: string | null;
  offer: Offer;
  events: RunEvent[];
  pending: { reasons: string[]; memo: Memo; actions: Action[] } | null;
  act: { entity_id: string; name: string; popularity: number; genres: string[]; genre_names: string[]; alternatives: string[]; image: string | null } | null;
  metro: string | null;
  demand: { metro: string; percentile: number; rank: number; of: number; affinity_rank: number; popularity: number; hype_gap: number; top_metros: [string, number][]; cells: unknown } | null;
  comps: { adjacent_acts: string[]; local_cobills: string[]; hangouts: string[]; sponsors: string[]; age_index: Record<string, number>; gender_index: Record<string, number> } | null;
  baseline: { verdict: Verdict; demand_guess: string; reason: string; suggested_openers: string[] } | null;
  draft: { verdict: Verdict; demand_factor: number; recommended_capacity: number; guarantee_ceiling: number; projected_gross_at_rec: number; flags: string[] } | null;
  skeptic: { agrees: boolean; suggested_verdict: Verdict; objections: { claim: string; evidence: string; severity: string }[] } | null;
  memo: Memo | null;
  approval: { required: boolean; reasons: string[]; decision: string; note: string; by: string } | null;
  actions: Action[] | null;
  round: number | null;
  replay_of?: string | null;
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json();
}

export const getMetros = () => fetch(`${API_BASE}/metros`).then((r) => j<string[]>(r));
export const createRun = (o: Offer) =>
  fetch(`${API_BASE}/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) }).then((r) => j<RunView>(r));
export const createReplay = (key: string) =>
  fetch(`${API_BASE}/replays/${key}`, { method: "POST" }).then((r) => j<RunView>(r));
export const getRun = (id: string) => fetch(`${API_BASE}/runs/${id}`).then((r) => j<RunView>(r));
export const postDecision = (id: string, decision: "approve" | "reject", note: string) =>
  fetch(`${API_BASE}/runs/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, note, by: "Judge" }),
  }).then((r) => j<RunView>(r));
export const streamUrl = (id: string) => `${API_BASE}/runs/${id}/stream`;

export const money = (n: number | null | undefined) =>
  n == null ? "—" : "$" + Math.round(n).toLocaleString("en-US");
export const num = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("en-US"));
export function ordinalSuffix(n: number) {
  const v = Math.round(n), m100 = Math.abs(v) % 100, m10 = Math.abs(v) % 10;
  if (m100 >= 11 && m100 <= 13) return "th";
  return m10 === 1 ? "st" : m10 === 2 ? "nd" : m10 === 3 ? "rd" : "th";
}
export const ordinal = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n)}${ordinalSuffix(n)}`);
export const uniq = (xs?: string[] | null) => {
  const seen = new Set<string>();
  return (xs ?? []).filter((x) => { const k = x.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
};

/** Which agents still need a "working…" placeholder. */
export function pendingAgents(r: Pick<RunView, "status" | "events">): { agent: string; waiting?: boolean }[] {
  const done = new Set(r.events.map((e) => e.agent));
  const gateDone = done.has("Risk Gate") || done.has("Human") || r.status === "done";
  if (r.status === "awaiting_approval") return gateDone && done.has("Human") ? [] : [{ agent: "Risk Gate", waiting: true }];
  if (r.status !== "running") return [];
  if (!done.has("Scout")) return [{ agent: "Scout" }];
  const wave = ["Demand Analyst", "Comps Agent", "Baseline (no Qloo)"].filter((a) => !done.has(a));
  if (wave.length) return wave.map((agent) => ({ agent }));
  if (!done.has("Rubric")) return [{ agent: "Rubric" }];
  const sk = r.events.filter((e) => e.agent === "Skeptic").length;
  const dl = r.events.filter((e) => e.agent === "Deal Agent").length;
  if (sk === 0) return [{ agent: "Skeptic" }];
  if (sk > dl) return [{ agent: "Deal Agent" }];
  if (gateDone) return [];
  return [{ agent: "Risk Gate" }];
}

export const totalQloo = (r: RunView) => r.events.reduce((s, e) => s + (e.qloo_calls?.length ?? 0), 0);
