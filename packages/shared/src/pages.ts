export type PageType = "document" | "database";

export interface PageNode {
  id: string;
  parentId: string | null;
  type: PageType;
  title: string;
  icon: string | null;
  cover: string | null;
  isFavorite: boolean;
  position: number;
  children: PageNode[];
}

export interface CreatePageRequest {
  type: PageType;
  parentId?: string | null;
}

export interface UpdatePageRequest {
  title?: string;
  icon?: string | null;
  cover?: string | null;
  isFavorite?: boolean;
}

export interface MovePageRequest {
  parentId: string | null;
  position: number;
}

export interface PageDetail {
  id: string;
  parentId: string | null;
  type: PageType;
  title: string;
  icon: string | null;
  cover: string | null;
  isFavorite: boolean;
  isRow: boolean;
}

export interface TrashItem {
  id: string;
  title: string;
  type: PageType;
}
