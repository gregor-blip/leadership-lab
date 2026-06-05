import { supabase } from "@/integrations/supabase/client";
import type {
  Profile,
  Scenario,
  ResolveResult,
  Wrapup,
  HistoryEntry,
  MeterState,
} from "./simulator-data";

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("simulator", { body });
  if (error) throw new Error(error.message ?? String(error));
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

// Current meter values in the shape the Edge Function expects.
function meterValues(meters: MeterState[]) {
  return meters.map((m) => ({ key: m.key, label: m.label, value: m.value }));
}

function historyForModel(history: HistoryEntry[]) {
  return history.map((h) => ({
    scenario: { title: h.scenario.title, dilemma: h.scenario.dilemma },
    decision: h.decision,
    consequence: h.consequence,
  }));
}

export function generateScenario(opts: {
  profile: Profile;
  round: number;
  history?: HistoryEntry[];
  meters?: MeterState[];
}): Promise<Scenario> {
  return call<Scenario>({
    action: "scenario",
    profile: opts.profile,
    round: opts.round,
    history: opts.history ? historyForModel(opts.history) : [],
    meters: opts.meters ? meterValues(opts.meters) : [],
  });
}

export function resolveDecision(opts: {
  profile: Profile;
  scenario: Scenario;
  decision: string;
  meters: MeterState[];
}): Promise<ResolveResult> {
  return call<ResolveResult>({
    action: "resolve",
    profile: opts.profile,
    scenario: opts.scenario,
    decision: opts.decision,
    meters: meterValues(opts.meters),
  });
}

export function generateWrapup(opts: {
  profile: Profile;
  history: HistoryEntry[];
  meters: MeterState[];
}): Promise<Wrapup> {
  return call<Wrapup>({
    action: "wrapup",
    profile: opts.profile,
    history: historyForModel(opts.history),
    meters: meterValues(opts.meters),
  });
}
