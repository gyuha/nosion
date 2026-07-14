import { Injectable } from "@nestjs/common";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import type { PageType, SearchResultItem } from "@nosion/shared";
import { db } from "../drizzle/client";
import { document, page } from "../drizzle/schema";

@Injectable()
export class SearchService {
  async search(workspaceId: string, q: string): Promise<SearchResultItem[]> {
    const query = q.trim();
    if (!query) return [];
    const pattern = `%${query}%`;

    const rows = await db
      .select({
        id: page.id,
        title: page.title,
        type: page.type,
      })
      .from(page)
      .leftJoin(document, eq(document.pageId, page.id))
      .where(
        and(
          eq(page.workspaceId, workspaceId),
          isNull(page.deletedAt),
          or(ilike(page.title, pattern), ilike(document.searchText, pattern)),
        ),
      );

    return rows.map(
      (r): SearchResultItem => ({
        pageId: r.id,
        title: r.title,
        type: r.type as PageType,
      }),
    );
  }
}
