export type ViewType = "table" | "board" | "list";

export interface FilterRule {
  propertyId: string;
  // 속성 값과 일치(체크박스·셀렉트) 또는 부분 포함(텍스트) 여부로 판정한다.
  value: unknown;
}

export interface SortRule {
  propertyId: string;
  direction: "asc" | "desc";
}

export interface ViewConfig {
  filter?: FilterRule[];
  sort?: SortRule;
  // 보드 뷰가 그룹 기준으로 쓰는 셀렉트 속성.
  groupPropertyId?: string;
}

export interface DbView {
  id: string;
  name: string;
  type: ViewType;
  config: ViewConfig;
  position: number;
}

export interface CreateViewRequest {
  name: string;
  type: ViewType;
}

export interface UpdateViewRequest {
  name?: string;
  config?: ViewConfig;
}
