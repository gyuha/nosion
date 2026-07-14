import { Controller, Get, Query } from "@nestjs/common";
import type { SearchResponse } from "@nosion/shared";
import { WorkspaceId } from "../auth/workspace-id.decorator";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @WorkspaceId() workspaceId: string,
    @Query("q") q: string | undefined,
  ): Promise<SearchResponse> {
    const results = await this.searchService.search(workspaceId, q ?? "");
    return { results };
  }
}
