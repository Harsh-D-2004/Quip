import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneOff, Clock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLogo from "@/components/AppLogo";
import LoadingSpinner from "@/components/LoadingSpinner";
import WaveformAnimation from "@/components/WaveformAnimation";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";

const LiveMeetingPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setMeetingStatus } = useSession();
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);

  const meetingId = sessionStorage.getItem("meetingId") || "";
  const meetingLink = sessionStorage.getItem("meetingLink") || "";

  useEffect(() => {
    if (!meetingId) {
      navigate("/join");
      return;
    }
    // Mark session as in-meeting to prevent expiry
    setMeetingStatus(true);
  }, [meetingId, navigate, setMeetingStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleLeaveMeeting = async () => {
    setIsLeaving(true);
    setMeetingStatus(false);

    try {
      const response = await api.leaveMeeting(meetingId);

      if (response.success) {
        toast({
          title: "Left Meeting",
          description: "Generating your meeting summary...",
        });

        sessionStorage.setItem("meetingDuration", formatDuration(meetingDuration));
        navigate("/summary");
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to leave meeting properly.",
          variant: "destructive",
        });
        setIsLeaving(false);
        setMeetingStatus(true);
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Could not reach the server.",
        variant: "destructive",
      });
      setIsLeaving(false);
      setMeetingStatus(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none">
        {/* Ripple effects */}
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-ripple" />
        <div className="absolute inset-0 rounded-full border border-primary/15 animate-ripple" style={{ animationDelay: "0.5s" }} />
        <div className="absolute inset-0 rounded-full border border-primary/10 animate-ripple" style={{ animationDelay: "1s" }} />
      </div>

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-4 border-b border-border backdrop-blur-sm bg-background/80">
        <AppLogo size="sm" />
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
          </span>
          <span className="text-sm font-semibold text-success tracking-wide">LIVE</span>
        </div>
      </header>

      {/* Main content */}
      <div className="relative flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center animate-fade-in">
          
          {/* Animated bot indicator */}
          <div className="relative mb-10">
            <div className="relative inline-flex items-center justify-center w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/30 animate-float">
              <div className="absolute inset-2 rounded-full bg-primary/5 backdrop-blur-sm" />
              <Mic className="relative w-12 h-12 text-primary" />
            </div>
            
            {/* Waveform below the icon */}
            <div className="mt-6">
              <WaveformAnimation bars={7} />
            </div>
          </div>

          {/* Bot status badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-success/10 border border-success/30 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-sm font-bold text-success uppercase tracking-wider">Bot Recording</span>
          </div>

          {/* Duration display */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest font-mono">Duration</span>
            </div>
            <div className="text-7xl font-bold text-foreground font-mono tracking-tight">
              {formatDuration(meetingDuration)}
            </div>
          </div>

          {/* Meeting link */}
          <div className="bg-muted/20 backdrop-blur-sm rounded-xl p-5 mb-8 border border-border/50">
            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-widest font-mono">Meeting</div>
            <div className="text-sm text-foreground truncate font-mono">
              {meetingLink}
            </div>
          </div>

          {/* Leave button */}
          <Button
            onClick={handleLeaveMeeting}
            disabled={isLeaving}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground h-14 font-bold tracking-wide text-base rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLeaving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <PhoneOff className="w-5 h-5 mr-3" />
                End Meeting & Generate Summary
              </>
            )}
          </Button>

          <p className="mt-6 text-xs text-muted-foreground font-mono">
            Click to leave and generate AI summary
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveMeetingPage;
