import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  MENTORS,
  PARTICIPANT,
  EMPTY_STATE,
  type TranscriptEntry,
  type Figure,
  type ConvState,
  type PersonaStatement,
} from "@/lib/simulator-data";
import { getCase, sendTurn, callPersona, synthesize } from "@/lib/simulator-client";
import { Component, type ReactNode } from "react";

// Per-message error boundary: a malformed model payload degrades to an inline
// note instead of blanking the whole app (the root boundary would take the page).
class ItemBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return <p className="kicker px-1 text-ink-mute">A message could not be displayed.</p>;
    return this.props.children;
  }
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IEDC Leadership Lab" },
      {
        name: "description",
        content:
          "A live, AI-powered MBA case experience. One real decision, in conversation with a council of five mentors.",
      },
    ],
  }),
  component: App,
});

type Phase = "gate" | "intro" | "onboarding" | "conversation";

// Offline preview (?preview=1): seed a representative transcript so every card
// type renders without the edge function. Dev/demo aid only; no backend call.
const PREVIEW_CASE = `### The decision
IEDC–Poslovna šola Bled is forty years old and admired. Demand for its flagship executive programmes is softening while cheaper, faster online formats pull from underneath.

1. **Defend the premium.** Hold price and prestige, invest in the residential experience.
2. **Meet the market.** Launch a lower-priced modular online track under the IEDC name.
3. **Split the brand.** Spin a separate digital school so the flagship stays untouched.`;

const PREVIEW_SEED: TranscriptEntry[] = [
  { kind: "participant", text: "Before I decide anything, show me the three-year trend on executive-programme revenue and margin." },
  {
    kind: "facilitator",
    text: "Here is the audited picture for the executive-education line, FY2022 to FY2024. Revenue is roughly flat while the contribution margin has slipped four points, almost entirely from rising delivery cost per participant.\n\n**IEDC cost base, 2024 (€)**\n\n| Line | Amount | % of base |\n|---|---|---|\n| Materials + services | 1,213,648 | 53% |\n| Labour | 851,588 | 37% |\n| Amortization | 105,020 | 5% |\n| Other + financial | 113,016 | 5% |\n| **Total** | **2,283,272** | **100%** |",
    figures: [
      { label: "Exec revenue FY24", value: "€6.41M" },
      { label: "3-yr revenue CAGR", value: "+1.2%" },
      { label: "Contribution margin", value: "47.2%" },
      { label: "Margin vs FY22", value: "−4.1 pts" },
      { label: "Cost / participant", value: "€3,180" },
      { label: "Repeat-client share", value: "38%" },
      { label: "Structural cost gap", value: "~€540k (cost base ~€2.28M vs revenue ~€1.74M)" },
    ],
  },
  { kind: "note", text: "You convene the full council on the three doors." },
  {
    kind: "council",
    id: "disruptor",
    name: "The Disruptor",
    school: "Disruptive innovation & demand",
    text: "Defending the premium is how forty-year-old institutions die comfortably. Door 3 is the only one that meets the threat where it actually lives. Move before someone else names your price for you.",
  },
  {
    kind: "council",
    id: "operator",
    name: "The Operator",
    school: "Execution & capital reality",
    text: "The Disruptor is hand-waving the hard part. On €130k of cash and 14 people:\n\n- **Faculty:** the AI track needs teaching time nobody has freed up.\n- **Cash:** there is no budget line to build it yet.\n- **Timeline:** eighteen months, not next term, or it ships broken.\n\nName the owner and the money first.",
  },
  {
    kind: "council",
    id: "champion",
    name: "The Champion",
    school: "Constructive advocacy",
    text: "The case for door 3 is stronger than the room admits: the finished building, a 97%-backed recap, a board that just added a Harvard scholar and a tech founder. But say it plainly, what makes IEDC *the* school companies trust to implement AI, not one more claimant? Earn that and door 3 holds.",
  },
  {
    kind: "council",
    id: "ethicalChallenger",
    name: "The Ethical Challenger",
    school: "Stakeholder ethics",
    text: "You are all deciding for alumni who paid full price for scarcity. Whatever door you pick, who bears the cost that was not in the room, and would you say it to their faces first?",
  },
  {
    kind: "facilitator",
    text: "The real split: the **Operator** wants the mechanism nailed before the leap; the **Disruptor** says the market will not wait for it. Where do you land, move now and build under fire, or fund the capability first? What would have to be true to do both?",
    figures: [],
  },
];

