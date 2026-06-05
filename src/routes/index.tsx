import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  DEFAULT_PROFILE,
  PSY_LABELS,
  MENTORS,
  METERS,
  CONSENT_LINE,
  TOTAL_ROUNDS,
  clamp,
  type Profile,
  type Scenario,
  type Reaction,
  type Wrapup,
  type MeterState,
  type MeterPayload,
  type HistoryEntry,
} from "@/lib/simulator-data";
import { generateScenario, resolveDecision, generateWrapup } from "@/lib/simulator-client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Leadership Lab — a simulator with a view" },
      {
        name: "description",
        content:
          "A live, personalized executive-leadership simulator. Every scenario, consequence, and mentor reaction is generated for one specific learner.",
      },
    ],
  }),
  component: Simulator,
});

type Phase = "intro" | "deciding" | "resolved" | "wrapup";
type Loading = null | "scenario" | "resolve" | "wrapup";

/* ---------- helpers ---------- */

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function useAnimatedNumber(target: number, duration = 650) {
  const [val, setVal] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      ref.current = target;
      setVal(target);
      return;
    }
    const from = ref.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setVal(Math.round(from + (target - from) * easeOut(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function metersFromScenario(s: Scenario): MeterState[] {
  return METERS.map((def) => {
    const p = s.meters?.find((x) => x.key === def.key);
    return {
      key: def.key,
      label: def.label,
      value: clamp(p?.value ?? 50),
      reason: p?.reason ?? "",
    };
  });
}

function applyDeltas(prev: MeterState[], payload: MeterPayload[]): MeterState[] {
  return prev.map((m) => {
    const p = payload.find((x) => x.key === m.key);
    if (!p) return m;
    return { ...m, value: clamp(m.value + (p.delta ?? 0)), reason: p.reason ?? m.reason };
  });
}

/* ---------- root ---------- */

function Simulator() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(1);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [meters, setMeters] = useState<MeterState[]>([]);
  const [decision, setDecision] = useState("");
  const [consequence, setConsequence] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Reaction[] | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [wrap, setWrap] = useState<Wrapup | null>(null);
  const [loading, setLoading] = useState<Loading>(null);
  const [profileDirty, setProfileDirty] = useState(false);

  function fail(e: unknown) {
    const msg = String((e as any)?.message ?? e);
    toast.error("Generation failed", { description: msg });
  }

  async function startRun(p: Profile = profile) {
    setLoading("scenario");
    setPhase("deciding");
    setScenario(null);
    setConsequence(null);
    setReactions(null);
    setWrap(null);
    setDecision("");
    setRound(1);
    setHistory([]);
    setProfileDirty(false);
    try {
      const s = await generateScenario({ profile: p, round: 1 });
      setScenario(s);
      setMeters(metersFromScenario(s));
    } catch (e) {
      fail(e);
      setPhase("intro");
    } finally {
      setLoading(null);
    }
  }

  // Live re-generation: rebuild the CURRENT round from the (edited) profile.
  async function regenerateCurrent() {
    setLoading("scenario");
    setScenario(null);
    setConsequence(null);
    setReactions(null);
    setDecision("");
    setProfileDirty(false);
    try {
      const s = await generateScenario({
        profile,
        round,
        history,
        meters: round > 1 ? meters : undefined,
      });
      setScenario(s);
      if (round === 1) setMeters(metersFromScenario(s));
      setPhase("deciding");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(null);
    }
  }

  async function commitDecision() {
    if (!scenario || !decision.trim()) return;
    setLoading("resolve");
    try {
      const res = await resolveDecision({ profile, scenario, decision: decision.trim(), meters });
      setMeters((prev) => applyDeltas(prev, res.meters));
      setConsequence(res.consequence);
      setReactions(res.reactions);
      setHistory((h) => [...h, { scenario, decision: decision.trim(), consequence: res.consequence }]);
      setPhase("resolved");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(null);
    }
  }

  async function advance() {
    if (round >= TOTAL_ROUNDS) {
      setLoading("wrapup");
      try {
        const w = await generateWrapup({ profile, history, meters });
        setWrap(w);
        setPhase("wrapup");
      } catch (e) {
        fail(e);
      } finally {
        setLoading(null);
      }
      return;
    }
    const next = round + 1;
    setLoading("scenario");
    setConsequence(null);
    setReactions(null);
    setDecision("");
    setScenario(null);
    try {
      const s = await generateScenario({ profile, round: next, history, meters });
      setRound(next);
      setScenario(s);
      setPhase("deciding");
    } catch (e) {
      fail(e);
    } finally {
      setLoading(null);
    }
  }

  function resetRun() {
    setPhase("intro");
    setRound(1);
    setScenario(null);
    setMeters([]);
    setDecision("");
    setConsequence(null);
    setReactions(null);
    setHistory([]);
    setWrap(null);
    setProfileDirty(false);
  }

  function saveProfile(p: Profile) {
    setProfile(p);
    if (phase !== "intro") setProfileDirty(true);
  }

  return (
    <div className="min-h-screen bg-paper">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-[1320px] px-6 py-8 md:px-10 md:py-10">
        <AppChrome>
          <Header />
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <ProfilePanel profile={profile} onSave={saveProfile} />
            <main className="lg:col-span-9 lg:border-l hairline border-t lg:border-t-0">
              {meters.length > 0 && <MetersRow meters={meters} />}

              {phase === "intro" ? (
                <IntroBlock loading={loading === "scenario"} onStart={() => startRun()} />
              ) : phase === "wrapup" ? (
                <WrapupBlock wrap={wrap} loading={loading === "wrapup"} onReset={resetRun} />
              ) : (
                <>
                  <ScenarioBlock
                    scenario={scenario}
                    round={round}
                    loading={loading === "scenario"}
                    phase={phase}
                    decision={decision}
                    setDecision={setDecision}
                    onCommit={commitDecision}
                    committing={loading === "resolve"}
                    profileDirty={profileDirty}
                    onRegenerate={regenerateCurrent}
                  />
                  {(consequence || loading === "resolve") && (
                    <ConsequenceBlock consequence={consequence} loading={loading === "resolve"} />
                  )}
                  <MentorsPanel
                    reactions={reactions}
                    loading={loading === "resolve"}
                    resolved={phase === "resolved"}
                  />
                  {phase === "resolved" && (
                    <AdvanceBar
                      round={round}
                      loading={loading === "wrapup" || loading === "scenario"}
                      onAdvance={advance}
                    />
                  )}
                </>
              )}
            </main>
          </div>
        </AppChrome>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="kicker">
            Grounded in distinct schools of management thought — adversarial sparring partners, not real individuals.
          </span>
          <button onClick={resetRun} className="kicker hover:text-ink hover:opacity-100">
            ↺ Reset run
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------- chrome + header ---------- */

function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="border hairline bg-card shadow-[0_40px_90px_-50px_rgba(60,40,10,0.35)]">
      <div className="flex items-center justify-between border-b hairline px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.88_0.01_80)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.88_0.01_80)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.88_0.01_80)]" />
        </div>
        <div className="kicker">leadership lab — concept prototype</div>
        <div className="w-12" />
      </div>
      <div className="p-5 md:p-9">{children}</div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-4 border-b hairline pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="kicker">Executive Simulator / 02</div>
        <h1 className="mt-2 text-[40px] font-medium leading-[0.95] tracking-tight md:text-[46px]">
          Leadership Lab
        </h1>
        <div className="tagline mt-3 text-lg text-ink/80">
          A simulator with a view — every scenario written for one leader.
        </div>
      </div>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <span className="kicker border hairline px-2.5 py-1.5">Concept prototype</span>
        <div className="numeral text-sm text-muted-foreground">
          {new Date().toISOString().slice(0, 10)}
        </div>
      </div>
    </header>
  );
}

/* ---------- profile ---------- */

function ProfilePanel({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);

  useEffect(() => {
    if (!editing) setDraft(profile);
  }, [profile, editing]);

  const p = profile.professional;

  return (
    <aside className="lg:col-span-3 lg:pr-6 lg:pt-6 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="kicker">Learner / 01</div>
          <h2 className="mt-1 text-2xl tracking-tight">Profile</h2>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                onSave(draft);
                setEditing(false);
                toast.success("Profile updated", {
                  description: "It will shape the next generated scenario.",
                });
              }}
              className="bg-electric px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink"
            >
              Save
            </button>
            <button
              onClick={() => {
                setDraft(profile);
                setEditing(false);
              }}
              className="border hairline px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="border hairline px-3 py-1.5 text-xs uppercase tracking-wider hover:bg-ink hover:text-paper"
          >
            Edit
          </button>
        )}
      </div>

      <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
        <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 bg-electric" />
        {CONSENT_LINE}
      </p>

      <Section label="Professional">
        {editing ? (
          <div className="space-y-2.5">
            <EditRow k="Region" v={draft.professional.region} onChange={(v) => setDraft({ ...draft, professional: { ...draft.professional, region: v } })} />
            <EditRow k="Age" type="number" v={String(draft.professional.age)} onChange={(v) => setDraft({ ...draft, professional: { ...draft.professional, age: Number(v) || 0 } })} />
            <EditRow k="Company" v={draft.professional.companyType} onChange={(v) => setDraft({ ...draft, professional: { ...draft.professional, companyType: v } })} />
            <EditRow k="Sector" v={draft.professional.sector} onChange={(v) => setDraft({ ...draft, professional: { ...draft.professional, sector: v } })} />
            <EditRow k="Role" v={draft.professional.role} onChange={(v) => setDraft({ ...draft, professional: { ...draft.professional, role: v } })} />
            <EditRow k="Experience" type="number" v={String(draft.professional.yearsExperience)} onChange={(v) => setDraft({ ...draft, professional: { ...draft.professional, yearsExperience: Number(v) || 0 } })} />
            <EditRow k="Ambition" v={draft.professional.ambition} onChange={(v) => setDraft({ ...draft, professional: { ...draft.professional, ambition: v } })} />
            <div>
              <div className="kicker mb-1">Situation</div>
              <textarea
                value={draft.professional.situation}
                onChange={(e) => setDraft({ ...draft, professional: { ...draft.professional, situation: e.target.value } })}
                className="w-full border hairline bg-paper p-2 text-xs leading-relaxed outline-none focus:border-ink"
                rows={5}
              />
            </div>
          </div>
        ) : (
          <>
            <Row k="Region" v={p.region} />
            <Row k="Age" v={String(p.age)} mono />
            <Row k="Company" v={p.companyType} />
            <Row k="Sector" v={p.sector} />
            <Row k="Role" v={p.role} />
            <Row k="Experience" v={`${p.yearsExperience} yrs`} mono />
            <Row k="Ambition" v={p.ambition} />
            <div className="pt-2">
              <div className="kicker mb-1">Situation</div>
              <p className="text-xs leading-relaxed text-muted-foreground">{p.situation}</p>
            </div>
          </>
        )}
      </Section>

      <Section label="Psychological">
        {(Object.keys(profile.psychological) as (keyof Profile["psychological"])[]).map((k) =>
          editing ? (
            <SliderBar
              key={k}
              k={k}
              v={draft.psychological[k]}
              onChange={(v) => setDraft({ ...draft, psychological: { ...draft.psychological, [k]: v } })}
            />
          ) : (
            <Bar key={k} k={k} v={profile.psychological[k]} />
          )
        )}
      </Section>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <div className="mb-3 flex items-center justify-between border-b hairline pb-2">
        <span className="kicker">{label}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className={mono ? "numeral" : "text-right"}>{v}</span>
    </div>
  );
}

