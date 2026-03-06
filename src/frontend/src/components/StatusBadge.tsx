import { IncidentStatus } from "../hooks/useQueries";

interface StatusBadgeProps {
  status: IncidentStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const classes: Record<IncidentStatus, string> = {
    [IncidentStatus.Detected]: "status-detected",
    [IncidentStatus.Analyzing]: "status-analyzing",
    [IncidentStatus.Patching]: "status-patching",
    [IncidentStatus.Sandboxing]: "status-sandboxing",
    [IncidentStatus.PRSubmitted]: "status-prsubmitted",
    [IncidentStatus.Fixed]: "status-fixed",
    [IncidentStatus.Failed]: "status-failed",
  };

  const icons: Record<IncidentStatus, string> = {
    [IncidentStatus.Detected]: "◉",
    [IncidentStatus.Analyzing]: "⟳",
    [IncidentStatus.Patching]: "⚒",
    [IncidentStatus.Sandboxing]: "⬡",
    [IncidentStatus.PRSubmitted]: "⬆",
    [IncidentStatus.Fixed]: "✓",
    [IncidentStatus.Failed]: "✗",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium ${classes[status]} ${className}`}
    >
      <span>{icons[status]}</span>
      {status}
    </span>
  );
}
