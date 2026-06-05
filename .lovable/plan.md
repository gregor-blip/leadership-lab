## Diagnosis

The runtime error is NOT a code bug and NOT a missing secret. It's a stale deployment.

- Network log: `POST /functions/v1/simulator` with `{"action":"case"}` → `400 {"error":"unknown action"}`.
- Workspace source (`supabase/functions/simulator/index.ts`, 318 lines, post–PR #1) handles `case` and `turn` actions and contains the new `CASE_TEXT` / `FACT_SHEET` (IEDC, Omažić, Lake Bled).
- Deployed function is still the pre-merge version that only knows `scenario` / `resolve` / `wrapup`.
- `ANTHROPIC_API_KEY` is present in project secrets (verified via `fetch_secrets`); Edge Function secrets are project-scoped, so the key will be available to the redeployed function automatically — no secret action required.

## Action (Supabase ops only — no code edits)

1. Call `supabase--deploy_edge_functions` with `function_names: ["simulator"]` to push the current workspace `supabase/functions/simulator/index.ts` to Supabase.
2. Verify with `supabase--curl_edge_functions`:
   - `POST /simulator` body `{"action":"case"}` → expect 200 with `caseText` field populated from the new `CASE_TEXT`.
   - `POST /simulator` body `{"action":"turn", ...minimal valid turn payload...}` → expect 200 with a model-generated turn response (this also confirms `ANTHROPIC_API_KEY` is live end-to-end).
3. If either verification fails, pull `supabase--edge_function_logs` for `simulator` and report the actual stack trace before touching anything else. No code in the repo will be modified under any circumstance.

## Out of scope

- No edits to `supabase/functions/simulator/index.ts` or any other repo file.
- No changes to secrets (already set).
- No frontend changes — the client is already sending the correct `{"action":"case"}` shape.