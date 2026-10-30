import { describe, expect, it } from "vitest";
import { ordinal, pendingAgents, uniq } from "@/lib/api";

const ev = (agent: string) => ({ agent, text: "", ms: 0, qloo_calls: [] });

describe("ordinal percentiles", () => {
  it("rounds and suffixes", () => {
    expect(ordinal(18.3)).toBe("18th");
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(22)).toBe("22nd");
    expect(ordinal(23)).toBe("23rd");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(100)).toBe("100th");
  });
});

describe("uniq chips", () => {
  it("drops duplicates", () => expect(uniq(["Patagonia", "patagonia ", "REI"])).toEqual(["Patagonia", "REI"]));
});

describe("timeline placeholders", () => {
  const base = ["Scout", "Demand Analyst", "Comps Agent", "Baseline (no Qloo)", "Rubric"].map(ev);
  it("no Skeptic placeholder once Skeptic reported", () =>
    expect(pendingAgents({ status: "running", events: [...base, ev("Skeptic")] })).toEqual([{ agent: "Deal Agent" }]));
  it("round 2 skeptic expects deal agent again", () =>
    expect(pendingAgents({ status: "running", events: [...base, ev("Skeptic"), ev("Deal Agent"), ev("Skeptic")] })).toEqual([{ agent: "Deal Agent" }]));
  it("waiting for you when awaiting approval", () =>
    expect(pendingAgents({ status: "awaiting_approval", events: base })).toEqual([{ agent: "Risk Gate", waiting: true }]));
  it("nothing when done or error", () => {
    expect(pendingAgents({ status: "done", events: [] })).toEqual([]);
    expect(pendingAgents({ status: "error", events: [] })).toEqual([]);
  });
  it("risk gate complete after Human event", () =>
    expect(pendingAgents({ status: "running", events: [...base, ev("Skeptic"), ev("Deal Agent"), ev("Human")] })).toEqual([]));
});
