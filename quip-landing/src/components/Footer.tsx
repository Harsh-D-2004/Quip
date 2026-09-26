import Logo from "./Logo";
import { Github } from "./Icons";
import { site } from "../site.config";

export default function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            AI meeting notes
          </span>
        </div>

        <div className="flex items-center gap-6 sm:ml-auto">
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <a href={site.downloadUrl} download className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Download
          </a>
          <span className="font-mono text-xs text-muted-foreground">v{site.version}</span>
        </div>
      </div>
    </footer>
  );
}
