import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ActivityLog, Incident } from "../backend.d";
import { HealingPipeline } from "../components/HealingPipeline";
import { IncidentDetail } from "../components/IncidentDetail";
import { StatusBadge } from "../components/StatusBadge";
import {
  IncidentStatus,
  useActivityLog,
  useCreateIncident,
  useIncidents,
  useUpdateIncidentStatus,
} from "../hooks/useQueries";
import {
  PIPELINE_STAGES,
  getRandomSimulationData,
  getSimulationStageData,
} from "../utils/simulation";

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString();
}

function formatActivityTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function severityColor(errorType: string): string {
  if (["DatabaseConnectionError", "NullPointerException"].includes(errorType)) {
    return "oklch(0.65 0.24 25)";
  }
  if (["KeyError", "TimeoutError"].includes(errorType)) {
    return "oklch(0.85 0.2 95)";
  }
  return "oklch(0.72 0.2 240)";
}

function MetricCard({
  label,
  value,
  color,
  icon,
  ocid,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: string;
  ocid: string;
}) {
  return (
    <div
      data-ocid={ocid}
      className="panel rounded flex flex-col gap-1 px-3 py-2 relative overflow-hidden"
      style={{ border: `1px solid ${color}30` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
        }}
      />
      <div
        className="font-mono text-xs tracking-widest opacity-60 uppercase"
        style={{ color }}
      >
        {icon} {label}
      </div>
      <div className="font-mono text-2xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: incidents = [], isLoading: incidentsLoading } = useIncidents();
  const { data: activityLog = [] } = useActivityLog();
  const createIncident = useCreateIncident();
  const updateStatus = useUpdateIncidentStatus();
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [simulating, setSimulating] = useState(false);

  const selectedIncident: Incident | null =
    incidents.find((i) => i.id === selectedId) ?? null;

  const metrics = {
    detected: incidents.length,
    fixed: incidents.filter((i) => i.status === IncidentStatus.Fixed).length,
    prs: incidents.filter(
      (i) =>
        i.status === IncidentStatus.PRSubmitted ||
        i.status === IncidentStatus.Fixed,
    ).length,
    uptime: "99.97%",
  };

  const handleSimulate = useCallback(async () => {
    if (simulating) return;
    setSimulating(true);
    toast("Simulation started — monitoring for new incident...", {
      style: {
        background: "oklch(0.12 0.015 260)",
        border: "1px solid oklch(0.72 0.18 200 / 0.4)",
        color: "oklch(0.72 0.18 200)",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "12px",
      },
    });

    try {
      const { errorType, filePath, lineNumber, errorMessage } =
        getRandomSimulationData();
      const id = await createIncident.mutateAsync({
        errorType,
        filePath,
        lineNumber,
        errorMessage,
      });

      setSelectedId(id);

      const stageData = getSimulationStageData(errorType);
      const stagesToProgress = PIPELINE_STAGES.slice(1);
      const delays = [2000, 3000, 3000, 4000, 2000];

      for (let i = 0; i < stagesToProgress.length; i++) {
        await new Promise((r) => setTimeout(r, delays[i] ?? 2000));
        const status = stagesToProgress[i];
        if (!status) break;
        await updateStatus.mutateAsync({
          id,
          status,
          rcaSummary: stageData.rcaSummary,
          patchCode: i >= 1 ? stageData.patchCode : "",
          testCode: i >= 1 ? stageData.testCode : "",
          prUrl: i >= 3 ? stageData.prUrl : "",
          prTitle: i >= 3 ? stageData.prTitle : "",
          prDescription: i >= 3 ? stageData.prDescription : "",
        });
        toast(`Pipeline: ${status}`, {
          style: {
            background: "oklch(0.12 0.015 260)",
            border: "1px solid oklch(0.82 0.22 145 / 0.4)",
            color: "oklch(0.82 0.22 145)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
          },
        });
      }

      toast.success("Incident resolved — PR submitted!", {
        style: {
          background: "oklch(0.12 0.015 260)",
          border: "1px solid oklch(0.82 0.22 145 / 0.6)",
          color: "oklch(0.82 0.22 145)",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "12px",
        },
      });
    } catch {
      toast.error("Simulation failed — check backend connection");
    } finally {
      setSimulating(false);
    }
  }, [simulating, createIncident, updateStatus]);

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "oklch(0.1 0.01 260)" }}
    >
      {/* Top navigation bar */}
      <header
        className="flex items-center justify-between px-4 py-2 border-b relative"
        style={{
          borderColor: "oklch(0.28 0.04 200)",
          background: "oklch(0.11 0.015 260)",
        }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.72 0.18 200 / 0.4), oklch(0.82 0.22 145 / 0.4), transparent)",
          }}
        />
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-sm"
            style={{
              background: "oklch(0.82 0.22 145 / 0.15)",
              border: "1px solid oklch(0.82 0.22 145 / 0.5)",
              color: "oklch(0.82 0.22 145)",
              boxShadow: "0 0 10px oklch(0.82 0.22 145 / 0.3)",
            }}
          >
            ⟳
          </div>
          <div>
            <div
              className="font-mono text-xs font-bold tracking-widest glitch-text"
              style={{ color: "oklch(0.92 0.04 165)" }}
            >
              SELF-HEALING DEVOPS AGENT
            </div>
            <div
              className="font-mono text-xs tracking-wide"
              style={{ color: "oklch(0.55 0.04 200)" }}
            >
              v2.0 · Vertex AI · Docker Sandbox
            </div>
          </div>
        </div>

        {/* Agent status */}
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full pulse-green"
            style={{ background: "oklch(0.82 0.22 145)" }}
          />
          <span
            className="font-mono text-xs tracking-widest"
            style={{ color: "oklch(0.82 0.22 145)" }}
          >
            AGENT ONLINE
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            data-ocid="nav.dashboard_link"
            className="font-mono text-xs px-3 py-1.5 rounded tracking-wider transition-all duration-200"
            style={{
              background: "oklch(0.82 0.22 145 / 0.1)",
              border: "1px solid oklch(0.82 0.22 145 / 0.3)",
              color: "oklch(0.82 0.22 145)",
            }}
          >
            DASHBOARD
          </Link>
          <Link
            to="/incidents"
            data-ocid="nav.incidents_link"
            className="font-mono text-xs px-3 py-1.5 rounded tracking-wider transition-all duration-200 hover:opacity-80"
            style={{
              color: "oklch(0.55 0.04 200)",
              border: "1px solid transparent",
            }}
          >
            INCIDENTS
          </Link>
        </nav>
      </header>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2">
        <MetricCard
          ocid="metrics.detected_card"
          label="Errors Detected"
          value={metrics.detected}
          color="oklch(0.65 0.24 25)"
          icon="◉"
        />
        <MetricCard
          ocid="metrics.fixed_card"
          label="Patches Applied"
          value={metrics.fixed}
          color="oklch(0.82 0.22 145)"
          icon="⚒"
        />
        <MetricCard
          ocid="metrics.prs_card"
          label="PRs Submitted"
          value={metrics.prs}
          color="oklch(0.72 0.18 200)"
          icon="⬆"
        />
        <MetricCard
          ocid="metrics.uptime_card"
          label="System Uptime"
          value={metrics.uptime}
          color="oklch(0.72 0.2 240)"
          icon="◈"
        />
      </div>

      {/* Main 3-column layout */}
      <div
        className="flex-1 grid px-4 gap-2 pb-2"
        style={{ gridTemplateColumns: "1fr 220px 1fr", minHeight: 0 }}
      >
        {/* LEFT: Live Error Feed */}
        <div
          className="panel rounded flex flex-col"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div className="panel-header justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "oklch(0.65 0.24 25)" }}
              />
              <span>LIVE ERROR FEED</span>
            </div>
            <span
              className="font-mono text-xs"
              style={{ color: "oklch(0.4 0.04 200)" }}
            >
              {incidents.length} incidents
            </span>
          </div>
          <ScrollArea className="flex-1">
            {incidentsLoading && (
              <div className="p-4 text-center">
                <div
                  className="font-mono text-xs animate-pulse"
                  style={{ color: "oklch(0.55 0.04 200)" }}
                >
                  Connecting to monitoring service...
                </div>
              </div>
            )}
            {!incidentsLoading && incidents.length === 0 && (
              <div data-ocid="feed.empty_state" className="p-4 text-center">
                <div
                  className="font-mono text-xs opacity-40"
                  style={{ color: "oklch(0.55 0.04 200)" }}
                >
                  No incidents detected.
                  <br />
                  System operating normally.
                </div>
              </div>
            )}
            <div
              className="divide-y"
              style={{ borderColor: "oklch(0.18 0.02 260)" }}
            >
              {incidents
                .slice()
                .reverse()
                .map((incident, idx) => (
                  <button
                    type="button"
                    key={incident.id.toString()}
                    data-ocid={`feed.item.${idx + 1}`}
                    onClick={() => setSelectedId(incident.id)}
                    className="w-full text-left px-3 py-2 transition-all duration-200 hover:bg-[oklch(0.15_0.02_260)] focus:outline-none"
                    style={{
                      background:
                        selectedId === incident.id
                          ? "oklch(0.72 0.18 200 / 0.08)"
                          : "transparent",
                      borderLeft:
                        selectedId === incident.id
                          ? "2px solid oklch(0.72 0.18 200)"
                          : "2px solid transparent",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              background: severityColor(incident.errorType),
                            }}
                          />
                          <span
                            className="font-mono text-xs font-semibold truncate"
                            style={{ color: "oklch(0.85 0.06 200)" }}
                          >
                            {incident.errorType}
                          </span>
                        </div>
                        <div
                          className="font-mono text-xs truncate"
                          style={{ color: "oklch(0.55 0.04 200)" }}
                        >
                          {incident.filePath}:{incident.lineNumber.toString()}
                        </div>
                        <div
                          className="font-mono text-xs truncate mt-0.5 opacity-70"
                          style={{ color: "oklch(0.65 0.24 25)" }}
                        >
                          {incident.errorMessage.substring(0, 50)}
                          {incident.errorMessage.length > 50 ? "…" : ""}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <StatusBadge status={incident.status} />
                        <span
                          className="font-mono text-xs opacity-50"
                          style={{ color: "oklch(0.55 0.04 200)" }}
                        >
                          {formatTimestamp(incident.timestamp)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </ScrollArea>
        </div>

        {/* CENTER: Healing Pipeline */}
        <div
          className="panel rounded flex flex-col"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div className="panel-header justify-between">
            <div className="flex items-center gap-2">
              <span style={{ color: "oklch(0.82 0.22 145)" }}>◈</span>
              <span>PIPELINE</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <HealingPipeline incident={selectedIncident} />
          </div>
        </div>

        {/* RIGHT: Incident Detail */}
        <div
          className="panel rounded flex flex-col"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          <div className="panel-header">
            <span style={{ color: "oklch(0.62 0.2 240)" }}>⊙</span>
            <span>INCIDENT DETAIL</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <IncidentDetail incident={selectedIncident} />
          </div>
        </div>
      </div>

      {/* Bottom: Activity Timeline + Simulate button */}
      <div className="panel mx-4 mb-2 rounded" style={{ maxHeight: "120px" }}>
        <div className="panel-header justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "oklch(0.72 0.2 240)" }}
            />
            <span>AGENT ACTIVITY LOG</span>
          </div>
          <button
            type="button"
            data-ocid="dashboard.simulate_button"
            onClick={handleSimulate}
            disabled={simulating}
            className="font-mono text-xs px-3 py-1 rounded tracking-wider transition-all duration-200 disabled:opacity-50"
            style={{
              background: simulating
                ? "oklch(0.82 0.22 145 / 0.05)"
                : "oklch(0.82 0.22 145 / 0.15)",
              border: "1px solid oklch(0.82 0.22 145 / 0.5)",
              color: "oklch(0.82 0.22 145)",
              boxShadow: simulating
                ? "none"
                : "0 0 8px oklch(0.82 0.22 145 / 0.2)",
            }}
          >
            {simulating ? "⟳ SIMULATING..." : "▶ SIMULATE INCIDENT"}
          </button>
        </div>

        <div className="timeline-scroll px-3 py-2">
          <div className="flex gap-3 min-w-max">
            {activityLog.length === 0 && (
              <div
                className="font-mono text-xs opacity-40"
                style={{ color: "oklch(0.55 0.04 200)" }}
              >
                No activity yet. Click "Simulate Incident" to begin.
              </div>
            )}
            {activityLog
              .slice()
              .reverse()
              .slice(0, 20)
              .map((log: ActivityLog) => (
                <div
                  key={log.id.toString()}
                  className="flex-shrink-0 flex flex-col gap-0.5 px-2 py-1 rounded"
                  style={{
                    background: "oklch(0.15 0.02 260)",
                    border: "1px solid oklch(0.25 0.03 200)",
                    minWidth: "160px",
                  }}
                >
                  <div
                    className="font-mono text-xs"
                    style={{ color: "oklch(0.72 0.18 200)" }}
                  >
                    {formatActivityTimestamp(log.timestamp)}
                  </div>
                  <div
                    className="font-mono text-xs font-semibold"
                    style={{ color: "oklch(0.85 0.06 200)" }}
                  >
                    {log.action}
                  </div>
                  <div
                    className="font-mono text-xs opacity-60 truncate max-w-[150px]"
                    style={{ color: "oklch(0.55 0.04 200)" }}
                  >
                    INC-{log.incidentId.toString().padStart(4, "0")} ·{" "}
                    {log.details}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="py-2 px-4 text-center border-t"
        style={{ borderColor: "oklch(0.18 0.02 260)" }}
      >
        <p
          className="font-mono text-xs tracking-wider"
          style={{ color: "oklch(0.35 0.04 200)" }}
        >
          Made by{" "}
          <span className="font-bold" style={{ color: "oklch(0.72 0.18 200)" }}>
            Krushna Joshi
          </span>{" "}
          · © {new Date().getFullYear()} · Built with{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
            style={{ color: "oklch(0.55 0.04 200)" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
