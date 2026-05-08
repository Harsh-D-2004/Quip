import React from "react";

interface WaveformAnimationProps {
  bars?: number;
  className?: string;
}

const WaveformAnimation: React.FC<WaveformAnimationProps> = ({ 
  bars = 5, 
  className = "" 
}) => {
  return (
    <div className={`flex items-end justify-center gap-1 h-12 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 bg-primary rounded-full animate-waveform"
          style={{
            animationDelay: `${i * 0.15}s`,
            height: "100%",
          }}
        />
      ))}
    </div>
  );
};

export default WaveformAnimation;
