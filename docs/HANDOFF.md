# IEDC Leadership Lab — Session Handoff

_Last updated: 2026-06-05. Written for a fresh (ideally local) Claude Code session that can read the Obsidian design/tech-stack notes._

---

## 1. What this is

**IEDC Leadership Lab** — a live, AI-powered MBA case experience, demoed Monday to the leadership of **IEDC–Poslovna šola Bled** (a 40-year European business school). It is the **student-facing layer only** (a future three-layer product also has professor-authoring + school psychometric-intake layers — **do not build those**).

One fixed case, run as a **live Socratic conversation**:
- A single **Facilitator/Analyst** voice answers by default (one question → one reply).
- The Analyst answers financial/analytical questions **only** from a hardcoded fact-sheet (never invents numbers) — this is **Peak 1**.
- A **council of five discipline mentors** is **summoned on demand** (button or natural language); when the full council is called on the three-door decision they must **genuinely disagree** — this is **Peak 2**.
- No score, no meters, no right answer. The conversation is the product.

The logged-in student is **Marko Novaković** (Serbia) — _who is doing_ the case; the in-case participant sits in the **president's seat at IEDC** (not a character named Marko).

---

## 2. Tech stack

- **Frontend:** React 19 + TypeScript + **TanStack Start** (file-based routing, SSR) + **Tailwind v4** + shadcn/ui. Build: **Vite**. Package manager: **bun**. (Scaffolded by Lovable.)
- **Backend:** Supabase Edge Function `simulator` (Deno) — all AI generation runs here. Frontend calls it via `supabase.functions.invoke("simulator", …)`.
- **AI:** Anthropic Claude, model string **`claude-sonnet-4-6`**, called from inside the Edge Function. `ANTHROPIC_API_KEY` lives **only** as a Supabase Edge Function secret (read via `Deno.env.get`). It is **never** in the repo, frontend, or client bundle. `.env` holds only the Supabase URL + **publishable/anon** key (public-safe).
- **State:** in-memory in the client (no DB persistence).
- **Hosting/deploy:** Lovable Cloud manages Supabase + deploys. Lovable two-way syncs GitHub `main`.

---

## 3. Repo & branch state

Repo: `gregor-blip/leadership-lab`

- **`main`** — current shipped app. Merged PRs #1–#4:
  - #1 pivot to IEDC case conversation (analyst + council)
  - #2 council on-demand (single-voice default, summon) + schema `analyst → reply`
  - #3 single "Convene the council" button + Marko participant identity
  - #4 full-width conversation + collapsible case bar
- **`claude/elegant-tesla-akZHy`** — has everything on `main` PLUS one **unmerged** commit:
  - `585964e` — an "institutional-luxury" visual redesign (Fraunces + Hanken fonts, gold "Analyst exhibit", grain/atmosphere). **Parked, NOT approved.** The plan is to **redesign to the Obsidian spec instead**, so treat `585964e` as a discardable reference, not a baseline.

> If redesigning fresh: branch from `main`, ignore `585964e` (or cherry-pick only if useful).

---

## 4. Key files

```
src/routes/index.tsx              # the whole UI (onboarding + conversation)
src/lib/simulator-data.ts         # types, MENTORS (5), PARTICIPANT (Marko), transcript + toHistory()
src/lib/simulator-client.ts       # getCase(), sendTurn(message, transcript, summon?)
src/styles.css                    # design tokens (IEDC gold/charcoal/cream), fonts, motion
src/routes/__root.tsx             # root shell
supabase/functions/simulator/index.ts   # Edge Function (case + turn actions)
supabase/config.toml              # verify_jwt = false
```

---

## 5. Edge Function contract (`supabase/functions/simulator/index.ts`)

Actions (POST body `{ action, … }`):

- **`case`** → `{ caseText }`. **No AI call** (bulletproof). The case markdown is hardcoded as `CASE_TEXT`.
- **`turn`** → input `{ message, history, summon? }`; returns:
  ```json
  {
    "reply":   { "text": "single facilitator/analyst voice (always present)",
                 "figures": [ { "label": "...", "value": "..." } ] },
    "council": [ { "id", "name", "school", "message" } ],   // [] unless summoned
    "note":    "stage line, e.g. who was summoned/silenced; '' if none"
  }
  ```
  - `summon`: `"auto"` (1–2 relevant) · `"all"` (full council, must clash) · `<mentorId>` (just that one). Omitted ⇒ council only speaks on natural-language intent in `message`.
  - **Single orchestrated Claude call** (not one per mentor) so mentors can disagree _with each other_ and react to summon/silence.
  - `history` is a flat list `[{ role: "participant" | "facilitator" | "council", name?, text }]` (built by `toHistory()`; note entries are display-only and excluded).

