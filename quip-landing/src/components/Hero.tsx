import AppFrame from "./AppFrame";
import { Download, Github, Arrow } from "./Icons";
import { site } from "../site.config";

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-full max-w-[900px] -translate-x-1/2 bg-gradient-glow" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3.5 py-1.5"
            style={{ animationDelay: "0ms" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Free · Open source · Runs locally
            </span>
          </div>

          <h1
            className="animate-fade-up mt-6 text-[2.5rem] font-extrabold leading-[1.03] tracking-tight sm:text-5xl lg:text-[3.5rem]"
            style={{ animationDelay: "80ms" }}
          >
            Your meetings,
            <br />
            <span className="text-gradient">written down.</span>
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
            style={{ animationDelay: "160ms" }}
          >
            Quip is a silent bot that joins your Google Meet calls, captures every word
            from the live captions, and hands back a structured summary and a PDF —
            decisions, action items, and who said what.
          </p>

          <p
            className="animate-fade-up mt-4 max-w-xl leading-relaxed text-muted-foreground"
            style={{ animationDelay: "200ms" }}
          >
            No Chrome extension. No Google Workspace plan. Nothing leaves your machine
            except the transcript you choose to summarise.
          </p>

          <div className="animate-fade-up mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "260ms" }}>
            <a href={site.downloadUrl} download className="btn-primary">
              <Download />
              Download for Linux
            </a>
            <a href={site.github} target="_blank" rel="noreferrer noopener" className="btn-secondary">
              <Github />
              View source
            </a>
          </div>

          <p className="animate-fade-up mt-4 font-mono text-xs text-muted-foreground" style={{ animationDelay: "300ms" }}>
            .deb · {site.debSize} · Debian / Ubuntu x64 · v{site.version}
          </p>

          <a
            href="#how"
            className="animate-fade-up group mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            style={{ animationDelay: "340ms" }}
          >
            See how it works
            <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        <div className="animate-fade-up relative" style={{ animationDelay: "220ms" }}>
          <div className="pointer-events-none absolute -inset-8 bg-gradient-glow" />
          <AppFrame title="Quip — AI Meeting Notetaker" className="relative">
            <img
              src="/screens/05-recording.png"
              alt="Quip recording a live Google Meet call, showing a waveform, a BOT RECORDING badge and a running duration of 0:26"
              width={1313}
              height={842}
              fetchPriority="high"
              decoding="async"
              className="block w-full"
            />
          </AppFrame>
        </div>
      </div>
    </section>
  );
}
