import { supabase } from "@/integrations/supabase/client";
import type { Profile, Scenario, Reaction } from "./simulator-data";

export async function generateScenario(profile: Profile): Promise<Scenario> {
  const { data, error } = await supabase.functions.invoke("simulator", {
    body: { action: "scenario", profile },
  });
  if (error) throw error;
  return data as Scenario;
}

export async function generateReactions(
  profile: Profile,
  scenario: Scenario,
  choice: { id: string; label: string; description: string }
): Promise<{ reactions: Reaction[] }> {
  const { data, error } = await supabase.functions.invoke("simulator", {
    body: { action: "react", profile, scenario, choice },
  });
  if (error) throw error;
  return data as { reactions: Reaction[] };
}
