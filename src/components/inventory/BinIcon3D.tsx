
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  current: number;
  min: number;
  supplier: string;
  orderedOn?: string;
  lastUsed?: string;
}

function binColor(current: number, min: number) {
  if (current >= min * 1.2) return "#34d399"; // green
  if (current >= min) return "#facc15"; // yellow
  if (current > 0) return "#f87171"; // red
  return "#E11D48";
}

export const BinIcon3D: React.FC<Props> = ({ current, min, supplier, orderedOn, lastUsed }) => {
  const color = binColor(current, min);
  // 3D Perspective Box SVG
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <svg viewBox="0 0 40 34" width={40} height={34}
          className="drop-shadow-md"
          style={{ cursor: "pointer", display: "block" }}>
          {/* bottom face */}
          <polygon points="7,29 33,29 38,21 2,21" fill="#e5e7eb" />
          {/* left face */}
          <polygon points="2,21 7,29 7,10 2,2" fill="#cfd8dc" />
          {/* right face */}
          <polygon points="38,21 33,29 33,10 38,2" fill="#b0b6ba" />
          {/* top face */}
          <polygon points="7,10 33,10 38,2 2,2" fill="#dbeafe" />
          {/* bin fill (stock) */}
          <rect
            x={10}
            y={29 - Math.max(6, Math.round(16 * Math.min(current / Math.max(1, min), 1.2)))}
            width={20}
            height={Math.max(6, Math.round(16 * Math.min(current / Math.max(1, min), 1.2)))}
            rx={2}
            fill={color}
            style={{ filter: "brightness(.92)" }}
          />
          <rect x={10} y={29} width={20} height={2} fill="#999" opacity={.15}/>
          <rect x={10} y={27} width={20} height={2} fill="#222" opacity={.07}/>
          {/* outline */}
          <polygon points="7,29 33,29 38,21 2,21" fill="none" stroke="#203e70" strokeWidth="1.1"/>
          <polygon points="2,21 7,29 7,10 2,2" fill="none" stroke="#203e70" strokeWidth="1.1"/>
          <polygon points="38,21 33,29 33,10 38,2" fill="none" stroke="#203e70" strokeWidth="1.1"/>
          <polygon points="7,10 33,10 38,2 2,2" fill="none" stroke="#203e70" strokeWidth="1.1"/>
        </svg>
      </TooltipTrigger>
      <TooltipContent>
        <div><span className="font-semibold">Supplier:</span> {supplier}</div>
        {orderedOn && <div><span className="font-semibold">Ordered On:</span> {orderedOn}</div>}
        {lastUsed && <div><span className="font-semibold">Last Used:</span> {lastUsed}</div>}
      </TooltipContent>
    </Tooltip>
  );
};

export default BinIcon3D;
