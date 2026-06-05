## Plan: Store mentor system prompts verbatim in the Edge Function

Add six string constants to `supabase/functions/simulator/index.ts` (the existing Edge Function — note: the user called it `simulate`, but the function in the repo is `simulator`; I'll add the constants there and confirm the location).

### What I'll add

At the top of `supabase/functions/simulator/index.ts`, just below the existing imports/CORS block, add:

1. `const SHARED_PREAMBLE = \`...\`` — the shared preamble text, verbatim.
2. `const MENTOR_PROMPTS = { disruptor: \`...\`, operator: \`...\`, contrarian: \`...\`, systemsThinker: \`...\`, ethicalChallenger: \`...\` }` — each mentor's block, verbatim.

Rules I will follow:
- Copy each block character-for-character from your message. No rephrasing, trimming, or "cleanup".
- Use backtick template literals so apostrophes, em-dashes, and quotes are preserved as-is. No escaping beyond what backticks require (backticks themselves and `${` — none appear in your text).
- Section header lines (e.g. `=== THE DISRUPTOR ===`) are NOT part of the block bodies — they're delimiters in your message. Each constant's body starts at the first content line after the header and ends at the blank line before the next `===` header. If you want the `=== ... ===` headers included inside the strings, tell me and I'll include them.
- These constants stay server-side only. They are not returned in any response and not imported by frontend code.

### Wiring (not changing behavior yet, just storing)

This step ONLY stores the constants. I will not yet change how `action: "react"` builds its system prompt. Once stored, the intended usage (for a later step) is: for each mentor, system prompt = `SHARED_PREAMBLE + "\n\n" + MENTOR_PROMPTS[mentorKey]`.

Note: the current Edge Function uses 4 mentors (Strategist/Realist/Ethicist/Skeptic) and an action called `react`. Your spec has 5 mentors (Disruptor/Operator/Contrarian/Systems-Thinker/Ethical Challenger) and mentions an action called `resolve`. I'll leave the existing mentor wiring + action name alone in this step and only add the constants. Switching the function over to the 5-mentor model + `resolve` action is a separate change I can do next if you confirm.

### Verification

After the edit I will:
1. Print the exact constant block back to you in chat (copy-pasted from the file) so you can verify nothing was reworded.
2. Confirm the file path and approximate line range where the block lives.

No other files change.