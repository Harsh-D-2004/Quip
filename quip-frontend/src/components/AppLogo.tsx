import React, { forwardRef } from "react";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const AppLogo = forwardRef<HTMLDivElement, AppLogoProps>(
  ({ size = "md", showText = false }, ref) => {
    const textSizes = {
      sm: "text-xl",
      md: "text-2xl",
      lg: "text-4xl",
    };

    return (
      <div ref={ref} className="flex items-center gap-2">
        <span className={`${textSizes[size]} font-bold tracking-tight`}>
          <span className="text-primary">Q</span>
          <span className="text-foreground">uip</span>
        </span>
        {showText && (
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            AI Notes
          </span>
        )}
      </div>
    );
  }
);

AppLogo.displayName = "AppLogo";

export default AppLogo;