function EditRow({
  k,
  v,
  onChange,
  type = "text",
}: {
  k: string;
  v: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <input
        type={type}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className="w-[62%] border hairline bg-paper px-2 py-1 text-right text-sm outline-none focus:border-ink"
      />
    </label>
  );
}

function psyLabel(k: keyof Profile["psychological"]) {
  return k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

function Bar({ k, v }: { k: keyof Profile["psychological"]; v: number }) {
  const [lo, hi] = PSY_LABELS[k];
  return (
    <div className="pt-1">
      <div className="flex items-baseline justify-between text-[11px]">
        <span>{psyLabel(k)}</span>
        <span className="numeral text-muted-foreground">{v}</span>
      </div>
      <div className="relative mt-1 h-1.5 bg-secondary">
        <div className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-500 ease-out" style={{ width: `${v}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  );
}

function SliderBar({
  k,
  v,
  onChange,
}: {
  k: keyof Profile["psychological"];
  v: number;
  onChange: (v: number) => void;
}) {
  const [lo, hi] = PSY_LABELS[k];
  return (
    <div className="pt-1">
      <div className="flex items-baseline justify-between text-[11px]">
        <span>{psyLabel(k)}</span>
        <span className="numeral text-muted-foreground">{v}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-1.5 w-full cursor-pointer accent-[var(--electric)]"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  );
}

/* ---------- meters ---------- */

function MetersRow({ meters }: { meters: MeterState[] }) {
  return (
    <div className="grid grid-cols-2 border-b hairline lg:grid-cols-4">
      {meters.map((m, i) => (
        <MeterCard key={m.key} m={m} last={i === meters.length - 1} />
      ))}
    </div>
  );
}

function MeterCard({ m, last }: { m: MeterState; last: boolean }) {
  const shown = useAnimatedNumber(m.value);
  return (
    <div className={`p-4 ${last ? "" : "border-r hairline"} border-b hairline lg:border-b-0`}>
      <div className="kicker text-[9.5px]">{m.label}</div>
      <div className="numeral mt-1.5 text-[44px] font-medium leading-none md:text-[52px]">{shown}</div>
      <div className="relative mt-2.5 h-[3px] bg-secondary">
        <div
          className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-700 ease-out"
          style={{ width: `${m.value}%` }}
        />
      </div>
      {m.reason && <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{m.reason}</p>}
    </div>
  );
}

/* ---------- intro ---------- */

function IntroBlock({ loading, onStart }: { loading: boolean; onStart: () => void }) {
  return (
    <section className="px-6 py-10 md:px-8">
      <div className="grid grid-cols-12 items-end gap-6">
        <div className="numeral col-span-12 text-[88px] leading-none text-ink md:col-span-3 md:text-[120px]">00</div>
        <div className="col-span-12 md:col-span-7">
          <p className="text-base leading-relaxed text-muted-foreground">
            A live, AI-powered leadership simulator. Every scenario, consequence, and mentor reaction is
            generated for <span className="tagline text-ink">one specific learner</span> — conditioned on who
            they are, how they think, and what they're chasing. Edit the profile and the next scenario changes.
          </p>
          <button
            onClick={onStart}
            disabled={loading}
            className="mt-6 bg-electric px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Generating…" : "Begin simulation →"}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- scenario + decision ---------- */

function ScenarioBlock({
  scenario,
  round,
  loading,
  phase,
  decision,
  setDecision,
  onCommit,
  committing,
  profileDirty,
  onRegenerate,
}: {
  scenario: Scenario | null;
  round: number;
  loading: boolean;
  phase: Phase;
  decision: string;
  setDecision: (v: string) => void;
  onCommit: () => void;
  committing: boolean;
  profileDirty: boolean;
  onRegenerate: () => void;
}) {
  const locked = phase === "resolved";
  return (
    <section className="border-b hairline px-6 py-7 md:px-8">
      <div className="flex items-end justify-between gap-4 border-b hairline pb-4">
        <div>
          <div className="kicker">
            Decision point · Round {round} / {TOTAL_ROUNDS}
          </div>
          <h2 className="mt-1.5 text-2xl tracking-tight md:text-3xl">
            {scenario ? scenario.title : loading ? "Generating…" : "Awaiting brief"}
          </h2>
        </div>
      </div>

      {profileDirty && !loading && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--electric)] bg-[oklch(0.95_0.05_85)] px-4 py-3">
          <span className="text-sm">Profile changed — regenerate this scenario to see the effect.</span>
          <button onClick={onRegenerate} className="bg-electric px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink">
            Regenerate ↻
          </button>
        </div>
      )}

      {loading && <ScenarioSkeleton />}

      {scenario && !loading && (
        <div className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-12">
          <div className="space-y-4 md:col-span-8">
            <p className="text-[15px] leading-relaxed">{scenario.context}</p>
            <p className="text-[15px] font-medium leading-relaxed">{scenario.dilemma}</p>
          </div>
          <div className="md:col-span-4 md:border-l hairline md:pl-5">
            <div className="kicker mb-2">At stake</div>
            <ul className="space-y-2 text-sm">
              {scenario.stakes.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="numeral text-muted-foreground">0{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {!locked && (
            <div className="md:col-span-12">
              <div className="kicker mb-2">Your move — write it in your own words</div>
              <textarea
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                placeholder="Type how you respond, in your own words…"
                rows={3}
                className="w-full border hairline bg-paper p-3.5 text-[15px] leading-relaxed outline-none focus:border-ink"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {scenario.suggestedMoves?.map((mv, i) => (
                  <button
                    key={i}
                    onClick={() => setDecision(mv.description)}
                    className="max-w-xs border hairline px-3 py-2 text-left transition-colors hover:border-ink"
                  >
                    <span className="block text-xs font-semibold">{mv.label}</span>
                    <span className="text-[11px] text-muted-foreground">{mv.description}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="kicker">Free text is primary · suggested moves just seed it</span>
                <button
                  onClick={onCommit}
                  disabled={committing || !decision.trim()}
                  className="bg-electric px-6 py-3 text-sm font-semibold uppercase tracking-wider text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {committing ? "Resolving…" : "Commit decision →"}
                </button>
              </div>
            </div>
          )}

          {locked && (
            <div className="md:col-span-12 border-t hairline pt-4">
              <div className="kicker mb-1.5">Your decision</div>
              <p className="text-sm italic text-muted-foreground">"{decision}"</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ScenarioSkeleton() {
  return (
    <div className="space-y-3 pt-6">
      <div className="h-4 w-3/4 animate-pulse bg-secondary" />
      <div className="h-4 w-full animate-pulse bg-secondary" />
      <div className="h-4 w-2/3 animate-pulse bg-secondary" />
    </div>
  );
}

/* ---------- consequence ---------- */

function ConsequenceBlock({ consequence, loading }: { consequence: string | null; loading: boolean }) {
  return (
    <section className="border-b hairline px-6 py-7 md:px-8">
      <div className="kicker mb-3">What happened</div>
      {loading && !consequence ? (
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse bg-secondary" />
          <div className="h-4 w-5/6 animate-pulse bg-secondary" />
        </div>
      ) : (
        <p className="animate-in fade-in slide-in-from-bottom-2 duration-500 text-[15px] leading-relaxed">
          {consequence}
        </p>
      )}
    </section>
  );
}

/* ---------- mentors ---------- */

function MentorsPanel({
  reactions,
  loading,
  resolved,
}: {
  reactions: Reaction[] | null;
  loading: boolean;
  resolved: boolean;
}) {
  if (!resolved && !loading) return null;
  return (
    <section className="px-6 py-7 md:px-8">
      <div className="flex items-end justify-between gap-4 border-b hairline pb-4">
        <div>
          <div className="kicker">Mentors / 03</div>
          <h2 className="mt-1.5 text-2xl tracking-tight md:text-3xl">Five voices react</h2>
        </div>
        <div className="kicker max-w-xs text-right">
          Distinct schools of thought — adversarial sparring partners, not real individuals.
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 border hairline md:grid-cols-2">
        {MENTORS.map((m, i) => {
          const r = reactions?.find((x) => x.id === m.id);
          const accent = m.id === "ethicalChallenger";
          return (
            <article
              key={m.id}
              className={`p-5 md:p-6 ${i % 2 === 0 ? "md:border-r hairline" : ""} ${i < MENTORS.length - (MENTORS.length % 2 === 0 ? 2 : 1) ? "border-b hairline" : ""} ${
                r ? "animate-in fade-in slide-in-from-bottom-2" : ""
              }`}
              style={r ? { animationDuration: "500ms", animationDelay: `${i * 70}ms`, animationFillMode: "both" } : undefined}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="kicker">{m.school}</div>
                  <div className="mt-1 text-lg tracking-tight">
                    {accent && <span className="mr-1.5 text-electric">●</span>}
                    {m.name}
                  </div>
                </div>
                <span className="numeral text-xl text-muted-foreground">0{i + 1}</span>
              </div>

              {r ? (
                <>
                  <div className="my-3.5 h-0.5 w-7" style={{ background: accent ? "var(--electric)" : "var(--rule)" }} />
                  <p className="text-[15px] font-semibold leading-snug">{r.headline}</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{r.critique}</p>
                  <p className="tagline mt-3.5 border-t hairline pt-3 text-sm">{r.probe}</p>
                </>
              ) : (
                <div className="mt-5 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse bg-secondary" />
                  <div className="h-3 w-full animate-pulse bg-secondary" />
                  <div className="h-3 w-2/3 animate-pulse bg-secondary" />
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- advance + wrap-up ---------- */

function AdvanceBar({ round, loading, onAdvance }: { round: number; loading: boolean; onAdvance: () => void }) {
  const last = round >= TOTAL_ROUNDS;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t hairline px-6 py-5 md:px-8">
      <span className="kicker">
        {last ? "Run complete — review the debrief" : `Round ${round} resolved · ${TOTAL_ROUNDS - round} to go`}
      </span>
      <button
        onClick={onAdvance}
        disabled={loading}
        className="border hairline px-5 py-3 text-sm font-medium uppercase tracking-wider transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
      >
        {loading ? "Generating…" : last ? "See wrap-up →" : "Next decision →"}
      </button>
    </div>
  );
}

function WrapupBlock({ wrap, loading, onReset }: { wrap: Wrapup | null; loading: boolean; onReset: () => void }) {
  return (
    <section className="px-6 py-8 md:px-8">
      <div className="kicker">Debrief / 04</div>
      {loading || !wrap ? (
        <div className="mt-3 space-y-3">
          <div className="h-8 w-2/3 animate-pulse bg-secondary" />
          <div className="h-4 w-full animate-pulse bg-secondary" />
          <div className="h-4 w-5/6 animate-pulse bg-secondary" />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h2 className="mt-2 text-3xl tracking-tight md:text-4xl">{wrap.title}</h2>
          <p className="tagline mt-4 max-w-2xl text-lg leading-relaxed text-ink/85">{wrap.summary}</p>
          <div className="mt-7 grid grid-cols-1 gap-0 border hairline md:grid-cols-3">
            {wrap.takeaways?.map((t, i) => (
              <div key={i} className={`p-5 ${i < wrap.takeaways.length - 1 ? "border-b hairline md:border-b-0 md:border-r" : ""}`}>
                <div className="numeral text-3xl text-electric">0{i + 1}</div>
                <p className="mt-2 text-sm leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
          <button
            onClick={onReset}
            className="mt-7 border hairline px-5 py-3 text-sm font-medium uppercase tracking-wider transition-colors hover:bg-ink hover:text-paper"
          >
            ↺ Reset run
          </button>
        </div>
      )}
    </section>
  );
}
