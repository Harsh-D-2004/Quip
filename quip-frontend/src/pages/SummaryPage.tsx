import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Download, 
  FileText, 
  Clock, 
  CheckCircle2, 
  ListTodo, 
  Users,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import AppLogo from "@/components/AppLogo";
import LoadingSpinner from "@/components/LoadingSpinner";
import { api, mapSummaryResponse, SummaryResponse } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { useApiKey } from "@/hooks/useApiKey";
import SettingsButton from "@/components/SettingsButton";

const SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openPrompt } = useApiKey();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const meetingId = sessionStorage.getItem("meetingId") || "";
  const meetingDuration = sessionStorage.getItem("meetingDuration") || "0:00";
  const notesCount = sessionStorage.getItem("notesCount") || "0";
  const [transcript, setTranscript] = useState<string>("");

  useEffect(() => {
    if (!meetingId) {
      navigate("/");
      return;
    }

    const fetchTranscript = async () => {
      try {
        const response = await api.getTranscript();
        logger.meeting.info("Transcript received successfully");
        logger.meeting.info("Transcript data : ", response);
        setTranscript(response.transcript ?? "");
      } catch (error) {
        logger.meeting.error("Failed to fetch transcript", { error });
        setTranscript("");
      }
    };


    const fetchSummary = async () => {
      logger.meeting.info("Fetching meeting summary from API");
      try {
        const response = await api.getSummary();
        if (response.success && response.data) {
          logger.meeting.info("Summary received successfully");
          logger.meeting.info("Summary data : ", response.data);
          setSummary(mapSummaryResponse(response.data));
        } else {
          logger.meeting.warn("No summary data received, using empty state");
          setSummary({
            meetingSummary: "",
            keyDiscussionPoints: [],
            participantContributions: {},
            participantCount: 0,
            notes : ""
          });

          if (response.code === "NO_API_KEY") {
            openPrompt();
            toast({
              title: "OpenRouter key required",
              description: "Add your API key to generate summaries.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Could not summarise this meeting",
              description: response.error || "The summarisation service returned an error.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        logger.meeting.error("Failed to fetch summary", { error });
        setSummary({
          meetingSummary: "",
          keyDiscussionPoints: [],
          participantContributions: {},
          participantCount: 0,
          notes : ""
        });
        toast({
          title: "Server Error",
          description: "API unavailable, showing sample summary data.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary().then(() =>
    toast({
      title: "Summary Generated",
      description: "Your meeting summary has been generated.",
    }));

    fetchTranscript().then(() => {
      toast({
        title: "Transcript Generated",
        description: "Your meeting transcript has been generated.",
      });
    })
  }, [meetingId, navigate, meetingDuration, toast]);

  const handleDownloadPDF = () => {
    if (!summary) return;

    setIsDownloading(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 20;

      const ACCENT : [number, number, number] = [60, 90, 180];
      const MUTED : [number, number, number] = [120, 120, 120];

      const ensureOnePage = (extraSpace = 0) => {
        if (yPos + extraSpace > pageHeight - margin) {
          throw new Error("PAGE_LIMIT_REACHED");
        }
      };

      // ===== HEADER =====
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...ACCENT);
      doc.text("Meeting Notes", margin, yPos);

      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(
          `Date: ${new Date().toLocaleDateString()} • Duration: ${
              sessionStorage.getItem("meetingDuration") ?? "—"
          }`,
          margin,
          yPos
      );

      yPos += 10;

      // Divider
      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // ===== SUMMARY =====
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text("Summary", margin, yPos);
      yPos += 6;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const summaryLines = doc.splitTextToSize(
          summary.meetingSummary || "—",
          contentWidth
      );
      ensureOnePage(summaryLines.length * 6);
      doc.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * 6 + 10;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Key Discussion Points", margin, yPos);
      yPos += 6;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      summary.keyDiscussionPoints.slice(0, 5).forEach((point) => {
        const lines = doc.splitTextToSize(`• ${point}`, contentWidth);
        ensureOnePage(lines.length * 6);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 6 + 2;
      });

      yPos += 8;

      // ===== PARTICIPANTS =====
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Participant Contributions", margin, yPos);
      yPos += 6;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      Object.entries(summary.participantContributions)
          .slice(0, 5)
          .forEach(([name, contribution], index) => {
            const text = `${index + 1}. ${name}: ${contribution}`;
            const lines = doc.splitTextToSize(text, contentWidth);
            ensureOnePage(lines.length * 6);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 6 + 2;
          });

      // ===== FOOTER =====
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(
          "Generated by Meeting Buddy",
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
      );

      doc.save(`meeting-notes-${new Date().toISOString().split("T")[0]}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: "Your meeting notes have been saved.",
      });
    } catch (error) {
      if (error.message === "PAGE_LIMIT_REACHED") {
        toast({
          title: "Too Much Content",
          description: "Summary exceeds one page. Please shorten the meeting notes.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Download Failed",
          description: "Could not generate PDF.",
          variant: "destructive",
        });
      }
    } finally {
      setIsDownloading(false);
    }
  };


  const handleNewMeeting = () => {
    // Clear session storage
    sessionStorage.clear();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Generating Summary
          </h2>
          <p className="text-muted-foreground">
            Our AI is analyzing your meeting notes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-4 border-b border-border">
        <AppLogo size="sm" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewMeeting}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          New Meeting
        </Button>
      </header>

      {/* Main content */}
      <div className="relative max-w-4xl mx-auto p-6 animate-fade-in">
        {/* Title section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Meeting Summary Ready
          </h1>
          <p className="text-muted-foreground">
            Here's what was discussed in your meeting
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card-elevated p-4 text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-lg font-bold text-foreground">{sessionStorage.getItem("meetingDuration")}</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
          <div className="card-elevated p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-2" />
            <div className="text-lg font-bold text-foreground">
              {summary?.participantCount || 0}
            </div>
            <div className="text-xs text-muted-foreground">Participants</div>
          </div>
        </div>

        {/* Summary card */}
        <div className="card-elevated p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">AI Summary</h2>
          </div>
          <p className="text-foreground leading-relaxed">{summary?.meetingSummary}</p>
        </div>

        {/* Key points and action items */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Key Points */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <h2 className="text-lg font-semibold text-foreground">Key Points</h2>
            </div>
            <ul className="space-y-3">
              {summary?.keyDiscussionPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-success/10 text-success text-xs flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-sm text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Items */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-4">
              <ListTodo className="w-5 h-5 text-warning" />
              <h2 className="text-lg font-semibold text-foreground">Participant Contributions</h2>
            </div>
            <ul className="space-y-3">
              {summary &&
                  Object.entries(summary.participantContributions).map(
                      ([name, contribution], index) => (
                          <li key={name} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-warning/10 text-warning text-xs flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-sm text-foreground">
                              <strong>{name}:</strong> {contribution}
                            </span>
                          </li>
                      )
                  )}
            </ul>
          </div>
        </div>

        {/* Download button */}
        <div className="text-center">
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="btn-primary inline-flex items-center gap-3 h-14 px-8 text-lg"
          >
            {isDownloading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download PDF</span>
              </>
            )}
          </Button>
        </div>

        {transcript && (
            <div className="card-elevated p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Full Transcription
                </h2>
              </div>

              <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                {transcript}
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPage;
