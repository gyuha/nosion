import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrashItem } from "@nosion/shared";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    throw new Error(`API 오류: ${res.status}`);
  }
  return res.json();
}

const TRASH_KEY = ["trash"];
const TREE_KEY = ["pages", "tree"];

export function useTrash() {
  return useQuery({
    queryKey: TRASH_KEY,
    queryFn: () => api<TrashItem[]>("/trash"),
  });
}

export function useRestorePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/pages/${id}/restore`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRASH_KEY });
      qc.invalidateQueries({ queryKey: TREE_KEY });
    },
  });
}

export function usePermanentlyDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/pages/${id}/permanent`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRASH_KEY }),
  });
}
