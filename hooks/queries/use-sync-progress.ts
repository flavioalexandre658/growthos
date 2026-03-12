import { useQuery } from "@tanstack/react-query";
import type { SyncJobProgress } from "@/lib/queue";

interface SyncStatusResponse {
  jobId: string;
  state: "waiting" | "active" | "completed" | "failed" | "delayed" | "paused" | "not_found";
  progress: SyncJobProgress | null;
  result: Record<string, number> | null;
  failedReason: string | null;
  attemptsMade: number;
  timestamp: number | null;
  finishedOn: number | null;
}

export const getSyncProgressQueryKey = (jobId: string | null) => ["sync-progress", jobId];

export function useSyncProgress(jobId: string | null) {
  return useQuery<SyncStatusResponse>({
    queryKey: getSyncProgressQueryKey(jobId),
    queryFn: async () => {
      const res = await fetch(`/api/sync/status?jobId=${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch sync status");
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state === "completed" || state === "failed" || state === "not_found") return false;
      return 2000;
    },
  });
}
