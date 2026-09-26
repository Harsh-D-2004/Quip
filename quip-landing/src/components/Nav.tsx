import { useEffect, useState } from "react";
import Logo from "./Logo";
import { Download, Github } from "./Icons";
import { site } from "../site.config";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-border bg-background/80 backdrop-blur-xl" : ""
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
        <a href="#top" className="flex items-center gap-2">
          <Logo size="sm" />
        </a>

        <div className="ml-auto hidden items-center gap-7 md:flex">
          <a href="#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#why" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Why Quip
          </a>
          <a href="#install" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Install
          </a>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            aria-label="Quip on GitHub"
          >
            <Github className="h-[18px] w-[18px]" />
          </a>
          <a href={site.downloadUrl} download className="btn-primary !px-4 !py-2.5 text-sm">
            <Download className="h-4 w-4" />
            Download
          </a>
        </div>
      </nav>
    </header>
  );
}
