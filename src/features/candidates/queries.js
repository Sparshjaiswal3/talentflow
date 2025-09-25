// src/features/candidates/queries.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "../../lib/api";

// List / search / filter candidates
export function useCandidates(params) {
  return useQuery({
    queryKey: ["candidates", params],
    queryFn: () => apiGet("/candidates", params),
    keepPreviousData: true,
  });
}

// Stage transitions / updates (optimistic)
export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => apiSend("PATCH", `/candidates/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["candidates"] });
      const prev = qc.getQueriesData({ queryKey: ["candidates"] });
      // optimistic update across all cached pages
      prev.forEach(([key, data]) => {
        if (!data?.items) return;
        const items = data.items.map((c) => (c.id === id ? { ...c, ...patch } : c));
        qc.setQueryData(key, { ...data, items });
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      // rollback
      ctx?.prev?.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data);
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["candidates"] }),
  });
}

// Candidate timeline (notes + stage changes)
export function useTimeline(candidateId) {
  return useQuery({
    queryKey: ["timeline", candidateId],
    queryFn: () => apiGet(`/candidates/${candidateId}/timeline`),
    enabled: !!candidateId,
  });
}
