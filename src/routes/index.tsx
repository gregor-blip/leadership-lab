import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { MENTORS, PARTICIPANT, type TranscriptEntry, type Figure } from "@/lib/simulator-data";
import { getCase, sendTurn } from "@/lib/simulator-client";

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

type Phase = "onboarding" | "conversation";

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function App() {
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [caseText, setCaseText] = useState<string>("");
  const [loadingCase, setLoadingCase] = useState(false);

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
    <div className="relative min-h-screen">
      {/* grain atmosphere */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
        aria-hidden
      />
      <Toaster position="top-right" />
      <div className="relative z-10 mx-auto max-w-[1200px] px-4 py-7 md:px-8 md:py-12">
        <AppFrame>
          <Header />
          {phase === "onboarding" ? (
            <OnboardingBrief loading={loadingCase} onBegin={begin} />
          ) : (
            <Conversation caseText={caseText} />
          )}
        </AppFrame>
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <span className="kicker">
            Adversarial mentors grounded in distinct schools of thought — not real individuals.
          </span>
          <span className="kicker">IEDC · Bled · MMXXVI</span>
        </footer>
      </div>
    </div>
  );
}

/* ---------- frame + masthead ---------- */

function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rise border border-rule-strong bg-card shadow-[0_30px_90px_-45px_rgba(70,50,20,0.30)]">
      <div className="flex items-center justify-between border-b hairline px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 bg-gold" />
          <span className="kicker text-ink">IEDC Leadership Lab</span>
        </div>
        <span className="kicker">Concept prototype</span>
      </div>
      <div className="p-5 md:p-10">{children}</div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-6 border-b border-rule-strong pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="kicker">Executive Case Studio</span>
          <span className="h-px w-12 bg-gold" />
        </div>
        <h1 className="display mt-4 text-[42px] font-normal leading-[0.95] tracking-[-0.02em] text-ink md:text-[58px]">
          A live case,
          <br />
          <span className="tagline">in conversation.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft md:text-base">
          Not a quiz — an institutional intelligence you talk to, command, and argue with.
        </p>
      </div>
      <ParticipantBadge />
    </header>
  );
}

// A real, recognizable Serbian tricolour (no emoji that degrades to "RS").
function SerbianFlag() {
  return (
    <svg
      width="28"
      height="20"
      viewBox="0 0 28 20"
      className="block shrink-0"
      role="img"
      aria-label="Serbia"
    >
      <rect width="28" height="20" rx="2.5" fill="#0C4076" />
      <rect width="28" height="6.67" y="0" fill="#C6363C" />
      <rect width="28" height="6.66" y="13.34" fill="#F4F1EA" />
      <rect x="0.5" y="0.5" width="27" height="19" rx="2" fill="none" stroke="rgba(40,30,10,0.20)" />
    </svg>
  );
}

