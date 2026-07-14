// BlockNote 블록 배열. 실제 블록 스키마는 BlockNote 라이브러리가 정의하므로
// 여기서는 계약 타입을 구체 스키마에 묶지 않는다(에디터 교체 시 마이그레이션 영향 최소화).
export type DocumentContent = unknown[];

export interface DocumentContentResponse {
  pageId: string;
  content: DocumentContent;
}

export interface UpdateDocumentContentRequest {
  content: DocumentContent;
}
