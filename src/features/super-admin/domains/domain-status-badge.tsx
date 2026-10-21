import React from "react";
import { Clock, CheckCircle2, ShieldCheck, AlertTriangle, XCircle } from "lucide-react";
import { getDomainStatusMeta, type DomainStatus } from "./types";

interface DomainStatusBadgeProps {
  status: DomainStatus;
  showIcon?: boolean;
  className?: string;
}

export function DomainStatusBadge({
  status,
  showIcon = true,
  className = "",
}: DomainStatusBadgeProps) {
  const meta = getDomainStatusMeta(status);

  const styleMap: Record<
    "pending" | "verified" | "active" | "suspended" | "retired",
    {
      badgeClass: string;
      dotClass: string;
      icon: React.ComponentType<{ className?: string; size?: number }>;
    }
  > = {
    pending: {
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      dotClass: "bg-amber-500 animate-pulse",
      icon: Clock,
    },
    verified: {
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      dotClass: "bg-blue-500",
      icon: ShieldCheck,
    },
    active: {
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      dotClass: "bg-emerald-500",
      icon: CheckCircle2,
    },
    suspended: {
      badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      dotClass: "bg-rose-500",
      icon: AlertTriangle,
    },
    retired: {
      badgeClass: "bg-muted/40 text-muted-foreground border-border/60",
      dotClass: "bg-muted-foreground",
      icon: XCircle,
    },
  };

  const style = styleMap[meta.variant] || styleMap.pending;
  const IconComponent = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.badgeClass} ${className}`}
      title={meta.description}
      aria-label={`Status: ${meta.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`} aria-hidden="true" />
      {showIcon && <IconComponent size={13} className="shrink-0" aria-hidden="true" />}
      <span>{meta.label}</span>
    </span>
  );
}
