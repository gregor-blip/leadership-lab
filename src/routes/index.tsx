import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { MENTORS, type TranscriptEntry, type Figure, type Summon } from "@/lib/simulator-data";
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
    <div className="min-h-screen bg-paper">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-9 md:py-10">
        <AppChrome>
          <Header />
          {phase === "onboarding" ? (
            <OnboardingBrief loading={loadingCase} onBegin={begin} />
          ) : (
            <Conversation caseText={caseText} />
          )}
        </AppChrome>
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="kicker">
            A live case, in conversation — adversarial mentors grounded in distinct schools of thought, not real individuals.
          </span>
          <span className="numeral text-muted-foreground">IEDC · Bled</span>
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
        <div className="kicker">iedc leadership lab — concept prototype</div>
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
        <div className="kicker">IEDC Leadership Lab</div>
        <h1 className="mt-2 text-[36px] font-medium leading-[0.95] tracking-tight md:text-[44px]">
          A live case, in conversation.
        </h1>
        <div className="tagline mt-3 text-lg text-ink/80">
          Not a quiz — an intelligence you talk to, command, and argue with.
        </div>
      </div>
      <span className="kicker shrink-0 border hairline px-2.5 py-1.5">Concept prototype</span>
    </header>
  );
}

/* ---------- onboarding brief (static, no AI call) ---------- */

