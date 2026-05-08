import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, ArrowRight, Video, LogOut, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLogo from "@/components/AppLogo";
import LoadingSpinner from "@/components/LoadingSpinner";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";

const JoinMeetingPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isValid, isLoading, clearSession, formatTimeRemaining, checkSession } = useSession();
  const [meetingLink, setMeetingLink] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("Enter meeting link to join");
  const [showReloginMessage, setShowReloginMessage] = useState(false);

  // Check session validity only after loading is complete
  useEffect(() => {
    if (!isLoading && !isValid) {
      setShowReloginMessage(true);
    }
  }, [isValid, isLoading]);

  const handleJoinMeeting = async () => {
    // Check session before joining
    if (!checkSession()) {
      setShowReloginMessage(true);
      toast({
        title: "Session Expired",
        description: "Please login again to join meetings.",
        variant: "destructive",
      });
      return;
    }

    if (!meetingLink.trim()) {
      toast({
        title: "Missing Link",
        description: "Please enter a meeting link.",
        variant: "destructive",
      });
      return;
    }

    setStatus("loading");
    setStatusMessage("Joining meeting...");

    try {
      const response = await api.joinMeeting(meetingLink);

      if (response.success && response.data) {
        setStatus("success");
        setStatusMessage("Successfully joined!");
        toast({
          title: "Meeting Joined",
          description: "Bot has joined the meeting. Recording notes...",
        });

        sessionStorage.setItem("meetingId", response.data.meetingId);
        sessionStorage.setItem("meetingLink", meetingLink);

        setTimeout(() => {
          navigate("/meeting");
        }, 1000);
      } else {
        setStatus("error");
        
        // Check if it's an auth-related error
        const errorMsg = response.error || "Failed to join meeting";
        if (errorMsg.toLowerCase().includes("auth") || errorMsg.toLowerCase().includes("login") || errorMsg.toLowerCase().includes("credential")) {
          setShowReloginMessage(true);
          setStatusMessage("Authentication expired - please relogin");
        } else {
          setStatusMessage(errorMsg);
        }
        
        toast({
          title: "Failed to Join",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      setStatus("error");
      setStatusMessage("Connection error");
      toast({
        title: "Connection Error",
        description: "Could not reach the server.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const handleRelogin = () => {
    clearSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />
      <div className="fixed top-0 right-0 w-[600px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-4 border-b border-border">
        <AppLogo size="sm" />
        <div className="flex items-center gap-4">
          {isValid && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimeRemaining()}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg animate-fade-in">
          {/* Relogin warning */}
          {showReloginMessage && (
            <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-warning mb-1">Session Expired</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Your login session has expired. Please login again to continue.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleRelogin}
                    className="bg-warning hover:bg-warning/90 text-warning-foreground"
                  >
                    Relogin Now
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Join a Meeting
            </h1>
            <p className="text-muted-foreground">
              Paste your meeting link below to start capturing notes
            </p>
          </div>

          {/* Join card */}
          <div className="card-elevated p-8">
            {/* Meeting link input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Meeting Link
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Link2 className="w-5 h-5" />
                </div>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  className="input-field pl-12"
                  disabled={status === "loading" || status === "success" || showReloginMessage}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Supports Google Meet.
              </p>
            </div>

            {/* Status indicator */}
            <div className="flex justify-center mb-6">
              <StatusBadge status={status} label={statusMessage} />
            </div>

            {/* Join button */}
            <Button
              onClick={handleJoinMeeting}
              disabled={status === "loading" || status === "success" || !meetingLink.trim() || showReloginMessage}
              className="btn-primary w-full flex items-center justify-center gap-3 h-12"
            >
              {status === "loading" ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Joining meeting...</span>
                </>
              ) : status === "success" ? (
                <>
                  <span>Opening meeting view</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  <span>Join Meeting</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </div>

          {/* Features list */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground font-mono">
            <span>Record</span>
            <span className="text-primary">•</span>
            <span>Transcribe</span>
            <span className="text-primary">•</span>
            <span>Summarize</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinMeetingPage;
