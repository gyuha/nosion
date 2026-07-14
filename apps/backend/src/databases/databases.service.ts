import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type {
  DatabaseResponse,
  DbProperty,
  DbRow,
  PropertyConfig,
  PropertyType,
} from "@nosion/shared";
import { db } from "../drizzle/client";
import { dbProperty, page, propertyValue } from "../drizzle/schema";
import { PagesService } from "../pages/pages.service";

@Injectable()
export class DatabasesService {
  constructor(private readonly pagesService: PagesService) {}

  private async assertDatabasePage(workspaceId: string, pageId: string) {
    const row = await this.pagesService.findOwned(workspaceId, pageId);
    if (row.type !== "database") {
      throw new BadRequestException("데이터베이스 페이지가 아닙니다");
    }
    return row;
  }

  async getDatabase(
    workspaceId: string,
    pageId: string,
  ): Promise<DatabaseResponse> {
    await this.assertDatabasePage(workspaceId, pageId);

    const properties = await db
      .select()
      .from(dbProperty)
      .where(eq(dbProperty.pageId, pageId))
      .orderBy(asc(dbProperty.position));

    const rowPages = await db
      .select()
      .from(page)
      .where(
        and(
          eq(page.parentId, pageId),
          eq(page.isRow, true),
          isNull(page.deletedAt),
        ),
      )
      .orderBy(asc(page.position));

    const allValues =
      rowPages.length > 0
        ? await db
            .select()
            .from(propertyValue)
            .where(
              inArray(
                propertyValue.rowPageId,
                rowPages.map((r) => r.id),
              ),
            )
        : [];
    const valuesByRow = new Map<string, Record<string, unknown>>();
    for (const v of allValues) {
      const map = valuesByRow.get(v.rowPageId) ?? {};
      map[v.propertyId] = v.value;
      valuesByRow.set(v.rowPageId, map);
    }

    const rows: DbRow[] = rowPages.map((r) => ({
      pageId: r.id,
      title: r.title,
      values: valuesByRow.get(r.id) ?? {},
    }));

    return {
      properties: properties.map(
        (p): DbProperty => ({
          id: p.id,
          name: p.name,
          type: p.type as PropertyType,
          config: p.config as PropertyConfig,
          position: p.position,
        }),
      ),
      rows,
    };
  }

  async createProperty(
    workspaceId: string,
    pageId: string,
    name: string,
    type: PropertyType,
    config: PropertyConfig | undefined,
  ) {
    await this.assertDatabasePage(workspaceId, pageId);
    const existing = await db
      .select({ position: dbProperty.position })
      .from(dbProperty)
      .where(eq(dbProperty.pageId, pageId))
      .orderBy(asc(dbProperty.position));
    const nextPosition = existing.length
      ? Math.max(...existing.map((e) => e.position)) + 1
      : 0;
    const [created] = await db
      .insert(dbProperty)
      .values({
        pageId,
        name,
        type,
        config: config ?? {},
        position: nextPosition,
      })
      .returning();
    return created;
  }

  async updateProperty(
    workspaceId: string,
    pageId: string,
    propertyId: string,
    patch: { name?: string; type?: PropertyType; config?: PropertyConfig },
  ) {
    await this.assertDatabasePage(workspaceId, pageId);
    await this.findProperty(pageId, propertyId);
    const [updated] = await db
      .update(dbProperty)
      .set(patch)
      .where(and(eq(dbProperty.id, propertyId), eq(dbProperty.pageId, pageId)))
      .returning();
    return updated;
  }

  async deleteProperty(workspaceId: string, pageId: string, propertyId: string) {
    await this.assertDatabasePage(workspaceId, pageId);
    await this.findProperty(pageId, propertyId);
    await db
      .delete(dbProperty)
      .where(and(eq(dbProperty.id, propertyId), eq(dbProperty.pageId, pageId)));
  }

  private async findProperty(pageId: string, propertyId: string) {
    const [row] = await db
      .select()
      .from(dbProperty)
      .where(and(eq(dbProperty.id, propertyId), eq(dbProperty.pageId, pageId)));
    if (!row) {
      throw new NotFoundException("속성을 찾을 수 없습니다");
    }
    return row;
  }

  async createRow(workspaceId: string, pageId: string) {
    await this.assertDatabasePage(workspaceId, pageId);
    return this.pagesService.create(workspaceId, "document", pageId, true);
  }

  async updateValue(
    workspaceId: string,
    rowPageId: string,
    propertyId: string,
    value: unknown,
  ) {
    const rowPage = await this.pagesService.findOwned(workspaceId, rowPageId);
    if (!rowPage.isRow || !rowPage.parentId) {
      throw new BadRequestException("행 페이지가 아닙니다");
    }
    await this.findProperty(rowPage.parentId, propertyId);

    await db
      .insert(propertyValue)
      .values({ rowPageId, propertyId, value })
      .onConflictDoUpdate({
        target: [propertyValue.rowPageId, propertyValue.propertyId],
        set: { value },
      });
    return { rowPageId, propertyId, value };
  }
}
