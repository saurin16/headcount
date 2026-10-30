import { motion } from "framer-motion";
import { agentLabel } from "@/lib/presentation";
import {
  Binoculars,
  BarChart3,
  Users,
  Bot,
  Scale,
  Swords,
  Handshake,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentMeta {
  name: string;
  icon: LucideIcon;
  text: string;
  border: string;
  bg: string;
}

export const AGENTS: Record<string, AgentMeta> = {
  Scout: {
    name: "Scout",
    icon: Binoculars,
    text: "text-amber",
    border: "border-amber/50",
    bg: "bg-amber/10",
  },
  "Demand Analyst": {
    name: "Demand Analyst",
    icon: BarChart3,
    text: "text-amber",
    border: "border-amber/50",
    bg: "bg-amber/10",
  },
  "Comps Agent": {
    name: "Comps Agent",
    icon: Users,
    text: "text-amber",
    border: "border-amber/50",
    bg: "bg-amber/10",
  },
  "Baseline (no Qloo)": {
    name: "Baseline (no Qloo)",
    icon: Bot,
    text: "text-steel",
    border: "border-steel/40",
    bg: "bg-steel/10",
  },
  Rubric: {
    name: "Rubric",
    icon: Scale,
    text: "text-foreground",
    border: "border-foreground/40",
    bg: "bg-foreground/5",
  },
  Skeptic: {
    name: "Skeptic",
    icon: Swords,
    text: "text-magenta",
    border: "border-magenta/50",
    bg: "bg-magenta/10",
  },
  "Deal Agent": {
    name: "Deal Agent",
    icon: Handshake,
    text: "text-go",
    border: "border-go/50",
    bg: "bg-go/10",
  },
  "Risk Gate": {
    name: "Risk Gate",
    icon: ShieldCheck,
    text: "text-gate",
    border: "border-gate/50",
    bg: "bg-gate/10",
  },
  Human: {
    name: "Human",
    icon: UserCheck,
    text: "text-gate",
    border: "border-gate/50",
    bg: "bg-gate/10",
  },
};
export const agentMeta = (n: string): AgentMeta => ({
  ...(AGENTS[n] ?? {
    name: n,
    icon: Scale,
    text: "text-foreground",
    border: "border-border",
    bg: "bg-background",
  }),
  name: agentLabel(n),
});

export function verdictClasses(v?: string | null) {
  const k = (v ?? "").toUpperCase();
  if (k === "GO") return "text-go border-go";
  if (k === "PASS") return "text-pass border-pass";
  return "text-amber border-amber";
}

export function VerdictStamp({ verdict, size = "lg" }: { verdict: string; size?: "sm" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-block font-display",
        size === "lg" ? "text-6xl sm:text-8xl" : "text-2xl",
        verdictClasses(verdict),
      )}
    >
      {verdict}
    </span>
  );
}
export function FormattedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <span>
      {prefix}
      {value.toLocaleString("en-US", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-xs",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({
  title,
  eyebrow,
  children,
  className,
  accent,
}: {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn("py-4 min-w-0", className)}
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
      <a
        href="https://github.com/saurin16/headcount"
        target="_blank"
        rel="noreferrer"
        className="text-amber hover:underline"
      >
        github.com/saurin16/headcount
      </a>
      <div className="mt-2">
        Qloo measures taste affinity, not ticket sales. Headcount drafts follow-ups; you send them.
      </div>
    </footer>
  );
}
