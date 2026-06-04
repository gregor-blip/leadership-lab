// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-sonnet-4-6";

const SCENARIO_SYSTEM = `You are the scenario engine for an AI Leadership Simulator used by graduate management students. Generate a single, tightly-scoped leadership dilemma calibrated to the learner profile provided.

Return STRICT JSON with this shape and nothing else:
{
  "title": "string, <= 60 chars",
  "context": "2-3 sentences setting the situation",
  "dilemma": "1-2 sentences naming the tension the learner must resolve",
  "stakes": ["3 short bullet phrases of what is at risk"],
  "options": [
    { "id": "A", "label": "short label", "description": "one sentence" },
    { "id": "B", "label": "short label", "description": "one sentence" },
    { "id": "C", "label": "short label", "description": "one sentence" }
  ]
}

The scenario must be grounded in the learner's region, sector, company type, role, and seniority. Avoid clichés.`;

const MENTORS = [
  { id: "drucker", name: "The Strategist", school: "Druckerian management — objectives, customer, contribution", voice: "measured, structural, focused on outcomes and accountability" },
  { id: "machiavelli", name: "The Realist", school: "Power and political realism", voice: "cold, tactical, focused on coalitions, leverage, and what survives contact with rivals" },
  { id: "sen", name: "The Ethicist", school: "Capabilities approach and stakeholder ethics", voice: "principled, dignified, focused on whose interests are silently traded away" },
  { id: "taleb", name: "The Skeptic", school: "Risk, fragility, optionality", voice: "blunt, contrarian, hunts hidden tail risks and false confidence" },
];

const MENTOR_SYSTEM = `You are four adversarial sparring partners critiquing a learner's decision in an AI Leadership Simulator. You are NOT real individuals — you are stylized voices grounded in distinct schools of management thought.

Given the scenario, the learner's profile (professional + psychological), and the option they chose, return STRICT JSON:
{
  "reactions": [
    { "id": "drucker",     "headline": "one sharp sentence", "critique": "2-3 sentences naming a specific blind spot tied to the learner's profile", "probe": "one pointed follow-up question" },
    { "id": "machiavelli", "headline": "...", "critique": "...", "probe": "..." },
    { "id": "sen",         "headline": "...", "critique": "...", "probe": "..." },
    { "id": "taleb",       "headline": "...", "critique": "...", "probe": "..." }
  ]
}

Each voice MUST stay in character:
- drucker: Druckerian — outcomes, customer, contribution, accountability
- machiavelli: power & political realism — coalitions, leverage, rivals
- sen: capabilities & stakeholder ethics — whose interests are silently traded
- taleb: risk, fragility, optionality — tail risks, false confidence

Tie each critique to a specific element of the learner's profile (e.g. high need for control, low openness to dissent, early-career role, regulated sector). No platitudes.`;

async function callAnthropic(system: string, user: string): Promise<string> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

function extractJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON in model response");
  return JSON.parse(m[0]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, profile, scenario, choice } = body;

    if (action === "scenario") {
      const text = await callAnthropic(
        SCENARIO_SYSTEM,
        `Learner profile:\n${JSON.stringify(profile, null, 2)}\n\nGenerate one fresh scenario now.`
      );
      return new Response(JSON.stringify(extractJson(text)), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (action === "react") {
      const text = await callAnthropic(
        MENTOR_SYSTEM,
        `Mentors: ${JSON.stringify(MENTORS)}\n\nLearner profile:\n${JSON.stringify(profile, null, 2)}\n\nScenario:\n${JSON.stringify(scenario, null, 2)}\n\nLearner's chosen option:\n${JSON.stringify(choice, null, 2)}\n\nProduce the four reactions now.`
      );
      return new Response(JSON.stringify(extractJson(text)), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
