// ---- Mentors (names ARE their personalities). ids match the Edge Function. ----
export type Mentor = { id: string; name: string; school: string; blurb: string };

export const MENTORS: Mentor[] = [
  {
    id: "disruptor",
    name: "The Disruptor",
    school: "Disruptive innovation",
    blurb:
      "Sees the cheaper, simpler threat coming from underneath — and doesn't care whether you think it applies to you.",
  },
  {
    id: "operator",
    name: "The Operator",
    school: "Execution & operations",
    blurb:
      "Turns every idea into who-does-what-by-when. Allergic to vision without a mechanism.",
  },
  {
    id: "contrarian",
    name: "The Contrarian",
    school: "Behavioral economics & cognitive bias",
    blurb:
      "Hunts the bias hiding in your confidence, and asks what evidence would actually change your mind.",
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
      "Asks who bears the cost that wasn't in the room — and whether the decision would survive the front page.",
  },
];

// ---- Conversation payloads (mirror the Edge Function `turn` response) ----
export type Figure = { label: string; value: string };

// The single default voice (facilitator/analyst). figures present only when it
// cites fact-sheet numbers.
export type Reply = { text: string; figures: Figure[] };

export type CouncilMessage = { id: string; name: string; school: string; message: string };

export type TurnResponse = { reply: Reply; council: CouncilMessage[]; note: string };

// How the council is summoned. Omitted = not summoned (single-voice turn).
//   "auto" = bring 1-2 relevant mentors · "all" = full council · <mentorId> = just that one
export type Summon = "auto" | "all" | string;

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
