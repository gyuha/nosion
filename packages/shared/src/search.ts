import type { PageType } from "./pages";

export interface SearchResultItem {
  pageId: string;
  title: string;
  type: PageType;
}

export interface SearchResponse {
  results: SearchResultItem[];
}