function App() {
  const [phase, setPhase] = useState<Phase>("gate");
  const [caseText, setCaseText] = useState<string>("");
  const [loadingCase, setLoadingCase] = useState(false);
  const [seed, setSeed] = useState<TranscriptEntry[] | null>(null);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Client-only: ?preview=1 jumps straight to a seeded conversation (skips gate + intro).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("preview") === "1") {
      setCaseText(PREVIEW_CASE);
      setSeed(PREVIEW_SEED);
      setPhase("conversation");
    }
  }, []);

  // The "I'm ready" click is the user gesture that lets the welcome audio play
  // without browser autoplay blocking. Start it here, then reveal the intro.
  function onReady() {
    audioRef.current?.play().catch(() => {});
    setPhase("intro");
  }
  function replayAudio() {
    const a = audioRef.current;
    if (!a) return;
    a.muted = false;
    setMuted(false);
    a.currentTime = 0;
    a.play().catch(() => {});
  }
  function toggleMute() {
    const a = audioRef.current;
    const next = !muted;
    setMuted(next);
    if (a) a.muted = next;
  }

  async function begin() {
    setLoadingCase(true);
    try {
      const { caseText } = await getCase();
      setCaseText(caseText);
      setPhase("conversation");
    } catch (e) {
      toast.error("Couldn't load the case", { description: String((e as any)?.message ?? e) });
    } finally {
      setLoadingCase(false);
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      {/* Audio lives at the root so the gate's click can start it and the intro can control it. */}
      <audio ref={audioRef} src="/audio/intro-welcome.mp3" preload="auto" />

      {phase === "gate" ? (
        <AudioGate onReady={onReady} />
      ) : (
        <div className="relative min-h-[100dvh] bg-paper">
          <div className="relative z-[2] mx-auto max-w-[1200px] px-5 pb-16 pt-7 md:px-10 md:pt-10">
            <Masthead inCase={phase === "conversation"} />
            <main>
              {phase === "intro" ? (
                <IntroPage
                  onBegin={() => setPhase("onboarding")}
                  muted={muted}
                  onReplay={replayAudio}
                  onToggleMute={toggleMute}
                />
              ) : phase === "onboarding" ? (
                <OnboardingBrief loading={loadingCase} onBegin={begin} />
              ) : (
                <Conversation caseText={caseText} seed={seed} />
              )}
            </main>
            <Footer />
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- audio gate + intro (shown before the dashboard) ---------- */

// One calm screen: get the volume up and the click that unlocks audio autoplay.
function AudioGate({ onReady }: { onReady: () => void }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-paper px-6 text-center">
      <div className="reveal kicker mb-7">IEDC · Leadership Lab</div>
      <h1 className="reveal reveal-1 display max-w-[18ch] text-[clamp(34px,6vw,72px)] leading-[1.02] text-ink">
        This experience has <span className="em">sound</span>.
      </h1>
      <p className="reveal reveal-2 mt-6 max-w-[40ch] text-[clamp(15px,2vw,19px)] leading-relaxed text-ink-soft">
        Turn your volume up. There&rsquo;s a short welcome before you begin.
      </p>
      <button onClick={onReady} className="btn btn-primary reveal reveal-3 mt-10">
        I&rsquo;m ready
        <span className="nub" aria-hidden>
          <ArrowIcon />
        </span>
      </button>
    </div>
  );
}

// The welcome page. Reads completely in silence; the voiceover is enhancement.
function IntroPage({
  onBegin,
  muted,
  onReplay,
  onToggleMute,
}: {
  onBegin: () => void;
  muted: boolean;
  onReplay: () => void;
  onToggleMute: () => void;
}) {
  const body = "text-[clamp(16px,1.5vw,18px)] leading-relaxed text-ink-soft";
  return (
    <section className="pb-10 pt-2">
      <div className="reveal flex items-center justify-between gap-4">
        <div className="kicker">A welcome before you begin</div>
        <div className="flex items-center gap-2">
          <button onClick={onReplay} className="btn btn-ghost !px-3 !py-1.5 text-[10px]">
            Replay
          </button>
          <button onClick={onToggleMute} className="btn btn-ghost !px-3 !py-1.5 text-[10px]">
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>
      </div>

      <h1 className="reveal reveal-1 display mt-7 text-[clamp(44px,7vw,96px)] text-ink">Welcome.</h1>

      <div className={`reveal reveal-2 mt-6 max-w-[60ch] space-y-5 ${body}`}>
        <p>
          What you&rsquo;re about to use isn&rsquo;t a presentation. It&rsquo;s a working piece of something
          larger, and I wanted you to <span className="text-ink">feel it</span>, not just hear me describe it.
        </p>
        <p>
          This is the <span className="text-ink">student&rsquo;s layer</span>, one of three. It&rsquo;s the part
          a student touches when a case is no longer paper in a folder, but a living situation they can step
          into, question, and argue with.
        </p>
        <p className="text-ink">It&rsquo;s live. So treat it that way:</p>
      </div>

      <div className="reveal reveal-3 mt-5 max-w-[60ch] bezel">
        <div className="bezel-core divide-y divide-hair">
          <MoveRow n="1" text="Ask it for any number from IEDC's real accounts, and watch it answer." />
          <MoveRow n="2" text="Summon a single mentor when you want one voice." />
          <MoveRow
            n="3"
            text="Convene the whole council on the decision, and watch five of them disagree, with each other, and with you."
          />
        </div>
      </div>

      <div className={`reveal reveal-4 mt-6 max-w-[60ch] space-y-5 ${body}`}>
        <p>
          <span className="text-ink">Don&rsquo;t judge it on polish. Judge it on what it points to.</span> A
          school where learning is immersive. Where a case talks back. Where the experience is the lesson.
        </p>
        <p>
          This is one third of the picture. Behind it sit the school&rsquo;s layer and the professor&rsquo;s
          layer, where teaching itself is reimagined. But that&rsquo;s for later.
        </p>
        <p>
          And it works two ways: alongside students in the classroom, or as the heart of{" "}
          <span className="text-ink">hybrid learning</span>, where the cases they&rsquo;d solve in any class come
          alive online, instead of arriving as paper.
        </p>
      </div>

      <div className="reveal reveal-5 mt-9 flex flex-wrap items-center gap-4 border-t border-rule pt-7">
        <button onClick={onBegin} className="btn btn-primary">
          Begin
          <span className="nub" aria-hidden>
            <ArrowIcon />
          </span>
        </button>
        <span className="kicker">Enter the case</span>
      </div>
    </section>
  );
}

function MoveRow({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <span className="section-num shrink-0 text-[22px] leading-none">{n}</span>
      <span className="text-[clamp(15px,1.6vw,17px)] leading-relaxed text-ink">{text}</span>
    </div>
  );
}

/* ---------- masthead (replaces the toy browser frame) ---------- */

function Masthead({ inCase }: { inCase: boolean }) {
  return (
    <header className="reveal flex items-center justify-between border-b border-rule pb-4">
      <div className="flex items-baseline gap-3">
        <span className="display text-[19px] leading-none text-ink">IEDC</span>
        <span className="hidden h-3 w-px bg-rule sm:block" />
        <span className="kicker hidden sm:inline">Leadership Lab</span>
      </div>
      <div className="flex items-center gap-3">
        {inCase && (
          <span className="kicker hidden items-center gap-2 md:inline-flex">
            <span className="now-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-line" />
            Live session
          </span>
        )}
        <ParticipantBadge />
      </div>
    </header>
  );
}

// The logged-in student this case is assigned to. Monogram, not a flag emoji.
function ParticipantBadge() {
  const initials = PARTICIPANT.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-full border border-rule bg-card text-[11px] font-medium tracking-tight text-ink"
      >
        {initials}
      </span>
      <div className="hidden leading-tight sm:block">
        <div className="text-[13px] font-medium tracking-tight text-ink">{PARTICIPANT.name}</div>
        <div className="kicker text-[9.5px]">Logged in · {PARTICIPANT.country}</div>
      </div>
    </div>
  );
}

/* ---------- onboarding brief (static, no AI call) ---------- */

function OnboardingBrief({ loading, onBegin }: { loading: boolean; onBegin: () => void }) {
  return (
    <section>
      {/* hero */}
      <div className="relative pb-12 pt-10 md:pt-16">
        <div className="reveal reveal-1 kicker mb-6">A live, AI-powered case experience</div>
        <h1 className="reveal reveal-2 display max-w-[14ch] text-[clamp(44px,7vw,104px)] text-ink">
          A live case, <span className="em">in conversation.</span>
        </h1>
        <p className="reveal reveal-3 tagline mt-6 max-w-[34ch] text-[clamp(19px,2.4vw,30px)] leading-[1.32] text-ink-soft">
          Not a quiz. An intelligence you talk to, command, and argue with.
        </p>
        <span className="section-num pointer-events-none absolute -top-2 right-0 hidden select-none text-[clamp(90px,11vw,170px)] opacity-40 lg:block">
          00
        </span>
      </div>

      <div className="border-t border-rule" />

      {/* the brief */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-10 pt-12 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="kicker mb-4">
            <span className="text-gold-line">01</span> &nbsp;/&nbsp; The brief
          </div>
          <h2 className="display text-[clamp(30px,3.6vw,52px)] text-ink">
            You sit in the <span className="em">president&rsquo;s seat</span> at IEDC.
          </h2>
          <p className="mt-5 max-w-[42ch] text-[16px] leading-relaxed text-ink-soft">
            One real decision, incomplete information, and a council that will not agree with you. There is no
            score and no right answer. The conversation is the product.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-3 md:gap-8">
          <BriefPoint n="01" title="A real situation">
            As close to a live executive moment as it gets. Talk freely, in your own words. The intelligence
            understands you.
          </BriefPoint>
          <BriefPoint n="02" title="Ask for the data">
            You don&rsquo;t hold every number, so ask for it. Any metric, any analysis. The old skill was
            doing the math; the new one is knowing what to ask.
          </BriefPoint>
          <BriefPoint n="03" title="You are not alone">
            You command a council of five. Their names are their personalities. They will disagree, with you
            and with each other. This is life, not software.
          </BriefPoint>
        </div>
      </div>

      {/* council roster */}
      <div className="mt-14">
        <div className="mb-4 flex items-end justify-between">
          <div className="kicker">
            <span className="text-gold-line">02</span> &nbsp;/&nbsp; Your council
          </div>
          <div className="kicker hidden text-ink-mute sm:block">Summoned on demand, never automatic</div>
        </div>
        <div className="bezel">
          <div className="bezel-core grid grid-cols-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-5">
            {MENTORS.map((m, i) => (
              <MentorCell key={m.id} mentor={m} index={i} last={i === MENTORS.length - 1} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 flex flex-col items-start gap-6 border-t border-rule pt-8 sm:flex-row sm:items-center sm:justify-between">
        <span className="kicker max-w-[44ch]">No score · no right answer · the conversation is the point</span>
        <button onClick={onBegin} disabled={loading} className="btn btn-primary">
          {loading ? "Loading the case" : "Begin the case"}
          <span className="nub" aria-hidden>
            <ArrowIcon />
          </span>
        </button>
      </div>
    </section>
  );
}

function BriefPoint({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="section-num text-[clamp(40px,4vw,58px)] opacity-90">{n}</div>
      <h3 className="mt-2 text-[17px] font-medium tracking-tight text-ink">{title}</h3>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

function MentorCell({ mentor, index, last }: { mentor: (typeof MENTORS)[number]; index: number; last: boolean }) {
  const accent = mentor.id === "ethicalChallenger";
  return (
    <div
      className={`reveal reveal-${Math.min(index + 1, 5)} flex flex-col p-5 ${
        !last ? "border-b border-hair sm:border-b lg:border-b-0 lg:border-r" : ""
      } ${index % 2 === 0 ? "sm:border-r sm:border-hair" : ""}`}
    >
      {/* fixed-height label + name rows so all five align regardless of wrap */}
      <div className="kicker min-h-[24px] text-[9.5px] leading-tight">{mentor.school}</div>
      <div className="mt-2 flex min-h-[44px] items-start gap-2">
        {accent && <span className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />}
        <span className="serif text-[18px] leading-[1.15] tracking-tight text-ink">{mentor.name}</span>
      </div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">{mentor.blurb}</p>
    </div>
  );
}

/* ---------- conversation ---------- */

function Conversation({ caseText, seed }: { caseText: string; seed?: TranscriptEntry[] | null }) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(seed ?? []);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [caseOpen, setCaseOpen] = useState(!(seed && seed.length)); // open to read first; collapsed when pre-seeded
  const [convState, setConvState] = useState<ConvState>(EMPTY_STATE); // distilled shared state, injected into personas
  const sentRef = useRef<HTMLDivElement | null>(null);

  // On send, bring the participant's just-sent message to the top so it is
  // immediately visible with room for the reply to stream in below it (standard
  // chat behavior). We only re-anchor when the participant just sent; replies and
  // council cards then flow in below the anchored message, never hiding it.
  useEffect(() => {
    const last = transcript[transcript.length - 1];
    if (last?.kind !== "participant") return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    sentRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [transcript]);

  async function runTurn(text: string) {
    if (!text || thinking) return;
    const snapshot = transcript; // history = turns BEFORE this message
    if (snapshot.length === 0) setCaseOpen(false); // collapse the case once we start
    const withParticipant: TranscriptEntry[] = [...snapshot, { kind: "participant", text }];
    setTranscript(withParticipant);
    setInput("");
    setThinking(true);
    try {
      const res = await sendTurn(text, snapshot, convState);
      let running: TranscriptEntry[] = [...withParticipant];
      if (res.reply?.text)
        running = [...running, { kind: "facilitator", text: res.reply.text, figures: res.reply.figures ?? [] }];
      if (res.note) running = [...running, { kind: "note", text: res.note }];
      setTranscript(running);
      const nextState = res.state ?? convState;
      if (res.state) setConvState(res.state);
      const ids = res.summon?.ids ?? [];
      if (res.summon && res.summon.mode !== "none" && ids.length) {
        await runCouncil(ids, text, running, nextState);
      }
    } catch (e) {
      toast.error("Couldn't get a reply", { description: String((e as any)?.message ?? e) });
    } finally {
      setThinking(false);
    }
  }

  // Run the summoned mentors one at a time so each SEES the prior statements and
  // genuinely responds. Cards render as each call lands (progressive, not a spinner
  // wall). A full council (more than one) gets a closing facilitator synthesis.
  async function runCouncil(
    ids: string[],
    participantMessage: string,
    baseTranscript: TranscriptEntry[],
    state: ConvState
  ) {
    const priors: PersonaStatement[] = [];
    let running = baseTranscript;
    for (const id of ids) {
      try {
        const stmt = await callPersona({
          personaId: id,
          message: participantMessage,
          transcript: baseTranscript,
          state,
          priorStatements: priors,
        });
        if (!stmt?.id) continue;
        priors.push(stmt);
        running = [
          ...running,
          { kind: "council", id: stmt.id, name: stmt.name, school: stmt.school, text: stmt.message },
        ];
        setTranscript(running);
      } catch (e) {
        toast.error("A mentor didn't make it in", { description: String((e as any)?.message ?? e) });
      }
    }
    if (priors.length > 1) {
      try {
        const syn = await synthesize({ transcript: baseTranscript, state, statements: priors });
        if (syn?.text) {
          running = [...running, { kind: "facilitator", text: syn.text, figures: [] }];
          setTranscript(running);
        }
      } catch {
        // synthesis is a nice-to-have; never fail the whole council on it
      }
    }
  }

  function send() {
    runTurn(input.trim());
  }

  // "Convene the council" — the facilitator asks who the participant wants to
  // hear from. No backend call; the participant then names them in plain
  // language and the orchestrator returns exactly those mentors.
  function convene() {
    if (thinking) return;
    setTranscript((t) => [
      ...t,
      {
        kind: "facilitator",
        text: "Who would you like to hear from, one of them, a few, or the full council? Name them and I'll bring them in.",
        figures: [],
      },
    ]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="pt-8">
      {/* CASE — collapsible bar on top; expand any time to re-read it */}
      <CaseBar open={caseOpen} onToggle={() => setCaseOpen((o) => !o)} caseText={caseText} />

      {/* CONVERSATION — full width, owns the screen */}
      <section className="mt-8">
        <div className="flex items-end justify-between border-b border-rule pb-3">
          <div className="kicker">
            <span className="text-gold-line">03</span> &nbsp;/&nbsp; The conversation
          </div>
          <div className="kicker hidden text-ink-mute sm:block">Talk freely · ask · decide · convene</div>
        </div>

        <div className="mx-auto max-w-[820px] space-y-5 py-7">
          {transcript.length === 0 && !thinking && <EmptyState />}
          {transcript.map((e, i) => {
            const anchor = i === transcript.length - 1 && e.kind === "participant";
            return (
              <ItemBoundary key={i}>
                <div ref={anchor ? sentRef : undefined} className="scroll-mt-6">
                  <TranscriptItem entry={e} index={i} />
                </div>
              </ItemBoundary>
            );
          })}
          {thinking && <Thinking />}
        </div>

        <Composer
          input={input}
          setInput={setInput}
          onSend={send}
          onKeyDown={onKeyDown}
          onConvene={convene}
          thinking={thinking}
        />
      </section>
    </div>
  );
}

// The case as a collapsible bar at the top of the conversation.
function CaseBar({ open, onToggle, caseText }: { open: boolean; onToggle: () => void; caseText: string }) {
  return (
    <div className="bezel">
      <div className="bezel-core overflow-hidden">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors duration-200 hover:bg-gold-wash/50"
        >
          <span className="kicker kicker-ink flex items-center gap-2.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-line" />
            The case · IEDC–Poslovna šola Bled
          </span>
          <span className="kicker flex items-center gap-2">
            {open ? "Hide" : "Read the case"}
            <Chevron open={open} />
          </span>
        </button>
        {open && (
          <div className="scroll-quiet max-h-[56vh] overflow-y-auto border-t border-hair px-6 py-7">
            <div className="mx-auto max-w-[680px]">
              <CaseText text={caseText} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="reveal py-6 text-center">
      <p className="display text-[clamp(26px,3.4vw,40px)] text-ink">The floor is yours.</p>
      <p className="mx-auto mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
        Read the case above, then respond in your own words. You&rsquo;ll get one direct reply, like a real
        conversation. Ask for any number or analysis, or state a direction. When you want pushback,{" "}
        <span className="text-ink">summon the council</span> below, or just say so.
      </p>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-2.5 px-1 text-ink-mute">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-gold-line/70 [animation:nowpulse_1.2s_ease-in-out_infinite]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gold-line/70 [animation:nowpulse_1.2s_ease-in-out_infinite_0.2s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gold-line/70 [animation:nowpulse_1.2s_ease-in-out_infinite_0.4s]" />
      </span>
      <span className="kicker">Thinking…</span>
    </div>
  );
}

function TranscriptItem({ entry, index }: { entry: TranscriptEntry; index: number }) {
  if (entry.kind === "participant") {
    return (
      <div className="reveal ml-auto w-fit max-w-[86%] rounded-[10px] border border-rule bg-paper-2 px-4 py-3">
        <div className="kicker mb-1.5">You · in the president&rsquo;s seat</div>
        <p className="text-[16px] leading-relaxed text-ink">{entry.text}</p>
      </div>
    );
  }
  if (entry.kind === "note") {
    return <p className="reveal tagline px-2 py-1 text-center text-[15px] text-ink-mute">{entry.text}</p>;
  }
  if (entry.kind === "facilitator") {
    return <ReplyCard text={entry.text} figures={entry.figures} />;
  }
  // council
  const accent = entry.id === "ethicalChallenger";
  return (
    <article className={`reveal reveal-${Math.min((index % 5) + 1, 5)} panel`}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2">
          {accent && <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />}
          <span className="serif text-[20px] tracking-tight text-ink">{entry.name}</span>
        </div>
        <div className="kicker shrink-0 text-[9.5px]">{entry.school}</div>
      </div>
      <div className="my-3 h-px w-9" style={{ background: accent ? "var(--gold-line)" : "var(--rule)" }} />
      <Markdown text={entry.text} />
    </article>
  );
}

// The single default voice. When it cites fact-sheet numbers it becomes the
// distinct gold "Analyst" exhibit with a figure strip (Peak 1); otherwise it
// reads as a lighter "Facilitator" reply.
function ReplyCard({ text, figures }: { text: string; figures: Figure[] }) {
  const figs = Array.isArray(figures) ? figures : [];
  const data = figs.length > 0;

  if (!data) {
    return (
      <article className="reveal max-w-[62ch]">
        <div className="kicker mb-2 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-line" />
          Facilitator
        </div>
        <Markdown text={text} />
      </article>
    );
  }

  return (
    <article className="reveal bezel bezel-gold">
      <div className="bezel-core p-5 md:p-6">
        <div className="kicker kicker-ink flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-gold" />
          Analyst · from the audited fact-sheet
        </div>
        <div className="mt-3.5">
          <Markdown text={text} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-gold-line/25 pt-5 sm:grid-cols-3">
          {figs.map((f, i) => {
            const { head, caption } = splitFigure(f.value);
            const size =
              head.length > 14
                ? "text-[clamp(16px,1.9vw,22px)]"
                : head.length > 9
                  ? "text-[clamp(20px,2.4vw,28px)]"
                  : "text-[clamp(24px,3vw,34px)]";
            return (
              <div key={i} className="min-w-0">
                <div className="kicker text-[9.5px] leading-tight">{String(f.label ?? "")}</div>
                <div className={`numeral mt-1.5 ${size} font-medium leading-[1.06] text-ink [text-wrap:balance]`}>
                  {head}
                </div>
                {caption && <div className="mt-1 text-[11px] leading-snug text-ink-mute">{caption}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function Composer({
  input,
  setInput,
  onSend,
  onKeyDown,
  onConvene,
  thinking,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onConvene: () => void;
  thinking: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-[3] -mx-1 bg-paper/92 px-1 pb-2 pt-4 backdrop-blur-sm">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <button onClick={onConvene} disabled={thinking} className="btn btn-ghost text-[11px]">
          <CouncilIcon />
          Convene the council
        </button>
        <span className="kicker hidden sm:inline">One voice by default · you choose who weighs in</span>
      </div>

      <div className="bezel">
        <div className="bezel-core">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Ask for a number, state a direction, or talk it through…"
            className="w-full resize-none bg-transparent px-4 pb-2 pt-3.5 text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-mute"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <span className="kicker text-[9.5px]">Enter to send · Shift+Enter for a new line</span>
            <button onClick={onSend} disabled={thinking || !input.trim()} className="btn btn-primary !py-2 !pl-5 !pr-2">
              {thinking ? "Sending" : "Send"}
              <span className="nub !h-7 !w-7" aria-hidden>
                <ArrowIcon />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
      <span className="kicker max-w-[60ch] leading-relaxed">
        A live case, in conversation. Adversarial mentors grounded in distinct schools of thought, not real
        individuals.
      </span>
      <span className="kicker text-ink-mute">IEDC · Bled</span>
    </footer>
  );
}

/* ---------- inline icons (ultra-light, emoji-free) ---------- */

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 11L11 3M11 3H5M11 3V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      className="text-ink transition-transform duration-300"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CouncilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="3.2" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="10.8" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="7" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.4 5.2L6 8.6M9.6 5.2L8 8.6M4.7 4H9.3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- lightweight markdown renderer for the case text ---------- */

function CaseText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = (key: string) => {
    if (!list.length) return;
    out.push(
      <ol key={key} className="mt-3 space-y-3">
        {list.map((item, i) => (
          <li key={i} className="flex gap-4 text-[16px] leading-relaxed text-ink md:text-[17px]">
            <span className="section-num shrink-0 text-[22px] leading-none">{i + 1}</span>
            <span className="serif">{renderInline(item.replace(/^\d+\.\s*/, ""))}</span>
          </li>
        ))}
      </ol>
    );
    list = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^\d+\.\s/.test(line)) {
      list.push(line);
      return;
    }
    flushList(`ol-${i}`);
    if (!line.trim()) return;
    if (line.startsWith("### ")) {
      out.push(
        <h3 key={i} className="kicker mt-7 first:mt-0">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("---")) {
      out.push(<div key={i} className="my-6 h-px bg-rule" />);
    } else {
      out.push(
        <p key={i} className="serif mt-3.5 text-[16px] leading-relaxed text-ink md:text-[17.5px]">
          {renderInline(line)}
        </p>
      );
    }
  });
  flushList("ol-end");
  return <div>{out}</div>;
}

// A figure's `value` should be a short headline number. If the model returns a
// long value with an explanation in parentheses, split it so the big numeral
// stays a number and the rest drops to a small caption below.
function splitFigure(value: unknown): { head: string; caption?: string } {
  const v = String(value ?? "").trim();
  const m = v.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
  if (m && m[1].trim()) return { head: m[1].trim(), caption: m[2].trim() };
  return { head: v };
}

function renderInline(text: string): React.ReactNode {
  const tokens = text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (!tok) return null;
    if ((tok.startsWith("**") && tok.endsWith("**")) || (tok.startsWith("__") && tok.endsWith("__"))) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`")) {
      return (
        <code key={i} className="numeral bg-paper-2 px-1 py-0.5 text-[0.9em]">
          {tok.slice(1, -1)}
        </code>
      );
    }
    if ((tok.startsWith("*") && tok.endsWith("*")) || (tok.startsWith("_") && tok.endsWith("_"))) {
      return (
        <em key={i} className="serif italic">
          {tok.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

// Does a cell read as a number (so it should right-align with tabular figures)?
function isNum(s: string): boolean {
  const t = String(s ?? "").trim().replace(/\*\*/g, "");
  if (!t) return false;
  return /^[~≈]?\s*[+\-(]?\s*[€$£]?\s*\d[\d.,\s]*\s*[%€$£kKmMbBn)]*$/.test(t);
}

// Styled GFM table, matched to the Analyst-exhibit look: mono kicker header with
// a gold underline, hairline rows, numeric columns right-aligned in tabular mono,
// padded for projector legibility, and horizontally scrollable as a safety net.
function MdTable({ header, rows }: { header: string[]; rows: string[][] }) {
  const cols = header.length;
  const numeric = Array.from({ length: cols }, (_, c) => {
    const vals = rows.map((r) => (r[c] ?? "").trim()).filter(Boolean);
    return vals.length > 0 && vals.every((v) => isNum(v));
  });
  return (
    <div className="my-3.5 overflow-x-auto">
      <table className="w-full border-collapse text-[15px] md:text-[16px]">
        <thead>
          <tr className="border-b border-gold-line/40">
            {header.map((h, c) => (
              <th
                key={c}
                className={`kicker px-3 py-2 align-bottom text-[10px] ${numeric[c] ? "text-right" : "text-left"}`}
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-hair last:border-b-0">
              {Array.from({ length: cols }, (_, c) => (
                <td
                  key={c}
                  className={`px-3 py-2 align-top text-ink ${
                    numeric[c] ? "numeral text-right tabular-nums" : "text-left"
                  }`}
                >
                  {renderInline(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Lightweight markdown for AI message bodies (Facilitator / Analyst / council):
   paragraphs, bullet + numbered lists, headings as bold, inline bold/italic/code.
   Carried over from PR #5 (projector short-form output) and styled to the gold
   system so the model's markdown renders instead of showing raw asterisks. */
function Markdown({ text }: { text: string }) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const body = "text-[16px] leading-relaxed text-ink md:text-[17px]";

  const flushPara = (k: string) => {
    if (!para.length) return;
    blocks.push(
      <p key={k} className={`${body} [&:not(:first-child)]:mt-2.5`}>
        {renderInline(para.join(" "))}
      </p>
    );
    para = [];
  };
  const flushList = (k: string) => {
    if (!list) return;
    const L = list;
    blocks.push(
      <ul key={k} className="mt-2.5 space-y-2 [&:not(:first-child)]:mt-3">
        {L.items.map((it, i) => (
          <li key={i} className={`flex gap-3 ${body}`}>
            <span className="shrink-0 select-none text-gold-line">
              {L.ordered ? (
                <span className="numeral text-[0.92em]">{i + 1}</span>
              ) : (
                <span className="inline-block translate-y-[0.14em] text-[0.65em]">●</span>
              )}
            </span>
            <span>{renderInline(it)}</span>
          </li>
        ))}
      </ul>
    );
    list = null;
  };

  const isRow = (s: string) => /^\|.*\|$/.test(s);
  const isDelim = (s: string) => /^\|?[\s:|-]+\|?$/.test(s) && s.includes("-");
  const toCells = (s: string) => s.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // GitHub-flavored markdown table: a header row, a |---| delimiter, then body rows.
    if (isRow(line) && i + 1 < lines.length && isDelim(lines[i + 1].trim())) {
      flushPara(`p${i}`);
      flushList(`l${i}`);
      const header = toCells(line);
      let j = i + 2;
      const trows: string[][] = [];
      while (j < lines.length && isRow(lines[j].trim())) {
        trows.push(toCells(lines[j].trim()));
        j++;
      }
      blocks.push(<MdTable key={`t${i}`} header={header} rows={trows} />);
      i = j - 1;
      continue;
    }

    const ul = line.match(/^[-*+]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ul) {
      flushPara(`p${i}`);
      if (!list || list.ordered) {
        flushList(`l${i}`);
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
    } else if (ol) {
      flushPara(`p${i}`);
      if (!list || !list.ordered) {
        flushList(`l${i}`);
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
    } else if (!line) {
      flushPara(`p${i}`);
      flushList(`l${i}`);
    } else {
      flushList(`l${i}`);
      const h = line.match(/^#{1,6}\s+(.*)$/);
      para.push(h ? `**${h[1]}**` : line);
    }
  }
  flushPara("pend");
  flushList("lend");

  return <div>{blocks}</div>;
}
