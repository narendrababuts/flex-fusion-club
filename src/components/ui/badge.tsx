
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Check, Clock } from "lucide-react"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        success: "bg-success text-white",
        warning: "bg-orange-500 text-white",
        info: "bg-blue-600 text-white",
        outline: "border border-primary text-primary bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  statusType?: 'completed' | 'pending' | 'draft' | null;
  label?: string;
}

function Badge({ className, variant, statusType, label, children, ...props }: BadgeProps) {
  // Determine color/icon for status badge
  let icon = null;
  let v = variant;
  let badgeLabel = label || children;
  if (statusType === 'completed') {
    v = "success";
    icon = <Check size={14} className="text-white/90 mr-1" />;
  }
  if (statusType === 'pending') {
    v = "warning";
    icon = <Clock size={14} className="text-white/90 mr-1" />;
  }
  if (statusType === 'draft') {
    v = "info";
    icon = <Clock size={14} className="text-white/90 mr-1" />;
  }

  // Tooltip: show badgeLabel on hover if text is truncated
  return (
    <div
      className={cn(
        badgeVariants({ variant: v }),
        "max-w-[120px] truncate cursor-help relative",
        className
      )}
      title={typeof badgeLabel === "string" ? badgeLabel : undefined}
      {...props}
      style={{ fontSize: 13, lineHeight: 1.2, minHeight: 28 }}
    >
      {icon}
      <span className="truncate">{badgeLabel}</span>
    </div>
  )
}

export { Badge, badgeVariants }
