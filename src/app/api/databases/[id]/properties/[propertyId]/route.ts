import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { databaseProperties, databaseRows } from "@/db/schema";
import {
  findActiveDatabasePage,
  findProperty,
  normalizeOptions,
  optionsAllowed,
  parseValues,
  PROPERTY_NAME_MAX_LENGTH,
  serializeProperty,
} from "@/lib/databases-api";
import {
  badRequest,
  getSessionWorkspace,
  notFound,
  parseJsonBody,
  unauthorized,
} from "@/lib/pages-api";

type RouteContext = { params: Promise<{ id: string; propertyId: string }> };

/** 속성 이름/옵션 수정 (이름을 바꿔도 기존 행 값은 propertyId로 연결되어 유지된다) */
export async function PATCH(request: Request, context: RouteContext) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const { id, propertyId } = await context.params;
  const page = await findActiveDatabasePage(workspace.id, id);
  if (!page) return notFound();

  const property = await findProperty(page.id, propertyId);
  if (!property) return notFound();

  const body = await parseJsonBody(request);
  if (!body) return badRequest("요청 본문이 올바른 JSON 객체가 아닙니다.");

  if (body.type !== undefined) {
    return badRequest("type은 변경할 수 없습니다.");
  }

  const updates: Partial<{ name: string; options: string | null }> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return badRequest("name은 비어 있지 않은 문자열이어야 합니다.");
    }
    if (body.name.length > PROPERTY_NAME_MAX_LENGTH) {
      return badRequest(`name은 ${PROPERTY_NAME_MAX_LENGTH}자 이하여야 합니다.`);
    }
    updates.name = body.name.trim();
  }

  if (body.options !== undefined) {
    if (!optionsAllowed(property.type)) {
      return badRequest("options는 select/multiSelect 타입에서만 사용할 수 있습니다.");
    }
    const result = normalizeOptions(body.options);
    if ("error" in result) return badRequest(result.error);
    updates.options = JSON.stringify(result);
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("변경할 항목(name, options)이 없습니다.");
  }

  const [updated] = await db
    .update(databaseProperties)
    .set(updates)
    .where(eq(databaseProperties.id, property.id))
    .returning();

  return NextResponse.json({ property: serializeProperty(updated) });
}

/** 속성 삭제 (모든 행에서 해당 속성 값 제거) */
export async function DELETE(request: Request, context: RouteContext) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const { id, propertyId } = await context.params;
  const page = await findActiveDatabasePage(workspace.id, id);
  if (!page) return notFound();

  const property = await findProperty(page.id, propertyId);
  if (!property) return notFound();

  await db
    .delete(databaseProperties)
    .where(eq(databaseProperties.id, property.id));

  const rows = await db
    .select({ id: databaseRows.id, values: databaseRows.values })
    .from(databaseRows)
    .where(eq(databaseRows.databasePageId, page.id));

  for (const row of rows) {
    const values = parseValues(row.values);
    if (!(property.id in values)) continue;
    delete values[property.id];
    await db
      .update(databaseRows)
      .set({ values: JSON.stringify(values) })
      .where(eq(databaseRows.id, row.id));
  }

  return NextResponse.json({ deletedPropertyId: property.id });
}
