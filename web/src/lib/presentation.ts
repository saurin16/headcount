import type { RunView } from "./api";

export const agentLabel = (name: string) =>
  name === "Rubric" ? "The math" : name === "Baseline (no Qloo)" ? "Plain AI (no Qloo data)" : name;
export const verdictMeaning = (verdict: string) =>
  ({ GO: "Book it as offered.", RESIZE: "Book it smaller.", PASS: "Don't book this one." })[
    verdict.toUpperCase() as "GO" | "RESIZE" | "PASS"
  ] ?? "Review this offer.";
export function progressSteps(run: Pick<RunView, "events" | "status" | "memo">) {
  const names = new Set(run.events.map((e) => e.agent));
  const complete = [
    names.has("Scout"),
    names.has("Demand Analyst") && names.has("Comps Agent"),
    names.has("Baseline (no Qloo)"),
    names.has("Deal Agent") && (names.has("Risk Gate") || !!run.memo),
    run.status === "done",
  ];
  const labels = [
    "Finding the band",
    "Checking the city's taste (Qloo)",
    "Asking a plain AI (no Qloo data), to compare",
    "Agents debating",
    "Final answer",
  ];
  const current = complete.findIndex((x) => !x);
  return labels.map((label, i) => ({
    label,
    done: complete[i] || run.status === "done",
    active: run.status === "running" && i === current,
  }));
}
export function approvalExplanation(run: RunView) {
  const reason = run.pending?.reasons[0] ?? "This offer needs your review.";
  if (/disagree|skeptic|debate/i.test(reason))
    return "The agents disagree about this offer. You decide whether to go ahead.";
  if (/guarantee|expos|budget|financial|dollar|\$/i.test(reason))
    return "The payment puts more money at risk. You decide whether to go ahead.";
  if (/risk|confidence|uncertain|demand/i.test(reason))
    return "There is uncertainty about this offer. You decide whether to go ahead.";
  return reason
    .replace(/percentile/gi, "city taste score")
    .replace(/guarantee ceiling/gi, "max to pay the band")
    .replace(/co-bill/gi, "local openers")
    .replace(/Rubric/g, "The math");
}
export function approvalWhy(run: RunView) {
  if (run.status === "awaiting_approval")
    return "The offer needs your review. You make the final call.";
  if (run.approval?.required) {
    const m = run.memo;
    const disagreed =
      !!m &&
      !!run.skeptic &&
      run.skeptic.suggested_verdict.toUpperCase() !== m.verdict.toUpperCase();
    return disagreed
      ? "The agents disagreed, so a person made the final call"
      : "The offer needed review, so a person made the final call";
  }
  return "Low risk, so the agents handled it automatically";
}
export const rankPosition = (rank: number, of: number) =>
  of <= 1 ? 0 : Math.max(0, Math.min(100, ((rank - 1) / (of - 1)) * 100));
