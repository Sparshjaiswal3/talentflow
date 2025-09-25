import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "../../lib/api";


export function useJobs(params) {
    return useQuery({
        queryKey: ["jobs", params],
        queryFn: () => apiGet("/jobs", params),
        keepPreviousData: true,
    });
}


export function useCreateJob() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload) => apiSend("POST", "/jobs", payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
}


export function useUpdateJob() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, patch }) => apiSend("PATCH", `/jobs/${id}`, patch),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    });
}


export function useReorderJob() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, fromOrder, toOrder }) => apiSend("PATCH", `/jobs/${id}/reorder`, { fromOrder, toOrder }),
        onMutate: async (vars) => {
            await qc.cancelQueries({ queryKey: ["jobs"] });
            const prev = qc.getQueriesData({ queryKey: ["jobs"] });
            // Optimistically reorder cache for all pages that include order
            prev.forEach(([key, data]) => {
                if (!data?.items) return;
                const list = [...data.items];
                const movedIdx = list.findIndex(j => j.order === vars.fromOrder);
                if (movedIdx === -1) return;
                const [moved] = list.splice(movedIdx, 1);
                list.splice(vars.toOrder, 0, moved);
                // Reassign order fields locally
                list.forEach((j, idx) => j.order = idx);
                qc.setQueryData(key, { ...data, items: list });
            });
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            // rollback
            ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data));
        },
        onSettled: () => qc.invalidateQueries({ queryKey: ["jobs"] })
    });
}