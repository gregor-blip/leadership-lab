import { useState } from "react";
import { DEFAULT_PROFILE, PSY_LABELS, type Profile, type Scenario, type Reaction, MENTORS } from "@/lib/simulator-data";
import { generateScenario, generateReactions } from "@/lib/simulator-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Leadership Simulator" },
      { name: "description", content: "Adversarial sparring partners for leadership decisions, grounded in distinct schools of management thought." },
    ],
  }),
  component: Simulator,
});

function Simulator() {
  const [profile] = useState<Profile>(DEFAULT_PROFILE);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [choice, setChoice] = useState<Scenario["options"][number] | null>(null);
  const [reactions, setReactions] = useState<Reaction[] | null>(null);
  const [loading, setLoading] = useState<"none" | "scenario" | "react">("none");
  const [error, setError] = useState<string | null>(null);

  async function newScenario() {
    setError(null);
    setReactions(null);
    setChoice(null);
    setLoading("scenario");
    try { setScenario(await generateScenario(profile)); }
    catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setLoading("none"); }
  }

  async function submitChoice(opt: Scenario["options"][number]) {
    if (!scenario) return;
    setChoice(opt);
    setReactions(null);
    setError(null);
    setLoading("react");
    try { setReactions((await generateReactions(profile, scenario, opt)).reactions); }
    catch (e: any) { setError(String(e?.message ?? e)); }
    finally { setLoading("none"); }
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-[1400px] px-10 py-10">
        <DeviceChrome>
          {/* Header */}
          <header className="grid grid-cols-12 border-b hairline pb-6">
            <div className="col-span-8">
              <div className="kicker">Studio / 001</div>
              <h1 className="mt-3 text-[44px] leading-[0.95] font-medium tracking-tight">
                AI Leadership Simulator
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Adversarial sparring partners, not real individuals. Each mentor speaks from a distinct school of management thought.
              </p>
            </div>
            <div className="col-span-4 flex flex-col items-end justify-end">
              <div className="kicker">Session</div>
              <div className="numeral text-[44px] leading-none">{new Date().toISOString().slice(0, 10)}</div>
            </div>
          </header>

          {/* Body */}
          <div className="grid grid-cols-12 gap-0">
            <ProfilePanel profile={profile} />
            <main className="col-span-9 border-l hairline">
              <ScenarioBlock
                scenario={scenario}
                loading={loading === "scenario"}
                onGenerate={newScenario}
                choice={choice}
                onChoose={submitChoice}
              />
              <MentorBlock reactions={reactions} loading={loading === "react"} hasChoice={!!choice} />
              {error && (
                <div className="border-t hairline p-6 text-sm text-destructive">
                  Error: {error}
                </div>
              )}
            </main>
          </div>
        </DeviceChrome>

        <footer className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
          <span className="kicker">Grounded in distinct schools of management thought — adversarial sparring partners, not real individuals.</span>
          <span className="numeral">v0.1</span>
        </footer>
      </div>
    </div>
  );
}

function DeviceChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="border hairline bg-card shadow-[0_1px_0_0_var(--rule),0_40px_80px_-40px_rgba(0,0,0,0.15)]">
      <div className="flex items-center justify-between border-b hairline px-5 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.86_0.005_270)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.86_0.005_270)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.86_0.005_270)]" />
        </div>
        <div className="kicker">simulator.local / studio</div>
        <div className="w-12" />
      </div>
      <div className="p-10">{children}</div>
    </div>
  );
}

function ProfilePanel({ profile }: { profile: Profile }) {
  const p = profile.professional;
  return (
    <aside className="col-span-3 pr-6 pt-6">
      <div className="kicker">Learner / 01</div>
      <h2 className="mt-2 text-2xl tracking-tight">Profile</h2>

      <Section label="Professional">
        <Row k="Region" v={p.region} />
        <Row k="Age" v={String(p.age)} mono />
        <Row k="Company" v={p.companyType} />
        <Row k="Sector" v={p.sector} />
        <Row k="Role" v={p.role} />
        <Row k="Experience" v={`${p.yearsExperience} yrs`} mono />
        <Row k="Ambition" v={p.ambition} />
      </Section>

      <Section label="Psychological">
        {(Object.keys(profile.psychological) as (keyof Profile["psychological"])[]).map((k) => (
          <Bar key={k} k={k} v={profile.psychological[k]} />
        ))}
      </Section>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
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
      <span className="text-muted-foreground">{k}</span>
      <span className={mono ? "numeral" : "text-right"}>{v}</span>
    </div>
  );
}

function Bar({ k, v }: { k: keyof Profile["psychological"]; v: number }) {
  const [lo, hi] = PSY_LABELS[k];
  const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
  return (
    <div className="pt-1">
      <div className="flex items-baseline justify-between text-[11px]">
        <span>{label}</span>
        <span className="numeral text-muted-foreground">{v}</span>
      </div>
      <div className="mt-1 h-px w-full bg-[var(--rule)]" />
      <div className="relative h-1.5">
        <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${v}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  );
}

