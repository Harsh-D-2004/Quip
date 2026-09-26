/**
 * Everything that changes between releases lives here.
 *
 * The installer is served from GitHub Releases rather than out of this repo:
 * it is ~239 MB, and GitHub rejects files over 100 MB without Git LFS, so
 * committing it would break `git push` for everyone. Releases have a 2 GB
 * per-file limit and are CDN-backed.
 *
 * GitHub sends `Content-Disposition: attachment` on release assets, so the link
 * downloads rather than navigating - the `download` attribute on the anchors is
 * ignored cross-origin and is there only as a hint.
 *
 * Set VITE_DOWNLOAD_URL to override at build time (see the root Dockerfile).
 */
const RELEASE_DEB =
  "https://github.com/Harsh-D-2004/Quip/releases/download/v1.0.0/quip_1.0.0_amd64.deb";

export const site = {
  version: "1.0.0",
  github: "https://github.com/Harsh-D-2004/Quip",
  releases: "https://github.com/Harsh-D-2004/Quip/releases",
  // Deliberately `||`, not `??`. The Dockerfile's `ENV VITE_DOWNLOAD_URL=${ARG}`
  // sets an EMPTY STRING when no --build-arg is passed, and `??` only falls back
  // on null/undefined - so `??` left href="" here, which resolves to the current
  // page and made the button save the HTML as "download.html".
  downloadUrl: import.meta.env.VITE_DOWNLOAD_URL?.trim() || RELEASE_DEB,
  debFilename: "quip_1.0.0_amd64.deb",
  debSize: "239 MB",
} as const;
