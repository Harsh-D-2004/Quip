import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Chrome, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLogo from "@/components/AppLogo";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import SettingsButton from "@/components/SettingsButton";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isValid, isLoading, createSession, formatTimeRemaining, timeRemaining } = useSession();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("Ready to authenticate");

  // Redirect if already logged in with valid session
  useEffect(() => {
    if (!isLoading && isValid && status === "idle") {
      navigate("/join");
    }
  }, [isValid, isLoading, status, navigate]);

  const handleLogin = async () => {
    setStatus("loading");
    setStatusMessage("Opening Chrome for authentication...");

    try {
      const response = await api.botLogin();

      if (response.success) {
        setStatus("success");
        setStatusMessage("Authentication successful!");
        createSession();
        toast({
          title: "Login Successful",
          description: "Bot authenticated. Session valid for 30 minutes.",
        });
        
        setTimeout(() => {
          navigate("/join");
        }, 1500);
      } else {
        setStatus("error");
        setStatusMessage(response.error || "Authentication failed");
        toast({
          title: "Authentication Failed",
          description: response.error || "Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setStatus("error");
      setStatusMessage("Connection error");
      toast({
        title: "Connection Error",
        description: "Could not reach the server. Please check your connection.",
        variant: "destructive",
      });
    }
  };

  const loginSteps = [
    "Click the button below to open Chrome",
    "Sign in to your Google account",
    "Allow necessary permissions",
    "Close Chrome window once logged in",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Main content */}
      <div className="relative flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <AppLogo size="lg" />
            </div>
            <p className="text-muted-foreground text-sm font-mono">
              AI-powered meeting notes
            </p>
          </div>

          {/* Login card */}
          <div className="card-elevated p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                <Chrome className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Bot Authentication
              </h2>
              <p className="text-sm text-muted-foreground">
                Login via Chrome to enable AI bot for meetings
              </p>
            </div>

            {/* Login steps */}
            <div className="bg-muted/20 rounded-xl p-4 mb-6 border border-border/50">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-mono">
                How to login
              </div>
              <div className="space-y-2">
                {loginSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {status === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm text-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex justify-center mb-6">
              <StatusBadge status={status} label={statusMessage} />
            </div>

            {/* Login button */}
            <Button
              onClick={handleLogin}
              disabled={status === "loading" || status === "success"}
              className="btn-primary w-full flex items-center justify-center gap-3 h-12"
            >
              {status === "loading" ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Opening Chrome...</span>
                </>
              ) : status === "success" ? (
                <>
                  <span>Proceeding</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  <Chrome className="w-5 h-5" />
                  <span>Login with Chrome</span>
                </>
              )}
            </Button>

            {/* Security note */}
            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>Session valid for 30 minutes after login</span>
            </div>
          </div>

          {/* Session timer if valid */}
          {isValid && timeRemaining > 0 && (
            <div className="mt-4 text-center">
              <span className="text-sm text-success font-mono">
                Session active: {formatTimeRemaining()} remaining
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative py-4 flex items-center justify-center gap-4 text-xs text-muted-foreground font-mono">
        <span>Quip • Secure • Private • Intelligent</span>
        <span className="opacity-40">|</span>
        <SettingsButton />
      </footer>
    </div>
  );
};

export default LoginPage;
