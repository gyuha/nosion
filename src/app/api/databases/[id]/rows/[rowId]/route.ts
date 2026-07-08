import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { databaseRows } from "@/db/schema";
import {
  findActiveDatabasePage,
  findActiveRow,
  getProperties,
  normalizeValue,
  parseValues,
} from "@/lib/databases-api";
import {
  badRequest,
  getSessionWorkspace,
  notFound,
  parseJsonBody,
  softDeletePageAndDescendants,
  unauthorized,
} from "@/lib/pages-api";

type RouteContext = { params: Promise<{ id: string; rowId: string }> };

/** 행의 속성 값 수정 (부분 병합, 값이 null이면 해당 속성 값을 지운다) */
export async function PATCH(request: Request, context: RouteContext) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const { id, rowId } = await context.params;
  const page = await findActiveDatabasePage(workspace.id, id);
  if (!page) return notFound();

  const row = await findActiveRow(page.id, rowId);
  if (!row) return notFound();

  const body = await parseJsonBody(request);
  if (!body) return badRequest("요청 본문이 올바른 JSON 객체가 아닙니다.");

  if (
    body.values === undefined ||
    typeof body.values !== "object" ||
    body.values === null ||
    Array.isArray(body.values)
  ) {
    return badRequest("values는 객체여야 합니다.");
  }

  const properties = await getProperties(page.id);
  const propertyById = new Map(properties.map((property) => [property.id, property]));

  const values = { ...row.values };
  for (const [propertyId, rawValue] of Object.entries(
    body.values as Record<string, unknown>,
  )) {
    const property = propertyById.get(propertyId);
    if (!property) return badRequest(`존재하지 않는 속성입니다: ${propertyId}`);
    const result = normalizeValue(property, rawValue);
    if (!result.ok) return badRequest(result.error);
    if (result.value === null) {
      delete values[propertyId];
    } else {
      values[propertyId] = result.value;
    }
  }

  const [updated] = await db
    .update(databaseRows)
    .set({ values: JSON.stringify(values) })
    .where(eq(databaseRows.id, row.id))
    .returning();

  return NextResponse.json({
    row: {
      id: updated.id,
      title: row.title,
      icon: row.icon,
      values: parseValues(updated.values),
      sortOrder: row.sortOrder,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
}

/** 행 삭제 (연결된 문서 페이지도 함께 소프트 삭제) */
export async function DELETE(request: Request, context: RouteContext) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const { id, rowId } = await context.params;
  const page = await findActiveDatabasePage(workspace.id, id);
  if (!page) return notFound();

  const row = await findActiveRow(page.id, rowId);
  if (!row) return notFound();

  await softDeletePageAndDescendants(workspace.id, row.id);
  await db.delete(databaseRows).where(eq(databaseRows.id, row.id));

  return NextResponse.json({ deletedId: row.id });
}
