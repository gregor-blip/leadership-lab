import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

type Mode = "signin" | "signup";

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
        <span className="kicker text-ink-mute">Loading…</span>
      </div>
    );
  }

  if (!session) return <SignInScreen />;

  return (
    <>
      {children}
      <SignOutBadge email={session.user.email ?? ""} />
    </>
  );
}

function SignOutBadge({ email }: { email: string }) {
  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-md border border-rule bg-card/90 px-3 py-1.5 text-[11px] shadow-sm backdrop-blur">
      <span className="text-ink-mute">{email}</span>
      <button
        onClick={() => supabase.auth.signOut()}
        className="text-ink underline-offset-2 hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}

function SignInScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if ((res as any)?.error) throw (res as any).error;
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 text-center">
          <div className="display text-[22px] leading-none text-ink">IEDC</div>
          <div className="kicker mt-2">Leadership Lab · Concept prototype</div>
        </div>
        <div className="rounded-lg border border-rule bg-card p-6 shadow-sm">
          <h1 className="text-lg font-medium tracking-tight text-ink">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-[13px] text-ink-mute">
            Required to launch the simulator.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={onGoogle}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-rule bg-paper px-3 py-2 text-sm font-medium text-ink transition hover:bg-card disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-mute">
            <span className="h-px flex-1 bg-rule" />
            or
            <span className="h-px flex-1 bg-rule" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="kicker">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="kicker">Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-[12px] text-ink-mute hover:text-ink"
          >
            {mode === "signin"
              ? "No account? Create one."
              : "Have an account? Sign in."}
          </button>
        </div>
      </div>
    </div>
  );
}
