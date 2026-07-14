import { useQuery } from "@tanstack/react-query";
import type { SearchResponse } from "@nosion/shared";

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      return res.json() as Promise<SearchResponse>;
    },
    enabled: query.trim().length > 0,
  });
}
