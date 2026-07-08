import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { pages, workspaces } from "@/db/schema";
import { auth } from "@/lib/auth";

export const TITLE_MAX_LENGTH = 200;
export const ICON_MAX_LENGTH = 8;

export type PageRow = typeof pages.$inferSelect;

/** 세션 사용자의 워크스페이스를 조회한다. 미인증이면 null. */
export async function getSessionWorkspace(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.userId, session.user.id),
  });
  return workspace ?? null;
}

export function unauthorized() {
  return NextResponse.json(
    { error: "로그인이 필요합니다." },
    { status: 401 },
  );
}

export function notFound() {
  return NextResponse.json(
    { error: "페이지를 찾을 수 없습니다." },
    { status: 404 },
  );
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** 요청 본문을 JSON 객체로 파싱한다. 실패 시 null. */
export async function parseJsonBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return null;
    }
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** 워크스페이스의 활성 페이지 전체를 정렬 순서대로 조회한다. */
export async function getActivePages(workspaceId: string) {
  return db
    .select()
    .from(pages)
    .where(and(eq(pages.workspaceId, workspaceId), isNull(pages.deletedAt)))
    .orderBy(asc(pages.sortOrder), asc(pages.createdAt));
}

/** 워크스페이스 내 활성 페이지 1건을 조회한다. 없으면 null. */
export async function findActivePage(workspaceId: string, pageId: string) {
  const row = await db.query.pages.findFirst({
    where: and(
      eq(pages.id, pageId),
      eq(pages.workspaceId, workspaceId),
      isNull(pages.deletedAt),
    ),
  });
  return row ?? null;
}

/** 지정된 부모(parentId) 아래 형제들 중 다음에 올 sortOrder 값을 계산한다. */
export async function nextSortOrder(
  workspaceId: string,
  parentId: string | null,
) {
  const [{ maxSort }] = await db
    .select({ maxSort: max(pages.sortOrder) })
    .from(pages)
    .where(
      and(
        eq(pages.workspaceId, workspaceId),
        parentId === null ? isNull(pages.parentId) : eq(pages.parentId, parentId),
        isNull(pages.deletedAt),
      ),
    );
  return (maxSort ?? -1) + 1;
}

/** 페이지와 그 하위(후손) 전체를 소프트 삭제하고 삭제된 id 목록을 반환한다. */
export async function softDeletePageAndDescendants(
  workspaceId: string,
  pageId: string,
) {
  const activePages = await getActivePages(workspaceId);
  const childrenByParent = new Map<string, string[]>();
  for (const row of activePages) {
    if (!row.parentId) continue;
    const list = childrenByParent.get(row.parentId) ?? [];
    list.push(row.id);
    childrenByParent.set(row.parentId, list);
  }

  const targetIds: string[] = [];
  const queue = [pageId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    targetIds.push(current);
    queue.push(...(childrenByParent.get(current) ?? []));
  }

  await db
    .update(pages)
    .set({ deletedAt: new Date() })
    .where(inArray(pages.id, targetIds));

  return targetIds;
}
