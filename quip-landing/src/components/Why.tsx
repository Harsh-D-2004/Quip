import { Check, Cross } from "./Icons";

const ROWS = [
  {
    approach: "Chrome extension",
    problems: [
      "Can't reach the audio stream of a Meet tab",
      "Breaks whenever Meet ships a DOM change",
      "Every participant has to install it",
    ],
  },
  {
    approach: "Google Meet / Workspace API",
    problems: [
      "Transcripts need a paid Workspace tier",
      "Recording APIs are gated per plan and region",
      "Your conversations pass through Google's pipeline",
    ],
  },
];

const QUIP = [
  "Drives a real browser session — the same thing a human would do",
  "Works with a plain, free Google account",
  "Only the bot joins; nobody else installs anything",
  "Transcripts and session state stay in your home directory",
  "Your own OpenRouter key, so you pick the model and see the bill",
];

export default function Why() {
  return (
    <section id="why" className="relative overflow-hidden border-t border-border py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[400px] w-[700px] -translate-x-1/2 bg-gradient-glow opacity-60" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="label">Why Quip</div>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          The obvious approaches don't work
        </h2>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1fr_1.15fr]">
          {ROWS.map((r) => (
            <div key={r.approach} className="card-elevated p-7">
              <h3 className="text-base font-semibold text-muted-foreground">{r.approach}</h3>
              <ul className="mt-5 space-y-3.5">
                {r.problems.map((p) => (
                  <li key={p} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                    <Cross className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive/70" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="card-elevated relative overflow-hidden border-primary/25 p-7">
            <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
            <div className="relative">
              <h3 className="text-base font-semibold">
                <span className="text-primary">Quip</span> instead
              </h3>
              <ul className="mt-5 space-y-3.5">
                {QUIP.map((p) => (
                  <li key={p} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
