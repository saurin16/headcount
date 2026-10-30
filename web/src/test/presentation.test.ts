import { describe, expect, it } from "vitest";
import { approvalWhy, progressSteps, rankPosition } from "@/lib/presentation";
import type { RunView } from "@/lib/api";

const event = (agent: string) => ({ agent, text: "", ms: 1, qloo_calls: [] });
describe("five-step run progress", () => {
  it("starts with finding the band", () => {
    const steps = progressSteps({ status: "running", events: [], memo: null });
    expect(steps).toHaveLength(5);
    expect(steps.map((s) => s.active)).toEqual([true, false, false, false, false]);
  });
  it("requires both taste agents before completing the city check", () => {
    const steps = progressSteps({
      status: "running",
      events: [event("Scout"), event("Demand Analyst"), event("Baseline (no Qloo)")],
      memo: null,
    });
    expect(steps[1]?.done).toBe(false);
    expect(steps[1]?.active).toBe(true);
  });
  it("never spins when awaiting approval or done", () => {
    expect(
      progressSteps({ status: "awaiting_approval", events: [], memo: null }).some((s) => s.active),
    ).toBe(false);
    const done = progressSteps({ status: "done", events: [], memo: null });
    expect(done.every((s) => s.done && !s.active)).toBe(true);
  });
});
describe("city rank position", () => {
  it("places the first and last cities at the bar ends", () => {
    expect(rankPosition(1, 105)).toBe(0);
    expect(rankPosition(105, 105)).toBe(100);
    expect(rankPosition(86, 105)).toBeCloseTo(81.73, 2);
  });
});
describe("honest approval reasons", () => {
  it("does not say a human decided while still awaiting", () => {
    expect(approvalWhy({ status: "awaiting_approval" } as RunView)).toBe(
      "The offer needs your review. You make the final call.",
    );
  });
  it("does not invent disagreement for a financial review", () => {
    expect(
      approvalWhy({
        status: "done",
        approval: { required: true },
        memo: { verdict: "RESIZE" },
        skeptic: { suggested_verdict: "RESIZE" },
      } as RunView),
    ).toBe("The offer needed review, so a person made the final call");
  });
});
