import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateViewRequest, DbView, UpdateViewRequest } from "@nosion/shared";

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

function dbKey(pageId: string) {
  return ["databases", pageId];
}

export function useCreateView(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateViewRequest) =>
      api<DbView>(`/databases/${pageId}/views`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dbKey(pageId) }),
  });
}

export function useUpdateView(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateViewRequest }) =>
      api<DbView>(`/databases/${pageId}/views/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dbKey(pageId) }),
  });
}

export function useDeleteView(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/databases/${pageId}/views/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dbKey(pageId) }),
  });
}
