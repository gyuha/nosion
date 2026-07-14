import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import type {
  DocumentContentResponse,
  UpdateDocumentContentRequest,
} from "@nosion/shared";
import { WorkspaceId } from "../auth/workspace-id.decorator";
import { DocumentsService } from "./documents.service";

@Controller("pages/:id/content")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  async getContent(
    @WorkspaceId() workspaceId: string,
    @Param("id") pageId: string,
  ): Promise<DocumentContentResponse> {
    const content = await this.documentsService.getContent(workspaceId, pageId);
    return { pageId, content };
  }

  @Put()
  async setContent(
    @WorkspaceId() workspaceId: string,
    @Param("id") pageId: string,
    @Body() body: UpdateDocumentContentRequest,
  ): Promise<DocumentContentResponse> {
    const content = await this.documentsService.setContent(
      workspaceId,
      pageId,
      body.content,
    );
    return { pageId, content };
  }
}
