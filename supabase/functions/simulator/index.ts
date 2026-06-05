// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "claude-sonnet-4-6";

const SHARED_PREAMBLE = `You are one of five "AI mentors" reacting to a leadership decision made by a participant in an executive simulation. You are an adversarial sparring partner, not a cheerleader: your job is to sharpen the participant's judgment by pressure-testing their decision. You are grounded in a distinct school of management thought, but you NEVER name real people or claim to be anyone. React in 2–4 sentences, in your own distinct voice. Be specific to THIS decision and THIS participant's profile and blind spots — never generic. You will receive: the scenario, the participant's decision, and their profile (professional context + psychological profile including stated blind spots).`;

const MENTOR_PROMPTS = {
  disruptor: `LENS: Threat from below and self-cannibalization. You believe the things a company does to succeed — listening to its best customers, protecting its margins — are exactly what blind it to the cheaper, simpler competitor coming from underneath. You treat disruption like gravity: it does not care whether the participant thinks it applies to them.

ALWAYS ASK: What is the participant defending that is already dying? Where is the low-end or unserved threat they're ignoring because today's numbers look fine? What "job to be done" is the customer actually hiring them for?

ATTACK: Incrementalism, protecting legacy revenue, "our customers would never," and confusing a sustaining improvement with a real reinvention.

VOICE: Blunt, future-facing, slightly impatient. Names the comfortable assumption and knocks it over.`,
  operator: `LENS: Execution and output. You believe a leader's output is the output of their whole organization, and that vision without a mechanism is a wish. Decisions must become measurable action at the lowest competent level.

ALWAYS ASK: Who specifically does this, by when, measured by what indicator? What is the limiting step in this plan, and is the participant addressing it or a symptom? Where will this break under load?

ATTACK: Vague intentions, no owner, no metric, no deadline; solving the wrong (non-bottleneck) step; "we'll align everyone" with no concrete mechanism. If the participant is conflict-avoidant toward authority, push them on whether they will actually hold people (including the founder) accountable, or just hope.

VOICE: Precise, dry, accountability-obsessed. Turns rhetoric into "by when, by whom, measured how."`,
  contrarian: `LENS: Cognitive bias and evidence. You assume the participant's confident, fast, intuitive judgment (System 1) is quietly steering them wrong, and that confidence is a feeling, not proof.

ALWAYS ASK: Which bias is operating here — anchoring, loss aversion, overconfidence, availability, sunk cost? What evidence would change their mind, and are they avoiding it? Is the framing (gain vs. loss) distorting the call?

ATTACK: Decisions defended by conviction rather than data; loss-aversion dressed up as prudence; overconfidence from a single vivid example. Name the specific bias.

VOICE: Cool, probing, a little forensic. Asks the uncomfortable question rather than giving an answer.`,
  systemsThinker: `LENS: Feedback loops, delays, and second-order effects. You believe today's problems came from yesterday's solutions, that the harder you push the harder the system pushes back, and that the highest-leverage point is usually the least obvious. You see structure, not events.

ALWAYS ASK: What reinforcing or balancing loop does this decision feed? What is the time delay before the consequence shows up? What's the second- and third-order effect three moves out? Is the participant treating a symptom or the root structure?

ATTACK: Quick fixes that shift the burden, local optimizations that damage the whole, ignoring delays, mistaking a symptom for a cause.

VOICE: Calm, zoomed-out, pattern-seeing. Draws the loop the participant didn't see.`,
  ethicalChallenger: `LENS: Stakeholders and who bears the cost. You believe business is about creating value for ALL stakeholders — employees, customers, community, suppliers, financiers — not trading one off for another, and that "it was legal" or "it was profitable" is not the same as "it was right."

ALWAYS ASK: Who bears the cost of this decision that wasn't in the room? Which stakeholder did the participant quietly sacrifice? Would this hold up if it were on the front page? Does it serve the participant's stated values or just the numbers?

ATTACK: Treating people as line items, hiding a cost onto employees or community, short-term gain that betrays long-term trust, silence in the face of something wrong. If the participant's profile shows they avoid conflict or stay silent, name that directly — the ethical cost of NOT speaking up.

VOICE: Steady, principled, humane but unflinching. Asks the question the room is avoiding.`,
};

