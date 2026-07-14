import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import type {
  CreatePageRequest,
  MovePageRequest,
  PageDetail,
  UpdatePageRequest,
} from "@nosion/shared";
import { WorkspaceId } from "../auth/workspace-id.decorator";
import { PagesService } from "./pages.service";

@Controller("pages")
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get("tree")
  async tree(@WorkspaceId() workspaceId: string) {
    return this.pagesService.getTree(workspaceId);
  }

  @Post()
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() body: CreatePageRequest,
  ) {
    return this.pagesService.create(workspaceId, body.type, body.parentId);
  }

  @Get(":id")
  async findOne(
    @WorkspaceId() workspaceId: string,
    @Param("id") id: string,
  ): Promise<PageDetail> {
    const row = await this.pagesService.findOwned(workspaceId, id);
    return {
      id: row.id,
      parentId: row.parentId,
      type: row.type as PageDetail["type"],
      title: row.title,
      icon: row.icon,
      cover: row.cover,
      isFavorite: row.isFavorite,
      isRow: row.isRow,
    };
  }

  @Patch(":id")
  async update(
    @WorkspaceId() workspaceId: string,
    @Param("id") id: string,
    @Body() body: UpdatePageRequest,
  ) {
    return this.pagesService.update(workspaceId, id, body);
  }

  @Post(":id/move")
  async move(
    @WorkspaceId() workspaceId: string,
    @Param("id") id: string,
    @Body() body: MovePageRequest,
  ) {
    return this.pagesService.move(
      workspaceId,
      id,
      body.parentId,
      body.position,
    );
  }

  @Delete(":id")
  async remove(@WorkspaceId() workspaceId: string, @Param("id") id: string) {
    await this.pagesService.softDelete(workspaceId, id);
    return { ok: true };
  }
}
