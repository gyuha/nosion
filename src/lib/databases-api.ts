import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { databaseProperties, databaseRows, pages } from "@/db/schema";
import { findActivePage } from "@/lib/pages-api";

export const PROPERTY_TYPES = [
  "text",
  "number",
  "select",
  "multiSelect",
  "date",
  "checkbox",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export function isPropertyType(value: unknown): value is PropertyType {
  return (
    typeof value === "string" &&
    (PROPERTY_TYPES as readonly string[]).includes(value)
  );
}

const SELECT_TYPES = new Set<PropertyType>(["select", "multiSelect"]);

export const OPTION_COLORS = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;
export type OptionColor = (typeof OPTION_COLORS)[number];

export const PROPERTY_NAME_MAX_LENGTH = 100;
export const OPTION_NAME_MAX_LENGTH = 100;

export type PropertyOption = { id: string; name: string; color: OptionColor };
export type PropertyRow = typeof databaseProperties.$inferSelect;
export type RowValues = Record<string, unknown>;

/** 워크스페이스 내 활성 "데이터베이스 페이지" 1건을 조회한다. 없거나 타입이 다르면 null. */
export async function findActiveDatabasePage(
  workspaceId: string,
  pageId: string,
) {
  const page = await findActivePage(workspaceId, pageId);
  if (!page || page.pageType !== "database") return null;
  return page;
}

/** 데이터베이스의 활성 속성 목록을 정렬 순서대로 조회한다. */
export async function getProperties(databasePageId: string) {
  return db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.pageId, databasePageId))
    .orderBy(
      asc(databaseProperties.sortOrder),
      asc(databaseProperties.createdAt),
    );
}

/** id로 속성 1건을 조회한다. 해당 데이터베이스 소속이 아니면 null. */
export async function findProperty(databasePageId: string, propertyId: string) {
  const row = await db.query.databaseProperties.findFirst({
    where: and(
      eq(databaseProperties.id, propertyId),
      eq(databaseProperties.pageId, databasePageId),
    ),
  });
  return row ?? null;
}

