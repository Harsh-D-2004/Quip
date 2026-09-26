import React from "react";
import { KeyRound } from "lucide-react";
import { useApiKey } from "@/hooks/useApiKey";

/**
 * Small, always-available way back into the key prompt. Without it the only time
 * a user could set their key would be the first-run dialog.
 */
const SettingsButton: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { openPrompt, configured } = useApiKey();

  return (
    <button
      type="button"
      onClick={openPrompt}
      title={configured ? "Update OpenRouter API key" : "Add your OpenRouter API key"}
      className={`inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      <KeyRound className="w-3.5 h-3.5" />
      <span>{configured ? "API key" : "Add API key"}</span>
      {configured === false && (
        <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-destructive" aria-hidden />
      )}
    </button>
  );
};

export default SettingsButton;
