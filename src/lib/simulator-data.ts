export type Profile = {
  professional: {
    region: string;
    age: number;
    companyType: string;
    sector: string;
    role: string;
    yearsExperience: number;
    ambition: string;
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

export const DEFAULT_PROFILE: Profile = {
  professional: {
    region: "Western Europe",
    age: 31,
    companyType: "Listed multinational",
    sector: "Industrial manufacturing",
    role: "Senior Product Manager",
    yearsExperience: 7,
    ambition: "C-suite within 10 years",
  },
  psychological: {
    riskAppetite: 62,
    decisiveness: 78,
    conflictStyle: 45,
    needForControl: 71,
    opennessToDissent: 38,
    ethicalAnchoring: 66,
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

export const MENTORS = [
  { id: "drucker",     name: "The Strategist", accent: "var(--ink)",    school: "Druckerian management" },
  { id: "machiavelli", name: "The Realist",    accent: "var(--ink)",    school: "Political realism" },
  { id: "sen",         name: "The Ethicist",   accent: "var(--ink)",    school: "Capabilities & stakeholder ethics" },
  { id: "taleb",       name: "The Skeptic",    accent: "var(--ink)",    school: "Risk & fragility" },
] as const;

export type Scenario = {
  title: string;
  context: string;
  dilemma: string;
  stakes: string[];
  options: { id: string; label: string; description: string }[];
};

export type Reaction = { id: string; headline: string; critique: string; probe: string };
