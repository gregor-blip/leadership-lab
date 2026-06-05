export type Profile = {
  professional: {
    region: string;
    age: number;
    companyType: string;
    sector: string;
    role: string;
    yearsExperience: number;
    ambition: string;
    situation: string;
  };
  psychological: {
    riskAppetite: number;
    decisiveness: number;
    conflictStyle: number;
    needForControl: number;
    opennessToDissent: number;
    ethicalAnchoring: number;
  };
};

// Seed learner: Marko (see brief). Rich, specific, and EDITABLE — editing it
// changes the next generated scenario, which is the key demo moment.
export const DEFAULT_PROFILE: Profile = {
  professional: {
    region: "Slovenia (Central Europe)",
    age: 40,
    companyType: "Family-owned industrial exporter (~€120M revenue)",
    sector: "Industrial manufacturing / export",
    role: "Senior Operations Director",
    yearsExperience: 12,
    ambition: "Become CEO within 3 years",
    situation:
      "The founder still walks the floor and second-guesses management. A German competitor just undercut us with an AI-automated plant. Our best engineers are being poached. Marko is strong analytically but conflict-avoidant — especially toward the founder — has a high need to be liked, and tends to stay silent rather than challenge authority.",
  },
  psychological: {
    riskAppetite: 42,
    decisiveness: 55,
    conflictStyle: 22,
    needForControl: 61,
    opennessToDissent: 38,
    ethicalAnchoring: 70,
  },
};

export const PSY_LABELS: Record<keyof Profile["psychological"], [string, string]> = {
  riskAppetite: ["Risk-averse", "Risk-seeking"],
  decisiveness: ["Deliberative", "Decisive"],
  conflictStyle: ["Accommodating", "Confrontational"],
  needForControl: ["Delegative", "Controlling"],
  opennessToDissent: ["Closed", "Open to dissent"],
  ethicalAnchoring: ["Pragmatic", "Principled"],
};

// The five discipline mentors. ids MUST match MENTOR_META in the Edge Function.
export const MENTORS = [
  { id: "disruptor", name: "The Disruptor", school: "Disruptive innovation" },
  { id: "operator", name: "The Operator", school: "Execution & operations" },
  { id: "contrarian", name: "The Contrarian", school: "Behavioral economics & cognitive bias" },
  { id: "systemsThinker", name: "The Systems-Thinker", school: "Systems thinking" },
  { id: "ethicalChallenger", name: "The Ethical Challenger", school: "Stakeholder ethics" },
] as const;

// The four situation meters, canonical order. Mirrors the Edge Function prompts.
export const METERS = [
  { key: "founderConfidence", label: "Founder Confidence" },
  { key: "cashRunway", label: "Cash Runway" },
  { key: "teamMorale", label: "Team Morale" },
  { key: "marketPosition", label: "Market Position" },
] as const;

export type MeterKey = (typeof METERS)[number]["key"];

export const CONSENT_LINE =
  "Built from 2 completed assessments + your interactions — with your consent.";

export const TOTAL_ROUNDS = 3;

export type SuggestedMove = { label: string; description: string };

// From the Edge Function: round 1 carries `value`; resolve carries `delta`.
export type MeterPayload = { key: MeterKey; value?: number; delta?: number; reason?: string };

export type Scenario = {
  title: string;
  context: string;
  dilemma: string;
  stakes: string[];
  suggestedMoves: SuggestedMove[];
  meters?: MeterPayload[];
};

export type Reaction = {
  id: string;
  name: string;
  school: string;
  headline: string;
  critique: string;
  probe: string;
};

export type ResolveResult = {
  consequence: string;
  meters: MeterPayload[];
  reactions: Reaction[];
};

export type Wrapup = {
  title: string;
  summary: string;
  takeaways: string[];
};

// Running meter state held in the client.
export type MeterState = { key: MeterKey; label: string; value: number; reason: string };

export type HistoryEntry = {
  scenario: Scenario;
  decision: string;
  consequence: string;
};

export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
