import { supabase } from "@/integrations/supabase/client";
import { toHistory, type TranscriptEntry, type TurnResponse, type Summon } from "./simulator-data";

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

// One conversational turn: the participant's free-text message + full history.
// `summon` is set only when the participant explicitly calls the council via the
// UI control; natural-language summons are detected server-side from the message.
export function sendTurn(
  message: string,
  transcript: TranscriptEntry[],
  summon?: Summon
): Promise<TurnResponse> {
  return call<TurnResponse>({
    action: "turn",
    message,
    history: toHistory(transcript),
    ...(summon ? { summon } : {}),
  });
}