function ScenarioBlock({
  scenario, loading, onGenerate, choice, onChoose,
}: {
  scenario: Scenario | null;
  loading: boolean;
  onGenerate: () => void;
  choice: Scenario["options"][number] | null;
  onChoose: (o: Scenario["options"][number]) => void;
}) {
  return (
    <section className="px-8 py-8">
      <div className="flex items-end justify-between border-b hairline pb-4">
        <div>
          <div className="kicker">Scenario / 02</div>
          <h2 className="mt-2 text-3xl tracking-tight">
            {scenario ? scenario.title : "Awaiting brief"}
          </h2>
        </div>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="border hairline px-5 py-3 text-sm font-medium uppercase tracking-wider hover:bg-ink hover:text-paper disabled:opacity-40 transition-colors"
        >
          {loading ? "Generating…" : scenario ? "New scenario" : "Generate scenario"}
        </button>
      </div>

      {!scenario && !loading && (
        <div className="grid grid-cols-12 gap-6 py-12">
          <div className="col-span-2 numeral text-[120px] leading-none text-ink">00</div>
          <p className="col-span-7 self-end text-base text-muted-foreground">
            Generate a leadership dilemma calibrated to your profile. Choose a path. Receive four critiques.
          </p>
        </div>
      )}

      {scenario && (
        <div className="grid grid-cols-12 gap-6 pt-6">
          <div className="col-span-2 numeral text-[96px] leading-none">01</div>
          <div className="col-span-7 space-y-4">
            <p className="text-[15px] leading-relaxed">{scenario.context}</p>
            <p className="text-[15px] leading-relaxed font-medium">{scenario.dilemma}</p>
          </div>
          <div className="col-span-3 border-l hairline pl-4">
            <div className="kicker mb-2">At stake</div>
            <ul className="space-y-1.5 text-sm">
              {scenario.stakes.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="numeral text-muted-foreground">0{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 mt-4 border-t hairline pt-6">
            <div className="kicker mb-3">Decision</div>
            <div className="grid grid-cols-3 gap-0 border hairline">
              {scenario.options.map((o, i) => {
                const sel = choice?.id === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => onChoose(o)}
                    className={`relative text-left p-5 border-r hairline last:border-r-0 transition-colors ${
                      sel ? "bg-ink text-paper" : "hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="numeral text-2xl">0{i + 1}</span>
                      <span className="kicker" style={{ color: sel ? "var(--paper)" : undefined }}>
                        Option {o.id}
                      </span>
                    </div>
                    <div className="mt-3 text-base font-medium">{o.label}</div>
                    <div className={`mt-1.5 text-sm ${sel ? "" : "text-muted-foreground"}`}>{o.description}</div>
                    {sel && <div className="absolute right-3 top-3 h-2 w-2 bg-electric" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function MentorBlock({
  reactions, loading, hasChoice,
}: { reactions: Reaction[] | null; loading: boolean; hasChoice: boolean }) {
  return (
    <section className="border-t hairline px-8 py-8">
      <div className="flex items-end justify-between border-b hairline pb-4">
        <div>
          <div className="kicker">Mentors / 03</div>
          <h2 className="mt-2 text-3xl tracking-tight">Adversarial critique</h2>
        </div>
        <div className="kicker max-w-xs text-right">
          Four voices, four schools of thought
        </div>
      </div>

      {!hasChoice && !loading && (
        <p className="py-10 text-sm text-muted-foreground">Choose an option above to summon the mentors.</p>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-0 border hairline mt-6">
          {MENTORS.map((m) => (
            <div key={m.id} className="border-r border-b hairline p-6 last:border-r-0 even:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
              <div className="kicker">{m.school}</div>
              <div className="mt-2 text-xl">{m.name}</div>
              <div className="mt-4 h-3 w-3/4 bg-secondary animate-pulse" />
              <div className="mt-2 h-3 w-full bg-secondary animate-pulse" />
              <div className="mt-2 h-3 w-2/3 bg-secondary animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {reactions && (
        <div className="grid grid-cols-2 gap-0 border hairline mt-6">
          {MENTORS.map((m, i) => {
            const r = reactions.find((x) => x.id === m.id);
            if (!r) return null;
            return (
              <article key={m.id} className={`relative p-6 ${i % 2 === 0 ? "border-r hairline" : ""} ${i < 2 ? "border-b hairline" : ""}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="kicker">{m.school}</div>
                    <div className="mt-1 text-xl tracking-tight">{m.name}</div>
                  </div>
                  <span className="numeral text-2xl text-muted-foreground">0{i + 1}</span>
                </div>
                <div className="mt-4 h-px bg-electric w-8" />
                <p className="mt-4 text-base font-medium leading-snug">{r.headline}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.critique}</p>
                <div className="mt-4 border-t hairline pt-3">
                  <span className="kicker">Probe</span>
                  <p className="mt-1 text-sm italic">{r.probe}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