// The logged-in student this case is assigned to — a real product account chip.
function ParticipantBadge() {
  return (
    <div className="rise flex shrink-0 items-center gap-3 border border-rule bg-paper-2/50 px-3.5 py-2.5">
      <SerbianFlag />
      <div className="leading-tight">
        <div className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{PARTICIPANT.name}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          <span className="kicker text-[9px]">Logged in · {PARTICIPANT.country}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- onboarding brief (static, no AI call) ---------- */

function OnboardingBrief({ loading, onBegin }: { loading: boolean; onBegin: () => void }) {
  return (
    <section className="pt-8">
      <div className="kicker">The brief · 00</div>
      <h2 className="tagline mt-3 max-w-3xl text-[26px] leading-[1.2] text-ink md:text-[34px]">
        You sit in the president's seat at IEDC.
      </h2>

      <div className="mt-9 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-3">
        <BriefPoint n="01" title="A real situation" delay={80}>
          As close to a real executive situation as it gets. A real decision, with incomplete
          information. Talk freely, in your own words — the intelligence understands you.
        </BriefPoint>
        <BriefPoint n="02" title="Ask for the data" delay={160}>
          You don't have all the numbers — so ask. Any metric, any analysis: ask, and it runs.
          You no longer calculate; you command. The new skill is knowing what to ask.
        </BriefPoint>
        <BriefPoint n="03" title="You are not alone" delay={240}>
          A council of five mentors. Their names are their personalities. They disagree — with you and
          each other. Summon them, push them, or tell one to stay quiet. This is life, not software.
        </BriefPoint>
      </div>

      <div className="mt-10 border-t hairline pt-7">
        <div className="flex items-center gap-3">
          <span className="kicker text-ink">Your council</span>
          <span className="h-px flex-1 bg-rule" />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-0 border border-rule sm:grid-cols-2 lg:grid-cols-5">
          {MENTORS.map((m, i) => (
            <div
              key={m.id}
              className={`rise p-5 ${i < MENTORS.length - 1 ? "border-b hairline lg:border-b-0 lg:border-r" : ""} ${
                i % 2 === 0 ? "sm:border-r hairline" : ""
              } lg:border-r`}
              style={{ animationDelay: `${300 + i * 70}ms` }}
            >
              <div className="kicker text-[9px]">{m.school}</div>
              <div className="display mt-2 text-[19px] font-medium tracking-[-0.01em] text-ink">
                {m.id === "ethicalChallenger" && <span className="mr-1.5 text-gold-deep">◆</span>}
                {m.name}
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-soft">{m.blurb}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
        <span className="kicker">No score · no right answer · the conversation is the point</span>
        <button
          onClick={onBegin}
          disabled={loading}
          className="bg-gold px-8 py-4 text-[12px] font-bold uppercase tracking-[0.14em] text-ink transition-all hover:brightness-[1.04] disabled:opacity-40"
        >
          {loading ? "Loading case…" : "Begin →"}
        </button>
      </div>
    </section>
  );
}

function BriefPoint({
  n,
  title,
  children,
  delay,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <div className="rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="numeral text-[40px] leading-none text-gold-deep">{n}</div>
      <h3 className="display mt-3 text-[19px] font-medium tracking-[-0.01em] text-ink">{title}</h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

/* ---------- conversation: collapsible case bar on top + full-width chat ---------- */

function Conversation({ caseText }: { caseText: string }) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [caseOpen, setCaseOpen] = useState(true); // open to read first; auto-collapses on first turn
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [transcript, thinking]);

  async function runTurn(text: string) {
    if (!text || thinking) return;
    const snapshot = transcript; // history = turns BEFORE this message
    if (snapshot.length === 0) setCaseOpen(false); // collapse the case once we start
    setTranscript((t) => [...t, { kind: "participant", text }]);
    setInput("");
    setThinking(true);
    try {
      const res = await sendTurn(text, snapshot);
      const additions: TranscriptEntry[] = [];
      if (res.reply?.text)
        additions.push({ kind: "facilitator", text: res.reply.text, figures: res.reply.figures ?? [] });
      if (res.note) additions.push({ kind: "note", text: res.note });
      for (const c of res.council ?? [])
        additions.push({ kind: "council", id: c.id, name: c.name, school: c.school, text: c.message });
      setTranscript((t) => [...t, ...additions]);
    } catch (e) {
      toast.error("The room went quiet", { description: String((e as any)?.message ?? e) });
    } finally {
      setThinking(false);
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
        text: "Who would you like to hear from — one of them, a few, or the full council? Name them and I'll bring them in.",
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
    <div className="pt-7">
      <CaseBar open={caseOpen} onToggle={() => setCaseOpen((o) => !o)} caseText={caseText} />

      <section className="mt-7">
        <div className="flex items-center gap-3 border-b border-rule-strong pb-3">
          <span className="kicker text-ink">The conversation · 02</span>
          <span className="h-px flex-1 bg-rule" />
          <span className="kicker">ask · decide · convene</span>
        </div>

        <div className="space-y-5 py-6">
          {transcript.length === 0 && !thinking && <EmptyState />}
          {transcript.map((e, i) => (
            <TranscriptItem key={i} entry={e} index={i} />
          ))}
          {thinking && <Thinking />}
          <div ref={endRef} />
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

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block text-ink transition-transform duration-300"
      style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
      ▾
    </span>
  );
}

// The case as a collapsible masthead bar at the top of the conversation.
function CaseBar({
  open,
  onToggle,
  caseText,
}: {
  open: boolean;
  onToggle: () => void;
  caseText: string;
}) {
  return (
    <div className="rise border border-rule">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 bg-paper-2/50 px-5 py-4 text-left transition-colors hover:bg-paper-2"
      >
        <span className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 bg-gold" />
          <span className="kicker text-ink">The Case</span>
          <span className="tagline hidden text-[15px] text-ink-soft sm:inline">
            IEDC–Poslovna šola Bled · Spring 2026
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="kicker">{open ? "Hide" : "Read the case"}</span>
          <Chevron open={open} />
        </span>
      </button>
      {open && (
        <div className="max-h-[60vh] overflow-y-auto border-t hairline px-6 py-8 md:px-12 md:py-10">
          <div className="case-prose mx-auto max-w-[68ch]">
            <CaseText text={caseText} />
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rise border border-rule bg-paper-2/40 px-6 py-7 md:px-8">
      <p className="tagline text-[22px] text-ink md:text-[26px]">The floor is yours.</p>
      <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">
        Read the case above, then respond in your own words — you'll get one direct reply, like a real
        conversation. Ask for any number or analysis (“show me the three-year financial trend”), or state a
        direction. When you want pushback, <span className="text-ink">Convene the council</span> below — or
        just say so (“council, tear this apart”).
      </p>
    </div>
  );
}

function Thinking() {
  return (
    <div className="rise flex items-center gap-2.5 py-1">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-gold/80 animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-gold/80 animate-pulse [animation-delay:160ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-gold/80 animate-pulse [animation-delay:320ms]" />
      </span>
      <span className="tagline text-[15px] text-ink-soft">the room is considering…</span>
    </div>
  );
}

function TranscriptItem({ entry, index }: { entry: TranscriptEntry; index: number }) {
  if (entry.kind === "participant") {
    return (
      <div className="rise border-l-2 border-ink bg-paper-2/50 px-5 py-4">
        <div className="kicker mb-1.5">You · the president's seat</div>
        <p className="text-[17px] leading-relaxed text-ink">{entry.text}</p>
      </div>
    );
  }
  if (entry.kind === "note") {
    return (
      <div className="rise flex items-center justify-center gap-3 py-1">
        <span className="h-px w-10 bg-rule" />
        <span className="tagline text-[15px] text-ink-soft">{entry.text}</span>
        <span className="h-px w-10 bg-rule" />
      </div>
    );
  }
  if (entry.kind === "facilitator") {
    return <FacilitatorVoice text={entry.text} figures={entry.figures} />;
  }
  // council mentor
  const accent = entry.id === "ethicalChallenger";
  return (
    <article
      className="rise border border-rule bg-card p-5 md:p-6"
      style={{
        animationDelay: `${(index % 5) * 80}ms`,
        borderLeftWidth: "3px",
        borderLeftColor: accent ? "var(--gold)" : "var(--rule-strong)",
      }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="display text-[21px] font-medium tracking-[-0.01em] text-ink md:text-[23px]">
          {entry.name}
        </h4>
        <span className="kicker shrink-0">{entry.school}</span>
      </div>
      <p className="mt-3 text-[16px] leading-relaxed text-ink md:text-[17px]">{entry.text}</p>
    </article>
  );
}

// The single default voice. Plain reply = "Facilitator"; when it cites
// fact-sheet numbers it becomes the gold "Analyst" Exhibit (Peak 1 payoff).
function FacilitatorVoice({ text, figures }: { text: string; figures: Figure[] }) {
  if (figures.length === 0) {
    return (
      <div className="rise">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-soft" />
          <span className="kicker">Facilitator</span>
        </div>
        <p className="max-w-[72ch] text-[17px] leading-relaxed text-ink md:text-[18px]">{text}</p>
      </div>
    );
  }
  return <AnalystExhibit text={text} figures={figures} />;
}

// Signature element: the analyst answer as a designed financial exhibit.
function AnalystExhibit({ text, figures }: { text: string; figures: Figure[] }) {
  return (
    <article className="rise border-2 border-gold bg-[oklch(0.976_0.026_86)]">
      <div className="flex items-center justify-between border-b border-gold/40 px-5 py-3">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 bg-gold" />
          <span className="kicker text-ink">Analyst · Live read</span>
        </span>
        <span className="kicker text-gold-deep">Audited · FY22–24</span>
      </div>
      <div className="px-5 py-5 md:px-6">
        <p className="max-w-[72ch] text-[17px] leading-relaxed text-ink md:text-[18px]">{text}</p>
        {figures.length > 0 && (
          <div className="mt-6 grid grid-cols-2 border-l border-t border-rule sm:grid-cols-3">
            {figures.map((f, i) => (
              <FigureCell key={i} figure={f} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function FigureCell({ figure }: { figure: Figure }) {
  const key = /(deficit|gap|loss)/i.test(`${figure.label} ${figure.value}`);
  return (
    <div
      className={`border-b border-r border-rule px-4 py-4 ${
        key ? "bg-[oklch(0.965_0.05_85)]" : "bg-card/50"
      }`}
    >
      <div className="kicker text-[9px]">{figure.label}</div>
      <div
        className={`numeral mt-1.5 leading-none ${
          key ? "text-[32px] text-gold-deep md:text-[40px]" : "text-[25px] text-ink md:text-[29px]"
        }`}
      >
        {figure.value}
      </div>
      {key && <span className="mt-2.5 block h-[3px] w-10 bg-gold" />}
    </div>
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
    <div className="sticky bottom-0 border-t border-rule-strong bg-card/95 pt-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={onConvene}
          disabled={thinking}
          className="group inline-flex items-center gap-2 border border-rule px-4 py-2 transition-colors hover:border-gold hover:bg-[oklch(0.965_0.05_85)] disabled:opacity-40"
        >
          <span className="h-1.5 w-1.5 bg-gold transition-transform group-hover:scale-125" />
          <span className="kicker text-ink">Convene the council</span>
        </button>
        <span className="kicker">one voice by default · you choose who weighs in</span>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder="Ask for a number, state a direction, or talk to the room…"
        className="w-full resize-none border border-rule bg-paper px-4 py-3.5 text-[16px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-gold-deep"
      />
      <div className="mt-3 flex items-center justify-between pb-1">
        <span className="kicker">Enter to send · Shift+Enter for a new line</span>
        <button
          onClick={onSend}
          disabled={thinking || !input.trim()}
          className="bg-gold px-7 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-ink transition-all hover:brightness-[1.04] disabled:opacity-40"
        >
          {thinking ? "…" : "Send →"}
        </button>
      </div>
    </div>
  );
}

/* ---------- case text renderer (headings, lists, bold, rules) ---------- */

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
            <span className="numeral text-[22px] leading-none text-gold-deep">{i + 1}</span>
            <span>{renderInline(item.replace(/^\d+\.\s*/, ""))}</span>
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
        <div key={i} className="mt-8 first:mt-0">
          <span className="mb-2 block h-px w-9 bg-gold" />
          <h3 className="kicker text-ink">{line.slice(4)}</h3>
        </div>
      );
    } else if (line.startsWith("---")) {
      out.push(<div key={i} className="my-6 h-px bg-rule" />);
    } else {
      out.push(
        <p key={i} className="mt-4 text-[17px] leading-[1.7] text-ink md:text-[18px]">
          {renderInline(line)}
        </p>
      );
    }
  });
  flushList("ol-end");
  return <div>{out}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-ink">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
