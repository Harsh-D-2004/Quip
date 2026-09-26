import { useState } from "react";
import { Download, Github, Check } from "./Icons";
import { site } from "../site.config";

const APT = `sudo apt install ./${site.debFilename}`;

function CopyLine({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked (no https / permissions) - the text is selectable anyway */
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-black/40 px-4 py-3">
      <span className="select-none font-mono text-sm text-primary/70">$</span>
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground/90">
        {cmd}
      </code>
      <button
        onClick={copy}
        className="flex-shrink-0 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
      >
        {copied ? (
          <span className="flex items-center gap-1 text-success">
            <Check className="h-3.5 w-3.5" /> copied
          </span>
        ) : (
          "copy"
        )}
      </button>
    </div>
  );
}

export default function Install() {
  return (
    <section id="install" className="relative overflow-hidden border-t border-border py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 bg-gradient-glow" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="label">Install</div>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Download, double-click, done
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted-foreground">
          One package with everything inside it. No runtime to install first, no
          terminal needed unless you want one.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a href={site.downloadUrl} download className="btn-primary text-base">
            <Download />
            Download .deb · {site.debSize}
          </a>
          <a href={site.github} target="_blank" rel="noreferrer noopener" className="btn-secondary">
            <Github />
            Build from source
          </a>
        </div>

        <div className="mt-12 text-left">
          <div className="label mb-3">Or from a terminal</div>
          <CopyLine cmd={APT} />
        </div>

        <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
          <div className="card-elevated p-6">
            <div className="label">Requires</div>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Debian or Ubuntu x64, a Google account for the bot, and a free{" "}
              <a
                href="https://openrouter.ai/settings/keys"
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:underline"
              >
                OpenRouter key
              </a>{" "}
              for summaries.
            </p>
          </div>
          <div className="card-elevated p-6">
            <div className="label">Your data</div>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Transcripts, logs and your Google session live in{" "}
              <code className="font-mono text-xs text-foreground/80">~/.config/Quip/</code> and
              survive updates and uninstalls.
            </p>
          </div>
          <div className="card-elevated p-6">
            <div className="label">Uninstall</div>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              <code className="font-mono text-xs text-foreground/80">sudo apt remove quip</code>.
              Your notes stay where they are.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
