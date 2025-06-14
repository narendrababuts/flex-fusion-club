
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  current: number;
  min: number;
};

const getGaugeColor = (current: number, min: number) => {
  if (current >= min * 1.2) return "#23C55E"; // bright green;
  if (current >= min) return "#FACC15"; // yellow
  if (current > 0) return "#F87171"; // red
  return "#E11D48"; // deeper red when zero
};

export const StockGauge: React.FC<Props> = ({ current, min }) => {
  const percent = min === 0 ? 1 : Math.min(current / min, 1.25);
  const size = 44, stroke = 7, radius = (size - stroke) / 2, circ = 2 * Math.PI * radius, progress = Math.min(percent, 1) * circ, color = getGaugeColor(current, min);
  const status = current >= min ? "OK" : "Low";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg width={size} height={size} className="drop-shadow-lg" style={{ background: "#F4F8FB", borderRadius: "50%" }}>
          {/* 3D effect */}
          <defs>
            <linearGradient id="gauge-outline" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#bde7fa" />
              <stop offset="100%" stopColor="#C7FDE0" />
            </linearGradient>
          </defs>
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="#fff"
            stroke="url(#gauge-outline)"
            strokeWidth={stroke}
            opacity={0.7}
          />
          {/* Progress arc */}
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke + 1}
            strokeDasharray={circ}
            strokeDashoffset={circ-progress}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset .8s cubic-bezier(.45,1.8,.3,.8), stroke .3s" }}
            />
          {/* Center value */}
          <text
            x="50%" y="53%"
            textAnchor="middle"
            fontSize="14px"
            fontWeight="bold"
            fill="#1e3a8a"
            style={{ filter: "drop-shadow(0 1px white)" }}
          >
            {current}
          </text>
        </svg>
      </TooltipTrigger>
      <TooltipContent>
        <div className="font-medium">Current: {current} — Minimum: {min}</div>
        <div className={`text-xs mt-1 font-semibold ${status === "OK" ? "text-green-600" : "text-red-600"}`}>
          Status: {status}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default StockGauge;
