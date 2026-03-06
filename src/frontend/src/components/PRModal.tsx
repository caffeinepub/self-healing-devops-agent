import type { Incident } from "../backend.d";

interface PRModalProps {
  incident: Incident;
  onClose: () => void;
}

function PatchViewer({ code }: { code: string }) {
  if (!code) return null;
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
          // biome-ignore lint/suspicious/noArrayIndexKey: line index is stable here
          <div key={i} className={`${cls} block whitespace-pre-wrap break-all`}>
            {line || " "}
          </div>
        );
      })}
    </div>
  );
}

export function PRModal({ incident, onClose }: PRModalProps) {
  return (
    <div
      data-ocid="pr_modal.dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 0.85)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        className="panel w-full max-w-2xl max-h-[85vh] flex flex-col rounded"
        style={{
          border: "1px solid oklch(0.72 0.18 200 / 0.5)",
          boxShadow:
            "0 0 40px oklch(0.72 0.18 200 / 0.2), 0 0 80px oklch(0.62 0.2 240 / 0.1)",
        }}
      >
        {/* Header */}
        <div
          className="panel-header justify-between"
          style={{ borderColor: "oklch(0.28 0.04 200)" }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: "oklch(0.72 0.18 200)" }}>⬆</span>
            <span>PULL REQUEST PREVIEW</span>
          </div>
          <button
            type="button"
            data-ocid="pr_modal.close_button"
            onClick={onClose}
            className="font-mono text-xs hover:opacity-100 opacity-60 transition-opacity"
            style={{ color: "oklch(0.72 0.18 200)" }}
          >
            [CLOSE ✕]
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* PR Title */}
          <div>
            <div
              className="font-mono text-xs tracking-wider mb-1 opacity-60"
              style={{ color: "oklch(0.55 0.04 200)" }}
            >
              TITLE
            </div>
            <div
              className="font-mono text-sm font-bold"
              style={{ color: "oklch(0.92 0.04 165)" }}
            >
              {incident.prTitle}
            </div>
          </div>

          {/* Branch */}
          <div>
            <div
              className="font-mono text-xs tracking-wider mb-1 opacity-60"
              style={{ color: "oklch(0.55 0.04 200)" }}
            >
              BRANCH
            </div>
            <div
              className="font-mono text-xs px-2 py-1 rounded inline-block"
              style={{
                background: "oklch(0.82 0.22 145 / 0.1)",
                border: "1px solid oklch(0.82 0.22 145 / 0.3)",
                color: "oklch(0.82 0.22 145)",
              }}
            >
              fix/agent-{incident.errorType.toLowerCase().replace(/\s+/g, "-")}-
              {incident.id.toString()}
            </div>
          </div>

          {/* Description */}
          {incident.prDescription && (
            <div>
              <div
                className="font-mono text-xs tracking-wider mb-1 opacity-60"
                style={{ color: "oklch(0.55 0.04 200)" }}
              >
                DESCRIPTION
              </div>
              <div
                className="font-mono text-xs leading-5 whitespace-pre-wrap p-3 rounded"
                style={{
                  background: "oklch(0.08 0.01 260)",
                  border: "1px solid oklch(0.22 0.03 200)",
                  color: "oklch(0.75 0.06 200)",
                }}
              >
                {incident.prDescription}
              </div>
            </div>
          )}

          {/* Code diff */}
          {incident.patchCode && (
            <div>
              <div
                className="font-mono text-xs tracking-wider mb-1 opacity-60"
                style={{ color: "oklch(0.55 0.04 200)" }}
              >
                CODE DIFF
              </div>
              <div
                className="p-3 rounded overflow-x-auto"
                style={{
                  background: "oklch(0.08 0.01 260)",
                  border: "1px solid oklch(0.22 0.03 200)",
                }}
              >
                <PatchViewer code={incident.patchCode} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-2">
            {incident.prUrl && (
              <a
                href={incident.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded font-mono text-xs font-semibold tracking-wider text-center transition-all duration-200 hover:opacity-90"
                style={{
                  background: "oklch(0.82 0.22 145 / 0.15)",
                  border: "1px solid oklch(0.82 0.22 145 / 0.5)",
                  color: "oklch(0.82 0.22 145)",
                }}
              >
                ↗ VIEW ON GITHUB
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded font-mono text-xs font-semibold tracking-wider transition-all duration-200 hover:opacity-90"
              style={{
                background: "oklch(0.18 0.02 260)",
                border: "1px solid oklch(0.28 0.04 200)",
                color: "oklch(0.55 0.04 200)",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
