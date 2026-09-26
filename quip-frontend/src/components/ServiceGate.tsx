import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLogo from "@/components/AppLogo";
import LoadingSpinner from "@/components/LoadingSpinner";
import { initApiBase } from "@/services/api";
import { logger } from "@/lib/logger";
import type { ServiceState } from "@/types/quip-bridge";

/**
 * Nothing in the UI can do useful work before the service has a port, so the app
 * waits here rather than letting every page fail its own fetch.
 *
 * It also renders the case §1 of the restructure plan exists for: the service can
 * die without taking the window with it, and the user gets told and offered a
 * restart instead of a blank screen.
 */
const ServiceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceState, setServiceState] = useState<ServiceState["state"]>("starting");
  const [retrying, setRetrying] = useState(false);

  const connect = React.useCallback(async () => {
    setError(null);
    try {
      await initApiBase();
      setReady(true);
      setServiceState("running");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.api.error("Service unavailable", { error: message });
      setError(message);
    }
  }, []);

  useEffect(() => {
    void connect();
  }, [connect]);

  useEffect(() => {
    if (!window.quip) return;
    return window.quip.onServiceState((state) => {
      setServiceState(state.state);
      if (state.state === "dead" || state.state === "failed") {
        setError(state.error || "The Quip background service stopped responding.");
      }
    });
  }, []);

  const handleRestart = async () => {
    setRetrying(true);
    try {
      if (window.quip) await window.quip.restartService();
      await connect();
    } finally {
      setRetrying(false);
    }
  };

  if (ready && !error) {
    return (
      <>
        {children}
        {(serviceState === "restarting" || serviceState === "dead") && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-destructive/15 px-4 py-2 text-sm text-destructive backdrop-blur">
            <AlertTriangle className="w-4 h-4" />
            {serviceState === "restarting"
              ? "Recording service restarting..."
              : "Recording service stopped."}
            {serviceState === "dead" && (
              <button onClick={handleRestart} className="underline ml-1">
                Restart
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />
      <div className="relative w-full max-w-md text-center animate-fade-in">
        <div className="flex justify-center mb-6">
          <AppLogo size="lg" />
        </div>

        {error ? (
          <div className="card-elevated p-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-4">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              Background service unavailable
            </h2>
            <p className="text-sm text-muted-foreground mb-6 font-mono break-words">{error}</p>
            <Button onClick={handleRestart} disabled={retrying} className="btn-primary w-full">
              {retrying ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" /> Restarting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Restart service
                </span>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground font-mono">
              Starting recording service...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceGate;
