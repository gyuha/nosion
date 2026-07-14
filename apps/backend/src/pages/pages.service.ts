import { Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import type { PageNode, PageType } from "@nosion/shared";
import { db } from "../drizzle/client";
import { page } from "../drizzle/schema";

@Injectable()
export class PagesService {
  async getTree(workspaceId: string): Promise<PageNode[]> {
    const rows = await db
      .select()
      .from(page)
      .where(
        and(
          eq(page.workspaceId, workspaceId),
          eq(page.isRow, false),
          isNull(page.deletedAt),
        ),
      )
      .orderBy(asc(page.position));

    const nodes = new Map<string, PageNode>();
    for (const row of rows) {
      nodes.set(row.id, {
        id: row.id,
        parentId: row.parentId,
        type: row.type as PageType,
        title: row.title,
        icon: row.icon,
        cover: row.cover,
        isFavorite: row.isFavorite,
        position: row.position,
        children: [],
      });
    }

    const roots: PageNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId)) {
        nodes.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async create(
    workspaceId: string,
    type: PageType,
    parentId: string | null | undefined,
  ) {
    if (parentId) {
      await this.findOwned(workspaceId, parentId);
    }
    const [{ nextPosition }] = await db
      .select({ nextPosition: max(page.position) })
      .from(page)
      .where(
        and(
          eq(page.workspaceId, workspaceId),
          parentId ? eq(page.parentId, parentId) : isNull(page.parentId),
        ),
      );
    const [created] = await db
      .insert(page)
      .values({
        workspaceId,
        parentId: parentId ?? null,
        type,
        position: (nextPosition ?? -1) + 1,
      })
      .returning();
    return created;
  }

  async findOwned(workspaceId: string, id: string) {
    const [row] = await db
      .select()
      .from(page)
      .where(and(eq(page.id, id), eq(page.workspaceId, workspaceId)));
    if (!row) {
      throw new NotFoundException("페이지를 찾을 수 없습니다");
    }
    return row;
  }

  async update(
    workspaceId: string,
    id: string,
    patch: {
      title?: string;
      icon?: string | null;
      cover?: string | null;
      isFavorite?: boolean;
    },
  ) {
    await this.findOwned(workspaceId, id);
    const [updated] = await db
      .update(page)
      .set(patch)
      .where(and(eq(page.id, id), eq(page.workspaceId, workspaceId)))
      .returning();
    return updated;
  }

  async move(
    workspaceId: string,
    id: string,
    parentId: string | null,
    position: number,
  ) {
    await this.findOwned(workspaceId, id);
    if (parentId) {
      await this.findOwned(workspaceId, parentId);
    }
    const [updated] = await db
      .update(page)
      .set({ parentId, position })
      .where(and(eq(page.id, id), eq(page.workspaceId, workspaceId)))
      .returning();
    return updated;
  }

  async softDelete(workspaceId: string, id: string) {
    await this.findOwned(workspaceId, id);
    // 하위 페이지 전체를 함께 휴지통으로 보낸다(F7 전제).
    const descendantIds = await this.collectDescendantIds(workspaceId, id);
    const targetIds = [id, ...descendantIds];
    await db
      .update(page)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(page.workspaceId, workspaceId), inArray(page.id, targetIds)),
      );
  }

  private async collectDescendantIds(
    workspaceId: string,
    rootId: string,
  ): Promise<string[]> {
    const all = await db
      .select({ id: page.id, parentId: page.parentId })
      .from(page)
      .where(eq(page.workspaceId, workspaceId));
    const childrenByParent = new Map<string, string[]>();
    for (const row of all) {
      if (!row.parentId) continue;
      const list = childrenByParent.get(row.parentId) ?? [];
      list.push(row.id);
      childrenByParent.set(row.parentId, list);
    }
    const result: string[] = [];
    const stack = [rootId];
    while (stack.length) {
      const current = stack.pop()!;
      const children = childrenByParent.get(current) ?? [];
      for (const childId of children) {
        result.push(childId);
        stack.push(childId);
      }
    }
    return result;
  }
}
