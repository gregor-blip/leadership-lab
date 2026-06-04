
# AI Leadership Simulator — Build Plan (revised)

Two changes from v1, everything else unchanged and approved.

## Changes from v1

- **Runtime model**: Edge Function calls **`claude-sonnet-4-6`** (Claude Sonnet 4.6 — verified current latest via Anthropic's models overview). Endpoint `https://api.anthropic.com/v1/messages`, `anthropic-version: 2023-06-01`, JSON-only system instruction.
- **Design**: light Swiss-modernist, not dark/slate.

## Design system (revised)

Light, editorial, document-like — built to sit next to your other application papers.

- **Surfaces**: off-white page (`oklch(0.985 0.003 90)` — warm paper), pure white inset cards, hairline `1px` rules in near-black at ~12% opacity. No drop shadows on content; one soft shadow only on the outer device chrome.
- **Ink**: near-black `oklch(0.18 0.01 270)` for body, true black for display numerals.
- **Accent**: a single electric accent used sparingly — primary buttons, active slider track, selected meter index, mentor archetype dot. Default proposal: **electric vermilion** `oklch(0.62 0.24 28)`. (If you'd rather have signal blue or chartreuse, say so before I commit tokens.)
- **Type**: **Inter Tight** for UI/body, **Space Grotesk** (or **Söhne**-alike via Inter Display) for section labels in ALL-CAPS tracked-out micro, and **oversized tabular numerals** (Inter with `font-feature-settings: "tnum"`) for meter values — 56–72px, true black, weight 500.
- **Grid**: strict 12-column with 24px gutters on desktop, hairline column dividers visible on the simulator card. Section headers numbered `01 / PROFILE`, `02 / SIMULATOR`, `03 / MENTORS` in micro-caps.
- **Chrome**: a thin off-white outer frame with a single hairline border, rounded `xl`, no gradient — reads like a printed document with a window cut.
- **Mentor accents**: replaced with small filled circles + label, all five using neutral inks except a single accent dot — keeps the page calm; the accent stays scarce.
- All values defined as oklch tokens in `src/styles.css` under `:root` + `@theme inline`. No raw color classes in components.

## Everything else (unchanged from v1, approved)

- Enable Lovable Cloud; create Edge Function `simulate` with two actions (`scenario`, `resolve`); CORS + `verify_jwt = false`.
- Prompt you to add `ANTHROPIC_API_KEY` as a Supabase secret via the secret tool (don't paste it in chat).
- Single route `/` with three-column desktop layout (Profile / Simulator / Mentors), stacked tabs on mobile, inside the document chrome.
- Components: `AppChrome`, `ProfilePanel` (view + edit, Marko seed), `SimulatorPanel` (meters, scenario, free-text + suggested buttons, consequence, Next), `MeterCard`, `MentorsPanel` (5 archetypes with framing line).
- State machine: scenario → resolve → next, 3 rounds, then wrap-up. In-memory only; "Reset run" clears state.
- Toast on 402/429 from Anthropic. All prompts live server-side.

## Build order

1. Enable Lovable Cloud.
2. Light Swiss design tokens in `src/styles.css` + fonts.
3. Edge Function scaffold (`supabase/functions/simulate/index.ts` + `config.toml`) calling `claude-sonnet-4-6`, with a graceful fallback response when the key is absent.
4. Prompt for `ANTHROPIC_API_KEY` via the secret tool.
5. `AppChrome` + page shell.
6. `ProfilePanel` with Marko seed + edit mode.
7. `SimulatorPanel` + `MeterCard`.
8. `MentorsPanel`.
9. Wire state + Edge Function calls + loading/toasts.
10. QA the full 3-round flow in the preview.
