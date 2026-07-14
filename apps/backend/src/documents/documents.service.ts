import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import type { DocumentContent } from "@nosion/shared";
import { db } from "../drizzle/client";
import { document, page } from "../drizzle/schema";
import { extractPlainText } from "./extract-text";

@Injectable()
export class DocumentsService {
  private async assertOwned(workspaceId: string, pageId: string) {
    const [row] = await db
      .select({ id: page.id })
      .from(page)
      .where(and(eq(page.id, pageId), eq(page.workspaceId, workspaceId)));
    if (!row) {
      throw new NotFoundException("페이지를 찾을 수 없습니다");
    }
  }

  async getContent(
    workspaceId: string,
    pageId: string,
  ): Promise<DocumentContent> {
    await this.assertOwned(workspaceId, pageId);
    const [row] = await db
      .select()
      .from(document)
      .where(eq(document.pageId, pageId));
    return (row?.content as DocumentContent) ?? [];
  }

  async setContent(
    workspaceId: string,
    pageId: string,
    content: DocumentContent,
  ): Promise<DocumentContent> {
    await this.assertOwned(workspaceId, pageId);
    const searchText = extractPlainText(content);
    await db
      .insert(document)
      .values({ pageId, content, searchText })
      .onConflictDoUpdate({
        target: document.pageId,
        set: { content, searchText },
      });
    return content;
  }
}
