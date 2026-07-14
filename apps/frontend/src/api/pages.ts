import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePageRequest,
  MovePageRequest,
  PageDetail,
  PageNode,
  UpdatePageRequest,
} from "@nosion/shared";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`API 오류: ${res.status}`);
  }
  return res.json();
}

const TREE_KEY = ["pages", "tree"];

export function usePageTree() {
  return useQuery({
    queryKey: TREE_KEY,
    queryFn: () => api<PageNode[]>("/pages/tree"),
  });
}

export function usePage(id: string | undefined) {
  return useQuery({
    queryKey: ["pages", id],
    queryFn: () => api<PageDetail>(`/pages/${id}`),
    enabled: !!id,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePageRequest) =>
      api<PageDetail>("/pages", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TREE_KEY }),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePageRequest }) =>
      api<PageDetail>(`/pages/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: TREE_KEY });
      qc.invalidateQueries({ queryKey: ["pages", vars.id] });
      qc.invalidateQueries({ queryKey: ["search"] });
    },
  });
}

export function useMovePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MovePageRequest }) =>
      api(`/pages/${id}/move`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TREE_KEY }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/pages/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TREE_KEY });
      qc.invalidateQueries({ queryKey: ["search"] });
    },
  });
}
