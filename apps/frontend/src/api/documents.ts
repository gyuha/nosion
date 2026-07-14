import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocumentContent, DocumentContentResponse } from "@nosion/shared";

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

export function useDocumentContent(pageId: string | undefined) {
  return useQuery({
    queryKey: ["documents", pageId],
    queryFn: () => api<DocumentContentResponse>(`/pages/${pageId}/content`),
    enabled: !!pageId,
  });
}

export function useSaveDocumentContent(pageId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: DocumentContent) =>
      api<DocumentContentResponse>(`/pages/${pageId}/content`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["documents", pageId], data);
      qc.invalidateQueries({ queryKey: ["search"] });
    },
  });
}
