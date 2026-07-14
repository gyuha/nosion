import { Body, Controller, Param, Patch } from "@nestjs/common";
import type { UpdatePropertyValueRequest } from "@nosion/shared";
import { WorkspaceId } from "../auth/workspace-id.decorator";
import { DatabasesService } from "./databases.service";

@Controller("rows/:pageId/values/:propertyId")
export class RowsController {
  constructor(private readonly databasesService: DatabasesService) {}

  @Patch()
  async updateValue(
    @WorkspaceId() workspaceId: string,
    @Param("pageId") pageId: string,
    @Param("propertyId") propertyId: string,
    @Body() body: UpdatePropertyValueRequest,
  ) {
    return this.databasesService.updateValue(
      workspaceId,
      pageId,
      propertyId,
      body.value,
    );
  }
}
