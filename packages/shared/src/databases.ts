export type PropertyType =
  | "text"
  | "number"
  | "select"
  | "multi_select"
  | "date"
  | "checkbox";

export interface SelectOption {
  id: string;
  label: string;
}

// select/multi_select 속성의 config 형태. 다른 타입은 현재 부가 설정이 없다.
export interface PropertyConfig {
  options?: SelectOption[];
}

export interface DbProperty {
  id: string;
  name: string;
  type: PropertyType;
  config: PropertyConfig;
  position: number;
}

export interface CreatePropertyRequest {
  name: string;
  type: PropertyType;
  config?: PropertyConfig;
}

export interface UpdatePropertyRequest {
  name?: string;
  type?: PropertyType;
  config?: PropertyConfig;
}

export interface DbRow {
  pageId: string;
  title: string;
  values: Record<string, unknown>;
}

export interface DatabaseResponse {
  properties: DbProperty[];
  rows: DbRow[];
  views: import("./views").DbView[];
}

export interface UpdatePropertyValueRequest {
  value: unknown;
}
