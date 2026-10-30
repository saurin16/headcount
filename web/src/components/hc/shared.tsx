import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";
import { Binoculars, BarChart3, Users, Bot, Scale, Swords, Handshake, ShieldCheck, UserCheck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentMeta { name: string; icon: LucideIcon; text: string; border: string; bg: string }

export const AGENTS: Record<string, AgentMeta> = {
  Scout: { name: "Scout", icon: Binoculars, text: "text-amber", border: "border-amber/50", bg: "bg-amber/10" },
  "Demand Analyst": { name: "Demand Analyst", icon: BarChart3, text: "text-amber", border: "border-amber/50", bg: "bg-amber/10" },
  "Comps Agent": { name: "Comps Agent", icon: Users, text: "text-amber", border: "border-amber/50", bg: "bg-amber/10" },
  "Baseline (no Qloo)": { name: "Baseline (no Qloo)", icon: Bot, text: "text-steel", border: "border-steel/40", bg: "bg-steel/10" },
  Rubric: { name: "Rubric", icon: Scale, text: "text-foreground", border: "border-foreground/40", bg: "bg-foreground/5" },
  Skeptic: { name: "Skeptic", icon: Swords, text: "text-magenta", border: "border-magenta/50", bg: "bg-magenta/10" },
  "Deal Agent": { name: "Deal Agent", icon: Handshake, text: "text-go", border: "border-go/50", bg: "bg-go/10" },
  "Risk Gate": { name: "Risk Gate", icon: ShieldCheck, text: "text-gate", border: "border-gate/50", bg: "bg-gate/10" },
  Human: { name: "Human", icon: UserCheck, text: "text-gate", border: "border-gate/50", bg: "bg-gate/10" },
};
export const agentMeta = (n: string): AgentMeta => AGENTS[n] ?? AGENTS["Rubric"]!;

export function verdictClasses(v?: string | null) {
  const k = (v ?? "").toUpperCase();
  if (k === "GO") return "text-go border-go";
  if (k === "PASS") return "text-pass border-pass";
  return "text-amber border-amber";
}

export function VerdictStamp({ verdict, size = "lg" }: { verdict: string; size?: "sm" | "lg" }) {
  return (
    <motion.div
      initial={{ scale: 2.6, rotate: -18, opacity: 0 }}
      animate={{ scale: 1, rotate: -6, opacity: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 16 }}
      className={cn(
        "inline-block border-4 rounded-md font-display",
        size === "lg" ? "px-6 py-2 text-6xl sm:text-8xl border-[6px]" : "px-2 py-0.5 text-2xl border-2",
        verdictClasses(verdict),
      )}
      style={{ boxShadow: "0 0 40px -6px currentColor, inset 0 0 20px -8px currentColor" }}
    >
      {verdict}
    </motion.div>
  );
}

export function CountUp({ value, prefix = "", suffix = "", decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => prefix + v.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) + suffix);
  useEffect(() => { const c = animate(mv, value, { duration: 1.1, ease: "easeOut" }); return c.stop; }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string | undefined }) {
  return <span className={cn("inline-flex items-center rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-xs", className)}>{children}</span>;
}

export function Card({ title, eyebrow, children, className, accent }: { title?: string; eyebrow?: string; children: React.ReactNode; className?: string; accent?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("panel p-4 sm:p-5 min-w-0", className)}
    >
      {eyebrow && <div className={cn("eyebrow mb-1", accent)}>{eyebrow}</div>}
      {title && <h3 className="font-display text-2xl sm:text-3xl mb-3">{title}</h3>}
      {children}
    </motion.section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border mt-16 py-8 px-4 text-center text-xs text-muted-foreground font-mono">
      Powered by Qloo Taste AI · Gemini · LangGraph ·{" "}
      <a href="https://github.com/saurin16/headcount" target="_blank" rel="noreferrer" className="text-amber hover:underline">
        github.com/saurin16/headcount
      </a>
      <div className="mt-2">Qloo measures taste affinity, not ticket sales. Headcount drafts follow-ups; you send them.</div>
    </footer>
  );
}
