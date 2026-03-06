import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ActivityLog {
    id: bigint;
    action: string;
    incidentId: bigint;
    timestamp: bigint;
    details: string;
}
export interface Incident {
    id: bigint;
    status: IncidentStatus;
    prDescription: string;
    rcaSummary: string;
    testCode: string;
    errorMessage: string;
    filePath: string;
    prTitle: string;
    patchCode: string;
    errorType: string;
    lineNumber: bigint;
    timestamp: bigint;
    prUrl: string;
}
export enum IncidentStatus {
    Analyzing = "Analyzing",
    Failed = "Failed",
    Patching = "Patching",
    Detected = "Detected",
    Sandboxing = "Sandboxing",
    Fixed = "Fixed",
    PRSubmitted = "PRSubmitted"
}
export interface backendInterface {
    createIncident(errorType: string, filePath: string, lineNumber: bigint, errorMessage: string): Promise<bigint>;
    deleteIncident(id: bigint): Promise<void>;
    getActivityLog(): Promise<Array<ActivityLog>>;
    getIncident(id: bigint): Promise<Incident | null>;
    getIncidentActivity(incidentId: bigint): Promise<Array<ActivityLog>>;
    getIncidents(): Promise<Array<Incident>>;
    updateIncidentStatus(id: bigint, status: IncidentStatus, rcaSummary: string, patchCode: string, testCode: string, prUrl: string, prTitle: string, prDescription: string): Promise<void>;
}
