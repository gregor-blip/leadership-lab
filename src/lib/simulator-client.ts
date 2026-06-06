import { supabase } from "@/integrations/supabase/client";
import {
  toHistory,
  type TranscriptEntry,
  type TurnResponse,
  type ConvState,
  type PersonaStatement,
  type SynthesizeResponse,
} from "./simulator-data";

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("simulator", { body });
  if (error) throw new Error(error.message ?? String(error));
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

// Static case text — no AI call, so the case display can't fail mid-demo.
export function getCase(): Promise<{ caseText: string }> {
  return call<{ caseText: string }>({ action: "case" });
}

// One Socratic facilitator turn: the participant's message + recent history +
// the distilled shared state. Returns the single voice, the updated state, and
// whether/who the participant summoned.
export function sendTurn(
  message: string,
  transcript: TranscriptEntry[],
  state: ConvState
): Promise<TurnResponse> {
  return call<TurnResponse>({
    action: "turn",
    message,
    history: toHistory(transcript),
    state,
  });
}

// One persona's statement. `priorStatements` are the personas who already spoke
// THIS round, so this persona sees them and genuinely responds / disagrees.
export function callPersona(args: {
  personaId: string;
  message: string;
  transcript: TranscriptEntry[];
  state: ConvState;
  priorStatements: PersonaStatement[];
}): Promise<PersonaStatement> {
  return call<PersonaStatement>({
    action: "persona",
    personaId: args.personaId,
    message: args.message,
    history: toHistory(args.transcript),
    state: args.state,
    priorStatements: args.priorStatements,
  });
}

// Facilitator synthesis after a full council. Surfaces the fault line; adds no
// sixth opinion and picks no side.
export function synthesize(args: {
  transcript: TranscriptEntry[];
  state: ConvState;
  statements: PersonaStatement[];
}): Promise<SynthesizeResponse> {
  return call<SynthesizeResponse>({
    action: "synthesize",
    history: toHistory(args.transcript),
    state: args.state,
    statements: args.statements,
  });
}
