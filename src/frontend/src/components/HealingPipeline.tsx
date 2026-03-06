import type { Incident } from "../backend.d";
import { IncidentStatus } from "../hooks/useQueries";

interface HealingPipelineProps {
  incident: Incident | null;
}

const STAGES = [
  {
    id: IncidentStatus.Detected,
    label: "MONITOR",
    icon: "◈",
    desc: "Error Detected",
    ocid: "pipeline.monitor_stage",
  },
  {
    id: IncidentStatus.Analyzing,
    label: "RCA",
    icon: "⊕",
    desc: "Root Cause Analysis",
    ocid: "pipeline.rca_stage",
  },
  {
    id: IncidentStatus.Patching,
    label: "FIX",
    icon: "⚒",
    desc: "Patch Generation",
    ocid: "pipeline.fix_stage",
  },
  {
    id: IncidentStatus.Sandboxing,
    label: "SANDBOX",
    icon: "⬡",
    desc: "Docker Verification",
    ocid: "pipeline.sandbox_stage",
  },
  {
    id: IncidentStatus.PRSubmitted,
    label: "PR",
    icon: "⬆",
    desc: "GitHub Pull Request",
    ocid: "pipeline.pr_stage",
  },
  {
    id: IncidentStatus.Fixed,
    label: "FIXED",
    icon: "✓",
    desc: "Deployment Complete",
    ocid: "pipeline.monitor_stage",
  },
];

const STATUS_ORDER: Record<IncidentStatus, number> = {
  [IncidentStatus.Detected]: 0,
  [IncidentStatus.Analyzing]: 1,
  [IncidentStatus.Patching]: 2,
  [IncidentStatus.Sandboxing]: 3,
  [IncidentStatus.PRSubmitted]: 4,
  [IncidentStatus.Fixed]: 5,
  [IncidentStatus.Failed]: -1,
};

export function HealingPipeline({ incident }: HealingPipelineProps) {
  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
        <div
          className="text-4xl opacity-20"
          style={{ color: "oklch(0.72 0.18 200)" }}
        >
          ◈
        </div>
        <p
          className="font-mono text-xs uppercase tracking-widest opacity-40"
          style={{ color: "oklch(0.72 0.18 200)" }}
        >
          Select an incident
        </p>
        <p
          className="text-xs opacity-25"
          style={{ color: "oklch(0.6 0.04 200)" }}
        >
          Click any error in the live feed to visualize the healing pipeline
        </p>
      </div>
    );
  }

  const currentOrder =
    incident.status === IncidentStatus.Failed
      ? -1
      : STATUS_ORDER[incident.status];

  const isFailed = incident.status === IncidentStatus.Failed;

  return (
    <div className="flex flex-col items-center justify-center h-full py-4 gap-2 px-4">
      {/* Incident summary header */}
      <div className="w-full mb-2 text-center">
        <div
          className="font-mono text-xs tracking-wider mb-1"
          style={{ color: "oklch(0.55 0.04 200)" }}
        >
          INC-{incident.id.toString().padStart(4, "0")}
        </div>
        <div
          className="font-mono text-sm font-semibold truncate"
          style={{ color: "oklch(0.92 0.04 165)" }}
        >
          {incident.errorType}
        </div>
        <div
          className="font-mono text-xs truncate mt-0.5"
          style={{ color: "oklch(0.55 0.04 200)" }}
        >
          {incident.filePath}
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="flex flex-col items-center gap-0 w-full max-w-xs">
        {STAGES.map((stage, idx) => {
          const stageOrder = idx;
          const isCompleted = currentOrder > stageOrder;
          const isActive = currentOrder === stageOrder;
          const isPending = currentOrder < stageOrder;
          const isFailedStage = isFailed && stageOrder === currentOrder + 1;

          let nodeColor = "oklch(0.25 0.03 200)";
          let textColor = "oklch(0.4 0.04 200)";
          let borderColor = "oklch(0.28 0.04 200)";

          if (isFailed && idx <= currentOrder) {
            nodeColor = "oklch(0.65 0.24 25 / 0.1)";
            textColor = "oklch(0.65 0.24 25)";
            borderColor = "oklch(0.65 0.24 25)";
          } else if (isCompleted) {
            nodeColor = "oklch(0.82 0.22 145 / 0.15)";
            textColor = "oklch(0.82 0.22 145)";
            borderColor = "oklch(0.82 0.22 145)";
          } else if (isActive) {
            nodeColor = "oklch(0.72 0.18 200 / 0.15)";
            textColor = "oklch(0.72 0.18 200)";
            borderColor = "oklch(0.72 0.18 200)";
          }

          const unused = { isPending, isFailedStage };
          void unused;

          return (
            <div key={stage.id} className="flex flex-col items-center w-full">
              {/* Stage node */}
              <div
                data-ocid={stage.ocid}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded transition-all duration-500 ${isActive ? "pipeline-active" : ""}`}
                style={{
                  background: nodeColor,
                  border: `1px solid ${borderColor}`,
                  boxShadow: isActive
                    ? "0 0 12px oklch(0.72 0.18 200 / 0.4)"
                    : isCompleted
                      ? "0 0 6px oklch(0.82 0.22 145 / 0.2)"
                      : "none",
                }}
              >
                <div
                  className={`text-lg w-6 text-center font-mono ${isActive ? "animate-pulse" : ""}`}
                  style={{ color: textColor }}
                >
                  {stage.icon}
                </div>
                <div className="flex-1">
                  <div
                    className="font-mono text-xs font-bold tracking-widest"
                    style={{ color: textColor }}
                  >
                    {stage.label}
                  </div>
                  <div
                    className="font-mono text-xs opacity-70"
                    style={{ color: textColor }}
                  >
                    {stage.desc}
                  </div>
                </div>
                {isCompleted && !isFailed && (
                  <div
                    className="font-mono text-xs"
                    style={{ color: "oklch(0.82 0.22 145)" }}
                  >
                    ✓
                  </div>
                )}
                {isActive && !isFailed && (
                  <div
                    className="font-mono text-xs animate-pulse"
                    style={{ color: "oklch(0.72 0.18 200)" }}
                  >
                    ◌
                  </div>
                )}
                {isFailed && idx <= currentOrder && (
                  <div
                    className="font-mono text-xs"
                    style={{ color: "oklch(0.65 0.24 25)" }}
                  >
                    ✗
                  </div>
                )}
              </div>

              {/* Connector line */}
              {idx < STAGES.length - 1 && (
                <div className="flex flex-col items-center">
                  <div
                    className="w-px h-3 transition-all duration-500"
                    style={{
                      background:
                        isCompleted && !isFailed
                          ? "oklch(0.82 0.22 145 / 0.6)"
                          : isActive
                            ? "oklch(0.72 0.18 200 / 0.4)"
                            : "oklch(0.28 0.04 200 / 0.4)",
                    }}
                  />
                  <div
                    className="w-0 h-0"
                    style={{
                      borderLeft: "3px solid transparent",
                      borderRight: "3px solid transparent",
                      borderTop: `5px solid ${
                        isCompleted && !isFailed
                          ? "oklch(0.82 0.22 145 / 0.6)"
                          : "oklch(0.28 0.04 200 / 0.4)"
                      }`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
