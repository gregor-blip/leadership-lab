-- ai_spend is only written by the SECURITY DEFINER function bump_ai_spend
-- and read by trusted server code. No client (anon/authenticated) should
-- touch it directly. Add an explicit deny-all policy so RLS has a policy
-- attached (clears the "RLS enabled, no policy" linter finding) while
-- keeping the table inaccessible to client roles.

REVOKE ALL ON public.ai_spend FROM anon, authenticated;

DROP POLICY IF EXISTS "No client access to ai_spend" ON public.ai_spend;

CREATE POLICY "No client access to ai_spend"
ON public.ai_spend
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
