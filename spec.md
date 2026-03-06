# Self-Healing DevOps Agent

## Current State
New project with no existing code.

## Requested Changes (Diff)

### Add
- A dashboard UI simulating a Self-Healing Autonomous DevOps Agent
- Live error log feed panel showing simulated 500 errors / crash events
- Root Cause Analysis (RCA) panel showing AI-generated analysis per error
- Pipeline stages visualization: Monitor -> RCA -> Fix -> Sandbox -> PR
- Incident log/history table with status (Detected, Analyzing, Fixed, PR Submitted)
- Code diff viewer showing simulated AI-generated patch
- Pull Request preview panel with auto-generated explanation
- Agent activity feed / timeline
- Stats/metrics bar: errors detected, patches applied, PRs submitted, uptime
- "Made by Krushna Joshi" footer credit
- Unique, dark tech/terminal aesthetic layout

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Backend: Store incident records with fields: id, timestamp, errorType, filePath, lineNumber, rcaSummary, patchStatus (Detected | Analyzing | Patching | Sandboxing | PRSubmitted | Fixed), prUrl
2. Backend: CRUD for incidents - createIncident, getIncidents, updateIncidentStatus
3. Backend: Agent stats - getStats returning counts of detected/fixed/prs
4. Frontend: Dark terminal-themed layout with sidebar navigation
5. Frontend: Dashboard overview with metrics cards at top
6. Frontend: Live error feed panel (left column) with simulated incoming errors
7. Frontend: Incident detail panel (right column) with pipeline stage tracker
8. Frontend: Incidents history table with status badges
9. Frontend: Code diff viewer with syntax highlighting simulation
10. Frontend: PR preview modal
11. Frontend: Agent activity timeline/log
12. Frontend: Footer with "Made by Krushna Joshi"