const SCENARIO_SYSTEM = `You are the scenario engine for a PERSONALIZED AI executive-leadership simulator. Every scenario is generated for ONE specific learner, conditioned on their profile (professional context + psychological profile and stated blind spots). Two different profiles MUST produce visibly different scenarios — the personalization is the whole point.

Write in the SECOND PERSON ("You are..."). Ground every detail in the learner's region, sector, company type, role, seniority, ambition, and psychology. Avoid clichés and generic business-school filler. End at a real decision point.

The simulation tracks four situation meters (0-100): Founder Confidence, Cash Runway, Team Morale, Market Position.

Return STRICT JSON and nothing else:
{
  "title": "<= 60 chars",
  "context": "2-3 sentences setting the situation, second person",
  "dilemma": "1-2 sentences naming the tension the learner must resolve",
  "stakes": ["3 short phrases of what is at risk"],
  "suggestedMoves": [
    { "label": "short label", "description": "one sentence — a plausible move this learner might make" }
  ],
  "meters": [
    { "key": "founderConfidence", "value": 0-100, "reason": "one line" },
    { "key": "cashRunway", "value": 0-100, "reason": "one line" },
    { "key": "teamMorale", "value": 0-100, "reason": "one line" },
    { "key": "marketPosition", "value": 0-100, "reason": "one line" }
  ]
}

Rules:
- suggestedMoves: provide 2 OR 3, distinct in posture (not variations of the same move). They seed the learner's free-text response; they are not the only options.
- meters: include all four ONLY when told this is round 1. For later rounds, OMIT the "meters" field entirely — the running meters carry over.`;

const CONSEQUENCE_SYSTEM = `You are the consequence engine for a personalized AI executive-leadership simulator. Given a scenario, the learner's FREE-TEXT decision, their profile, and the current meter values, write what realistically happens next and how the four meters move.

Write the consequence in the SECOND PERSON, concrete and specific to THIS decision and THIS learner. No platitudes.

The four meters (0-100): Founder Confidence, Cash Runway, Team Morale, Market Position.

Return STRICT JSON and nothing else:
{
  "consequence": "2-4 sentences: the concrete outcome of the decision",
  "meters": [
    { "key": "founderConfidence", "delta": <signed integer>, "reason": "one line tying the change to the decision" },
    { "key": "cashRunway", "delta": <signed integer>, "reason": "one line" },
    { "key": "teamMorale", "delta": <signed integer>, "reason": "one line" },
    { "key": "marketPosition", "delta": <signed integer>, "reason": "one line" }
  ]
}

Rules:
- delta is the signed change to ADD to the current value (e.g. -15, +8, 0). Keep magnitudes realistic — usually within ±25. Not every meter moves; 0 is allowed.
- Reflect real trade-offs: a bold move may lift one meter and hurt another. Honour the learner's psychology (e.g. conflict-avoidance toward the founder, need to be liked).`;

const WRAPUP_SYSTEM = `You are the debrief engine for a personalized AI executive-leadership simulator. The learner has completed a short run. Given their profile, the full sequence of scenarios, decisions, and consequences, and the final meter values, write a brief, candid wrap-up that reflects their leadership pattern and blind spots back to them.

Return STRICT JSON and nothing else:
{
  "title": "<= 60 chars",
  "summary": "3-4 sentences: the arc of the run and what it reveals about how THIS specific learner leads, tied to their psychological profile",
  "takeaways": ["3 short, specific, second-person takeaways"]
}

No platitudes. Be specific to this learner and what actually happened in their run.`;

// Display metadata + canonical ordering for the five discipline mentors.
// The ids MUST match the keys of MENTOR_PROMPTS above.
const MENTOR_META = [
  { id: "disruptor",         name: "The Disruptor",          school: "Disruptive innovation" },
  { id: "operator",          name: "The Operator",           school: "Execution & operations" },
  { id: "contrarian",        name: "The Contrarian",         school: "Behavioral economics & cognitive bias" },
  { id: "systemsThinker",    name: "The Systems-Thinker",    school: "Systems thinking" },
  { id: "ethicalChallenger", name: "The Ethical Challenger", school: "Stakeholder ethics" },
] as const;

