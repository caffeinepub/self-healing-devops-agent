import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Incident } from "../backend.d";
import { IncidentDetail } from "../components/IncidentDetail";
import { PRModal } from "../components/PRModal";
import { StatusBadge } from "../components/StatusBadge";
import {
  IncidentStatus,
  useCreateIncident,
  useDeleteIncident,
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
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
}

export function Incidents() {
  const { data: incidents = [], isLoading } = useIncidents();
  const createIncident = useCreateIncident();
  const updateStatus = useUpdateIncidentStatus();
  const deleteIncident = useDeleteIncident();

  const [simulating, setSimulating] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [prModalIncident, setPrModalIncident] = useState<Incident | null>(null);

  const handleSimulate = useCallback(async () => {
    if (simulating) return;
    setSimulating(true);
    toast("Simulation started...", {
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
      }

      toast.success("Incident resolved!", {
        style: {
          background: "oklch(0.12 0.015 260)",
          border: "1px solid oklch(0.82 0.22 145 / 0.6)",
          color: "oklch(0.82 0.22 145)",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "12px",
        },
      });
    } catch {
      toast.error("Simulation failed");
    } finally {
      setSimulating(false);
    }
  }, [simulating, createIncident, updateStatus]);

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: bigint) => {
      e.stopPropagation();
      try {
        await deleteIncident.mutateAsync(id);
        if (selectedIncident?.id === id) setSelectedIncident(null);
        toast("Incident deleted", {
          style: {
            background: "oklch(0.12 0.015 260)",
            border: "1px solid oklch(0.65 0.24 25 / 0.4)",
            color: "oklch(0.65 0.24 25)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
          },
        });
      } catch {
        toast.error("Failed to delete incident");
      }
    },
    [deleteIncident, selectedIncident],
  );

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "oklch(0.1 0.01 260)" }}
    >
      {/* Header */}
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
              className="font-mono text-xs font-bold tracking-widest"
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
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            data-ocid="nav.dashboard_link"
            className="font-mono text-xs px-3 py-1.5 rounded tracking-wider transition-all duration-200 hover:opacity-80"
            style={{
              color: "oklch(0.55 0.04 200)",
              border: "1px solid transparent",
            }}
          >
            DASHBOARD
          </Link>
          <Link
            to="/incidents"
            data-ocid="nav.incidents_link"
            className="font-mono text-xs px-3 py-1.5 rounded tracking-wider transition-all duration-200"
            style={{
              background: "oklch(0.82 0.22 145 / 0.1)",
              border: "1px solid oklch(0.82 0.22 145 / 0.3)",
              color: "oklch(0.82 0.22 145)",
            }}
          >
            INCIDENTS
          </Link>
        </nav>
      </header>

      {/* Page header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "oklch(0.18 0.02 260)" }}
      >
        <div>
          <h1
            className="font-mono text-sm font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.85 0.04 200)" }}
          >
            ◈ Incident History
          </h1>
          <p
            className="font-mono text-xs mt-0.5"
            style={{ color: "oklch(0.45 0.04 200)" }}
          >
            {incidents.length} total incidents ·{" "}
            {incidents.filter((i) => i.status === IncidentStatus.Fixed).length}{" "}
            resolved
          </p>
        </div>
        <button
          type="button"
          data-ocid="incidents.simulate_button"
          onClick={handleSimulate}
          disabled={simulating}
          className="font-mono text-xs px-4 py-2 rounded tracking-wider transition-all duration-200 disabled:opacity-50"
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
          {simulating ? "⟳ SIMULATING..." : "▶ SIMULATE NEW INCIDENT"}
        </button>
      </div>

      {/* Main content: table + detail panel */}
      <div className="flex flex-1 gap-2 px-4 py-2 overflow-hidden">
        {/* Table */}
        <div
          className="panel rounded flex-1 flex flex-col min-w-0"
          style={{ minHeight: 0 }}
        >
          <div className="panel-header">
            <span style={{ color: "oklch(0.72 0.18 200)" }}>▤</span>
            <span>ALL INCIDENTS</span>
          </div>
          <ScrollArea className="flex-1">
            <Table data-ocid="incidents.table">
              <TableHeader>
                <TableRow
                  style={{
                    borderColor: "oklch(0.22 0.03 200)",
                    background: "oklch(0.13 0.015 260)",
                  }}
                >
                  {[
                    "ID",
                    "TIMESTAMP",
                    "ERROR TYPE",
                    "FILE PATH",
                    "LINE",
                    "STATUS",
                    "ACTIONS",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="font-mono text-xs tracking-widest py-2"
                      style={{ color: "oklch(0.45 0.04 200)" }}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 font-mono text-xs"
                      style={{ color: "oklch(0.45 0.04 200)" }}
                    >
                      Loading incidents...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && incidents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      data-ocid="incidents.empty_state"
                      className="text-center py-8 font-mono text-xs"
                      style={{ color: "oklch(0.35 0.04 200)" }}
                    >
                      No incidents recorded. Click "Simulate New Incident" to
                      begin.
                    </TableCell>
                  </TableRow>
                )}
                {incidents
                  .slice()
                  .reverse()
                  .map((incident, idx) => (
                    <TableRow
                      key={incident.id.toString()}
                      data-ocid={`incidents.row.${idx + 1}`}
                      onClick={() => setSelectedIncident(incident)}
                      className="cursor-pointer transition-colors duration-150"
                      style={{
                        borderColor: "oklch(0.18 0.02 260)",
                        background:
                          selectedIncident?.id === incident.id
                            ? "oklch(0.72 0.18 200 / 0.05)"
                            : "transparent",
                      }}
                    >
                      <TableCell
                        className="font-mono text-xs py-2"
                        style={{ color: "oklch(0.55 0.04 200)" }}
                      >
                        INC-{incident.id.toString().padStart(4, "0")}
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs py-2"
                        style={{ color: "oklch(0.6 0.04 200)" }}
                      >
                        {formatTimestamp(incident.timestamp)}
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs py-2 font-semibold"
                        style={{ color: "oklch(0.85 0.06 200)" }}
                      >
                        {incident.errorType}
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs py-2 max-w-[160px] truncate"
                        style={{ color: "oklch(0.55 0.04 200)" }}
                      >
                        {incident.filePath}
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs py-2"
                        style={{ color: "oklch(0.55 0.04 200)" }}
                      >
                        :{incident.lineNumber.toString()}
                      </TableCell>
                      <TableCell className="py-2">
                        <StatusBadge status={incident.status} />
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          {incident.prUrl && (
                            <button
                              type="button"
                              data-ocid="pr_modal.open_modal_button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrModalIncident(incident);
                              }}
                              className="font-mono text-xs px-2 py-0.5 rounded transition-all duration-200 hover:opacity-80"
                              style={{
                                background: "oklch(0.72 0.18 200 / 0.1)",
                                border: "1px solid oklch(0.72 0.18 200 / 0.3)",
                                color: "oklch(0.72 0.18 200)",
                              }}
                            >
                              PR
                            </button>
                          )}
                          <button
                            type="button"
                            data-ocid={`incidents.delete_button.${idx + 1}`}
                            onClick={(e) => handleDelete(e, incident.id)}
                            className="font-mono text-xs px-2 py-0.5 rounded transition-all duration-200 hover:opacity-80"
                            style={{
                              background: "oklch(0.65 0.24 25 / 0.1)",
                              border: "1px solid oklch(0.65 0.24 25 / 0.3)",
                              color: "oklch(0.65 0.24 25)",
                            }}
                          >
                            DEL
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* Detail sidebar */}
        <div
          className="panel rounded flex flex-col"
          style={{ width: "320px", minHeight: 0 }}
        >
          <div className="panel-header justify-between">
            <div className="flex items-center gap-2">
              <span style={{ color: "oklch(0.62 0.2 240)" }}>⊙</span>
              <span>DETAIL</span>
            </div>
            {selectedIncident && (
              <button
                type="button"
                data-ocid="incident_detail.close_button"
                onClick={() => setSelectedIncident(null)}
                className="font-mono text-xs opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "oklch(0.55 0.04 200)" }}
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <IncidentDetail incident={selectedIncident} />
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

      {prModalIncident && (
        <PRModal
          incident={prModalIncident}
          onClose={() => setPrModalIncident(null)}
        />
      )}
    </div>
  );
}
