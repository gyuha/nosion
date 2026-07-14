import type { DocumentContent } from "@nosion/shared";

// BlockNote 블록 JSON에서 검색용 평문 텍스트를 추출한다.
// 정확한 블록 스키마에 의존하지 않도록, 중첩된 구조를 재귀적으로 순회하며
// text 필드를 전부 모은다(문단·헤딩·리스트·코드 블록 등 어떤 블록 타입이든 동작).
export function extractPlainText(content: DocumentContent): string {
  const parts: string[] = [];

  function walk(node: unknown): void {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (typeof obj.text === "string") {
        parts.push(obj.text);
      }
      for (const key of ["content", "children"]) {
        if (key in obj) walk(obj[key]);
      }
    }
  }

  walk(content);
  return parts.join(" ").trim();
}
