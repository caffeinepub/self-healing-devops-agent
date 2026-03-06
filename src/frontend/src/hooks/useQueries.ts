import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IncidentStatus } from "../backend.d";
import type { ActivityLog, Incident } from "../backend.d";
import { useActor } from "./useActor";

export function useIncidents() {
  const { actor, isFetching } = useActor();
  return useQuery<Incident[]>({
    queryKey: ["incidents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getIncidents();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useIncident(id: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Incident | null>({
    queryKey: ["incident", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getIncident(id);
    },
    enabled: !!actor && !isFetching && id !== null,
    refetchInterval: 3000,
  });
}

export function useActivityLog() {
  const { actor, isFetching } = useActor();
  return useQuery<ActivityLog[]>({
    queryKey: ["activityLog"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActivityLog();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useIncidentActivity(incidentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ActivityLog[]>({
    queryKey: ["incidentActivity", incidentId?.toString()],
    queryFn: async () => {
      if (!actor || incidentId === null) return [];
      return actor.getIncidentActivity(incidentId);
    },
    enabled: !!actor && !isFetching && incidentId !== null,
    refetchInterval: 3000,
  });
}

export function useCreateIncident() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      errorType,
      filePath,
      lineNumber,
      errorMessage,
    }: {
      errorType: string;
      filePath: string;
      lineNumber: bigint;
      errorMessage: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createIncident(
        errorType,
        filePath,
        lineNumber,
        errorMessage,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["activityLog"] });
    },
  });
}

export function useUpdateIncidentStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      rcaSummary,
      patchCode,
      testCode,
      prUrl,
      prTitle,
      prDescription,
    }: {
      id: bigint;
      status: IncidentStatus;
      rcaSummary: string;
      patchCode: string;
      testCode: string;
      prUrl: string;
      prTitle: string;
      prDescription: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateIncidentStatus(
        id,
        status,
        rcaSummary,
        patchCode,
        testCode,
        prUrl,
        prTitle,
        prDescription,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["activityLog"] });
    },
  });
}

export function useDeleteIncident() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteIncident(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["activityLog"] });
    },
  });
}

export { IncidentStatus };
