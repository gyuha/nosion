import { eq, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { databaseProperties } from "@/db/schema";
import {
  findActiveDatabasePage,
  isPropertyType,
  normalizeOptions,
  optionsAllowed,
  PROPERTY_NAME_MAX_LENGTH,
  PROPERTY_TYPES,
  serializeProperty,
  type PropertyOption,
} from "@/lib/databases-api";
import {
  badRequest,
  getSessionWorkspace,
  notFound,
  parseJsonBody,
  unauthorized,
} from "@/lib/pages-api";

type RouteContext = { params: Promise<{ id: string }> };

/** 속성 추가 */
export async function POST(request: Request, context: RouteContext) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const { id } = await context.params;
  const page = await findActiveDatabasePage(workspace.id, id);
  if (!page) return notFound();

  const body = await parseJsonBody(request);
  if (!body) return badRequest("요청 본문이 올바른 JSON 객체가 아닙니다.");

  if (typeof body.name !== "string" || body.name.trim() === "") {
    return badRequest("name은 비어 있지 않은 문자열이어야 합니다.");
  }
  if (body.name.length > PROPERTY_NAME_MAX_LENGTH) {
    return badRequest(`name은 ${PROPERTY_NAME_MAX_LENGTH}자 이하여야 합니다.`);
  }
  if (!isPropertyType(body.type)) {
    return badRequest(`type은 ${PROPERTY_TYPES.join(", ")} 중 하나여야 합니다.`);
  }
  const type = body.type;

  let options: PropertyOption[] = [];
  if (optionsAllowed(type)) {
    if (body.options !== undefined) {
      const result = normalizeOptions(body.options);
      if ("error" in result) return badRequest(result.error);
      options = result;
    }
  } else if (body.options !== undefined) {
    return badRequest("options는 select/multiSelect 타입에서만 사용할 수 있습니다.");
  }

  const [{ maxSort }] = await db
    .select({ maxSort: max(databaseProperties.sortOrder) })
    .from(databaseProperties)
    .where(eq(databaseProperties.pageId, page.id));

  const [created] = await db
    .insert(databaseProperties)
    .values({
      pageId: page.id,
      name: body.name.trim(),
      type,
      options: optionsAllowed(type) ? JSON.stringify(options) : null,
      sortOrder: (maxSort ?? -1) + 1,
    })
    .returning();

  return NextResponse.json(
    { property: serializeProperty(created) },
    { status: 201 },
  );
}
