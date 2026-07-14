import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePropertyRequest,
  DatabaseResponse,
  DbProperty,
  UpdatePropertyRequest,
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

function dbKey(pageId: string) {
  return ["databases", pageId];
}

export function useDatabase(pageId: string | undefined) {
  return useQuery({
    queryKey: dbKey(pageId ?? ""),
    queryFn: () => api<DatabaseResponse>(`/databases/${pageId}`),
    enabled: !!pageId,
  });
}

export function useCreateProperty(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePropertyRequest) =>
      api<DbProperty>(`/databases/${pageId}/properties`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dbKey(pageId) }),
  });
}

export function useUpdateProperty(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePropertyRequest }) =>
      api<DbProperty>(`/databases/${pageId}/properties/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dbKey(pageId) }),
  });
}

export function useDeleteProperty(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/databases/${pageId}/properties/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dbKey(pageId) }),
  });
}

export function useCreateRow(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/databases/${pageId}/rows`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dbKey(pageId) }),
  });
}

export function useDeleteRow(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rowPageId: string) =>
      api(`/pages/${rowPageId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dbKey(pageId) }),
  });
}

export function useUpdatePropertyValue(pageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rowPageId,
      propertyId,
      value,
    }: {
      rowPageId: string;
      propertyId: string;
      value: unknown;
    }) =>
      api(`/rows/${rowPageId}/values/${propertyId}`, {
        method: "PATCH",
        body: JSON.stringify({ value }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: dbKey(pageId) }),
  });
}