function OnboardingBrief({ loading, onBegin }: { loading: boolean; onBegin: () => void }) {
  return (
    <section className="pt-7">
      <div className="kicker">The brief / 00</div>
      <h2 className="tagline mt-2 max-w-2xl text-2xl leading-snug md:text-[28px]">
        You sit in the president's seat at IEDC.
      </h2>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-7 md:grid-cols-3">
        <BriefPoint n="01" title="A real situation">
          This is as close to a real executive situation as it gets. You'll face a real decision with
          incomplete information. Talk freely, in your own words — the AI understands you.
        </BriefPoint>
        <BriefPoint n="02" title="Ask for the data">
          You don't have all the numbers — so ask for them. Any metric, any analysis: ask, and the AI
          runs it. You no longer calculate; you command. The old skill was doing the math. The new skill
          is knowing what to ask.
        </BriefPoint>
        <BriefPoint n="03" title="You are not alone">
          You command a council of five mentors. Their names are their personalities. They will disagree —
          with you and with each other. Ask them, push them deeper, tell one to stay quiet, or talk to just
          one. This is life, not software.
        </BriefPoint>
      </div>

      <div className="mt-9 border-t hairline pt-6">
        <div className="kicker mb-4">Your council</div>
        <div className="grid grid-cols-1 gap-0 border hairline sm:grid-cols-2 lg:grid-cols-5">
          {MENTORS.map((m, i) => (
            <div
              key={m.id}
              className={`p-4 ${i < MENTORS.length - 1 ? "border-b hairline lg:border-b-0 lg:border-r" : ""} ${
                i % 2 === 0 ? "sm:border-r hairline" : ""
              } lg:border-r`}
            >
              <div className="kicker text-[9.5px]">{m.school}</div>
              <div className="mt-1.5 text-lg tracking-tight">
                {m.id === "ethicalChallenger" && <span className="mr-1.5 text-electric">●</span>}
                {m.name}
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{m.blurb}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <span className="kicker">No score · no right answer · the conversation is the point</span>
        <button
          onClick={onBegin}
          disabled={loading}
          className="bg-electric px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "Loading case…" : "Begin →"}
        </button>
      </div>
    </section>
  );
}

function BriefPoint({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="numeral text-3xl text-electric">{n}</div>
      <h3 className="mt-2 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

/* ---------- conversation: case (left) + chat (right) ---------- */

function Conversation({ caseText }: { caseText: string }) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [transcript, thinking]);

  async function runTurn(text: string, summon?: Summon) {
    if (!text || thinking) return;
    const snapshot = transcript; // history = turns BEFORE this message
    setTranscript((t) => [...t, { kind: "participant", text }]);
    setInput("");
    setThinking(true);
    try {
      const res = await sendTurn(text, snapshot, summon);
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

  // Explicit summon via the UI control. Uses the typed text if present, else a
  // sensible default message for the chosen mode.
  function summonCouncil(mode: Summon) {
    if (thinking) return;
    const typed = input.trim();
    const fallback =
      mode === "all"
        ? "Full council — tear this apart. I want to hear all five."
        : mode === "auto"
        ? "Council, weigh in on this."
        : `${MENTORS.find((m) => m.id === mode)?.name ?? "Mentor"}, what's your read?`;
    runTurn(typed || fallback, mode);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-0 pt-6 lg:grid-cols-12">
      {/* CASE — stays visible, sized for projection */}
      <section className="lg:col-span-5 lg:border-r hairline lg:pr-7">
        <div className="kicker">The case / 01 · IEDC–Poslovna šola Bled</div>
        <div className="mt-3 max-h-none lg:max-h-[68vh] lg:overflow-y-auto lg:pr-2">
          <CaseText text={caseText} />
        </div>
      </section>

      {/* CONVERSATION */}
      <section className="mt-8 lg:col-span-7 lg:mt-0 lg:pl-7">
        <div className="flex items-center justify-between border-b hairline pb-3">
          <div className="kicker">The conversation / 02</div>
          <div className="kicker text-muted-foreground">Talk freely · ask · decide · summon</div>
        </div>

        <div className="space-y-4 py-5">
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
          onSummon={summonCouncil}
          thinking={thinking}
        />
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border hairline p-5">
      <p className="tagline text-lg">The floor is yours.</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Read the case on the left, then respond in your own words — you'll get one direct reply, like a
        real conversation. Ask for any number or analysis (“show me the three-year financial trend”), or
        state a direction. When you want pushback, <span className="text-ink">summon the council</span>{" "}
        below — or just say so (“council, tear this apart”).
      </p>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-2 px-1 text-muted-foreground">
      <span className="h-1.5 w-1.5 animate-pulse bg-ink/50" />
      <span className="h-1.5 w-1.5 animate-pulse bg-ink/50 [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse bg-ink/50 [animation-delay:300ms]" />
      <span className="kicker ml-1">The room is thinking</span>
    </div>
  );
}

function TranscriptItem({ entry, index }: { entry: TranscriptEntry; index: number }) {
  if (entry.kind === "participant") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 border-l-2 border-ink bg-secondary/60 px-4 py-3">
        <div className="kicker mb-1">You · in the president's seat</div>
        <p className="text-[15px] leading-relaxed">{entry.text}</p>
      </div>
    );
  }
  if (entry.kind === "note") {
    return (
      <p className="tagline px-1 text-center text-sm text-muted-foreground animate-in fade-in duration-300">
        {entry.text}
      </p>
    );
  }
  if (entry.kind === "facilitator") {
    return <ReplyCard text={entry.text} figures={entry.figures} />;
  }
  // council
  const accent = entry.id === "ethicalChallenger";
  return (
    <article
      className="animate-in fade-in slide-in-from-bottom-2 border hairline p-4 md:p-5"
      style={{ animationDuration: "450ms", animationDelay: `${(index % 5) * 70}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-baseline justify-between">
        <div className="text-lg tracking-tight">
          {accent && <span className="mr-1.5 text-electric">●</span>}
          {entry.name}
        </div>
        <div className="kicker">{entry.school}</div>
      </div>
      <div className="my-2.5 h-0.5 w-7" style={{ background: accent ? "var(--electric)" : "var(--rule)" }} />
      <p className="text-[15px] leading-relaxed">{entry.text}</p>
    </article>
  );
}

// The single default voice. When it cites fact-sheet numbers it becomes the
// distinct gold "Analyst" card with a figure strip (Peak 1); otherwise it reads
// as a lighter "Facilitator" reply.
function ReplyCard({ text, figures }: { text: string; figures: Figure[] }) {
  const data = figures.length > 0;
  return (
    <article
      className={`animate-in fade-in slide-in-from-bottom-2 duration-300 p-4 md:p-5 ${
        data ? "border-2 border-[var(--electric)] bg-[oklch(0.97_0.03_85)]" : "border-l-2 border-[var(--rule)] pl-4"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 ${data ? "bg-electric" : "bg-ink/40"}`} />
        <span className="kicker">{data ? "Analyst · from the audited fact-sheet" : "Facilitator"}</span>
      </div>
      <p className="mt-3 text-[16px] leading-relaxed md:text-[17px]">{text}</p>
      {data && (
        <div className="mt-4 grid grid-cols-2 gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-3">
          {figures.map((f, i) => (
            <div key={i} className="bg-card p-3">
              <div className="kicker text-[9px]">{f.label}</div>
              <div className="numeral mt-1 text-xl font-medium leading-none md:text-2xl">{f.value}</div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Composer({
  input,
  setInput,
  onSend,
  onKeyDown,
  onSummon,
  thinking,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSummon: (mode: Summon) => void;
  thinking: boolean;
}) {
  return (
    <div className="sticky bottom-0 border-t hairline bg-card pt-4">
      {/* Council on tap — single voice stays the default; these summon mentors. */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <span className="kicker mr-1">Summon</span>
        <SummonChip label="Council" onClick={() => onSummon("auto")} thinking={thinking} />
        {MENTORS.map((m) => (
          <SummonChip
            key={m.id}
            label={m.name.replace(/^The /, "")}
            accent={m.id === "ethicalChallenger"}
            onClick={() => onSummon(m.id)}
            thinking={thinking}
          />
        ))}
        <SummonChip label="Full council" emphasis onClick={() => onSummon("all")} thinking={thinking} />
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder="Ask for a number, state a direction, or talk to the room…"
        className="w-full resize-none border hairline bg-paper p-3.5 text-[15px] leading-relaxed outline-none focus:border-ink"
      />
      <div className="mt-2.5 flex items-center justify-between pb-1">
        <span className="kicker">Enter to send · Shift+Enter for a new line · one voice by default</span>
        <button
          onClick={onSend}
          disabled={thinking || !input.trim()}
          className="bg-electric px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {thinking ? "…" : "Send →"}
        </button>
      </div>
    </div>
  );
}

function SummonChip({
  label,
  onClick,
  thinking,
  emphasis,
  accent,
}: {
  label: string;
  onClick: () => void;
  thinking: boolean;
  emphasis?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={thinking}
      className={`border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40 ${
        emphasis
          ? "border-[var(--electric)] bg-[oklch(0.97_0.03_85)] hover:bg-electric hover:text-ink"
          : "hairline hover:bg-ink hover:text-paper"
      }`}
    >
      {accent && <span className="mr-1 text-electric">●</span>}
      {label}
    </button>
  );
}

/* Lightweight markdown renderer for the case text (headings, lists, bold, rules). */
function CaseText({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = (key: string) => {
    if (!list.length) return;
    out.push(
      <ol key={key} className="mt-2 space-y-2.5">
        {list.map((item, i) => (
          <li key={i} className="flex gap-3 text-[16px] leading-relaxed md:text-[17px]">
            <span className="numeral text-xl text-electric">{i + 1}</span>
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
        <h3 key={i} className="kicker mt-6 text-[11px] first:mt-0">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("---")) {
      out.push(<div key={i} className="my-5 h-px bg-[var(--rule)]" />);
    } else {
      out.push(
        <p key={i} className="mt-3 text-[16px] leading-relaxed md:text-[17px]">
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