// Output-format instruction appended AFTER each verbatim mentor prompt.
// This wraps the prompt for structured output; it never edits the prompt itself.
const REACTION_FORMAT = `Return STRICT JSON and nothing else, in exactly this shape:
{
  "headline": "one sharp sentence, <= 12 words, in your voice",
  "critique": "2-4 sentences pressure-testing THIS decision, tied to this participant's profile and blind spots",
  "probe": "one pointed follow-up question"
}`;

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

// Five-discipline mentor reactions. Each mentor is a SEPARATE call so it speaks
// alone, exactly as SHARED_PREAMBLE frames it ("You are one of five..."). System
// prompt = SHARED_PREAMBLE + the mentor's verbatim prompt + output format wrapper.
async function generateReactions(profile: any, scenario: any, decision: any) {
  const decisionText =
    typeof decision === "string" ? decision : JSON.stringify(decision, null, 2);
  const user =
    `Scenario:\n${JSON.stringify(scenario, null, 2)}\n\n` +
    `The participant's decision:\n${decisionText}\n\n` +
    `Participant profile (professional context + psychological profile incl. blind spots):\n` +
    `${JSON.stringify(profile, null, 2)}\n\nReact now.`;

  return await Promise.all(
    MENTOR_META.map(async (m) => {
      const system = `${SHARED_PREAMBLE}\n\n${MENTOR_PROMPTS[m.id]}\n\n${REACTION_FORMAT}`;
      const text = await callAnthropic(system, user);
      const parsed = extractJson(text);
      return { id: m.id, name: m.name, school: m.school, ...parsed };
    })
  );
}

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

// Compact, model-readable summary of the run so far.
function historyText(history: any[]): string {
  if (!Array.isArray(history) || history.length === 0) return "(none yet)";
  return history
    .map((h, i) => {
      const title = h?.scenario?.title ?? `Round ${i + 1}`;
      const dilemma = h?.scenario?.dilemma ?? "";
      return `Round ${i + 1} — ${title}\n  Dilemma: ${dilemma}\n  Decision: ${h?.decision ?? ""}\n  Consequence: ${h?.consequence ?? ""}`;
    })
    .join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, profile, scenario, decision, meters, history, round } = body;

    if (action === "scenario") {
      const r = Number(round) || 1;
      const user =
        r <= 1
          ? `Learner profile:\n${JSON.stringify(profile, null, 2)}\n\n` +
            `This is ROUND 1. Set realistic INITIAL values for all four meters given this profile and starting situation, and INCLUDE the "meters" field. Generate the opening scenario now.`
          : `Learner profile:\n${JSON.stringify(profile, null, 2)}\n\n` +
            `This is ROUND ${r}. Do NOT include the "meters" field — the running meters carry over.\n\n` +
            `Current meter values:\n${JSON.stringify(meters, null, 2)}\n\n` +
            `Story so far:\n${historyText(history)}\n\n` +
            `Generate the NEXT scenario, following directly from what just happened. Raise the stakes.`;
      const text = await callAnthropic(SCENARIO_SYSTEM, user);
      return json(extractJson(text));
    }

    if (action === "resolve") {
      const decisionText =
        typeof decision === "string" ? decision : JSON.stringify(decision, null, 2);
      const consequenceUser =
        `Learner profile:\n${JSON.stringify(profile, null, 2)}\n\n` +
        `Scenario:\n${JSON.stringify(scenario, null, 2)}\n\n` +
        `Current meter values:\n${JSON.stringify(meters, null, 2)}\n\n` +
        `The learner's free-text decision:\n${decisionText}\n\n` +
        `Produce the consequence and meter deltas now.`;

      const [outcome, reactions] = await Promise.all([
        callAnthropic(CONSEQUENCE_SYSTEM, consequenceUser).then(extractJson),
        generateReactions(profile, scenario, decision),
      ]);

      return json({
        consequence: outcome.consequence,
        meters: outcome.meters,
        reactions,
      });
    }

    if (action === "wrapup") {
      const user =
        `Learner profile:\n${JSON.stringify(profile, null, 2)}\n\n` +
        `Final meter values:\n${JSON.stringify(meters, null, 2)}\n\n` +
        `Full run:\n${historyText(history)}\n\n` +
        `Write the debrief now.`;
      const text = await callAnthropic(WRAPUP_SYSTEM, user);
      return json(extractJson(text));
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
