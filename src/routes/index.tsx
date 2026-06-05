import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { MENTORS } from "@/lib/simulator-data";
import { getCase } from "@/lib/simulator-client";

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
            <ConversationStub caseText={caseText} />
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
        You are an IEDC graduate and senior operator. Today, you sit in the president's seat.
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

/* ---------- conversation (minimal stub — built out next) ---------- */

function ConversationStub({ caseText }: { caseText: string }) {
  return (
    <section className="pt-7">
      <div className="kicker">The case / 01</div>
      <div className="mt-3 max-w-3xl">
        <CaseText text={caseText} />
      </div>
      <div className="mt-8 border-t hairline pt-5">
        <p className="kicker">Conversation — building next</p>
      </div>
    </section>
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
      <ol key={key} className="mt-2 space-y-2">
        {list.map((item, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
            <span className="numeral text-electric">{i + 1}</span>
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
        <h3 key={i} className="kicker mt-6 first:mt-0">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("---")) {
      out.push(<div key={i} className="my-5 h-px bg-[var(--rule)]" />);
    } else {
      out.push(
        <p key={i} className="mt-3 text-[15px] leading-relaxed">
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