**Hardcoded server-side (do not move client-side, do not let the model invent figures):**
- `CASE_TEXT` — the displayed case.
- `FACT_SHEET` — authoritative audited financials (FY2022–24), cost structure, the three doors, pre-computed analytical reads. Analyst answers ONLY from this.
- `SHARED_PREAMBLE` + `MENTOR_PROMPTS` (disruptor / operator / contrarian / systemsThinker / ethicalChallenger) — **verbatim, intentional; do not reword.**

**Behavioral rules baked into the prompt — preserve these in any change:**
1. **Fact-sheet integrity (Peak 1):** if asked for a figure not on the sheet (marketing budget, cost per student, etc.), say it's not available — never fabricate.
2. **Council disagreement (Peak 2):** full council on the three doors must rebut each other by name and split on how fast / what to sacrifice — not five agreeable paragraphs.
3. Real people (Omazić, Purg, Orešković) = factual roles only; never role-play as them or invent quotes. Mentors are archetypes, never real people.

---

## 6. Design language (current)

- IEDC palette: warm **cream** surface, **charcoal-brown** ink, **golden-yellow** accent (gold = the live AI/data layer), hairline rules, serif-italic for editorial voice.
- Tokens in `src/styles.css` (`--paper`, `--ink`, `--gold`, `--rule`, etc.).
- **Projector legibility is non-negotiable** — it runs on a projector Monday; large, readable from the back of a room.
- Respect `prefers-reduced-motion`.
- **➡ TODO (the reason for the new session): redesign the conversation UI to the spec in the Obsidian vault** (tech stack + design system). The current/parked designs were not accepted.

---

## 7. Outstanding / gotchas

- **⚠️ `simulator` Edge Function redeploy is the open gate.** Lovable synced the council-on-demand code to `main` but the deployed function went **stale** (same issue happened before). Until Lovable **redeploys** it, a plain "hello" still fires the old always-on council. Verify after redeploy: `"hello"` → one **Facilitator** reply + empty council; Convene → name a mentor → only that one speaks.
- **Deploy mechanics:** Lovable deploys edge functions when changed _inside_ Lovable; a GitHub→main sync does NOT reliably redeploy them. Ask Lovable explicitly to redeploy `simulator`.
- **This cloud session could not deploy or test the function:** Supabase MCP had no permission on the project, and outbound network to `*.supabase.co` is not on the egress allowlist (`Host not in allowlist`). A **local** session / the Lovable UI / Supabase dashboard can.
- **Verify the deployed function from a non-restricted machine:**
  ```bash
  ANON="<VITE_SUPABASE_PUBLISHABLE_KEY from .env>"
  curl -s -X POST "https://yuzgsakabajftcveqcka.supabase.co/functions/v1/simulator" \
    -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "content-type: application/json" \
    -d '{"action":"turn","message":"hello","history":[]}' | jq
  ```
  New function ⇒ response has `"reply"` + `"council": []`. Old ⇒ has `"analyst"` / non-empty council.
- **Lovable also edits this repo** (two-way sync on `main`). Do meaningful work on a branch; merge deliberately. Never rename/delete the repo (breaks Lovable sync).

---

## 8. Run & verify locally

```bash
bun install
bun run dev        # vite dev
```
Env (`.env`, already present): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. The live `turn`/`case` calls hit the deployed Supabase function (needs `ANTHROPIC_API_KEY` secret set there).

Scripted demo path to keep working: read case → ask 3-yr financial trend (Peak 1) → state a direction → Convene full council on the three doors (Peak 2: they clash) → overrule one → commit.

---

## 9. Suggested first prompt for the new (local) session

> Read my Obsidian note `<path/title>` for the IEDC Leadership Lab tech stack + design system. Repo is `gregor-blip/leadership-lab`. `main` is the current app; branch `claude/elegant-tesla-akZHy` has an unmerged redesign (`585964e`) — ignore it. Rebuild the conversation UI to the Obsidian spec. Frontend only; keep the Edge Function behavior (Facilitator default, council-on-demand, fact-sheet lock, the verbatim mentor prompts) and projector legibility. Also: get Lovable to redeploy the `simulator` edge function (it's stale).
