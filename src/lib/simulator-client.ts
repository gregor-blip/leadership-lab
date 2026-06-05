import { supabase } from "@/integrations/supabase/client";
import { toHistory, type TranscriptEntry, type TurnResponse } from "./simulator-data";

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
export function sendTurn(message: string, transcript: TranscriptEntry[]): Promise<TurnResponse> {
  return call<TurnResponse>({
    action: "turn",
    message,
    history: toHistory(transcript),
  });
}
