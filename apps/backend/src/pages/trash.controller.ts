import { Controller, Get } from "@nestjs/common";
import type { PageType, TrashItem } from "@nosion/shared";
import { WorkspaceId } from "../auth/workspace-id.decorator";
import { PagesService } from "./pages.service";

@Controller("trash")
export class TrashController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  async list(@WorkspaceId() workspaceId: string): Promise<TrashItem[]> {
    const rows = await this.pagesService.getTrash(workspaceId);
    return rows.map(
      (r): TrashItem => ({
        id: r.id,
        title: r.title,
        type: r.type as PageType,
      }),
    );
  }
}