export function parseOptions(raw: string | null): PropertyOption[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializeProperty(row: PropertyRow) {
  return { ...row, options: parseOptions(row.options) };
}

/** 요청 바디의 options 배열을 검증하고 저장 가능한 형태로 정규화한다. */
export function normalizeOptions(
  input: unknown,
): PropertyOption[] | { error: string } {
  if (!Array.isArray(input)) return { error: "options는 배열이어야 합니다." };

  const result: PropertyOption[] = [];
  const usedNames = new Set<string>();
  for (const item of input) {
    if (typeof item !== "object" || item === null) {
      return { error: "options의 각 항목은 객체여야 합니다." };
    }
    const { id, name, color } = item as Record<string, unknown>;
    if (typeof name !== "string" || name.trim() === "") {
      return { error: "옵션 name은 비어 있지 않은 문자열이어야 합니다." };
    }
    if (name.length > OPTION_NAME_MAX_LENGTH) {
      return { error: `옵션 name은 ${OPTION_NAME_MAX_LENGTH}자 이하여야 합니다.` };
    }
    if (
      typeof color !== "string" ||
      !(OPTION_COLORS as readonly string[]).includes(color)
    ) {
      return {
        error: `옵션 color는 ${OPTION_COLORS.join(", ")} 중 하나여야 합니다.`,
      };
    }
    const trimmed = name.trim();
    if (usedNames.has(trimmed)) {
      return { error: "옵션 이름이 중복되었습니다." };
    }
    usedNames.add(trimmed);
    result.push({
      id: typeof id === "string" && id.trim() !== "" ? id : crypto.randomUUID(),
      name: trimmed,
      color: color as OptionColor,
    });
  }
  return result;
}

/** options 필드가 이 속성 타입에서 허용되는지 검사한다. */
export function optionsAllowed(type: PropertyType): boolean {
  return SELECT_TYPES.has(type);
}

/**
 * 속성 타입에 맞게 값을 검증/정규화한다.
 * value가 null이면 "값 지움"을 의미하며 항상 허용된다.
 */
export function normalizeValue(
  property: PropertyRow,
  value: unknown,
): { ok: true; value: unknown | null } | { ok: false; error: string } {
  if (value === null) return { ok: true, value: null };

  switch (property.type) {
    case "text": {
      if (typeof value !== "string") {
        return { ok: false, error: `${property.name}은(는) 문자열이어야 합니다.` };
      }
      return { ok: true, value };
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return { ok: false, error: `${property.name}은(는) 숫자여야 합니다.` };
      }
      return { ok: true, value };
    }
    case "checkbox": {
      if (typeof value !== "boolean") {
        return { ok: false, error: `${property.name}은(는) true/false여야 합니다.` };
      }
      return { ok: true, value };
    }
    case "date": {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        return {
          ok: false,
          error: `${property.name}은(는) 유효한 날짜 문자열이어야 합니다.`,
        };
      }
      return { ok: true, value };
    }
    case "select": {
      if (typeof value !== "string") {
        return {
          ok: false,
          error: `${property.name}은(는) 옵션 id 문자열이어야 합니다.`,
        };
      }
      const options = parseOptions(property.options);
      if (!options.some((option) => option.id === value)) {
        return { ok: false, error: `${property.name}에 존재하지 않는 옵션입니다.` };
      }
      return { ok: true, value };
    }
    case "multiSelect": {
      if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
        return {
          ok: false,
          error: `${property.name}은(는) 옵션 id 문자열 배열이어야 합니다.`,
        };
      }
      const options = parseOptions(property.options);
      const validIds = new Set(options.map((option) => option.id));
      if (!value.every((v) => validIds.has(v))) {
        return {
          ok: false,
          error: `${property.name}에 존재하지 않는 옵션이 포함되어 있습니다.`,
        };
      }
      return { ok: true, value: Array.from(new Set(value)) };
    }
    default: {
      return { ok: false, error: "지원하지 않는 속성 타입입니다." };
    }
  }
}

export function parseValues(raw: string): RowValues {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as RowValues)
      : {};
  } catch {
    return {};
  }
}

export type RowWithPage = {
  id: string;
  title: string;
  icon: string | null;
  values: RowValues;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

/** 데이터베이스의 활성 행 목록을 페이지 정렬 순서대로 조회한다. */
export async function getRows(databasePageId: string): Promise<RowWithPage[]> {
  const rows = await db
    .select({
      id: databaseRows.id,
      values: databaseRows.values,
      createdAt: databaseRows.createdAt,
      updatedAt: databaseRows.updatedAt,
      title: pages.title,
      icon: pages.icon,
      sortOrder: pages.sortOrder,
    })
    .from(databaseRows)
    .innerJoin(pages, eq(databaseRows.id, pages.id))
    .where(
      and(
        eq(databaseRows.databasePageId, databasePageId),
        isNull(pages.deletedAt),
      ),
    )
    .orderBy(asc(pages.sortOrder), asc(databaseRows.createdAt));

  return rows.map((row) => ({ ...row, values: parseValues(row.values) }));
}

/** id로 활성 행 1건을 조회한다. */
export async function findActiveRow(
  databasePageId: string,
  rowId: string,
): Promise<RowWithPage | null> {
  const [row] = await db
    .select({
      id: databaseRows.id,
      values: databaseRows.values,
      createdAt: databaseRows.createdAt,
      updatedAt: databaseRows.updatedAt,
      title: pages.title,
      icon: pages.icon,
      sortOrder: pages.sortOrder,
    })
    .from(databaseRows)
    .innerJoin(pages, eq(databaseRows.id, pages.id))
    .where(
      and(
        eq(databaseRows.id, rowId),
        eq(databaseRows.databasePageId, databasePageId),
        isNull(pages.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return null;
  return { ...row, values: parseValues(row.values) };
}
