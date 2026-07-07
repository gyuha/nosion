import { eq, inArray } from "drizzle-orm";
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
  unauthorized,
} from "@/lib/pages-api";

type RouteContext = { params: Promise<{ id: string }> };

/** 이름 변경 및 이동(부모/정렬 순서 변경) */
export async function PATCH(request: Request, context: RouteContext) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const { id } = await context.params;
  const page = await findActivePage(workspace.id, id);
  if (!page) return notFound();

  const body = await parseJsonBody(request);
  if (!body) return badRequest("요청 본문이 올바른 JSON 객체가 아닙니다.");

  const updates: Partial<{
    title: string;
    content: string;
    parentId: string | null;
    sortOrder: number;
  }> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      return badRequest("title은 비어 있지 않은 문자열이어야 합니다.");
    }
    if (body.title.length > TITLE_MAX_LENGTH) {
      return badRequest(`title은 ${TITLE_MAX_LENGTH}자 이하여야 합니다.`);
    }
    updates.title = body.title.trim();
  }

  if (body.content !== undefined) {
    if (typeof body.content !== "string") {
      return badRequest("content는 문자열이어야 합니다.");
    }
    updates.content = body.content;
  }

  const activePages = await getActivePages(workspace.id);
  const byId = new Map(activePages.map((row) => [row.id, row]));

  if ("parentId" in body) {
    if (body.parentId !== null && typeof body.parentId !== "string") {
      return badRequest("parentId는 문자열 또는 null이어야 합니다.");
    }
    let newParentId: string | null = null;
    if (typeof body.parentId === "string") {
      if (body.parentId === page.id) {
        return badRequest("페이지를 자기 자신의 하위로 이동할 수 없습니다.");
      }
      const parent = byId.get(body.parentId);
      if (!parent || parent.workspaceId !== workspace.id) return notFound();

      // 사이클 방지: 새 부모의 조상 중에 자신이 있으면 거부
      let ancestorId: string | null = parent.parentId;
      while (ancestorId) {
        if (ancestorId === page.id) {
          return badRequest(
            "페이지를 자신의 하위 페이지 아래로 이동할 수 없습니다.",
          );
        }
        ancestorId = byId.get(ancestorId)?.parentId ?? null;
      }
      newParentId = parent.id;
    }
    updates.parentId = newParentId;

    if (body.sortOrder === undefined) {
      // 정렬 순서 미지정 시 새 형제들의 맨 뒤에 붙인다.
      const siblings = activePages.filter(
        (row) => row.parentId === newParentId && row.id !== page.id,
      );
      updates.sortOrder =
        siblings.length > 0
          ? Math.max(...siblings.map((row) => row.sortOrder)) + 1
          : 0;
    }
  }

  if (body.sortOrder !== undefined) {
    if (typeof body.sortOrder !== "number" || !Number.isInteger(body.sortOrder)) {
      return badRequest("sortOrder는 정수여야 합니다.");
    }
    updates.sortOrder = body.sortOrder;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest("변경할 항목(title, content, parentId, sortOrder)이 없습니다.");
  }

  const [updated] = await db
    .update(pages)
    .set(updates)
    .where(eq(pages.id, page.id))
    .returning();

  return NextResponse.json({ page: updated });
}

/** 소프트 삭제 (하위 페이지까지 재귀 적용) */
export async function DELETE(request: Request, context: RouteContext) {
  const workspace = await getSessionWorkspace(request);
  if (!workspace) return unauthorized();

  const { id } = await context.params;
  const page = await findActivePage(workspace.id, id);
  if (!page) return notFound();

  // 활성 페이지 트리에서 자신 + 모든 후손을 수집한다.
  const activePages = await getActivePages(workspace.id);
  const childrenByParent = new Map<string, string[]>();
  for (const row of activePages) {
    if (!row.parentId) continue;
    const list = childrenByParent.get(row.parentId) ?? [];
    list.push(row.id);
    childrenByParent.set(row.parentId, list);
  }

  const targetIds: string[] = [];
  const queue = [page.id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    targetIds.push(current);
    queue.push(...(childrenByParent.get(current) ?? []));
  }

  await db
    .update(pages)
    .set({ deletedAt: new Date() })
    .where(inArray(pages.id, targetIds));

  return NextResponse.json({ deletedIds: targetIds });
}
