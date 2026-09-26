import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useApiKey } from "@/hooks/useApiKey";
import { AlertTriangle, ExternalLink, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

const OPENROUTER_KEYS_URL = "https://openrouter.ai/settings/keys";

/**
 * First-run prompt for the user's own OpenRouter key.
 *
 * Quip ships no provider key of its own: one baked into the installer would be
 * extractable with a zip tool and billable to us. The key the user pastes here is
 * verified against OpenRouter, then stored in their OS keychain by the desktop
 * shell - never inside the app bundle.
 */
const ApiKeyDialog: React.FC = () => {
  const { promptOpen, closePrompt, configured, encrypted, sessionOnly, save } = useApiKey();
  const [key, setKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (promptOpen) {
      setKey("");
      setReveal(false);
      setError(null);
    }
  }, [promptOpen]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await save(key);
    setSaving(false);

    if (result.success) {
      closePrompt();
    } else {
      setError(result.message || "Could not save the key");
    }
  };

  const openKeysPage = () => {
    if (window.quip) void window.quip.openExternal(OPENROUTER_KEYS_URL);
    else window.open(OPENROUTER_KEYS_URL, "_blank", "noopener");
  };

  return (
    <Dialog open={promptOpen} onOpenChange={(open) => (open ? undefined : closePrompt())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>
            {configured ? "Update your OpenRouter key" : "Add your OpenRouter key"}
          </DialogTitle>
          <DialogDescription>
            Quip uses OpenRouter to turn meeting transcripts into summaries. Bring your
            own key so usage is billed to your account and the key never leaves this
            machine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openrouter-key">API key</Label>
            <div className="relative">
              <Input
                id="openrouter-key"
                type={reveal ? "text" : "password"}
                placeholder="sk-or-v1-..."
                autoComplete="off"
                spellCheck={false}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && key.trim() && !saving) void handleSave();
                }}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={reveal ? "Hide key" : "Show key"}
              >
                {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={openKeysPage}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              Get a key from openrouter.ai
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {sessionOnly
                ? "Running outside the desktop app: this key is held in memory only and is forgotten when the service restarts."
                : encrypted
                  ? "Stored encrypted in your operating system's keychain."
                  : "No system keychain was found, so the key is stored in a file readable only by your user account."}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={closePrompt} disabled={saving}>
            {configured ? "Cancel" : "Skip for now"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!key.trim() || saving}
            className="btn-primary min-w-[9rem]"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Verifying...
              </span>
            ) : (
              "Verify and save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyDialog;
