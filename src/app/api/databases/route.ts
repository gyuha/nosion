import { NextResponse } from "next/server";
import { db } from "@/db";
import { pages } from "@/db/schema";
import {
  badRequest,
  findActivePage,
  getSessionWorkspace,
  nextSortOrder,
  notFound,
  parseJsonBody,
  TITLE_MAX_LENGTH,
  unauthorized,
} from "@/lib/pages-api";

/** 데이터베이스 페이지 생성 (부모 지정 가능) */
export async function POST(request: Request) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const body = await parseJsonBody(request);
  if (!body) return badRequest("요청 본문이 올바른 JSON 객체가 아닙니다.");

  let title = "새 데이터베이스";
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      return badRequest("title은 비어 있지 않은 문자열이어야 합니다.");
    }
    if (body.title.length > TITLE_MAX_LENGTH) {
      return badRequest(`title은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`);
    }
    title = body.title.trim();
  }

  let parentId: string | null = null;
  if (body.parentId !== undefined && body.parentId !== null) {
    if (typeof body.parentId !== "string") {
      return badRequest("parentId는 문자열 또는 null이어야 합니다.");
    }
    const parent = await findActivePage(workspace.id, body.parentId);
    if (!parent) return notFound();
    parentId = parent.id;
  }

  const sortOrder = await nextSortOrder(workspace.id, parentId);

  const [created] = await db
    .insert(pages)
    .values({
      workspaceId: workspace.id,
      parentId,
      title,
      pageType: "database",
      sortOrder,
    })
    .returning();

  return NextResponse.json({ page: created }, { status: 201 });
}
