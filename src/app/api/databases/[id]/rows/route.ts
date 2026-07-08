import { NextResponse } from "next/server";
import { db } from "@/db";
import { databaseRows, pages } from "@/db/schema";
import {
  findActiveDatabasePage,
  getProperties,
  normalizeValue,
  parseValues,
  type RowValues,
} from "@/lib/databases-api";
import {
  badRequest,
  getSessionWorkspace,
  nextSortOrder,
  notFound,
  parseJsonBody,
  TITLE_MAX_LENGTH,
  unauthorized,
} from "@/lib/pages-api";

type RouteContext = { params: Promise<{ id: string }> };

/** 행 추가 (제목 + 속성 값 맵). 행은 pages 트리의 문서 페이지 1건과 1:1로 생성된다. */
export async function POST(request: Request, context: RouteContext) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const { id } = await context.params;
  const page = await findActiveDatabasePage(workspace.id, id);
  if (!page) return notFound();

  const body = await parseJsonBody(request);
  if (!body) return badRequest("요청 본문이 올바른 JSON 객체가 아닙니다.");

  let title = "새 페이지";
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      return badRequest("title은 비어 있지 않은 문자열이어야 합니다.");
    }
    if (body.title.length > TITLE_MAX_LENGTH) {
      return badRequest(`title은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`);
    }
    title = body.title.trim();
  }

  const properties = await getProperties(page.id);
  const propertyById = new Map(properties.map((property) => [property.id, property]));

  const values: RowValues = {};
  if (body.values !== undefined) {
    if (
      typeof body.values !== "object" ||
      body.values === null ||
      Array.isArray(body.values)
    ) {
      return badRequest("values는 객체여야 합니다.");
    }
    for (const [propertyId, rawValue] of Object.entries(
      body.values as Record<string, unknown>,
    )) {
      const property = propertyById.get(propertyId);
      if (!property) return badRequest(`존재하지 않는 속성입니다: ${propertyId}`);
      const result = normalizeValue(property, rawValue);
      if (!result.ok) return badRequest(result.error);
      if (result.value !== null) values[propertyId] = result.value;
    }
  }

  const pageSortOrder = await nextSortOrder(workspace.id, page.id);

  const [createdPage] = await db
    .insert(pages)
    .values({
      workspaceId: workspace.id,
      parentId: page.id,
      title,
      pageType: "database_row",
      sortOrder: pageSortOrder,
    })
    .returning();

  const [createdRow] = await db
    .insert(databaseRows)
    .values({
      id: createdPage.id,
      databasePageId: page.id,
      values: JSON.stringify(values),
    })
    .returning();

  return NextResponse.json(
    {
      row: {
        id: createdRow.id,
        title: createdPage.title,
        icon: createdPage.icon,
        values: parseValues(createdRow.values),
        sortOrder: createdPage.sortOrder,
        createdAt: createdRow.createdAt,
        updatedAt: createdRow.updatedAt,
      },
    },
    { status: 201 },
  );
}
