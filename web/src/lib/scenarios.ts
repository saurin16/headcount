import type { Offer } from "@/lib/api";

export interface Scenario {
  key: string; // replay key on the API
  label: string;
  short: string;
  sub: string;
  offer: Offer;
  tone: string;
}

export const SCENARIOS: Scenario[] = [
  {
    key: "ai-would-sign",
    label: "The AI would've signed it",
    short: "AI would've signed",
    sub: "In this recorded run, a plain AI said GO. Qloo's taste data said otherwise.",
    offer: {
      act: "Khruangbin",
      city: "Omaha, NE",
      capacity: 1500,
      guarantee: 25000,
      ticket_price: 35,
    },
    tone: "hover:border-pass/70",
  },
  {
    key: "hometown-hero",
    label: "Hometown hero",
    short: "Hometown hero",
    sub: "Low risk, so the agents act on their own.",
    offer: {
      act: "Turnpike Troubadours",
      city: "Tulsa, OK",
      capacity: 2800,
      guarantee: 40000,
      ticket_price: 35,
    },
    tone: "hover:border-go/70",
  },
  {
    key: "agents-disagree",
    label: "The agents disagree",
    short: "Agents disagree",
    sub: "The agents disagree about this offer. You make the call.",
    offer: {
      act: "Japanese Breakfast",
      city: "Tulsa, OK",
      capacity: 2800,
      guarantee: 40000,
      ticket_price: 35,
    },
    tone: "hover:border-magenta/70",
  },
];
