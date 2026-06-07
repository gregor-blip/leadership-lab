CREATE TABLE public.ai_spend (
  id smallint PRIMARY KEY DEFAULT 1,
  total_micro_eur bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_spend_single_row CHECK (id = 1)
);

GRANT ALL ON public.ai_spend TO service_role;

ALTER TABLE public.ai_spend ENABLE ROW LEVEL SECURITY;

-- No policies => no access for anon/authenticated. service_role bypasses RLS.

INSERT INTO public.ai_spend (id, total_micro_eur) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.bump_ai_spend(amount_micro bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total bigint;
BEGIN
  UPDATE public.ai_spend
     SET total_micro_eur = total_micro_eur + GREATEST(amount_micro, 0),
         updated_at = now()
   WHERE id = 1
  RETURNING total_micro_eur INTO new_total;
  RETURN new_total;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_ai_spend(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_ai_spend(bigint) TO service_role;