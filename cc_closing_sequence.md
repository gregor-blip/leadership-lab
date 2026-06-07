# CC CLOSING SEQUENCE — how the case ends

> STATUS 2026-06-07: HOLD LIFTED and BUILT. v3 is live and the full-council Peak 2 test is confirmed, so the original "do not start until v3" hold no longer applies. This file is the source of truth for the closing sequence; it is reproduced here (corrected) so it can never go missing again. Two corrections vs the original design doc: (a) the hold is lifted; (b) the banned word "room" has been removed from this document and from all code and copy.

Add an ending to the case. Right now the conversation runs open-endedly — there's no close, no signal the case is done, and no bound on session length. Add a closing sequence that gives the participant a real, recognizable ending AND produces a structured decision record. This is also the natural cost/length bound: the Facilitator drives the session to a close rather than letting it run forever.

=== WHEN THE CLOSE TRIGGERS ===
The Facilitator drives toward closing once the pedagogical arc is complete — the participant has (1) examined the case/data, (2) convened the council and been challenged, (3) been pushed on their reasoning. Once those beats are hit, the Facilitator starts steering toward commitment: "You've stress-tested this from every angle — it's time to commit. Which direction, and what's the actual concept?" Also provide a hard ceiling so a rambling/adversarial session can't run forever (safety net, rarely hit). And an explicit affordance the participant can trigger any time they feel ready: "I'm ready to commit / decide."

=== THE CRITICAL POINT: THE CONCEPT IS THE DECISION ===
Committing to "door three / the AI hub" is NOT the decision — that's just the direction. "AI hub" is a label, not a case (the Champion explicitly pushes the participant past this). The real decision the case is testing is the CONCEPT OF THE SOLUTION: what IEDC actually builds and offers, for whom, and what makes it distinctly IEDC (the thing a McKinsey or Coursera or local university cannot replicate). The closing record must center on the concept, not just the door.

=== THE RECAP / DECISION RECORD (fixed template) ===
When the participant commits, the Facilitator generates a recap FROM THE STATE IT HAS BEEN KEEPING THE WHOLE TIME (the same running tabs it uses to brief the council — so this is assembling what was actually said, not inventing). The recap follows a FIXED TEMPLATE — these topics must always be addressed, in this order:
1. The direction — which door (e.g. door three, the AI hub).
2. **The concept of the solution** — the actual idea: what IEDC builds/offers, for whom, and what makes it distinctly IEDC that competitors can't replicate. THIS IS THE HEART OF THE RECORD.
3. The reasoning — why this concept, and why over the rejected doors.
4. The evidence — the facts/figures from the case that ground it.
5. The risks acknowledged — what the council surfaced that the participant is accepting.
6. Projected consequences over time — year 1, year 2, year 3.
7. The core bet — the central assumption the whole decision rests on.

Present this as ONE clean, structured page — this is the first time the participant sees their whole reasoning laid out coherently instead of scattered across the conversation. (That legibility is the point — seeing it whole prompts genuine second thoughts and final refinement.)

=== EDIT → CONFIRM → FINISH ===
- The participant can EDIT any part of the recap. Seeing the structured page for the first time will surface second thoughts ("my year-2 logic doesn't follow," "that's not quite why I rejected door one") — let them refine each section. This edit step is the final act of reasoning, not admin.
- After editing, the Facilitator asks for confirmation: "Is this right, Marko?"
- On confirm, a "Finish" / "Submit" button finalizes and displays the decision record as the completed artifact.

=== SCOPE FOR MONDAY ===
- The Finish/Submit button is a MOCKUP — it finalizes and displays the record; it does NOT route anywhere (the professor layer doesn't exist yet, and it is understood to be a concept prototype). No epilogue / "what IEDC actually did" reveal — the record is about the participant's own reasoning, full stop.
- The recap is generated from the Facilitator's existing state tabs — leverage what's already built for council-briefing; don't build a separate tracking system.

=== KEEP / DON'T BREAK ===
Everything from the v3 build: Facilitator one-voice default + Socratic-on-judgment; the five-voice council (incl. Champion) genuinely disagreeing; two-tier knowledge; Peak 1 data delivery; markdown; layout; Marko badge; IEDC tokens; projector legibility.

=== BANNED LANGUAGE ===
Do not use "the room" / "this room" / "when the room closes" or any equivalent vague language anywhere in the closing sequence, the recap, or the Facilitator's prompts. The participant is always talking to the Facilitator, a named mentor, or the council — never "the room."

=== DEPLOY MECHANICS ===
This changes BOTH the Edge Function (closing logic, recap generation, state-to-template) AND the frontend (the structured editable recap page, Finish button). After merge to main: the frontend needs a Lovable frontend republish + hard-refresh, AND the `simulator` edge function needs an EXPLICIT Lovable redeploy. A git sync does NOT auto-redeploy the edge function — if only the frontend is republished, the closing logic will be stale and the old improvised ending will still show. Both steps are required; neither is automatic.

=== AS BUILT (2026-06-07) ===
- Trigger: the Facilitator sets `closing.stage` on each turn — "none" / "ready" (arc complete or participant signaled; it steers and asks for direction + concept) / "commit" (direction AND a real concept are both on the table). The frontend opens the record automatically on "commit"; an "I'm ready to commit" affordance and a 12-turn safety ceiling both nudge the Facilitator to "ready", and a "record my decision now" escape is always available once ready.
- Record: the `record` edge action fills the seven-part template via forced tool-use (no JSON.parse of free text); the client falls back to a record built from the state tabs if the action is not deployed yet. Every section is editable; the concept of the solution is the visual spine.
- Confirm: "Is this right, Marko?" → "Yes, record it" → the finish screen displays the record read-only, no epilogue.
