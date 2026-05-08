import React, { forwardRef } from "react";
import { Check, Circle, AlertCircle, Loader2 } from "lucide-react";

interface StatusBadgeProps {
  status: "idle" | "loading" | "success" | "error";
  label: string;
}

const StatusBadge = forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, label }, ref) => {
    const statusConfig = {
      idle: {
        bg: "bg-muted",
        text: "text-muted-foreground",
        icon: Circle,
        dotColor: "bg-muted-foreground",
      },
      loading: {
        bg: "bg-primary/10",
        text: "text-primary",
        icon: Loader2,
        dotColor: "bg-primary",
      },
      success: {
        bg: "bg-success/10",
        text: "text-success",
        icon: Check,
        dotColor: "bg-success",
      },
      error: {
        bg: "bg-destructive/10",
        text: "text-destructive",
        icon: AlertCircle,
        dotColor: "bg-destructive",
      },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <div
        ref={ref}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.text} text-sm font-medium`}
      >
        <div className="status-indicator">
          {status === "loading" || status === "success" ? (
            <span className={`status-dot-pulse ${config.dotColor}`}></span>
          ) : null}
          <span className={`status-dot ${config.dotColor}`}></span>
        </div>
        <Icon
          className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`}
        />
        <span>{label}</span>
      </div>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

export default StatusBadge;
