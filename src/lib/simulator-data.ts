// ---- Participant identity (the logged-in student doing the case). This is a
// real participant record — later populated from the school login/intake layer
// and shared with the professor layer — not decoration. Marko is WHO is doing
// the case; he is not a character in it (the case participant is the president). ----
export type Participant = {
  name: string;
  country: string;
  flag: string;
  role: string;
};

export const PARTICIPANT: Participant = {
  name: "Marko Novaković",
  country: "Serbia",
  flag: "RS",
  role: "Participant",
};

// ---- The council (names ARE their personalities). ids match the Edge Function
// PERSONA_META. The Champion replaces the old Contrarian: four challenge from
// distinct angles, one builds the strongest case FOR the participant's direction. ----
export type Mentor = { id: string; name: string; school: string; blurb: string };

export const MENTORS: Mentor[] = [
  {
    id: "disruptor",
    name: "The Disruptor",
    school: "Disruptive innovation & demand",
    blurb:
      "Sees the cheaper, simpler threat coming from underneath, and asks what the market actually wants now.",
  },
  {
    id: "operator",
    name: "The Operator",
    school: "Execution & capital reality",
    blurb:
      "Turns every idea into who-does-what-by-when, paid for how. Allergic to vision without a mechanism.",
  },
  {
    id: "champion",
    name: "The Champion",
    school: "Constructive advocacy",
    blurb:
      "Builds the strongest case FOR your direction and makes you earn it. A steelman, not a yes-man.",
  },
  {
    id: "systemsThinker",
    name: "The Systems-Thinker",
    school: "Systems thinking",
    blurb:
      "Watches the feedback loops and the delays, and shows you the second- and third-order effects you missed.",
  },
  {
    id: "ethicalChallenger",
    name: "The Ethical Challenger",
    school: "Stakeholder ethics",
    blurb:
      "Asks who bears the cost that wasn't in the room, and whether the decision would survive the front page.",
  },
];

// ---- Conversation payloads (mirror the Edge Function) ----
export type Figure = { label: string; value: string };

// The single default voice (Socratic facilitator). figures present only when it
// cites fact-sheet numbers.
export type Reply = { text: string; figures: Figure[] };

// The Facilitator's distilled running state — injected into each persona so they
// reason from where things actually stand, not the raw transcript.
export type ConvState = {
  decided: string[];
  rejected: string[];
  open: string[];
  direction: string;
};

export const EMPTY_STATE: ConvState = { decided: [], rejected: [], open: [], direction: "" };

// Who the facilitator decided to convene this turn.
export type Summon = { mode: "none" | "all" | "named" | "auto"; ids: string[] };

// `turn` response: single facilitator voice + updated state + summon decision.
export type TurnResponse = { reply: Reply; note: string; state: ConvState; summon: Summon };

// One persona's statement (the `persona` action).
export type PersonaStatement = { id: string; name: string; school: string; message: string };

// The facilitator synthesis after a full council (the `synthesize` action).
export type SynthesizeResponse = { text: string };

// ---- Transcript (flat, in-memory). `note` entries are display-only and are
// NOT sent back to the model as history. ----
export type TranscriptEntry =
  | { kind: "participant"; text: string }
  | { kind: "facilitator"; text: string; figures: Figure[] }
  | { kind: "council"; id: string; name: string; school: string; text: string }
  | { kind: "note"; text: string };

// Build the history contract the Edge Function expects:
//   [{ role: "participant" | "facilitator" | "council", name?, text }]
export function toHistory(transcript: TranscriptEntry[]) {
  return transcript
    .filter((e) => e.kind !== "note")
    .map((e) => {
      if (e.kind === "participant") return { role: "participant", text: e.text };
      if (e.kind === "facilitator") return { role: "facilitator", text: e.text };
      return { role: "council", name: (e as any).name, text: (e as any).text };
    });
}
