import { and, eq, isNull, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { pages } from "@/db/schema";
import {
  badRequest,
  findActivePage,
  getActivePages,
  getSessionWorkspace,
  notFound,
  parseJsonBody,
  TITLE_MAX_LENGTH,
  type PageRow,
  unauthorized,
} from "@/lib/pages-api";

type PageNode = PageRow & { children: PageNode[] };

/** 활성 페이지 트리 조회 */
export async function GET(request: Request) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const rows = await getActivePages(workspace.id);

  const nodes = new Map<string, PageNode>();
  for (const row of rows) {
    nodes.set(row.id, { ...row, children: [] });
  }
  const tree: PageNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      tree.push(node);
    }
  }

  return NextResponse.json({ pages: tree });
}

/** 페이지 생성 (부모 지정 가능) */
export async function POST(request: Request) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

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

  let parentId: string | null = null;
  if (body.parentId !== undefined && body.parentId !== null) {
    if (typeof body.parentId !== "string") {
      return badRequest("parentId는 문자열 또는 null이어야 합니다.");
    }
    const parent = await findActivePage(workspace.id, body.parentId);
    if (!parent) return notFound();
    parentId = parent.id;
  }

  const [{ maxSort }] = await db
    .select({ maxSort: max(pages.sortOrder) })
    .from(pages)
    .where(
      and(
        eq(pages.workspaceId, workspace.id),
        parentId === null
          ? isNull(pages.parentId)
          : eq(pages.parentId, parentId),
        isNull(pages.deletedAt),
      ),
    );

  const [created] = await db
    .insert(pages)
    .values({
      workspaceId: workspace.id,
      parentId,
      title,
      sortOrder: (maxSort ?? -1) + 1,
    })
    .returning();

  return NextResponse.json({ page: created }, { status: 201 });
}
