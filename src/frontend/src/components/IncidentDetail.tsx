import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import type { Incident } from "../backend.d";
import { IncidentStatus } from "../hooks/useQueries";
import { PRModal } from "./PRModal";
import { StatusBadge } from "./StatusBadge";

interface IncidentDetailProps {
  incident: Incident | null;
}

type Tab = "rca" | "patch" | "test" | "pr";

function formatTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
}

function PatchViewer({ code }: { code: string }) {
  if (!code) {
    return (
      <div
        className="text-xs font-mono opacity-40 p-3"
        style={{ color: "oklch(0.6 0.04 200)" }}
      >
        No patch available yet...
      </div>
    );
  }

  const lines = code.split("\n");
  return (
    <div className="font-mono text-xs leading-5">
      {lines.map((line, i) => {
        const isAdd = line.startsWith("+") && !line.startsWith("+++");
        const isRemove = line.startsWith("-") && !line.startsWith("---");
        const isHeader =
          line.startsWith("@@") ||
          line.startsWith("---") ||
          line.startsWith("+++");

        let cls = "diff-neutral";
        if (isAdd) cls = "diff-add";
        else if (isRemove) cls = "diff-remove";
        else if (isHeader) cls = "text-xs opacity-50 pl-2";

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: line index is stable
          <div key={i} className={`${cls} block whitespace-pre-wrap break-all`}>
            {line || " "}
          </div>
        );
      })}
    </div>
  );
}

export function IncidentDetail({ incident }: IncidentDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("rca");
  const [prModalOpen, setPrModalOpen] = useState(false);

  if (!incident) {
    return (
      <div
        data-ocid="incident_detail.panel"
        className="flex flex-col items-center justify-center h-full gap-3 text-center px-4"
      >
        <div
          className="text-4xl opacity-20"
          style={{ color: "oklch(0.62 0.2 240)" }}
        >
          ⊙
        </div>
        <p
          className="font-mono text-xs uppercase tracking-widest opacity-40"
          style={{ color: "oklch(0.62 0.2 240)" }}
        >
          No incident selected
        </p>
        <p
          className="text-xs opacity-25"
          style={{ color: "oklch(0.6 0.04 200)" }}
        >
          Select an incident from the feed to view RCA, patch code, and test
          results
        </p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "rca", label: "RCA" },
    { id: "patch", label: "PATCH" },
    { id: "test", label: "TESTS" },
    { id: "pr", label: "PR" },
  ];

  return (
    <div data-ocid="incident_detail.panel" className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-3 py-2 border-b"
        style={{ borderColor: "oklch(0.28 0.04 200)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className="font-mono text-xs"
            style={{ color: "oklch(0.55 0.04 200)" }}
          >
            INC-{incident.id.toString().padStart(4, "0")}
          </span>
          <StatusBadge status={incident.status} />
        </div>
        <div
          className="font-mono text-sm font-bold truncate"
          style={{ color: "oklch(0.92 0.04 165)" }}
        >
          {incident.errorType}
        </div>
        <div
          className="font-mono text-xs truncate mt-0.5"
          style={{ color: "oklch(0.55 0.04 200)" }}
        >
          {incident.filePath}:{incident.lineNumber.toString()}
        </div>
        <div
          className="text-xs mt-1 truncate"
          style={{ color: "oklch(0.65 0.24 25)" }}
        >
          {incident.errorMessage}
        </div>
        <div
          className="font-mono text-xs mt-1 opacity-50"
          style={{ color: "oklch(0.6 0.04 200)" }}
        >
          {formatTimestamp(incident.timestamp)}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: "oklch(0.28 0.04 200)" }}
      >
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 font-mono text-xs py-1.5 tracking-wider transition-all duration-200"
            style={{
              color:
                activeTab === tab.id
                  ? "oklch(0.72 0.18 200)"
                  : "oklch(0.4 0.04 200)",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid oklch(0.72 0.18 200)"
                  : "2px solid transparent",
              background:
                activeTab === tab.id
                  ? "oklch(0.72 0.18 200 / 0.05)"
                  : "transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {activeTab === "rca" && (
            <div>
              {incident.rcaSummary ? (
                <div
                  className="font-mono text-xs leading-5 whitespace-pre-wrap"
                  style={{ color: "oklch(0.75 0.06 200)" }}
                >
                  {incident.rcaSummary}
                </div>
              ) : (
                <div
                  className="font-mono text-xs opacity-40"
                  style={{ color: "oklch(0.6 0.04 200)" }}
                >
                  {incident.status === IncidentStatus.Detected
                    ? "Waiting for analysis to begin..."
                    : "Analysis in progress..."}
                </div>
              )}
            </div>
          )}

          {activeTab === "patch" && (
            <div
              className="rounded p-2"
              style={{
                background: "oklch(0.08 0.01 260)",
                border: "1px solid oklch(0.22 0.03 200)",
              }}
            >
              <PatchViewer code={incident.patchCode} />
            </div>
          )}

          {activeTab === "test" && (
            <div
              className="rounded p-2"
              style={{
                background: "oklch(0.08 0.01 260)",
                border: "1px solid oklch(0.22 0.03 200)",
              }}
            >
              {incident.testCode ? (
                <pre
                  className="font-mono text-xs leading-5 whitespace-pre-wrap break-all"
                  style={{ color: "oklch(0.82 0.22 145)" }}
                >
                  {incident.testCode}
                </pre>
              ) : (
                <div
                  className="font-mono text-xs opacity-40"
                  style={{ color: "oklch(0.6 0.04 200)" }}
                >
                  Test code will appear after patch generation...
                </div>
              )}
            </div>
          )}

          {activeTab === "pr" && (
            <div className="flex flex-col gap-3">
              {incident.prTitle ? (
                <>
                  <div>
                    <div
                      className="font-mono text-xs opacity-60 mb-1 tracking-wider"
                      style={{ color: "oklch(0.55 0.04 200)" }}
                    >
                      PR TITLE
                    </div>
                    <div
                      className="font-mono text-xs font-semibold"
                      style={{ color: "oklch(0.92 0.04 165)" }}
                    >
                      {incident.prTitle}
                    </div>
                  </div>
                  {incident.prDescription && (
                    <div>
                      <div
                        className="font-mono text-xs opacity-60 mb-1 tracking-wider"
                        style={{ color: "oklch(0.55 0.04 200)" }}
                      >
                        DESCRIPTION
                      </div>
                      <div
                        className="font-mono text-xs leading-5 whitespace-pre-wrap"
                        style={{ color: "oklch(0.75 0.06 200)" }}
                      >
                        {incident.prDescription}
                      </div>
                    </div>
                  )}
                  {incident.prUrl && (
                    <button
                      type="button"
                      data-ocid="pr_modal.open_modal_button"
                      onClick={() => setPrModalOpen(true)}
                      className="w-full py-1.5 rounded font-mono text-xs font-semibold tracking-wider transition-all duration-200 hover:opacity-90"
                      style={{
                        background: "oklch(0.72 0.18 200 / 0.15)",
                        border: "1px solid oklch(0.72 0.18 200 / 0.5)",
                        color: "oklch(0.72 0.18 200)",
                      }}
                    >
                      VIEW PR DETAILS
                    </button>
                  )}
                </>
              ) : (
                <div
                  className="font-mono text-xs opacity-40"
                  style={{ color: "oklch(0.6 0.04 200)" }}
                >
                  PR will be created after sandbox verification...
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {prModalOpen && incident && (
        <PRModal incident={incident} onClose={() => setPrModalOpen(false)} />
      )}
    </div>
  );
}
