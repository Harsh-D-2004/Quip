import { useCallback, useEffect, useRef, useState } from "react";
import AppFrame from "./AppFrame";

/**
 * The product tour: the real app, step by step.
 *
 * Auto-advances so a visitor who does nothing still sees the whole flow, and
 * pauses the moment they take over (hover or click) so it never yanks the image
 * away mid-read.
 */
const STEPS = [
  {
    n: "01",
    title: "Add your OpenRouter key",
    body: "On first run Quip asks for your own key, checks it against OpenRouter, and stores it in your system keychain. Nothing is baked into the installer.",
    img: "/screens/01-api-key.png",
    alt: "Quip's first-run dialog asking for an OpenRouter API key, with a note that it is stored encrypted in the OS keychain",
  },
  {
    n: "02",
    title: "Sign in once",
    body: "Quip opens a real Chrome window on the Google sign-in page. Log in, close it, and the session is saved — every meeting after this is automatic.",
    img: "/screens/03-google-signin.png",
    alt: "A Google sign-in window open beside the Quip app, which shows 'Opening Chrome for authentication'",
  },
  {
    n: "03",
    title: "Paste a meeting link",
    body: "Drop in any meet.google.com link. The bot joins the call, clears the prompts and switches captions on by itself.",
    img: "/screens/04-join.png",
    alt: "Quip's Join a Meeting screen with a field for a Google Meet link",
  },
  {
    n: "04",
    title: "It listens",
    body: "Captions stream to disk as they appear. The bot tracks the participant count and leaves on its own when everyone else has gone.",
    img: "/screens/05-recording.png",
    alt: "Quip recording a live meeting, showing a waveform, a BOT RECORDING badge and a running duration",
  },
  {
    n: "05",
    title: "Read the notes",
    body: "A summary, the key points, who contributed what, the full transcript — and a one-page PDF to send on.",
    img: "/screens/06-summary.png",
    alt: "Quip's Meeting Summary Ready screen with duration, participants, AI summary, key points and a Download PDF button",
  },
] as const;

const DWELL_MS = 6000;

export default function Showcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  // Don't burn through the tour while it is off-screen.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !visible) return;
    const t = setTimeout(() => setActive((i) => (i + 1) % STEPS.length), DWELL_MS);
    return () => clearTimeout(t);
  }, [active, paused, visible]);

  const pick = useCallback((i: number) => {
    setActive(i);
    setPaused(true);
  }, []);

  return (
    <section
      id="how"
      ref={section}
      className="relative overflow-hidden border-t border-border py-24"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-full max-w-[820px] -translate-x-1/2 bg-gradient-glow" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="label">How it works</div>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          Five steps, and only the first two need you
        </h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-14">
          {/* step list */}
          <ol className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.n} className="min-w-[15rem] lg:min-w-0">
                  <button
                    onClick={() => pick(i)}
                    aria-current={on ? "step" : undefined}
                    className={`relative w-full rounded-lg border p-4 text-left transition-all duration-300 ${
                      on
                        ? "border-primary/40 bg-white/[0.04]"
                        : "border-transparent hover:border-border hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className={`font-mono text-xs ${on ? "text-primary" : "text-muted-foreground"}`}>
                        {s.n}
                      </span>
                      <span className={`font-semibold ${on ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.title}
                      </span>
                    </div>
                    {on && (
                      <p className="mt-2.5 pl-8 text-sm leading-relaxed text-muted-foreground">
                        {s.body}
                      </p>
                    )}
                    {/* progress rail for the active step */}
                    {on && (
                      <span className="absolute inset-y-2 left-0 w-0.5 overflow-hidden rounded-full bg-primary/20">
                        <span
                          key={`${active}-${paused}`}
                          className="block w-full bg-primary"
                          style={{
                            height: paused ? "100%" : "0%",
                            animation: paused ? undefined : `grow ${DWELL_MS}ms linear forwards`,
                          }}
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* screenshot */}
          <div className="relative">
            <AppFrame title="Quip — AI Meeting Notetaker">
              <div className="relative aspect-[1316/846] bg-background">
                {STEPS.map((s, i) => (
                  <img
                    key={s.img}
                    src={s.img}
                    alt={s.alt}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-contain object-top transition-opacity duration-500 ${
                      i === active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ))}
              </div>
            </AppFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
