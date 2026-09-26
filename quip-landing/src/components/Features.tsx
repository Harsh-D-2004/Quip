import { Bot, Captions, Sparkle, Doc, Shield, Offline } from "./Icons";

const FEATURES = [
  { icon: Bot, title: "Joins by itself", body: "Playwright drives a bundled Chromium into the call, handles the join prompts and turns captions on." },
  { icon: Captions, title: "Captures every word", body: "A MutationObserver streams captions to disk as they appear, flushed on a timer so a crash costs you seconds, not the meeting." },
  { icon: Sparkle, title: "Summarises with your key", body: "Bring your own OpenRouter key. Quip verifies it on first run and keeps it in your OS keychain." },
  { icon: Doc, title: "One-page PDF", body: "Summary, key points, per-participant contributions and a headcount, rendered with PDFKit and ready to send." },
  { icon: Shield, title: "Nothing baked in", body: "No provider key ships in the installer. The API only listens on 127.0.0.1, never on your network." },
  { icon: Offline, title: "Everything bundled", body: "Chromium and the Node service ship inside the .deb. No Node.js, no Docker, no Chrome install needed." },
];

export default function Features() {
  return (
    <section className="relative border-t border-border py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="label">What you get</div>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          A desktop app, not a service you sign up for
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group card-elevated p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Icon />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
