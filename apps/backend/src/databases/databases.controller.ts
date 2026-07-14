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
  CreatePropertyRequest,
  CreateViewRequest,
  DatabaseResponse,
  UpdatePropertyRequest,
  UpdateViewRequest,
} from "@nosion/shared";
import { WorkspaceId } from "../auth/workspace-id.decorator";
import { DatabasesService } from "./databases.service";

@Controller("databases/:pageId")
export class DatabasesController {
  constructor(private readonly databasesService: DatabasesService) {}

  @Get()
  async get(
    @WorkspaceId() workspaceId: string,
    @Param("pageId") pageId: string,
  ): Promise<DatabaseResponse> {
    return this.databasesService.getDatabase(workspaceId, pageId);
  }

  @Post("properties")
  async createProperty(
    @WorkspaceId() workspaceId: string,
    @Param("pageId") pageId: string,
    @Body() body: CreatePropertyRequest,
  ) {
    return this.databasesService.createProperty(
      workspaceId,
      pageId,
      body.name,
      body.type,
      body.config,
    );
  }

  @Patch("properties/:id")
  async updateProperty(
    @WorkspaceId() workspaceId: string,
    @Param("pageId") pageId: string,
    @Param("id") propertyId: string,
    @Body() body: UpdatePropertyRequest,
  ) {
    return this.databasesService.updateProperty(
      workspaceId,
      pageId,
      propertyId,
      body,
    );
  }

  @Delete("properties/:id")
  async deleteProperty(
    @WorkspaceId() workspaceId: string,
    @Param("pageId") pageId: string,
    @Param("id") propertyId: string,
  ) {
    await this.databasesService.deleteProperty(workspaceId, pageId, propertyId);
    return { ok: true };
  }

  @Post("rows")
  async createRow(
    @WorkspaceId() workspaceId: string,
    @Param("pageId") pageId: string,
  ) {
    return this.databasesService.createRow(workspaceId, pageId);
  }

  @Post("views")
  async createView(
    @WorkspaceId() workspaceId: string,
    @Param("pageId") pageId: string,
    @Body() body: CreateViewRequest,
  ) {
    return this.databasesService.createView(
      workspaceId,
      pageId,
      body.name,
      body.type,
    );
  }

  @Patch("views/:id")
  async updateView(
    @WorkspaceId() workspaceId: string,
    @Param("pageId") pageId: string,
    @Param("id") viewId: string,
    @Body() body: UpdateViewRequest,
  ) {
    return this.databasesService.updateView(workspaceId, pageId, viewId, body);
  }

  @Delete("views/:id")
  async deleteView(
    @WorkspaceId() workspaceId: string,
    @Param("pageId") pageId: string,
    @Param("id") viewId: string,
  ) {
    await this.databasesService.deleteView(workspaceId, pageId, viewId);
    return { ok: true };
  }
}
